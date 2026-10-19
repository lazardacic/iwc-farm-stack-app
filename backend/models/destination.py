from pydantic import BaseModel, Field
from typing import List, Optional


class Destination(BaseModel):
    title: str
    country: str
    description: str
    price: float = Field(..., gt=0)
    rating: float = Field(..., ge=0, le=5)
    image: str
    tags: List[str] = []
    featured: bool = False


class DestinationCreate(Destination):
    pass


class DestinationResponse(Destination):
    id: str


class DestinationFilters(BaseModel):
    country: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    featured: Optional[bool] = None


class DestinationPage(BaseModel):
    items: list[DestinationResponse]
    total: int
    page: int
    page_size: int
    pages: int
