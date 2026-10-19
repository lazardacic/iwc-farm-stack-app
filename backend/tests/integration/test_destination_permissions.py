import httpx
import pytest
from bson import ObjectId

from security import create_access_token
from services.user_service import migrate_legacy_roles


DESTINATION = {
    "title": "Lisbon Trip",
    "country": "Portugal",
    "description": "Test destination",
    "price": 900,
    "rating": 4.6,
    "image": "test.jpg",
    "tags": [],
    "featured": False,
}


async def create_user(user_collection, email: str, role: str):
    result = await user_collection.insert_one({
        "email": email,
        "password_hash": "hashed-password",
        "role": role,
    })
    user_id = str(result.inserted_id)
    return user_id, {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def send(test_app, method: str, url: str, **kwargs):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.request(method, url, **kwargs)


async def insert_destination(destination_collection, created_by=None):
    data = {**DESTINATION}
    if created_by:
        data["created_by"] = created_by
    result = await destination_collection.insert_one(data)
    return str(result.inserted_id)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "status_code"),
    [("subscriber", 403), ("editor", 200), ("admin", 200)],
)
async def test_create_destination_by_role(
    test_app,
    user_collection,
    role,
    status_code,
):
    _, headers = await create_user(user_collection, f"{role}@example.com", role)

    response = await send(
        test_app, "POST", "/destinations/", json=DESTINATION, headers=headers
    )

    assert response.status_code == status_code


@pytest.mark.asyncio
async def test_created_destination_records_owner(test_app, user_collection):
    editor_id, headers = await create_user(
        user_collection, "editor@example.com", "editor"
    )

    response = await send(
        test_app,
        "POST",
        "/destinations/",
        json={**DESTINATION, "created_by": "someone-else"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["created_by"] == editor_id


@pytest.mark.asyncio
async def test_editor_can_edit_own_destination(
    test_app,
    destination_collection,
    user_collection,
):
    editor_id, headers = await create_user(
        user_collection, "editor@example.com", "editor"
    )
    destination_id = await insert_destination(destination_collection, editor_id)

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "title": "Updated"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated"
    assert response.json()["created_by"] == editor_id


@pytest.mark.asyncio
@pytest.mark.parametrize("owner", ["other-editor-id", None])
async def test_editor_cannot_edit_other_destinations(
    test_app,
    destination_collection,
    user_collection,
    owner,
):
    _, headers = await create_user(user_collection, "editor@example.com", "editor")
    destination_id = await insert_destination(destination_collection, owner)

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "title": "Hijacked"},
        headers=headers,
    )

    assert response.status_code == 403
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})
    assert stored["title"] == "Lisbon Trip"


@pytest.mark.asyncio
async def test_admin_can_edit_any_destination(
    test_app,
    destination_collection,
    user_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    destination_id = await insert_destination(destination_collection, "editor-id")

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "title": "Admin edit"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["created_by"] == "editor-id"


@pytest.mark.asyncio
async def test_subscriber_cannot_edit(
    test_app,
    destination_collection,
    user_collection,
):
    subscriber_id, headers = await create_user(
        user_collection, "subscriber@example.com", "subscriber"
    )
    destination_id = await insert_destination(destination_collection, subscriber_id)

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json=DESTINATION,
        headers=headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_editor_cannot_delete_even_own_destination(
    test_app,
    destination_collection,
    user_collection,
):
    editor_id, headers = await create_user(
        user_collection, "editor@example.com", "editor"
    )
    destination_id = await insert_destination(destination_collection, editor_id)

    response = await send(
        test_app, "DELETE", f"/destinations/{destination_id}", headers=headers
    )

    assert response.status_code == 403
    assert await destination_collection.count_documents({}) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["editor", "subscriber"])
async def test_non_admins_cannot_manage_roles(test_app, user_collection, role):
    _, headers = await create_user(user_collection, f"{role}@example.com", role)
    target_id, _ = await create_user(
        user_collection, "target@example.com", "subscriber"
    )

    list_response = await send(test_app, "GET", "/users/", headers=headers)
    role_response = await send(
        test_app,
        "PATCH",
        f"/users/{target_id}/role",
        json={"role": "admin"},
        headers=headers,
    )

    assert list_response.status_code == 403
    assert role_response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_assign_editor_role(test_app, user_collection):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    target_id, _ = await create_user(
        user_collection, "target@example.com", "subscriber"
    )

    response = await send(
        test_app,
        "PATCH",
        f"/users/{target_id}/role",
        json={"role": "editor"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["role"] == "editor"


@pytest.mark.asyncio
async def test_legacy_user_role_is_treated_as_subscriber(
    test_app,
    user_collection,
):
    _, headers = await create_user(user_collection, "legacy@example.com", "user")

    me = await send(test_app, "GET", "/auth/me", headers=headers)
    create = await send(
        test_app, "POST", "/destinations/", json=DESTINATION, headers=headers
    )

    assert me.json()["role"] == "subscriber"
    assert create.status_code == 403


@pytest.mark.asyncio
async def test_migrate_legacy_roles(user_collection):
    await create_user(user_collection, "legacy@example.com", "user")
    await create_user(user_collection, "admin@example.com", "admin")

    migrated = await migrate_legacy_roles(user_collection)

    assert migrated == 1
    roles = sorted(
        [user["role"] async for user in user_collection.find({}, {"role": 1})]
    )
    assert roles == ["admin", "subscriber"]
    assert await migrate_legacy_roles(user_collection) == 0
