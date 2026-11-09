import httpx
import pytest

from tests.integration.test_destinations_api import make_auth_headers


def _payload(**overrides):
    payload = {
        "title": "Kotor Bay",
        "country": "Montenegro",
        "price": 800,
        "rating": 4.7,
        "image": "",
        "tags": [],
    }
    payload.update(overrides)
    return payload


async def _client(test_app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=test_app), base_url="http://test")


@pytest.mark.asyncio
async def test_create_stores_sanitized_html_and_plain_text(
    test_app, destination_collection, user_collection
):
    headers = await make_auth_headers(user_collection, "editor@example.com")

    async with await _client(test_app) as client:
        response = await client.post(
            "/destinations/",
            json=_payload(
                description_html=(
                    "<h2>Old town</h2>"
                    '<p onclick="steal()">Walls &amp; <strong>stairs</strong></p>'
                    '<img src="x" onerror="steal()"><script>steal()</script>'
                ),
            ),
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["description_html"] == "<h2>Old town</h2><p>Walls &amp; <strong>stairs</strong></p>"
    assert body["description"] == "Old town\n\nWalls & stairs"

    stored = await destination_collection.find_one({"title": "Kotor Bay"})
    assert "script" not in stored["description_html"]
    assert "onclick" not in stored["description_html"]


@pytest.mark.asyncio
async def test_update_replaces_plain_text_with_rich_text(
    test_app, destination_collection, user_collection
):
    headers = await make_auth_headers(user_collection, "editor@example.com")

    async with await _client(test_app) as client:
        created = await client.post(
            "/destinations/", json=_payload(description="Plain\n\ntext"), headers=headers
        )
        assert created.json()["description_html"] == "<p>Plain</p><p>text</p>"

        updated = await client.put(
            f"/destinations/{created.json()['id']}",
            json=_payload(description_html="<ul><li><p>Swim</p></li><li><p>Hike</p></li></ul>"),
            headers=headers,
        )

    assert updated.status_code == 200
    assert updated.json()["description_html"] == "<ul><li><p>Swim</p></li><li><p>Hike</p></li></ul>"
    assert updated.json()["description"] == "Swim\n\nHike"


@pytest.mark.asyncio
async def test_old_destinations_are_served_with_html(test_app, destination_collection):
    await destination_collection.insert_one(
        {
            "title": "Old entry",
            "slug": "old-entry",
            "country": "Serbia",
            "description": "Written <before> rich text\n\nSecond paragraph",
            "price": 100,
            "rating": 4,
            "image": "",
            "tags": [],
            "featured": False,
        }
    )

    async with await _client(test_app) as client:
        response = await client.get("/destinations/by-slug/old-entry")

    assert response.json()["description_html"] == (
        "<p>Written &lt;before&gt; rich text</p><p>Second paragraph</p>"
    )


@pytest.mark.asyncio
async def test_description_that_is_only_markup_is_rejected(test_app, user_collection):
    headers = await make_auth_headers(user_collection, "editor@example.com")

    async with await _client(test_app) as client:
        response = await client.post(
            "/destinations/",
            json=_payload(description_html="<p></p><script>steal()</script>"),
            headers=headers,
        )

    assert response.status_code == 422
