from datetime import datetime, timedelta, timezone

import httpx
import pytest
from bson import ObjectId

from security import create_access_token


@pytest.mark.asyncio
async def test_auth_me_valid_token(test_app, user_collection):
    user = {
        "email": "me@example.com",
        "password_hash": "hashed-password",
        "role": "user",
    }
    inserted = await user_collection.insert_one(user)
    token = create_access_token(str(inserted.inserted_id))

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"
    assert response.json()["role"] == "user"
    assert "password_hash" not in response.json()


@pytest.mark.asyncio
async def test_auth_me_missing_auth(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication token"


@pytest.mark.asyncio
async def test_auth_me_invalid_token(test_app):
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/auth/me",
            headers={"Authorization": "Bearer not-a-valid-token"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


@pytest.mark.asyncio
async def test_auth_me_expired_token(test_app, user_collection):
    inserted = await user_collection.insert_one({
        "email": "expired@example.com",
        "password_hash": "hashed-password",
        "role": "user",
    })

    expired_payload = {
        "sub": str(inserted.inserted_id),
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    import jwt
    from security import JWT_SECRET, JWT_ALGORITHM

    expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


@pytest.mark.asyncio
async def test_auth_me_user_not_found(test_app):
    token = create_access_token(str(ObjectId()))

    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"
