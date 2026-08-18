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
    }

    result = destination_serializer(destination)

    assert result == {
        "id": str(destination_id),
        "title": "Paris",
        "country": "France",
        "description": "A beautiful city",
        "price": 500,
        "rating": 4.8,
        "image": "paris.jpg",
        "tags": ["Europe", "City"],
        "featured": True,
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
        "country": "",
        "description": "",
        "price": 0,
        "rating": 0,
        "image": "",
        "tags": [],
        "featured": False,
    }


def test_destination_serializer_missing_field():
    destination = {
        "_id": ObjectId(),
        "title": "Paris",
    }

    with pytest.raises(KeyError):
        destination_serializer(destination)
