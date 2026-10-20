import logging
import random
from datetime import datetime, timedelta, timezone

from services.image_storage import ImageStorage, StoredImage


logger = logging.getLogger(__name__)

# Served by the frontend from public/placeholders.
PLACEHOLDER_IMAGES = [
    "/placeholders/beach.svg",
    "/placeholders/city.svg",
    "/placeholders/countryside.svg",
    "/placeholders/desert.svg",
    "/placeholders/lake.svg",
    "/placeholders/mountains.svg",
]


def random_placeholder() -> str:
    return random.choice(PLACEHOLDER_IMAGES)


async def record_upload(uploads, stored: StoredImage, user_id: str) -> None:
    await uploads.insert_one({
        "url": stored.url,
        "public_id": stored.public_id,
        "uploaded_by": user_id,
        "created_at": datetime.now(timezone.utc),
    })


async def resolve_upload_public_id(uploads, image_url: str, user) -> str | None:
    """Return the storage id when image_url is one of our uploads.

    External URLs and placeholders return None. Using another user's upload raises
    PermissionError, so nobody can attach (and later delete) an image they do not own.
    """
    record = await uploads.find_one({"url": image_url})
    if not record:
        return None

    if record["uploaded_by"] != user.id and user.role != "admin":
        raise PermissionError("You can only use images you uploaded")

    return record["public_id"]


async def release_image(storage: ImageStorage, uploads, destinations, public_id) -> None:
    """Delete a stored image once no destination references it. Failures are logged, not raised."""
    if not public_id:
        return

    if await destinations.count_documents({"image_public_id": public_id}) > 0:
        return

    try:
        await storage.delete(public_id)
    except Exception:
        logger.exception("Failed to delete stored image %s", public_id)
        return

    await uploads.delete_one({"public_id": public_id})


async def cleanup_orphaned_uploads(
    storage: ImageStorage,
    uploads,
    destinations,
    older_than: timedelta,
) -> int:
    """Delete uploads older than `older_than` that no destination uses.

    The age limit leaves time to finish the form after uploading, before the
    image is attached to a destination. Returns how many uploads were removed.
    """
    cutoff = datetime.now(timezone.utc) - older_than
    removed = 0

    async for record in uploads.find({"created_at": {"$lt": cutoff}}):
        in_use = await destinations.count_documents(
            {
                "$or": [
                    {"image_public_id": record["public_id"]},
                    {"image": record["url"]},
                ]
            },
            limit=1,
        )
        if in_use:
            continue

        try:
            await storage.delete(record["public_id"])
        except Exception:
            logger.exception("Failed to delete orphaned image %s", record["public_id"])
            continue

        await uploads.delete_one({"_id": record["_id"]})
        removed += 1

    return removed
