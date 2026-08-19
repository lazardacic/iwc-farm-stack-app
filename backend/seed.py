import asyncio
import random

from database.connection import create_mongo_client, get_database


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
        "image": f"https://picsum.photos/400/300?random={index + 1}",
        "tags": random.sample(all_tags, k=random.randint(2, 4)),
        "featured": random.choice([True, False]),
    }

    mock_destinations.append(destination)


async def seed_database():
    client = create_mongo_client()
    database = get_database(client)
    collection = database["destinations"]

    try:
        await collection.delete_many({})
        await collection.insert_many(mock_destinations)

        print("Successfully inserted 99 destinations")
    finally:
        client.close()


asyncio.run(seed_database())
