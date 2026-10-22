from datetime import datetime, timedelta, timezone

import pytest

from services.destination_images import cleanup_orphaned_uploads, release_image
from services.image_storage import ImageStorages
from tests.fakes import FakeImageStorage


DAY = timedelta(hours=24)


async def add_upload(upload_collection, image_storage, public_id, age, **fields):
    image_storage.files[public_id] = b"image"
    await upload_collection.insert_one({
        "url": f"https://images.test/{public_id}",
        "public_id": public_id,
        "storage": image_storage.name,
        "uploaded_by": "editor-id",
        "created_at": datetime.now(timezone.utc) - age,
        **fields,
    })


async def remaining(upload_collection):
    return sorted(
        [record["public_id"] async for record in upload_collection.find({})]
    )


@pytest.mark.asyncio
async def test_old_unused_upload_is_deleted(
    upload_collection,
    destination_collection,
    image_storage,
):
    await add_upload(upload_collection, image_storage, "old.webp", timedelta(hours=30))

    removed = await cleanup_orphaned_uploads(
        ImageStorages(image_storage), upload_collection, destination_collection, DAY
    )

    assert removed == 1
    assert image_storage.deleted == ["old.webp"]
    assert await remaining(upload_collection) == []


@pytest.mark.asyncio
async def test_recent_upload_is_kept_while_the_form_may_still_be_open(
    upload_collection,
    destination_collection,
    image_storage,
):
    await add_upload(upload_collection, image_storage, "new.webp", timedelta(hours=2))

    removed = await cleanup_orphaned_uploads(
        ImageStorages(image_storage), upload_collection, destination_collection, DAY
    )

    assert removed == 0
    assert await remaining(upload_collection) == ["new.webp"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "destination",
    [
        {"image_public_id": "used.webp"},
        {"image": "https://images.test/used.webp", "image_public_id": None},
    ],
    ids=["by-public-id", "by-url"],
)
async def test_upload_used_by_a_destination_is_kept(
    upload_collection,
    destination_collection,
    image_storage,
    destination,
):
    await add_upload(upload_collection, image_storage, "used.webp", timedelta(days=10))
    await destination_collection.insert_one({"title": "Lisbon", **destination})

    removed = await cleanup_orphaned_uploads(
        ImageStorages(image_storage), upload_collection, destination_collection, DAY
    )

    assert removed == 0
    assert image_storage.deleted == []
    assert await remaining(upload_collection) == ["used.webp"]


@pytest.mark.asyncio
async def test_failed_storage_delete_keeps_the_record_for_the_next_run(
    upload_collection,
    destination_collection,
    image_storage,
):
    async def failing_delete(public_id):
        raise RuntimeError("storage unavailable")

    image_storage.delete = failing_delete
    await add_upload(upload_collection, image_storage, "old.webp", timedelta(days=2))

    removed = await cleanup_orphaned_uploads(
        ImageStorages(image_storage), upload_collection, destination_collection, DAY
    )

    assert removed == 0
    assert await remaining(upload_collection) == ["old.webp"]


@pytest.mark.asyncio
async def test_old_local_upload_is_deleted_after_switching_to_cloudinary(
    upload_collection,
    destination_collection,
):
    local = FakeImageStorage("local")
    cloudinary = FakeImageStorage("cloudinary")
    # Recorded before the storage name was saved: a local /media URL.
    await upload_collection.insert_one({
        "url": "http://localhost:8080/api/media/old.webp",
        "public_id": "old.webp",
        "uploaded_by": "editor-id",
        "created_at": datetime.now(timezone.utc) - timedelta(days=2),
    })

    removed = await cleanup_orphaned_uploads(
        ImageStorages(cloudinary, [local]), upload_collection, destination_collection, DAY
    )

    assert removed == 1
    assert local.deleted == ["old.webp"]
    assert cloudinary.deleted == []


@pytest.mark.asyncio
async def test_upload_in_an_unconfigured_storage_is_kept(
    upload_collection,
    destination_collection,
):
    cloudinary = FakeImageStorage("cloudinary")
    await add_upload(upload_collection, cloudinary, "remote.webp", timedelta(days=2))

    removed = await cleanup_orphaned_uploads(
        ImageStorages(FakeImageStorage("local")),
        upload_collection,
        destination_collection,
        DAY,
    )

    assert removed == 0
    assert await remaining(upload_collection) == ["remote.webp"]


@pytest.mark.asyncio
async def test_release_deletes_from_the_storage_that_holds_the_image(
    upload_collection,
    destination_collection,
):
    local = FakeImageStorage("local")
    cloudinary = FakeImageStorage("cloudinary")
    await add_upload(upload_collection, local, "replaced.webp", timedelta(minutes=5))

    await release_image(
        ImageStorages(cloudinary, [local]),
        upload_collection,
        destination_collection,
        "replaced.webp",
    )

    assert local.deleted == ["replaced.webp"]
    assert cloudinary.deleted == []
    assert await remaining(upload_collection) == []
