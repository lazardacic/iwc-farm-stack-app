from datetime import datetime, timedelta, timezone

import httpx
import pytest
from bson import ObjectId

from security import create_access_token


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
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, url, **kwargs)


async def insert(destination_collection, **fields):
    result = await destination_collection.insert_one({**DESTINATION, **fields})
    return str(result.inserted_id)


@pytest.mark.asyncio
async def test_mine_requires_sign_in(test_app):
    response = await send(test_app, "GET", "/destinations/?mine=true")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in to see your destinations"


@pytest.mark.asyncio
async def test_mine_returns_only_the_callers_destinations(
    test_app,
    user_collection,
    destination_collection,
):
    editor_id, headers = await create_user(user_collection, "editor@example.com", "editor")
    await insert(destination_collection, title="Mine A", created_by=editor_id)
    await insert(destination_collection, title="Mine B", created_by=editor_id, country="Italy")
    await insert(destination_collection, title="Someone else's", created_by="other")
    await insert(destination_collection, title="Seeded, no owner")

    everything = await send(test_app, "GET", "/destinations/", headers=headers)
    mine = await send(test_app, "GET", "/destinations/?mine=true", headers=headers)
    mine_in_italy = await send(
        test_app, "GET", "/destinations/?mine=true&country=Italy", headers=headers
    )

    assert everything.json()["total"] == 4
    assert [item["title"] for item in mine.json()["items"]] == ["Mine A", "Mine B"]
    assert [item["title"] for item in mine_in_italy.json()["items"]] == ["Mine B"]


@pytest.mark.asyncio
async def test_list_with_an_invalid_token_returns_401(test_app):
    response = await send(
        test_app,
        "GET",
        "/destinations/",
        headers={"Authorization": "Bearer not-a-token"},
    )

    # 401 rather than a silent anonymous result, so the client refreshes its token.
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_pinned_lists_up_to_five_newest_first(test_app, destination_collection):
    now = datetime.now(timezone.utc)
    for index in range(6):
        await insert(
            destination_collection,
            title=f"Pinned {index}",
            pinned=True,
            pinned_at=now - timedelta(hours=index),
        )
    await insert(destination_collection, title="Featured but not pinned", featured=True)

    response = await send(test_app, "GET", "/destinations/pinned")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == [
        "Pinned 0",
        "Pinned 1",
        "Pinned 2",
        "Pinned 3",
        "Pinned 4",
    ]
    assert all(item["pinned"] for item in response.json())


@pytest.mark.asyncio
async def test_admin_pins_and_unpins_a_destination(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    destination_id = await insert(destination_collection)

    pinned = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/pinned",
        json={"pinned": True},
        headers=headers,
    )
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})

    assert pinned.status_code == 200
    assert pinned.json()["pinned"] is True
    assert pinned.json()["featured"] is False
    assert stored["pinned_at"] is not None

    unpinned = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/pinned",
        json={"pinned": False},
        headers=headers,
    )
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})

    assert unpinned.json()["pinned"] is False
    assert "pinned_at" not in stored


@pytest.mark.asyncio
async def test_sixth_pinned_destination_is_refused(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    already_pinned = None
    for _ in range(5):
        already_pinned = await insert(destination_collection, pinned=True)
    candidate = await insert(destination_collection)

    refused = await send(
        test_app,
        "PATCH",
        f"/destinations/{candidate}/pinned",
        json={"pinned": True},
        headers=headers,
    )
    kept = await send(
        test_app,
        "PATCH",
        f"/destinations/{already_pinned}/pinned",
        json={"pinned": True},
        headers=headers,
    )

    assert refused.status_code == 409
    assert "Only 5 destinations can be pinned" in refused.json()["detail"]
    assert kept.status_code == 200


@pytest.mark.asyncio
async def test_featured_has_no_limit_and_does_not_pin(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    for _ in range(48):
        await insert(destination_collection, featured=True)
    candidate = await insert(destination_collection)

    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{candidate}/featured",
        json={"featured": True},
        headers=headers,
    )
    slider = await send(test_app, "GET", "/destinations/pinned")

    assert response.status_code == 200
    assert response.json()["featured"] is True
    assert response.json()["pinned"] is False
    assert slider.json() == []


@pytest.mark.asyncio
async def test_featured_and_pinned_are_independent(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    destination_id = await insert(destination_collection, featured=True)

    await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/pinned",
        json={"pinned": True},
        headers=headers,
    )
    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/featured",
        json={"featured": False},
        headers=headers,
    )

    assert response.json()["featured"] is False
    assert response.json()["pinned"] is True


@pytest.mark.asyncio
@pytest.mark.parametrize("route", ["featured", "pinned"])
@pytest.mark.parametrize("role", ["editor", "subscriber"])
async def test_only_admins_change_featured_or_pinned(
    test_app,
    user_collection,
    destination_collection,
    role,
    route,
):
    user_id, headers = await create_user(user_collection, f"{role}@example.com", role)
    destination_id = await insert(destination_collection, created_by=user_id)

    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/{route}",
        json={route: True},
        headers=headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("route", ["featured", "pinned"])
@pytest.mark.parametrize(
    ("target", "status_code"),
    [("not-an-id", 400), (str(ObjectId()), 404)],
)
async def test_change_status_of_unknown_destination(
    test_app,
    user_collection,
    target,
    status_code,
    route,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")

    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{target}/{route}",
        json={route: True},
        headers=headers,
    )

    assert response.status_code == status_code


@pytest.mark.asyncio
async def test_create_cannot_feature_or_pin(test_app, user_collection):
    _, headers = await create_user(user_collection, "editor@example.com", "editor")

    response = await send(
        test_app,
        "POST",
        "/destinations/",
        json={**DESTINATION, "featured": True, "pinned": True},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["featured"] is False
    assert response.json()["pinned"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(("stored", "sent"), [(False, True), (True, False)])
async def test_edit_keeps_the_stored_featured_and_pinned_values(
    test_app,
    user_collection,
    destination_collection,
    stored,
    sent,
):
    editor_id, headers = await create_user(user_collection, "editor@example.com", "editor")
    destination_id = await insert(
        destination_collection, created_by=editor_id, featured=stored, pinned=stored
    )

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "featured": sent, "pinned": sent},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["featured"] is stored
    assert response.json()["pinned"] is stored
