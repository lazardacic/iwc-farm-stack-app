import pytest
from pydantic import ValidationError

from models.destination import Destination, DestinationCreate, DestinationResponse


def test_destination_create_valid():
    destination = DestinationCreate(
        title="Paris",
        country="France",
        description="A beautiful city",
        price=500,
        rating=4.8,
        image="paris.jpg",
        tags=["Europe", "City"],
        featured=True,
    )

    assert destination.title == "Paris"
    assert destination.country == "France"
    assert destination.description == "A beautiful city"
    assert destination.price == 500
    assert destination.rating == 4.8
    assert destination.image == "paris.jpg"
    assert destination.tags == ["Europe", "City"]
    assert destination.featured is True


def test_destination_defaults():
    destination = DestinationCreate(
        title="Paris",
        country="France",
        description="A beautiful city",
        price=500,
        rating=4.8,
        image="paris.jpg",
    )

    assert destination.tags == []
    assert destination.featured is False


def test_destination_response_valid():
    destination = DestinationResponse(
        id="123",
        title="Paris",
        country="France",
        description="A beautiful city",
        price=500,
        rating=4.8,
        image="paris.jpg",
    )

    assert destination.id == "123"
    assert destination.title == "Paris"


def test_destination_create_missing_required_field():
    with pytest.raises(ValidationError):
        DestinationCreate(
            country="France",
            description="A beautiful city",
            price=500,
            rating=4.8,
            image="paris.jpg",
        )


def test_destination_create_invalid_price():
    with pytest.raises(ValidationError):
        DestinationCreate(
            title="Paris",
            country="France",
            description="A beautiful city",
            price="not-a-number",
            rating=4.8,
            image="paris.jpg",
        )


def test_destination_create_invalid_rating():
    with pytest.raises(ValidationError):
        DestinationCreate(
            title="Paris",
            country="France",
            description="A beautiful city",
            price=500,
            rating="not-a-number",
            image="paris.jpg",
        )


def test_destination_create_invalid_tags():
    with pytest.raises(ValidationError):
        DestinationCreate(
            title="Paris",
            country="France",
            description="A beautiful city",
            price=500,
            rating=4.8,
            image="paris.jpg",
            tags=["Europe", 123],
        )
