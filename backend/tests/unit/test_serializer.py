from bson import ObjectId

import pytest

from services.destination_service import destination_serializer


def test_destination_serializer():
    destination_id = ObjectId()

    destination = {
        "_id": destination_id,
        "title": "Paris",
        "country": "France",
        "description": "A beautiful city",
        "price": 500,
        "rating": 4.8,
        "image": "paris.jpg",
        "tags": ["Europe", "City"],
        "featured": True,
        "created_by": "user-1",
    }

    result = destination_serializer(destination)

    assert result == {
        "id": str(destination_id),
        "title": "Paris",
        "slug": "",
        "country": "France",
        "description": "A beautiful city",
        "description_html": "<p>A beautiful city</p>",
        "price": 500,
        "rating": 4.8,
        "image": "paris.jpg",
        "tags": ["Europe", "City"],
        "featured": True,
        "created_by": "user-1",
        "pinned": False,
    }


def test_destination_serializer_with_empty_values():
    destination_id = ObjectId()

    destination = {
        "_id": destination_id,
        "title": "",
        "country": "",
        "description": "",
        "price": 0,
        "rating": 0,
        "image": "",
        "tags": [],
        "featured": False,
    }

    result = destination_serializer(destination)

    assert result == {
        "id": str(destination_id),
        "title": "",
        "slug": "",
        "country": "",
        "description": "",
        "description_html": "",
        "price": 0,
        "rating": 0,
        "image": "",
        "tags": [],
        "featured": False,
        "created_by": None,
        "pinned": False,
    }


def test_destination_serializer_missing_field():
    destination = {
        "_id": ObjectId(),
        "title": "Paris",
    }

    with pytest.raises(KeyError):
        destination_serializer(destination)


def test_serializer_keeps_stored_rich_text():
    destination = {
        "_id": ObjectId(),
        "title": "Paris",
        "country": "France",
        "description": "Old plain text",
        "description_html": "<h2>Paris</h2><p>Stored rich text</p>",
        "price": 500,
        "rating": 4.8,
        "image": "paris.jpg",
        "tags": [],
        "featured": False,
    }

    result = destination_serializer(destination)

    assert result["description_html"] == "<h2>Paris</h2><p>Stored rich text</p>"
