import re

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Literal, Optional

from utils.rich_text import (
    MAX_DESCRIPTION_HTML_LENGTH,
    html_to_text,
    sanitize_html,
    text_to_html,
)


class Destination(BaseModel):
    title: str
    country: str
    # Plain text, used for cards and excerpts. When description_html is sent,
    # the server derives this from it, so the two always match.
    description: str = ""
    # Rich text from the editor, sanitized on the server (see utils/rich_text.py).
    description_html: str = Field("", max_length=MAX_DESCRIPTION_HTML_LENGTH)
    price: float = Field(..., gt=0)
    rating: float = Field(..., ge=0, le=5)
    # Empty means "assign a placeholder" on create.
    image: str = ""
    tags: List[str] = []
    featured: bool = False
    # URL segment such as "belgrade-at-sunset". On create it comes from the title.
    # On update: not sent keeps the current slug, "" rebuilds it from the title,
    # any other value is normalized and made unique.
    slug: Optional[str] = Field(None, max_length=200)

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
    @model_validator(mode="after")
    def build_descriptions(self):
        # HTML wins when both are sent; a client that sends only plain text
        # (older clients, the seed, API users) gets paragraphs made for it.
        if self.description_html.strip():
            self.description_html = sanitize_html(self.description_html)
            self.description = html_to_text(self.description_html)
        else:
            self.description = self.description.strip()
            self.description_html = text_to_html(self.description)

        if not self.description:
            raise ValueError("Description is required")
        return self


class DestinationResponse(Destination):
    id: str
    slug: str = ""
    created_by: Optional[str] = None
    # Shown in the home page slider; independent of "featured".
    pinned: bool = False


DestinationSort = Literal[
    "oldest",
    "newest",
    "price_asc",
    "price_desc",
    "rating_desc",
    "title_asc",
]


# How many destinations the home page slider shows; admins cannot pin more.
MAX_PINNED_DESTINATIONS = 5


class FeaturedUpdate(BaseModel):
    featured: bool


class PinnedUpdate(BaseModel):
    pinned: bool


class DestinationFilters(BaseModel):
    country: Optional[str] = None
    created_by: Optional[str] = None
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
