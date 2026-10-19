from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import get_user_collection
from models.user import UserPage, UserPublic, UserResponse, UserRoleUpdate
from routes.auth import require_roles
from services.user_service import get_users, update_user_role


admin_only = require_roles("admin")

# Every route here is admin-only; the frontend dashboard is not a security boundary.
router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(admin_only)],
)


UserCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_user_collection),
]

AdminUser = Annotated[
    UserResponse,
    Depends(admin_only),
]


@router.get("/", response_model=UserPage)
async def fetch_users(
    collection: UserCollection,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
):
    return await get_users(collection, page, page_size, search)


@router.patch("/{id}/role", response_model=UserPublic)
async def change_user_role(
    id: str,
    payload: UserRoleUpdate,
    collection: UserCollection,
    current_user: AdminUser,
):
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    try:
        updated = await update_user_role(collection, id, payload.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id",
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return updated
