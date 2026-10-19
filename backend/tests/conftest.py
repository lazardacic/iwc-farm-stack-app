import os

os.environ.setdefault(
    "JWT_SECRET",
    "test-secret-key-for-farm-stack-auth-32-byte-minimum",
)

import pytest_asyncio

from motor.motor_asyncio import AsyncIOMotorClient

from config import MONGODB_URL
from database.dependencies import (
    get_destination_collection,
    get_image_storage,
    get_upload_collection,
    get_user_collection,
)
from main import app
from tests.fakes import FakeImageStorage


TEST_DATABASE_NAME = "farm_test_db"


@pytest_asyncio.fixture
async def test_database():
    client = AsyncIOMotorClient(MONGODB_URL)

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
async def user_collection(test_database):
    collection = test_database["users"]

    assert collection.database.name == TEST_DATABASE_NAME

    yield collection

    await collection.delete_many({})


@pytest_asyncio.fixture
async def upload_collection(test_database):
    collection = test_database["uploads"]

    assert collection.database.name == TEST_DATABASE_NAME

    yield collection

    await collection.delete_many({})


@pytest_asyncio.fixture
async def image_storage():
    return FakeImageStorage()


@pytest_asyncio.fixture
async def test_app(
    destination_collection,
    user_collection,
    upload_collection,
    image_storage,
):
    def override_get_destination_collection():
        return destination_collection

    def override_get_user_collection():
        return user_collection

    app.dependency_overrides[
        get_destination_collection
    ] = override_get_destination_collection
    app.dependency_overrides[
        get_user_collection
    ] = override_get_user_collection
    app.dependency_overrides[get_upload_collection] = lambda: upload_collection
    app.dependency_overrides[get_image_storage] = lambda: image_storage

    yield app

    app.dependency_overrides.clear()
