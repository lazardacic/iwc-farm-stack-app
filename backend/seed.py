import asyncio
import random
from datetime import datetime, timedelta, timezone

from database.connection import create_mongo_client, get_database
from models.destination import MAX_FEATURED_DESTINATIONS
from services.destination_images import random_placeholder


# Seeded destinations belong to this user when it exists (run seed_users.py first),
# so the editor account has its own destinations to edit.
SEED_OWNER_EMAIL = "editor@example.com"


cities = [
    ("Tokyo", "Japan"),
    ("Paris", "France"),
    ("Bali", "Indonesia"),
    ("Rome", "Italy"),
    ("Barcelona", "Spain"),
    ("New York", "USA"),
    ("Reykjavik", "Iceland"),
    ("Bangkok", "Thailand"),
    ("Dubai", "UAE"),
    ("Cape Town", "South Africa"),
    ("Sydney", "Australia"),
    ("Prague", "Czech Republic"),
    ("Amsterdam", "Netherlands"),
    ("Lisbon", "Portugal"),
    ("Vienna", "Austria"),
    ("Budapest", "Hungary"),
    ("Athens", "Greece"),
    ("Istanbul", "Turkey"),
    ("Seoul", "South Korea"),
    ("Singapore", "Singapore"),
]


descriptions = [
    "Perfect destination for culture and food lovers.",
    "Beautiful city with incredible nightlife and attractions.",
    "Ideal place for relaxing vacations and sightseeing.",
    "Known for amazing architecture and local cuisine.",
    "Popular tourist destination with unforgettable experiences.",
    "Great mix of history, modern lifestyle, and entertainment.",
]


all_tags = [
    "city",
    "beach",
    "nature",
    "nightlife",
    "culture",
    "food",
    "luxury",
    "shopping",
    "adventure",
    "romantic",
]


mock_destinations = []


for index in range(99):
    city, country = random.choice(cities)

    destination = {
        "title": f"{city} Trip #{index + 1}",
        "country": country,
        "description": random.choice(descriptions),
        "price": random.randint(500, 5000),
        "rating": round(random.uniform(3.5, 5.0), 1),
        "image": random_placeholder(),
        "tags": random.sample(all_tags, k=random.randint(2, 4)),
        "featured": False,
    }

    mock_destinations.append(destination)


# The home page slider shows at most this many featured destinations.
now = datetime.now(timezone.utc)
for position, destination in enumerate(
    random.sample(mock_destinations, k=MAX_FEATURED_DESTINATIONS)
):
    destination["featured"] = True
    destination["featured_at"] = now - timedelta(minutes=position)


async def seed_database():
    client = create_mongo_client()
    database = get_database(client)
    collection = database["destinations"]

    try:
        owner = await database["users"].find_one({"email": SEED_OWNER_EMAIL})
        if owner:
            for destination in mock_destinations:
                destination["created_by"] = str(owner["_id"])

        await collection.delete_many({})
        await collection.insert_many(mock_destinations)

        print(f"Successfully inserted {len(mock_destinations)} destinations")
        print(
            f"Owner: {SEED_OWNER_EMAIL}"
            if owner
            else f"No owner: {SEED_OWNER_EMAIL} does not exist, run seed_users.py first"
        )
    finally:
        client.close()


asyncio.run(seed_database())
