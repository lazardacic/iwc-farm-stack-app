import math
import re

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


async def get_destination_countries(collection) -> list[str]:
    countries = await collection.distinct("country")
    return sorted(country for country in countries if country)


async def ensure_destination_indexes(collection):
    await collection.create_index("country")
    await collection.create_index("price")
    await collection.create_index("rating")
    await collection.create_index("featured")


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
