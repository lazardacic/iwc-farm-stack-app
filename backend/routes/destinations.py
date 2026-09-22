from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import get_destination_collection
from models.destination import DestinationCreate
from models.user import UserResponse
from routes.auth import CurrentUser, require_roles
from services.destination_service import (
    get_all_destinations,
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


@router.get("/")
async def fetch_destinations(
    collection: DestinationCollection,
):
    return await get_all_destinations(collection)


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
