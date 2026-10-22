import httpx
import pytest
from bson import ObjectId

from security import create_access_token
from services.destination_service import ensure_destination_indexes


DESTINATION = {
    "title": "Belgrade at Sunset",
    "country": "Serbia",
    "description": "Test destination",
    "price": 690,
    "rating": 4.7,
}


async def editor_headers(user_collection, role: str = "editor"):
    result = await user_collection.insert_one({
        "email": f"{role}@example.com",
        "password_hash": "hashed-password",
        "role": role,
    })
    return {"Authorization": f"Bearer {create_access_token(str(result.inserted_id))}"}


async def send(test_app, method: str, url: str, **kwargs):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, url, **kwargs)


async def create(test_app, headers, **overrides):
    response = await send(
        test_app, "POST", "/destinations/", json={**DESTINATION, **overrides}, headers=headers
    )
    assert response.status_code == 200
    return response.json()


async def update(test_app, headers, destination_id, **overrides):
    return await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, **overrides},
        headers=headers,
    )


@pytest.mark.asyncio
async def test_slug_comes_from_the_title(test_app, user_collection):
    headers = await editor_headers(user_collection)

    created = await create(test_app, headers, title="Novi Sad i Đerdap")

    assert created["slug"] == "novi-sad-i-djerdap"


@pytest.mark.asyncio
async def test_duplicate_titles_get_numbered_slugs(test_app, user_collection):
    headers = await editor_headers(user_collection)

    slugs = [(await create(test_app, headers))["slug"] for _ in range(3)]

    assert slugs == ["belgrade-at-sunset", "belgrade-at-sunset-2", "belgrade-at-sunset-3"]


@pytest.mark.asyncio
async def test_a_slug_can_be_chosen_on_create(test_app, user_collection):
    headers = await editor_headers(user_collection)

    created = await create(test_app, headers, slug="Beograd Noću")

    assert created["slug"] == "beograd-nocu"


@pytest.mark.asyncio
async def test_changing_the_title_keeps_the_slug(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    response = await update(test_app, headers, created["id"], title="Belgrade by Night")

    assert response.status_code == 200
    assert response.json()["title"] == "Belgrade by Night"
    assert response.json()["slug"] == "belgrade-at-sunset"


@pytest.mark.asyncio
async def test_saving_the_same_slug_keeps_it_without_a_number(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    response = await update(test_app, headers, created["id"], slug="belgrade-at-sunset")

    assert response.json()["slug"] == "belgrade-at-sunset"


@pytest.mark.asyncio
async def test_editor_can_change_the_slug(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    response = await update(test_app, headers, created["id"], slug="Kalemegdan Evening!")

    assert response.json()["slug"] == "kalemegdan-evening"


@pytest.mark.asyncio
async def test_a_slug_in_use_gets_a_number(test_app, user_collection):
    headers = await editor_headers(user_collection)
    await create(test_app, headers, title="Kalemegdan")
    other = await create(test_app, headers)

    response = await update(test_app, headers, other["id"], slug="kalemegdan")

    assert response.json()["slug"] == "kalemegdan-2"


@pytest.mark.asyncio
async def test_clearing_the_slug_rebuilds_it_from_the_title(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    response = await update(
        test_app, headers, created["id"], title="Belgrade by Night", slug=""
    )

    assert response.json()["slug"] == "belgrade-by-night"


@pytest.mark.asyncio
async def test_destination_can_be_read_by_slug(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    found = await send(test_app, "GET", "/destinations/by-slug/belgrade-at-sunset")
    missing = await send(test_app, "GET", "/destinations/by-slug/atlantis")

    assert found.status_code == 200
    assert found.json()["id"] == created["id"]
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_existing_destinations_get_slugs_at_startup(destination_collection):
    for title in ["Tokyo Trip #1", "Nova Destinacija", "Nova Destinacija"]:
        await destination_collection.insert_one({**DESTINATION, "title": title})

    await ensure_destination_indexes(destination_collection)

    slugs = [
        doc["slug"]
        async for doc in destination_collection.find({}, {"slug": 1}).sort("_id", 1)
    ]
    assert slugs == ["tokyo-trip-1", "nova-destinacija", "nova-destinacija-2"]


@pytest.mark.asyncio
async def test_unique_index_rejects_duplicate_slugs(destination_collection):
    await ensure_destination_indexes(destination_collection)
    await destination_collection.insert_one({**DESTINATION, "slug": "taken"})

    with pytest.raises(Exception, match="duplicate key"):
        await destination_collection.insert_one({**DESTINATION, "slug": "taken"})


@pytest.mark.asyncio
async def test_lookup_by_object_id_still_works(test_app, user_collection):
    headers = await editor_headers(user_collection)
    created = await create(test_app, headers)

    response = await send(test_app, "GET", f"/destinations/{created['id']}")

    assert response.status_code == 200
    assert ObjectId.is_valid(response.json()["id"])
