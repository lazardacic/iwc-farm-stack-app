import os

import pytest

from services.image_storage import LocalImageStorage, detect_image_type


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        (b"\xff\xd8\xff\xe0rest", "jpg"),
        (b"\x89PNG\r\n\x1a\nrest", "png"),
        (b"RIFF\x00\x00\x00\x00WEBPVP8 ", "webp"),
        (b"GIF89a", None),
        (b"RIFF\x00\x00\x00\x00WAVE", None),
        (b"", None),
    ],
)
def test_detect_image_type(content, expected):
    assert detect_image_type(content) == expected


@pytest.mark.asyncio
async def test_local_storage_saves_and_deletes(tmp_path):
    storage = LocalImageStorage(str(tmp_path), "http://api.test/media/")

    stored = await storage.save(b"image-bytes", "png")

    assert stored.url == f"http://api.test/media/{stored.public_id}"
    path = tmp_path / stored.public_id
    assert path.read_bytes() == b"image-bytes"

    await storage.delete(stored.public_id)

    assert not path.exists()


@pytest.mark.asyncio
async def test_local_storage_ignores_paths_outside_its_directory(tmp_path):
    media = tmp_path / "media"
    secret = tmp_path / "secret.png"
    secret.write_bytes(b"keep me")
    storage = LocalImageStorage(str(media), "http://api.test/media")

    await storage.delete("../secret.png")

    assert secret.exists()
    assert os.listdir(media) == []
