from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import get_destination_collection
from models.destination import (
    DestinationCreate,
    DestinationFilters,
    DestinationPage,
)
from models.user import UserResponse
from routes.auth import CurrentUser, require_roles
from services.destination_service import (
    get_all_destinations,
    get_destination_countries,
    get_destination,
    create_destination,
    update_destination,
    delete_destination,
)


router = APIRouter(
    prefix="/destinations",
    tags=["Destinations"],
)


DestinationCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_destination_collection),
]


@router.get("/", response_model=DestinationPage)
async def fetch_destinations(
    collection: DestinationCollection,
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=100),
    search: str = Query("", max_length=100),
    country: str | None = Query(None, max_length=100),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    min_rating: float | None = Query(None, ge=0, le=5),
    max_rating: float | None = Query(None, ge=0, le=5),
    featured: bool | None = None,
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422,
            detail="min_price cannot be greater than max_price",
        )

    if min_rating is not None and max_rating is not None and min_rating > max_rating:
        raise HTTPException(
            status_code=422,
            detail="min_rating cannot be greater than max_rating",
        )

    filters = DestinationFilters(
        country=country,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        max_rating=max_rating,
        featured=featured,
    )

    return await get_all_destinations(
        collection,
        page,
        page_size,
        search,
        filters,
    )


@router.get("/countries", response_model=list[str])
async def fetch_destination_countries(
    collection: DestinationCollection,
):
    return await get_destination_countries(collection)


@router.get("/{id}")
async def fetch_destination(
    id: str,
    collection: DestinationCollection,
):
    try:
        destination = await get_destination(collection, id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination id",
        )

    if not destination:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return destination


AdminUser = Annotated[
    UserResponse,
    Depends(require_roles("admin")),
]


@router.post("/")
async def add_destination(
    destination: DestinationCreate,
    collection: DestinationCollection,
    current_user: CurrentUser,
):
    return await create_destination(
        collection,
        destination.model_dump(),
    )


@router.put("/{id}")
async def edit_destination(
    id: str,
    destination: DestinationCreate,
    collection: DestinationCollection,
    current_user: CurrentUser,
):
    try:
        updated = await update_destination(
            collection,
            id,
            destination.model_dump(),
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination id",
        )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return updated


@router.delete("/{id}")
async def remove_destination(
    id: str,
    collection: DestinationCollection,
    current_user: AdminUser,
):
    try:
        deleted = await delete_destination(
            collection,
            id,
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination id",
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return deleted
