import pytest
import httpx


@pytest.mark.asyncio
async def test_register_user_success(test_app, user_collection):
    payload = {
        "email": "user@example.com",
        "password": "secret123",
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/register",
            json=payload,
        )

    assert response.status_code == 201

    body = response.json()
    assert body["email"] == "user@example.com"
    assert body["role"] == "user"
    assert "id" in body
    assert "password_hash" not in body

    stored = await user_collection.find_one({"email": "user@example.com"})
    assert stored is not None
    assert stored["password_hash"] != payload["password"]
    assert stored["role"] == "user"


@pytest.mark.asyncio
async def test_register_user_duplicate_email(test_app, user_collection):
    await user_collection.insert_one({
        "email": "user@example.com",
        "password_hash": "hashed-value",
        "role": "user",
    })

    payload = {
        "email": "user@example.com",
        "password": "secret123",
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/register",
            json=payload,
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_user_invalid_email(test_app):
    payload = {
        "email": "not-an-email",
        "password": "secret123",
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/register",
            json=payload,
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_user_invalid_request_body(test_app):
    payload = {
        "email": "user@example.com",
    }

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/register",
            json=payload,
        )

    assert response.status_code == 422
