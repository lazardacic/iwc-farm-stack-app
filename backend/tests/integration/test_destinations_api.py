import httpx
from bson import ObjectId
import pytest

from security import create_access_token


async def make_auth_headers(user_collection, email: str, role: str = "user"):
    user = await user_collection.insert_one({
        "email": email,
        "password_hash": "hashed-password",
        "role": role,
    })
    token = create_access_token(str(user.inserted_id))
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_destinations(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_destinations_with_data(
    test_app,
    destination_collection,
):
    data = {
        "title": "Tokyo Trip",
        "country": "Japan",
        "description": "Test destination",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city", "culture"],
        "featured": True,
    }

    await destination_collection.insert_one(data)

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/")

    assert response.status_code == 200

    result = response.json()

    assert len(result) == 1
    assert result[0]["title"] == "Tokyo Trip"
    assert result[0]["country"] == "Japan"


@pytest.mark.asyncio
async def test_get_destination(test_app, destination_collection):
    data = {
        "title": "Paris Trip",
        "country": "France",
        "description": "Test destination",
        "price": 1200,
        "rating": 4.8,
        "image": "test.jpg",
        "tags": ["city", "culture"],
        "featured": False,
    }

    result = await destination_collection.insert_one(data)

    destination_id = str(result.inserted_id)

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            f"/destinations/{destination_id}"
        )

    assert response.status_code == 200

    result = response.json()

    assert result["id"] == destination_id
    assert result["title"] == "Paris Trip"
    assert result["country"] == "France"


@pytest.mark.asyncio
async def test_get_destination_invalid_id(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/not-a-valid-id")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid destination id"


@pytest.mark.asyncio
async def test_get_destination_not_found(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(f"/destinations/{ObjectId()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Destination not found"


@pytest.mark.asyncio
async def test_create_destination(test_app, destination_collection, user_collection):
    data = {
        "title": "Rome Trip",
        "country": "Italy",
        "description": "Test destination",
        "price": 900,
        "rating": 4.7,
        "image": "test.jpg",
        "tags": ["culture"],
        "featured": False,
    }

    headers = await make_auth_headers(user_collection, "creator@example.com")
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/destinations/",
            json=data,
            headers=headers,
        )

    assert response.status_code == 200

    result = response.json()

    assert result["title"] == "Rome Trip"
    assert result["country"] == "Italy"

    stored = await destination_collection.find_one(
        {"title": "Rome Trip"}
    )

    assert stored is not None


@pytest.mark.asyncio
async def test_create_destination_validation_error(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "creator-invalid@example.com")
    transport = httpx.ASGITransport(app=test_app)

    invalid_data = {
        "title": "Missing Required Fields",
        "price": 900,
        "rating": 4.7,
        "image": "test.jpg",
    }

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/destinations/",
            json=invalid_data,
            headers=headers,
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_destination_validation_error(test_app, destination_collection, user_collection):
    result = await destination_collection.insert_one(
        {
            "title": "Old Title",
            "country": "Japan",
            "description": "Test destination",
            "price": 1000,
            "rating": 4.5,
            "image": "test.jpg",
            "tags": ["city"],
            "featured": False,
        }
    )

    destination_id = str(result.inserted_id)
    headers = await make_auth_headers(user_collection, "updater-invalid@example.com")

    invalid_data = {
        "title": "New Title",
        "country": "Japan",
        "price": 1500,
        "rating": 4.9,
        "image": "updated.jpg",
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.put(
            f"/destinations/{destination_id}",
            json=invalid_data,
            headers=headers,
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_destination(
    test_app,
    destination_collection,
    user_collection,
):
    data = {
        "title": "Old Title",
        "country": "Japan",
        "description": "Test destination",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    }

    result = await destination_collection.insert_one(data)
    headers = await make_auth_headers(user_collection, "updater@example.com")

    destination_id = str(result.inserted_id)

    update_data = {
        "title": "New Title",
        "country": "Japan",
        "description": "Updated destination",
        "price": 1500,
        "rating": 4.9,
        "image": "updated.jpg",
        "tags": ["city", "culture"],
        "featured": True,
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.put(
            f"/destinations/{destination_id}",
            json=update_data,
            headers=headers,
        )

    assert response.status_code == 200

    result = response.json()

    assert result["id"] == destination_id
    assert result["title"] == "New Title"
    assert result["price"] == 1500
    assert result["rating"] == 4.9


@pytest.mark.asyncio
async def test_update_destination_invalid_id(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "updater-invalid-id@example.com")
    transport = httpx.ASGITransport(app=test_app)

    update_data = {
        "title": "New Title",
        "country": "Japan",
        "description": "Updated destination",
        "price": 1500,
        "rating": 4.9,
        "image": "updated.jpg",
        "tags": ["city", "culture"],
        "featured": True,
    }

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.put(
            "/destinations/not-a-valid-id",
            json=update_data,
            headers=headers,
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid destination id"


@pytest.mark.asyncio
async def test_update_destination_not_found(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "updater-not-found@example.com")
    transport = httpx.ASGITransport(app=test_app)

    update_data = {
        "title": "New Title",
        "country": "Japan",
        "description": "Updated destination",
        "price": 1500,
        "rating": 4.9,
        "image": "updated.jpg",
        "tags": ["city", "culture"],
        "featured": True,
    }

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.put(
            f"/destinations/{ObjectId()}",
            json=update_data,
            headers=headers,
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Destination not found"


@pytest.mark.asyncio
async def test_delete_destination(
    test_app,
    destination_collection,
    user_collection,
):
    data = {
        "title": "Delete Me",
        "country": "Japan",
        "description": "Test destination",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    }

    insert_result = await destination_collection.insert_one(data)
    headers = await make_auth_headers(user_collection, "admin-delete@example.com", role="admin")

    destination_id = str(insert_result.inserted_id)

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.delete(
            f"/destinations/{destination_id}",
            headers=headers,
        )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["message"] == "Destination deleted"

    deleted = await destination_collection.find_one(
        {"_id": insert_result.inserted_id}
    )

    assert deleted is None


@pytest.mark.asyncio
async def test_delete_destination_invalid_id(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "admin-delete-invalid@example.com", role="admin")
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.delete(
            "/destinations/not-a-valid-id",
            headers=headers,
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid destination id"


@pytest.mark.asyncio
async def test_delete_destination_not_found(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "admin-delete-not-found@example.com", role="admin")
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.delete(
            f"/destinations/{ObjectId()}",
            headers=headers,
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Destination not found"


@pytest.mark.asyncio
async def test_test_database_isolated(destination_collection):
    assert destination_collection.database.name == "farm_test_db"
