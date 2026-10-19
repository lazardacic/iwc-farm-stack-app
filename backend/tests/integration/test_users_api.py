import httpx
import pytest
from bson import ObjectId

from security import create_access_token


async def create_user(user_collection, email: str, role: str = "subscriber"):
    result = await user_collection.insert_one({
        "email": email,
        "password_hash": "hashed-password",
        "role": role,
    })
    return str(result.inserted_id)


def auth_headers(user_id: str):
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def send(test_app, method: str, url: str, **kwargs):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.request(method, url, **kwargs)


@pytest.mark.asyncio
async def test_list_users_requires_auth(test_app):
    response = await send(test_app, "GET", "/users/")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_users_forbidden_for_regular_user(test_app, user_collection):
    user_id = await create_user(user_collection, "user@example.com")

    response = await send(
        test_app, "GET", "/users/", headers=auth_headers(user_id)
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_for_admin(test_app, user_collection):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")
    await create_user(user_collection, "zoe@example.com")
    await create_user(user_collection, "bob@example.com")

    response = await send(
        test_app, "GET", "/users/", headers=auth_headers(admin_id)
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 3
    assert result["pages"] == 1
    assert [user["email"] for user in result["items"]] == [
        "admin@example.com",
        "bob@example.com",
        "zoe@example.com",
    ]
    assert all("password_hash" not in user for user in result["items"])


@pytest.mark.asyncio
async def test_list_users_search_and_pagination(test_app, user_collection):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")
    for email in ["anna@team.com", "mark@team.com", "other@example.com"]:
        await create_user(user_collection, email)

    response = await send(
        test_app,
        "GET",
        "/users/?search=TEAM&page=2&page_size=1",
        headers=auth_headers(admin_id),
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 2
    assert result["pages"] == 2
    assert [user["email"] for user in result["items"]] == ["mark@team.com"]


@pytest.mark.asyncio
async def test_admin_can_change_user_role(test_app, user_collection):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")
    user_id = await create_user(user_collection, "user@example.com")

    response = await send(
        test_app,
        "PATCH",
        f"/users/{user_id}/role",
        json={"role": "admin"},
        headers=auth_headers(admin_id),
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": user_id,
        "email": "user@example.com",
        "role": "admin",
    }
    stored = await user_collection.find_one({"_id": ObjectId(user_id)})
    assert stored["role"] == "admin"


@pytest.mark.asyncio
async def test_demoted_admin_loses_access_immediately(test_app, user_collection):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")
    other_admin_id = await create_user(
        user_collection, "other-admin@example.com", "admin"
    )

    response = await send(
        test_app,
        "PATCH",
        f"/users/{other_admin_id}/role",
        json={"role": "subscriber"},
        headers=auth_headers(admin_id),
    )
    assert response.status_code == 200

    response = await send(
        test_app, "GET", "/users/", headers=auth_headers(other_admin_id)
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_regular_user_cannot_change_roles(test_app, user_collection):
    user_id = await create_user(user_collection, "user@example.com")

    response = await send(
        test_app,
        "PATCH",
        f"/users/{user_id}/role",
        json={"role": "admin"},
        headers=auth_headers(user_id),
    )

    assert response.status_code == 403
    stored = await user_collection.find_one({"_id": ObjectId(user_id)})
    assert stored["role"] == "subscriber"


@pytest.mark.asyncio
async def test_admin_cannot_change_own_role(test_app, user_collection):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")

    response = await send(
        test_app,
        "PATCH",
        f"/users/{admin_id}/role",
        json={"role": "subscriber"},
        headers=auth_headers(admin_id),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "You cannot change your own role"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("target", "payload", "status_code"),
    [
        ("not-a-valid-id", {"role": "admin"}, 400),
        (str(ObjectId()), {"role": "admin"}, 404),
        (str(ObjectId()), {"role": "superuser"}, 422),
    ],
)
async def test_change_role_errors(
    test_app,
    user_collection,
    target,
    payload,
    status_code,
):
    admin_id = await create_user(user_collection, "admin@example.com", "admin")

    response = await send(
        test_app,
        "PATCH",
        f"/users/{target}/role",
        json=payload,
        headers=auth_headers(admin_id),
    )

    assert response.status_code == status_code
