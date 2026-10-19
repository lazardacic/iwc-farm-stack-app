import re

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional


class Destination(BaseModel):
    title: str
    country: str
    description: str
    price: float = Field(..., gt=0)
    rating: float = Field(..., ge=0, le=5)
    # Empty means "assign a placeholder" on create.
    image: str = ""
    tags: List[str] = []
    featured: bool = False

    @field_validator("image")
    @classmethod
    def image_must_be_safe(cls, value: str) -> str:
        value = value.strip()
        # Allow http(s) URLs and relative paths; reject javascript:, data: and other schemes.
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", value) and not re.match(
            r"^https?://", value
        ):
            raise ValueError("Image must be an http(s) URL or a relative path")
        return value


class DestinationCreate(Destination):
    pass


class DestinationResponse(Destination):
    id: str
    created_by: Optional[str] = None


DestinationSort = Literal[
    "oldest",
    "newest",
    "price_asc",
    "price_desc",
    "rating_desc",
    "title_asc",
]


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
