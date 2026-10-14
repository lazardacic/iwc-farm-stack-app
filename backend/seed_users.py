import asyncio
import os

from database.connection import create_mongo_client, get_database

os.environ.setdefault(
    "JWT_SECRET",
    "development-jwt-secret-for-seeding-users-32-bytes",
)

from security import hash_password


DEV_USERS = [
    {
        "email": "admin@example.com",
        "password": "admin1234",
        "role": "admin",
    },
    {
        "email": "user@example.com",
        "password": "user12345",
        "role": "user",
    },
]


async def seed_users():
    client = create_mongo_client()
    database = get_database(client)
    collection = database["users"]

    try:
        for entry in DEV_USERS:
            existing_user = await collection.find_one({"email": entry["email"]})

            if existing_user:
                continue

            await collection.insert_one(
                {
                    "email": entry["email"],
                    "password_hash": hash_password(entry["password"]),
                    "role": entry["role"],
                }
            )

        print("Development users are ready.")
        print("Admin: admin@example.com / admin1234")
        print("User: user@example.com / user12345")
    finally:
        client.close()


asyncio.run(seed_users())
