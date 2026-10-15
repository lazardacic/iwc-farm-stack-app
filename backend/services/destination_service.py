import math
import re

from bson import ObjectId
from bson.errors import InvalidId


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
    }


async def get_all_destinations(
    collection,
    page: int = 1,
    page_size: int = 9,
    search: str = "",
):
    query = {}
    search = search.strip()
    if search:
        escaped_search = re.escape(search)
        query = {
            "$or": [
                {"title": {"$regex": escaped_search, "$options": "i"}},
                {"country": {"$regex": escaped_search, "$options": "i"}},
            ]
        }

    total = await collection.count_documents(query)
    cursor = (
        collection.find(query)
        .sort("_id", 1)
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
