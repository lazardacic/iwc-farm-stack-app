import pytest

import config
from services.image_storage import (
    CloudinaryImageStorage,
    ImageStorages,
    LocalImageStorage,
    create_image_storages,
)
from tests.fakes import FakeImageStorage


def test_for_record_uses_the_saved_storage_name():
    local, cloudinary = FakeImageStorage("local"), FakeImageStorage("cloudinary")
    storages = ImageStorages(cloudinary, [local])

    assert storages.for_record({"storage": "local", "url": "x"}) is local
    assert storages.for_record({"storage": "cloudinary", "url": "x"}) is cloudinary


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://res.cloudinary.com/demo/image/upload/a.webp", "cloudinary"),
        ("http://localhost:8080/api/media/a.webp", "local"),
    ],
)
def test_for_record_infers_storage_for_older_records(url, expected):
    storages = ImageStorages(FakeImageStorage("cloudinary"), [FakeImageStorage("local")])

    assert storages.for_record({"url": url}).name == expected


def test_for_record_returns_none_for_an_unconfigured_storage():
    storages = ImageStorages(FakeImageStorage("local"))

    assert storages.for_record({"storage": "cloudinary", "url": "x"}) is None


def test_local_mode_also_registers_cloudinary_when_keys_exist(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "IMAGE_STORAGE", "local")
    monkeypatch.setattr(config, "MEDIA_DIR", str(tmp_path))
    monkeypatch.setattr(config, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(config, "CLOUDINARY_API_KEY", "key")
    monkeypatch.setattr(config, "CLOUDINARY_API_SECRET", "secret")

    storages = create_image_storages()

    assert isinstance(storages.active, LocalImageStorage)
    assert isinstance(storages.by_name["cloudinary"], CloudinaryImageStorage)


def test_cloudinary_mode_keeps_local_for_older_uploads(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "IMAGE_STORAGE", "cloudinary")
    monkeypatch.setattr(config, "MEDIA_DIR", str(tmp_path))
    monkeypatch.setattr(config, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(config, "CLOUDINARY_API_KEY", "key")
    monkeypatch.setattr(config, "CLOUDINARY_API_SECRET", "secret")

    storages = create_image_storages()

    assert isinstance(storages.active, CloudinaryImageStorage)
    assert isinstance(storages.by_name["local"], LocalImageStorage)


def test_cloudinary_mode_without_keys_names_what_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "IMAGE_STORAGE", "cloudinary")
    monkeypatch.setattr(config, "MEDIA_DIR", str(tmp_path))
    monkeypatch.setattr(config, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(config, "CLOUDINARY_API_KEY", "")
    monkeypatch.setattr(config, "CLOUDINARY_API_SECRET", "")

    with pytest.raises(RuntimeError, match="CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"):
        create_image_storages()
