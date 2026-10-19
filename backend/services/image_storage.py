import os
import re
import uuid
from dataclasses import dataclass
from typing import Protocol

from starlette.concurrency import run_in_threadpool

import config


IMAGE_EXTENSIONS = ("jpg", "png", "webp")
LOCAL_FILE_PATTERN = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp)$")


@dataclass
class StoredImage:
    url: str
    public_id: str


class ImageStorage(Protocol):
    async def save(self, content: bytes, extension: str) -> StoredImage: ...

    async def delete(self, public_id: str) -> None: ...


def detect_image_type(content: bytes) -> str | None:
    """Return the file extension for JPEG, PNG or WebP content, judged by its magic bytes."""
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


class LocalImageStorage:
    def __init__(self, directory: str, public_base_url: str):
        self.directory = directory
        self.public_base_url = public_base_url.rstrip("/")
        os.makedirs(directory, exist_ok=True)

    async def save(self, content: bytes, extension: str) -> StoredImage:
        filename = f"{uuid.uuid4().hex}.{extension}"
        path = os.path.join(self.directory, filename)

        def write():
            with open(path, "wb") as file:
                file.write(content)

        await run_in_threadpool(write)

        return StoredImage(
            url=f"{self.public_base_url}/{filename}",
            public_id=filename,
        )

    async def delete(self, public_id: str) -> None:
        # public_id is a generated file name; never let it point outside the directory.
        if not LOCAL_FILE_PATTERN.match(public_id):
            return

        path = os.path.join(self.directory, public_id)
        if os.path.exists(path):
            await run_in_threadpool(os.remove, path)


class CloudinaryImageStorage:
    def __init__(self, cloud_name: str, api_key: str, api_secret: str, folder: str):
        import cloudinary

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )
        self.folder = folder

    async def save(self, content: bytes, extension: str) -> StoredImage:
        import cloudinary.uploader

        result = await run_in_threadpool(
            cloudinary.uploader.upload,
            content,
            folder=self.folder,
            resource_type="image",
        )

        return StoredImage(url=result["secure_url"], public_id=result["public_id"])

    async def delete(self, public_id: str) -> None:
        import cloudinary.uploader

        await run_in_threadpool(
            cloudinary.uploader.destroy,
            public_id,
            invalidate=True,
        )


def create_image_storage() -> ImageStorage:
    if config.IMAGE_STORAGE == "local":
        return LocalImageStorage(
            config.MEDIA_DIR,
            f"{config.API_PUBLIC_URL}/media",
        )

    if config.IMAGE_STORAGE == "cloudinary":
        missing = [
            name
            for name, value in [
                ("CLOUDINARY_CLOUD_NAME", config.CLOUDINARY_CLOUD_NAME),
                ("CLOUDINARY_API_KEY", config.CLOUDINARY_API_KEY),
                ("CLOUDINARY_API_SECRET", config.CLOUDINARY_API_SECRET),
            ]
            if not value
        ]
        if missing:
            raise RuntimeError(
                "IMAGE_STORAGE=cloudinary requires: " + ", ".join(missing)
            )

        return CloudinaryImageStorage(
            config.CLOUDINARY_CLOUD_NAME,
            config.CLOUDINARY_API_KEY,
            config.CLOUDINARY_API_SECRET,
            config.CLOUDINARY_FOLDER,
        )

    raise RuntimeError(
        f"Unknown IMAGE_STORAGE '{config.IMAGE_STORAGE}'; use 'local' or 'cloudinary'"
    )
