import pytest_asyncio

from motor.motor_asyncio import AsyncIOMotorClient

from main import app
from database.dependencies import get_destination_collection


TEST_DATABASE_NAME = "farm_test_db"


@pytest_asyncio.fixture
async def test_database():
    client = AsyncIOMotorClient("mongodb://localhost:27017")

    database = client[TEST_DATABASE_NAME]

    assert database.name == TEST_DATABASE_NAME

    yield database

    await client.drop_database(TEST_DATABASE_NAME)

    client.close()


@pytest_asyncio.fixture
async def destination_collection(test_database):
    collection = test_database["destinations"]

    assert collection.database.name == TEST_DATABASE_NAME

    yield collection

    await collection.delete_many({})


@pytest_asyncio.fixture
async def test_app(destination_collection):
    def override_get_destination_collection():
        return destination_collection

    app.dependency_overrides[
        get_destination_collection
    ] = override_get_destination_collection

    yield app

    app.dependency_overrides.clear()
