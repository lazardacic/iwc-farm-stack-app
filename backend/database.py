from motor.motor_asyncio import AsyncIOMotorClient

from config import DATABASE_NAME, MONGODB_URL

client = AsyncIOMotorClient(MONGODB_URL)

database = client[DATABASE_NAME]

destination_collection = database.get_collection("destinations")
