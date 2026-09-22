import httpx
import pytest

from security import hash_password


@pytest.mark.asyncio
async def test_login_success(test_app, user_collection):
    await user_collection.insert_one({
        "email": "user@example.com",
        "password_hash": hash_password("secret123"),
        "role": "user",
    })

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/login",
            json={
                "email": "user@example.com",
                "password": "secret123",
            },
        )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_invalid_password(test_app, user_collection):
    await user_collection.insert_one({
        "email": "user@example.com",
        "password_hash": hash_password("secret123"),
        "role": "user",
    })

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/login",
            json={
                "email": "user@example.com",
                "password": "wrong-password",
            },
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_nonexistent_user(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/login",
            json={
                "email": "missing@example.com",
                "password": "secret123",
            },
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_invalid_request_body(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/auth/login",
            json={"email": "user@example.com"},
        )

    assert response.status_code == 422
