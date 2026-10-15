from motor.motor_asyncio import AsyncIOMotorClient

from config import DATABASE_NAME, MONGODB_URL


def create_mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(MONGODB_URL)


def get_database(client: AsyncIOMotorClient):
    return client[DATABASE_NAME]
