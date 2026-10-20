from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorCollection

from config import MAX_IMAGE_BYTES
from database.dependencies import get_image_storage, get_upload_collection
from models.image import ImageUploadResponse
from routes.auth import PublisherUser
from services.destination_images import record_upload
from services.image_processing import InvalidImageError, optimize_image
from services.image_storage import ImageStorage, detect_image_type


router = APIRouter(
    prefix="/images",
    tags=["Images"],
)


@router.post(
    "/",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    current_user: PublisherUser,
    uploads: Annotated[AsyncIOMotorCollection, Depends(get_upload_collection)],
    storage: Annotated[ImageStorage, Depends(get_image_storage)],
    file: UploadFile = File(...),
):
    # Read one byte past the limit to detect oversized files without loading more.
    content = await file.read(MAX_IMAGE_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty",
        )

    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Image must be 5 MB or smaller",
        )

    if not detect_image_type(content):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG and WebP images are allowed",
        )

    # Decoding and resizing are CPU-bound, so they run off the event loop.
    try:
        optimized = await run_in_threadpool(optimize_image, content)
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    stored = await storage.save(optimized, "webp")
    await record_upload(uploads, stored, current_user.id)

    return {"url": stored.url}
