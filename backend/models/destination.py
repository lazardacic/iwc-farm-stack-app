from pydantic import BaseModel, Field
from typing import List, Optional


class Destination(BaseModel):
    title: str
    country: str
    description: str
    price: float
    rating: float
    image: str
    tags: List[str] = []
    featured: bool = False


class DestinationCreate(Destination):
    pass


class DestinationResponse(Destination):
    id: str
