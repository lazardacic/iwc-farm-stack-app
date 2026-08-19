from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DATABASE_NAME = "farm_db"


def create_mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(MONGO_URL)


def get_database(client: AsyncIOMotorClient):
    return client[DATABASE_NAME]
