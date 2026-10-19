from models.destination import DestinationFilters
from services.destination_service import build_destination_query


def test_build_query_without_search_or_filters():
    assert build_destination_query() == {}


def test_build_query_ignores_empty_filters():
    assert build_destination_query("  ", DestinationFilters(country=" ")) == {}


def test_build_query_combines_search_and_filters():
    query = build_destination_query(
        "japan",
        DestinationFilters(
            country="Japan",
            min_price=500,
            max_price=1500,
            min_rating=4,
            featured=False,
        ),
    )

    assert query["$or"][0] == {"title": {"$regex": "japan", "$options": "i"}}
    assert query["country"] == "Japan"
    assert query["price"] == {"$gte": 500, "$lte": 1500}
    assert query["rating"] == {"$gte": 4}
    assert query["featured"] is False
