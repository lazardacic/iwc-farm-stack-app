from fastapi import APIRouter, HTTPException
from models.destination import DestinationCreate
from services.destination_service import (
    get_all_destinations,
    get_destination,
    create_destination,
    update_destination,
    delete_destination,
)

router = APIRouter(prefix="/destinations", tags=["Destinations"])


@router.get("/")
async def fetch_destinations():
    return await get_all_destinations()


@router.get("/{id}")
async def fetch_destination(id: str):
    destination = await get_destination(id)

    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    return destination


@router.post("/")
async def add_destination(destination: DestinationCreate):
    return await create_destination(destination.dict())


@router.put("/{id}")
async def edit_destination(id: str, destination: DestinationCreate):
    return await update_destination(id, destination.dict())


@router.delete("/{id}")
async def remove_destination(id: str):
    return await delete_destination(id)
