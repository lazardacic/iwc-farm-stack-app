import httpx
from bson import ObjectId
import pytest

from security import create_access_token


async def make_auth_headers(user_collection, email: str, role: str = "editor"):
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
    assert response.json() == {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 9,
        "pages": 0,
    }


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

    assert len(result["items"]) == 1
    assert result["total"] == 1
    assert result["items"][0]["title"] == "Tokyo Trip"
    assert result["items"][0]["country"] == "Japan"


@pytest.mark.asyncio
async def test_get_destinations_pagination_and_search(
    test_app,
    destination_collection,
):
    for title, country in [
        ("Tokyo Trip", "Japan"),
        ("Kyoto Trip", "Japan"),
        ("Rome Trip", "Italy"),
    ]:
        await destination_collection.insert_one(
            {
                "title": title,
                "country": country,
                "description": "Test destination",
                "price": 1000,
                "rating": 4.5,
                "image": "test.jpg",
                "tags": [],
                "featured": False,
            }
        )

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/destinations/?page=2&page_size=1&search=japan"
        )

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 2
    assert result["page"] == 2
    assert result["pages"] == 2
    assert len(result["items"]) == 1
    assert result["items"][0]["country"] == "Japan"


@pytest.mark.asyncio
async def test_get_destinations_rejects_invalid_pagination(test_app):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/?page=0")

    assert response.status_code == 422


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
    headers = await make_auth_headers(
        user_collection, "updater@example.com", role="admin"
    )

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


async def insert_filter_fixtures(destination_collection):
    await destination_collection.insert_many(
        [
            {
                "title": "Tokyo Trip",
                "country": "Japan",
                "description": "Test destination",
                "price": 2500,
                "rating": 4.8,
                "image": "test.jpg",
                "tags": [],
                "featured": True,
            },
            {
                "title": "Kyoto Trip",
                "country": "Japan",
                "description": "Test destination",
                "price": 900,
                "rating": 3.9,
                "image": "test.jpg",
                "tags": [],
                "featured": False,
            },
            {
                "title": "Rome Trip",
                "country": "Italy",
                "description": "Test destination",
                "price": 1500,
                "rating": 4.5,
                "image": "test.jpg",
                "tags": [],
                "featured": True,
            },
        ]
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("sort", "expected_titles"),
    [
        ("oldest", ["Tokyo Trip", "Kyoto Trip", "Rome Trip"]),
        ("newest", ["Rome Trip", "Kyoto Trip", "Tokyo Trip"]),
        ("price_asc", ["Kyoto Trip", "Rome Trip", "Tokyo Trip"]),
        ("price_desc", ["Tokyo Trip", "Rome Trip", "Kyoto Trip"]),
        ("rating_desc", ["Tokyo Trip", "Rome Trip", "Kyoto Trip"]),
        ("title_asc", ["Kyoto Trip", "Rome Trip", "Tokyo Trip"]),
    ],
)
async def test_get_destinations_sort(
    test_app,
    destination_collection,
    sort,
    expected_titles,
):
    await insert_filter_fixtures(destination_collection)

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(f"/destinations/?sort={sort}")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()["items"]] == expected_titles


@pytest.mark.asyncio
async def test_get_destinations_sort_is_stable_across_pages(
    test_app,
    destination_collection,
):
    inserted = await destination_collection.insert_many(
        [
            {
                "title": f"Same Price {index}",
                "country": "Italy",
                "description": "Test destination",
                "price": 1000,
                "rating": 4.5,
                "image": "test.jpg",
                "tags": [],
                "featured": False,
            }
            for index in range(5)
        ]
    )

    transport = httpx.ASGITransport(app=test_app)
    seen_ids = []
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        for page in range(1, 4):
            response = await client.get(
                f"/destinations/?sort=price_asc&page={page}&page_size=2"
            )
            seen_ids.extend(item["id"] for item in response.json()["items"])

    assert seen_ids == [str(id) for id in inserted.inserted_ids]


@pytest.mark.asyncio
async def test_get_destinations_rejects_unknown_sort(test_app):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/?sort=random")

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("query", "expected_titles"),
    [
        ("country=Japan", ["Tokyo Trip", "Kyoto Trip"]),
        ("min_price=1000&max_price=2000", ["Rome Trip"]),
        ("min_rating=4.5", ["Tokyo Trip", "Rome Trip"]),
        ("max_rating=4", ["Kyoto Trip"]),
        ("featured=true", ["Tokyo Trip", "Rome Trip"]),
        ("featured=false", ["Kyoto Trip"]),
        ("country=Japan&featured=true&min_rating=4", ["Tokyo Trip"]),
        ("search=trip&country=Italy", ["Rome Trip"]),
        ("country=Spain", []),
    ],
)
async def test_get_destinations_filters(
    test_app,
    destination_collection,
    query,
    expected_titles,
):
    await insert_filter_fixtures(destination_collection)

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(f"/destinations/?{query}")

    assert response.status_code == 200
    result = response.json()
    assert [item["title"] for item in result["items"]] == expected_titles
    assert result["total"] == len(expected_titles)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "query",
    [
        "min_price=2000&max_price=1000",
        "min_rating=4.5&max_rating=4",
        "min_price=-1",
        "min_rating=6",
        "featured=maybe",
    ],
)
async def test_get_destinations_rejects_invalid_filters(test_app, query):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(f"/destinations/?{query}")

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_destination_countries(test_app, destination_collection):
    await insert_filter_fixtures(destination_collection)

    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/destinations/countries")

    assert response.status_code == 200
    assert response.json() == ["Italy", "Japan"]


@pytest.mark.asyncio
async def test_create_destination_rejects_out_of_range_rating(
    test_app,
    user_collection,
):
    headers = await make_auth_headers(user_collection, "rating@example.com")
    transport = httpx.ASGITransport(app=test_app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/destinations/",
            json={
                "title": "Bad Rating",
                "country": "Italy",
                "description": "Test destination",
                "price": 900,
                "rating": 7,
                "image": "test.jpg",
            },
            headers=headers,
        )

    assert response.status_code == 422
