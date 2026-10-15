from bson import ObjectId

import pytest

from services.destination_service import (
    create_destination,
    get_destination,
    get_all_destinations,
    update_destination,
    delete_destination,
)


@pytest.mark.asyncio
async def test_get_destination_invalid_id(destination_collection):
    with pytest.raises(ValueError, match="Invalid destination id"):
        await get_destination(destination_collection, "not-a-valid-id")


@pytest.mark.asyncio
async def test_get_destination_not_found(destination_collection):
    result = await get_destination(destination_collection, str(ObjectId()))

    assert result is None


@pytest.mark.asyncio
async def test_update_destination_invalid_id(destination_collection):
    with pytest.raises(ValueError, match="Invalid destination id"):
        await update_destination(
            destination_collection,
            "not-a-valid-id",
            {"title": "New Title"},
        )

import pytest


@pytest.mark.asyncio
async def test_create_destination(destination_collection):
    data = {
        "title": "Tokyo Trip",
        "country": "Japan",
        "description": "Test",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": True,
    }

    result = await create_destination(
        destination_collection,
        data
    )

    assert result["title"] == "Tokyo Trip"
    assert result["country"] == "Japan"


@pytest.mark.asyncio
async def test_get_destination(destination_collection):
    data = {
        "title": "Paris Trip",
        "country": "France",
        "description": "Test",
        "price": 1200,
        "rating": 4.8,
        "image": "test.jpg",
        "tags": ["city", "culture"],
        "featured": False,
    }

    created = await create_destination(
        destination_collection,
        data,
    )

    result = await get_destination(
        destination_collection,
        created["id"],
    )

    assert result["id"] == created["id"]
    assert result["title"] == "Paris Trip"
    assert result["country"] == "France"


@pytest.mark.asyncio
async def test_get_all_destinations(destination_collection):
    destinations = [
        {
            "title": "Tokyo Trip",
            "country": "Japan",
            "description": "Test",
            "price": 1000,
            "rating": 4.5,
            "image": "test.jpg",
            "tags": ["city"],
            "featured": True,
        },
        {
            "title": "Rome Trip",
            "country": "Italy",
            "description": "Test",
            "price": 900,
            "rating": 4.7,
            "image": "test.jpg",
            "tags": ["culture"],
            "featured": False,
        },
    ]

    for destination in destinations:
        await create_destination(
            destination_collection,
            destination,
        )

    result = await get_all_destinations(
        destination_collection
    )

    assert len(result["items"]) == 2
    assert result["total"] == 2
    assert result["pages"] == 1
    assert result["items"][0]["title"] == "Tokyo Trip"
    assert result["items"][1]["title"] == "Rome Trip"


@pytest.mark.asyncio
async def test_update_destination(destination_collection):
    data = {
        "title": "Old Title",
        "country": "Japan",
        "description": "Test",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    }

    created = await create_destination(
        destination_collection,
        data,
    )

    update_data = {
        "title": "New Title",
        "price": 1500,
    }

    result = await update_destination(
        destination_collection,
        created["id"],
        update_data,
    )

    assert result["id"] == created["id"]
    assert result["title"] == "New Title"
    assert result["price"] == 1500


@pytest.mark.asyncio
async def test_update_destination_not_found(destination_collection):
    result = await update_destination(
        destination_collection,
        str(ObjectId()),
        {"title": "New Title"},
    )

    assert result is None


@pytest.mark.asyncio
async def test_delete_destination_invalid_id(destination_collection):
    with pytest.raises(ValueError, match="Invalid destination id"):
        await delete_destination(destination_collection, "not-a-valid-id")

@pytest.mark.asyncio
async def test_delete_destination(destination_collection):
    data = {
        "title": "Delete Me",
        "country": "Japan",
        "description": "Test",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    }

    created = await create_destination(
        destination_collection,
        data,
    )

    result = await delete_destination(
        destination_collection,
        created["id"],
    )

    assert result["message"] == "Destination deleted"

    deleted = await get_destination(
        destination_collection,
        created["id"],
    )

    assert deleted is None


@pytest.mark.asyncio
async def test_delete_destination_not_found(destination_collection):
    result = await delete_destination(
        destination_collection,
        str(ObjectId()),
    )

    assert result is None
