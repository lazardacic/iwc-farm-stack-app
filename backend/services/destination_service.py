from bson import ObjectId
from database import destination_collection


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


async def get_all_destinations():
    destinations = []

    async for destination in destination_collection.find():
        destinations.append(destination_serializer(destination))

    return destinations


async def get_destination(id: str):
    destination = await destination_collection.find_one(
        {"_id": ObjectId(id)}
    )

    if destination:
        return destination_serializer(destination)

    return None


async def create_destination(data: dict):
    result = await destination_collection.insert_one(data)

    new_destination = await destination_collection.find_one(
        {"_id": result.inserted_id}
    )

    return destination_serializer(new_destination)


async def update_destination(id: str, data: dict):
    await destination_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )

    updated = await destination_collection.find_one(
        {"_id": ObjectId(id)}
    )

    return destination_serializer(updated)


async def delete_destination(id: str):
    await destination_collection.delete_one(
        {"_id": ObjectId(id)}
    )

    return {"message": "Destination deleted"}
