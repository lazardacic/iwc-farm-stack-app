import math
import re

from bson import ObjectId
from bson.errors import InvalidId

from models.user import LEGACY_ROLE_MAP, normalize_role


def _parse_object_id(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except InvalidId as exc:
        raise ValueError("Invalid user id") from exc


def user_serializer(user) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": normalize_role(user.get("role")),
    }


async def get_users(
    collection,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
):
    query = {}
    search = search.strip()
    if search:
        query["email"] = {"$regex": re.escape(search), "$options": "i"}

    total = await collection.count_documents(query)
    cursor = (
        collection.find(query, {"password_hash": 0})
        .sort([("email", 1), ("_id", 1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    users = [user_serializer(user) async for user in cursor]

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


async def migrate_legacy_roles(collection) -> int:
    migrated = 0
    for legacy_role, role in LEGACY_ROLE_MAP.items():
        result = await collection.update_many(
            {"role": legacy_role},
            {"$set": {"role": role}},
        )
        migrated += result.modified_count
    return migrated


async def update_user_role(collection, id: str, role: str):
    object_id = _parse_object_id(id)

    result = await collection.update_one(
        {"_id": object_id},
        {"$set": {"role": role}},
    )

    if result.matched_count == 0:
        return None

    updated = await collection.find_one({"_id": object_id})

    return user_serializer(updated)
