from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import httpx
import jwt
import pytest

from config import JWT_SECRET
from routes.auth import refresh_cookie_path
from security import hash_password
from services.refresh_tokens import hash_token


PASSWORD = "password123"


async def send(test_app, method: str, url: str, refresh_token: str | None = None, **kwargs):
    headers = kwargs.pop("headers", {})
    if refresh_token:
        headers["Cookie"] = f"refresh_token={refresh_token}"

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, url, headers=headers, **kwargs)


async def login(test_app, user_collection, email="editor@example.com"):
    if not await user_collection.find_one({"email": email}):
        await user_collection.insert_one({
            "email": email,
            "password_hash": hash_password(PASSWORD),
            "role": "editor",
        })

    response = await send(
        test_app, "POST", "/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 200
    return response


def set_cookie_header(response) -> str:
    return response.headers.get("set-cookie", "")


async def me(test_app, access_token):
    return await send(
        test_app,
        "GET",
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )


@pytest.mark.asyncio
async def test_login_sets_an_http_only_refresh_cookie(test_app, user_collection):
    response = await login(test_app, user_collection)

    cookie = set_cookie_header(response)
    assert cookie.startswith("refresh_token=")
    assert "HttpOnly" in cookie
    assert "Path=/auth" in cookie
    assert "SameSite=lax" in cookie
    assert f"Max-Age={7 * 24 * 3600}" in cookie
    assert response.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_refresh_tokens_are_stored_hashed(
    test_app,
    user_collection,
    refresh_token_collection,
):
    response = await login(test_app, user_collection)
    token = response.cookies["refresh_token"]

    record = await refresh_token_collection.find_one({})

    assert record["token_hash"] == hash_token(token)
    assert token not in str(record)


@pytest.mark.asyncio
async def test_access_token_lasts_15_minutes(test_app, user_collection):
    response = await login(test_app, user_collection)

    payload = jwt.decode(
        response.json()["access_token"], JWT_SECRET, algorithms=["HS256"]
    )
    lifetime = payload["exp"] - datetime.now(timezone.utc).timestamp()

    assert payload["type"] == "access"
    assert 14 * 60 < lifetime <= 15 * 60


@pytest.mark.asyncio
async def test_refresh_returns_a_working_access_token_and_rotates_the_cookie(
    test_app,
    user_collection,
):
    first = (await login(test_app, user_collection)).cookies["refresh_token"]

    response = await send(test_app, "POST", "/auth/refresh", refresh_token=first)

    assert response.status_code == 200
    second = response.cookies["refresh_token"]
    assert second != first
    profile = await me(test_app, response.json()["access_token"])
    assert profile.json()["email"] == "editor@example.com"


@pytest.mark.asyncio
async def test_reusing_a_rotated_token_revokes_the_whole_session(
    test_app,
    user_collection,
    refresh_token_collection,
):
    first = (await login(test_app, user_collection)).cookies["refresh_token"]
    second = (
        await send(test_app, "POST", "/auth/refresh", refresh_token=first)
    ).cookies["refresh_token"]
    # Move the rotation outside the grace period, as if an attacker replayed it later.
    await refresh_token_collection.update_one(
        {"token_hash": hash_token(first)},
        {"$set": {"revoked_at": datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )

    replay = await send(test_app, "POST", "/auth/refresh", refresh_token=first)
    legitimate = await send(test_app, "POST", "/auth/refresh", refresh_token=second)

    assert replay.status_code == 401
    assert replay.json()["detail"] == "Refresh token reuse detected"
    assert legitimate.status_code == 401


@pytest.mark.asyncio
async def test_concurrent_refresh_within_grace_period_succeeds(
    test_app,
    user_collection,
):
    first = (await login(test_app, user_collection)).cookies["refresh_token"]
    await send(test_app, "POST", "/auth/refresh", refresh_token=first)

    second_tab = await send(test_app, "POST", "/auth/refresh", refresh_token=first)

    assert second_tab.status_code == 200
    assert "refresh_token" not in second_tab.cookies
    assert (await me(test_app, second_tab.json()["access_token"])).status_code == 200


@pytest.mark.asyncio
async def test_refresh_without_cookie_is_rejected(test_app):
    response = await send(test_app, "POST", "/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing refresh token"


@pytest.mark.asyncio
@pytest.mark.parametrize("token", ["not-a-real-token", ""], ids=["unknown", "empty"])
async def test_unknown_refresh_token_is_rejected_and_cleared(test_app, token):
    response = await send(
        test_app,
        "POST",
        "/auth/refresh",
        headers={"Cookie": f"refresh_token={token}"},
    )

    assert response.status_code == 401
    assert 'refresh_token=""' in set_cookie_header(response)


@pytest.mark.asyncio
async def test_expired_refresh_token_is_rejected(
    test_app,
    user_collection,
    refresh_token_collection,
):
    token = (await login(test_app, user_collection)).cookies["refresh_token"]
    await refresh_token_collection.update_one(
        {"token_hash": hash_token(token)},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
    )

    response = await send(test_app, "POST", "/auth/refresh", refresh_token=token)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_for_deleted_user_is_rejected(test_app, user_collection):
    token = (await login(test_app, user_collection)).cookies["refresh_token"]
    await user_collection.delete_many({})

    response = await send(test_app, "POST", "/auth/refresh", refresh_token=token)

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_logout_revokes_the_session_and_clears_the_cookie(
    test_app,
    user_collection,
):
    token = (await login(test_app, user_collection)).cookies["refresh_token"]

    logout = await send(test_app, "POST", "/auth/logout", refresh_token=token)
    after = await send(test_app, "POST", "/auth/refresh", refresh_token=token)

    assert logout.status_code == 204
    assert 'refresh_token=""' in set_cookie_header(logout)
    assert after.status_code == 401


@pytest.mark.asyncio
async def test_logout_without_cookie_still_succeeds(test_app):
    response = await send(test_app, "POST", "/auth/logout")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_logout_keeps_other_sessions(test_app, user_collection):
    laptop = (await login(test_app, user_collection)).cookies["refresh_token"]
    phone = (await login(test_app, user_collection)).cookies["refresh_token"]

    await send(test_app, "POST", "/auth/logout", refresh_token=laptop)
    response = await send(test_app, "POST", "/auth/refresh", refresh_token=phone)

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_token_without_access_type_is_rejected(test_app, user_collection):
    await login(test_app, user_collection)
    user = await user_collection.find_one({})
    legacy = jwt.encode(
        {
            "sub": str(user["_id"]),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    assert (await me(test_app, legacy)).status_code == 401


@pytest.mark.parametrize(
    ("root_path", "expected"),
    [("", "/auth"), ("/api", "/api/auth"), ("/api/", "/api/auth")],
)
def test_refresh_cookie_path_follows_the_proxy_prefix(root_path, expected):
    request = SimpleNamespace(scope={"root_path": root_path})

    assert refresh_cookie_path(request) == expected
