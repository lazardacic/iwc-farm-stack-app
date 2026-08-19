from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import get_destination_collection
from models.destination import DestinationCreate
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
    destination = await get_destination(collection, id)

    if not destination:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return destination


@router.post("/")
async def add_destination(
    destination: DestinationCreate,
    collection: DestinationCollection,
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
):
    return await update_destination(
        collection,
        id,
        destination.model_dump(),
    )


@router.delete("/{id}")
async def remove_destination(
    id: str,
    collection: DestinationCollection,
):
    return await delete_destination(
        collection,
        id,
    )
