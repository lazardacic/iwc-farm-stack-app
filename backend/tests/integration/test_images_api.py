import io

import httpx
import pytest
from bson import ObjectId
from PIL import Image

import services.image_processing as image_processing
from security import create_access_token
from services.destination_images import PLACEHOLDER_IMAGES


def make_image(fmt: str, size=(64, 48), mode="RGB", **save_options) -> bytes:
    color = (200, 120, 40, 128) if mode == "RGBA" else (200, 120, 40)
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, format=fmt, **save_options)
    return buffer.getvalue()


def decode(content: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(content))
    image.load()
    return image


PNG = make_image("PNG")
JPEG = make_image("JPEG")
WEBP = make_image("WEBP")
GIF = make_image("GIF")

DESTINATION = {
    "title": "Lisbon Trip",
    "country": "Portugal",
    "description": "Test destination",
    "price": 900,
    "rating": 4.6,
}


async def create_user(user_collection, email: str, role: str = "editor"):
    result = await user_collection.insert_one({
        "email": email,
        "password_hash": "hashed-password",
        "role": role,
    })
    user_id = str(result.inserted_id)
    return user_id, {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def send(test_app, method: str, url: str, **kwargs):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.request(method, url, **kwargs)


async def upload(test_app, headers, content=PNG, filename="photo.png"):
    return await send(
        test_app,
        "POST",
        "/images/",
        files={"file": (filename, content, "image/png")},
        headers=headers,
    )


async def create_destination(test_app, headers, **overrides):
    return await send(
        test_app,
        "POST",
        "/destinations/",
        json={**DESTINATION, **overrides},
        headers=headers,
    )


@pytest.mark.asyncio
async def test_upload_requires_auth(test_app):
    response = await upload(test_app, {})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_subscriber_cannot_upload(test_app, user_collection, image_storage):
    _, headers = await create_user(user_collection, "sub@example.com", "subscriber")

    response = await upload(test_app, headers)

    assert response.status_code == 403
    assert image_storage.files == {}


@pytest.mark.asyncio
@pytest.mark.parametrize("content", [PNG, JPEG, WEBP], ids=["png", "jpeg", "webp"])
async def test_editor_uploads_supported_images_as_webp(
    test_app,
    user_collection,
    upload_collection,
    image_storage,
    content,
):
    editor_id, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, content)

    assert response.status_code == 201
    url = response.json()["url"]
    assert url.endswith(".webp")
    record = await upload_collection.find_one({"url": url})
    assert record["uploaded_by"] == editor_id
    stored = decode(image_storage.files[record["public_id"]])
    assert stored.format == "WEBP"
    assert stored.size == (64, 48)


@pytest.mark.asyncio
async def test_large_image_is_resized_to_1600_px(
    test_app,
    user_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, make_image("JPEG", (4000, 3000)))

    assert response.status_code == 201
    stored = decode(next(iter(image_storage.files.values())))
    assert stored.size == (1600, 1200)


@pytest.mark.asyncio
async def test_exif_orientation_is_applied_and_metadata_removed(
    test_app,
    user_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90 degrees clockwise to display.
    exif[0x010F] = "Test Camera"  # Make
    photo = make_image("JPEG", (64, 48), exif=exif.tobytes())

    response = await upload(test_app, headers, photo)

    assert response.status_code == 201
    stored = decode(next(iter(image_storage.files.values())))
    assert stored.size == (48, 64)
    assert len(stored.getexif()) == 0


@pytest.mark.asyncio
async def test_transparency_is_kept(test_app, user_collection, image_storage):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, make_image("PNG", mode="RGBA"))

    assert response.status_code == 201
    stored = decode(next(iter(image_storage.files.values())))
    assert stored.mode == "RGBA"


@pytest.mark.asyncio
async def test_corrupt_image_with_valid_header_is_rejected(
    test_app,
    user_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)

    assert response.status_code == 400
    assert response.json()["detail"] == "The file is not a readable image"
    assert image_storage.files == {}


@pytest.mark.asyncio
async def test_image_with_too_many_pixels_is_rejected(
    test_app,
    user_collection,
    image_storage,
    monkeypatch,
):
    monkeypatch.setattr(image_processing, "MAX_IMAGE_PIXELS", 1000)
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, PNG)

    assert response.status_code == 400
    assert response.json()["detail"] == "Image dimensions are too large"
    assert image_storage.files == {}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("content", "filename", "status_code"),
    [
        (GIF, "animation.gif", 415),
        (b"<script>alert(1)</script>", "fake.png", 415),
        (b"", "empty.png", 400),
        (b"\x89PNG\r\n\x1a\n" + b"\x00" * (5 * 1024 * 1024), "huge.png", 413),
    ],
    ids=["gif", "script-renamed-png", "empty", "over-5mb"],
)
async def test_upload_rejects_invalid_files(
    test_app,
    user_collection,
    image_storage,
    content,
    filename,
    status_code,
):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await upload(test_app, headers, content, filename)

    assert response.status_code == status_code
    assert image_storage.files == {}


@pytest.mark.asyncio
async def test_destination_without_image_gets_placeholder(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await create_destination(test_app, headers)

    assert response.status_code == 200
    assert response.json()["image"] in PLACEHOLDER_IMAGES
    stored = await destination_collection.find_one({})
    assert stored["image_public_id"] is None


@pytest.mark.asyncio
async def test_destination_links_own_upload(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "editor@example.com")
    url = (await upload(test_app, headers)).json()["url"]

    response = await create_destination(test_app, headers, image=url)

    assert response.status_code == 200
    assert response.json()["image"] == url
    assert "image_public_id" not in response.json()
    stored = await destination_collection.find_one({})
    assert stored["image_public_id"] == url.rsplit("/", 1)[1]


@pytest.mark.asyncio
async def test_editor_cannot_use_another_users_upload(test_app, user_collection):
    _, owner_headers = await create_user(user_collection, "owner@example.com")
    _, other_headers = await create_user(user_collection, "other@example.com")
    url = (await upload(test_app, owner_headers)).json()["url"]

    response = await create_destination(test_app, other_headers, image=url)

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_use_any_upload(test_app, user_collection):
    _, editor_headers = await create_user(user_collection, "editor@example.com")
    _, admin_headers = await create_user(user_collection, "admin@example.com", "admin")
    url = (await upload(test_app, editor_headers)).json()["url"]

    response = await create_destination(test_app, admin_headers, image=url)

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_external_image_url_is_kept(test_app, user_collection):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await create_destination(
        test_app, headers, image="https://example.com/photo.jpg"
    )

    assert response.json()["image"] == "https://example.com/photo.jpg"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "image",
    ["javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://example.com/a.png"],
)
async def test_unsafe_image_values_are_rejected(test_app, user_collection, image):
    _, headers = await create_user(user_collection, "editor@example.com")

    response = await create_destination(test_app, headers, image=image)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_replacing_image_deletes_the_old_upload(
    test_app,
    user_collection,
    upload_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")
    old_url = (await upload(test_app, headers)).json()["url"]
    new_url = (await upload(test_app, headers, JPEG, "new.jpg")).json()["url"]
    destination_id = (await create_destination(test_app, headers, image=old_url)).json()["id"]

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "image": new_url},
        headers=headers,
    )

    assert response.status_code == 200
    old_public_id = old_url.rsplit("/", 1)[1]
    assert image_storage.deleted == [old_public_id]
    assert await upload_collection.find_one({"public_id": old_public_id}) is None


@pytest.mark.asyncio
async def test_keeping_the_same_image_deletes_nothing(
    test_app,
    user_collection,
    destination_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")
    url = (await upload(test_app, headers)).json()["url"]
    destination_id = (await create_destination(test_app, headers, image=url)).json()["id"]

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "image": url, "title": "Renamed"},
        headers=headers,
    )

    assert response.status_code == 200
    assert image_storage.deleted == []
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})
    assert stored["image_public_id"] == url.rsplit("/", 1)[1]


@pytest.mark.asyncio
async def test_clearing_image_assigns_placeholder_and_deletes_upload(
    test_app,
    user_collection,
    image_storage,
):
    _, headers = await create_user(user_collection, "editor@example.com")
    url = (await upload(test_app, headers)).json()["url"]
    destination_id = (await create_destination(test_app, headers, image=url)).json()["id"]

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "image": ""},
        headers=headers,
    )

    assert response.json()["image"] in PLACEHOLDER_IMAGES
    assert image_storage.deleted == [url.rsplit("/", 1)[1]]


@pytest.mark.asyncio
async def test_deleting_destination_deletes_its_upload(
    test_app,
    user_collection,
    image_storage,
):
    _, admin_headers = await create_user(user_collection, "admin@example.com", "admin")
    url = (await upload(test_app, admin_headers)).json()["url"]
    destination_id = (
        await create_destination(test_app, admin_headers, image=url)
    ).json()["id"]

    response = await send(
        test_app, "DELETE", f"/destinations/{destination_id}", headers=admin_headers
    )

    assert response.status_code == 200
    assert image_storage.deleted == [url.rsplit("/", 1)[1]]


@pytest.mark.asyncio
async def test_shared_upload_is_kept_while_still_used(
    test_app,
    user_collection,
    image_storage,
):
    _, admin_headers = await create_user(user_collection, "admin@example.com", "admin")
    url = (await upload(test_app, admin_headers)).json()["url"]
    first_id = (await create_destination(test_app, admin_headers, image=url)).json()["id"]
    await create_destination(test_app, admin_headers, image=url, title="Second")

    await send(test_app, "DELETE", f"/destinations/{first_id}", headers=admin_headers)

    assert image_storage.deleted == []
