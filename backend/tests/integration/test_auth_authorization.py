import httpx
import pytest

from security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_destinations_get_are_public(test_app, destination_collection):
    await destination_collection.insert_one({
        "title": "Paris",
        "country": "France",
        "description": "A beautiful city",
        "price": 500,
        "rating": 4.8,
        "image": "paris.jpg",
        "tags": ["city"],
        "featured": True,
    })

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_destination_post_requires_auth(test_app):
    payload = {
        "title": "Rome",
        "country": "Italy",
        "description": "A city",
        "price": 700,
        "rating": 4.6,
        "image": "rome.jpg",
        "tags": ["city"],
        "featured": False,
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post("/destinations/", json=payload)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_destination_put_requires_auth(test_app, destination_collection):
    inserted = await destination_collection.insert_one({
        "title": "Old Title",
        "country": "Japan",
        "description": "Test destination",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    })

    payload = {
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
            f"/destinations/{inserted.inserted_id}",
            json=payload,
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_destination_delete_requires_admin(test_app, user_collection, destination_collection):
    user_id = (await user_collection.insert_one({
        "email": "user@example.com",
        "password_hash": hash_password("secret123"),
        "role": "user",
    })).inserted_id

    admin_id = (await user_collection.insert_one({
        "email": "admin@example.com",
        "password_hash": hash_password("secret123"),
        "role": "admin",
    })).inserted_id

    destination_id = (await destination_collection.insert_one({
        "title": "Delete Me",
        "country": "Japan",
        "description": "Test",
        "price": 1000,
        "rating": 4.5,
        "image": "test.jpg",
        "tags": ["city"],
        "featured": False,
    })).inserted_id

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        user_token = create_access_token(str(user_id))
        admin_token = create_access_token(str(admin_id))

        user_response = await client.delete(
            f"/destinations/{destination_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert user_response.status_code == 403

        admin_response = await client.delete(
            f"/destinations/{destination_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_response.status_code == 200
