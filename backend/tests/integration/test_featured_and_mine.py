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
async def test_featured_lists_up_to_five_newest_first(test_app, destination_collection):
    now = datetime.now(timezone.utc)
    for index in range(6):
        await insert(
            destination_collection,
            title=f"Featured {index}",
            featured=True,
            featured_at=now - timedelta(hours=index),
        )
    await insert(destination_collection, title="Regular")

    response = await send(test_app, "GET", "/destinations/featured")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == [
        "Featured 0",
        "Featured 1",
        "Featured 2",
        "Featured 3",
        "Featured 4",
    ]


@pytest.mark.asyncio
async def test_admin_features_and_unfeatures_a_destination(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    destination_id = await insert(destination_collection)

    featured = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/featured",
        json={"featured": True},
        headers=headers,
    )
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})

    assert featured.status_code == 200
    assert featured.json()["featured"] is True
    assert stored["featured_at"] is not None

    unfeatured = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/featured",
        json={"featured": False},
        headers=headers,
    )
    stored = await destination_collection.find_one({"_id": ObjectId(destination_id)})

    assert unfeatured.json()["featured"] is False
    assert "featured_at" not in stored


@pytest.mark.asyncio
async def test_sixth_featured_destination_is_refused(
    test_app,
    user_collection,
    destination_collection,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")
    already_featured = None
    for _ in range(5):
        already_featured = await insert(destination_collection, featured=True)
    candidate = await insert(destination_collection)

    refused = await send(
        test_app,
        "PATCH",
        f"/destinations/{candidate}/featured",
        json={"featured": True},
        headers=headers,
    )
    kept = await send(
        test_app,
        "PATCH",
        f"/destinations/{already_featured}/featured",
        json={"featured": True},
        headers=headers,
    )

    assert refused.status_code == 409
    assert "Only 5 destinations can be featured" in refused.json()["detail"]
    assert kept.status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["editor", "subscriber"])
async def test_only_admins_can_feature(
    test_app,
    user_collection,
    destination_collection,
    role,
):
    user_id, headers = await create_user(user_collection, f"{role}@example.com", role)
    destination_id = await insert(destination_collection, created_by=user_id)

    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{destination_id}/featured",
        json={"featured": True},
        headers=headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("target", "status_code"),
    [("not-an-id", 400), (str(ObjectId()), 404)],
)
async def test_feature_unknown_destination(
    test_app,
    user_collection,
    target,
    status_code,
):
    _, headers = await create_user(user_collection, "admin@example.com", "admin")

    response = await send(
        test_app,
        "PATCH",
        f"/destinations/{target}/featured",
        json={"featured": True},
        headers=headers,
    )

    assert response.status_code == status_code


@pytest.mark.asyncio
async def test_create_cannot_feature_a_destination(test_app, user_collection):
    _, headers = await create_user(user_collection, "editor@example.com", "editor")

    response = await send(
        test_app,
        "POST",
        "/destinations/",
        json={**DESTINATION, "featured": True},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["featured"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(("stored", "sent"), [(False, True), (True, False)])
async def test_edit_keeps_the_stored_featured_value(
    test_app,
    user_collection,
    destination_collection,
    stored,
    sent,
):
    editor_id, headers = await create_user(user_collection, "editor@example.com", "editor")
    destination_id = await insert(
        destination_collection, created_by=editor_id, featured=stored
    )

    response = await send(
        test_app,
        "PUT",
        f"/destinations/{destination_id}",
        json={**DESTINATION, "featured": sent},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["featured"] is stored
