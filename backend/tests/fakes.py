import uuid

from services.image_storage import StoredImage


class FakeImageStorage:
    """In-memory ImageStorage for tests; never touches disk or Cloudinary."""

    def __init__(self, name: str = "fake"):
        self.name = name
        self.files: dict[str, bytes] = {}
        self.deleted: list[str] = []

    async def save(self, content: bytes, extension: str) -> StoredImage:
        public_id = f"{uuid.uuid4().hex}.{extension}"
        self.files[public_id] = content
        return StoredImage(
            url=f"https://images.test/{public_id}",
            public_id=public_id,
        )

    async def delete(self, public_id: str) -> None:
        self.files.pop(public_id, None)
        self.deleted.append(public_id)
