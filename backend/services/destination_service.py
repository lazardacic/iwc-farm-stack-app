import math
import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from models.destination import DestinationFilters, DestinationSort


def _parse_object_id(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except InvalidId as exc:
        raise ValueError("Invalid destination id") from exc


def destination_serializer(destination) -> dict:
    return {
        "id": str(destination["_id"]),
        "title": destination["title"],
        "country": destination["country"],
        "description": destination["description"],
        "price": destination["price"],
        "rating": destination["rating"],
        "image": destination["image"],
        "tags": destination["tags"],
        "featured": destination["featured"],
        "pinned": destination.get("pinned", False),
        "created_by": destination.get("created_by"),
    }


# Every sort ends with _id so equal values keep a stable order across pages.
SORT_FIELDS = {
    "oldest": [("_id", 1)],
    "newest": [("_id", -1)],
    "price_asc": [("price", 1), ("_id", 1)],
    "price_desc": [("price", -1), ("_id", 1)],
    "rating_desc": [("rating", -1), ("_id", 1)],
    "title_asc": [("title", 1), ("_id", 1)],
}


def _range_condition(minimum, maximum) -> dict:
    condition = {}
    if minimum is not None:
        condition["$gte"] = minimum
    if maximum is not None:
        condition["$lte"] = maximum
    return condition


def build_destination_query(
    search: str = "",
    filters: DestinationFilters | None = None,
) -> dict:
    query = {}
    search = search.strip()
    if search:
        escaped_search = re.escape(search)
        query["$or"] = [
            {"title": {"$regex": escaped_search, "$options": "i"}},
            {"country": {"$regex": escaped_search, "$options": "i"}},
        ]

    if filters is None:
        return query

    country = (filters.country or "").strip()
    if country:
        query["country"] = country

    price = _range_condition(filters.min_price, filters.max_price)
    if price:
        query["price"] = price

    rating = _range_condition(filters.min_rating, filters.max_rating)
    if rating:
        query["rating"] = rating

    if filters.featured is not None:
        query["featured"] = filters.featured

    if filters.created_by:
        query["created_by"] = filters.created_by

    return query


async def get_all_destinations(
    collection,
    page: int = 1,
    page_size: int = 9,
    search: str = "",
    filters: DestinationFilters | None = None,
    sort: DestinationSort = "oldest",
):
    query = build_destination_query(search, filters)

    total = await collection.count_documents(query)
    cursor = (
        collection.find(query)
        .sort(SORT_FIELDS[sort])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    destinations = []

    async for destination in cursor:
        destinations.append(destination_serializer(destination))

    return {
        "items": destinations,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


async def get_pinned_destinations(collection, limit: int) -> list[dict]:
    # Most recently pinned first; _id keeps the order stable for equal times.
    cursor = (
        collection.find({"pinned": True})
        .sort([("pinned_at", -1), ("_id", -1)])
        .limit(limit)
    )
    return [destination_serializer(destination) async for destination in cursor]


async def count_pinned_destinations(collection) -> int:
    return await collection.count_documents({"pinned": True})


async def _update_and_return(collection, id: str, change: dict):
    object_id = _parse_object_id(id)

    result = await collection.update_one({"_id": object_id}, change)
    if result.matched_count == 0:
        return None

    return destination_serializer(await collection.find_one({"_id": object_id}))


async def set_destination_featured(collection, id: str, featured: bool):
    return await _update_and_return(collection, id, {"$set": {"featured": featured}})


async def set_destination_pinned(collection, id: str, pinned: bool):
    change = (
        {"$set": {"pinned": True, "pinned_at": datetime.now(timezone.utc)}}
        if pinned
        else {"$set": {"pinned": False}, "$unset": {"pinned_at": ""}}
    )
    return await _update_and_return(collection, id, change)


async def get_destination_countries(collection) -> list[str]:
    countries = await collection.distinct("country")
    return sorted(country for country in countries if country)


async def ensure_destination_indexes(collection):
    await collection.create_index("country")
    await collection.create_index("price")
    await collection.create_index("rating")
    await collection.create_index("featured")
    await collection.create_index("pinned")


async def get_destination_document(collection, id: str):
    """Return the raw stored document, including internal fields such as image_public_id."""
    object_id = _parse_object_id(id)

    return await collection.find_one({"_id": object_id})


async def get_destination(collection, id: str):
    object_id = _parse_object_id(id)

    destination = await collection.find_one(
        {"_id": object_id}
    )

    if destination:
        return destination_serializer(destination)

    return None


async def create_destination(collection, data: dict):
    result = await collection.insert_one(data)

    new_destination = await collection.find_one(
        {"_id": result.inserted_id}
    )

    return destination_serializer(new_destination)


async def update_destination(collection, id: str, data: dict):
    object_id = _parse_object_id(id)

    result = await collection.update_one(
        {"_id": object_id},
        {"$set": data},
    )

    if result.matched_count == 0:
        return None

    updated = await collection.find_one(
        {"_id": object_id}
    )

    return destination_serializer(updated)


async def delete_destination(collection, id: str):
    object_id = _parse_object_id(id)

    result = await collection.delete_one(
        {"_id": object_id}
    )

    if result.deleted_count == 0:
        return None

    return {"message": "Destination deleted"}
