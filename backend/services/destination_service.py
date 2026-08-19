from bson import ObjectId


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


async def get_all_destinations(collection):
    destinations = []

    async for destination in collection.find():
        destinations.append(destination_serializer(destination))

    return destinations


async def get_destination(collection, id: str):
    destination = await collection.find_one(
        {"_id": ObjectId(id)}
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
    await collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": data},
    )

    updated = await collection.find_one(
        {"_id": ObjectId(id)}
    )

    return destination_serializer(updated)


async def delete_destination(collection, id: str):
    await collection.delete_one(
        {"_id": ObjectId(id)}
    )

    return {"message": "Destination deleted"}
