from typing import Literal

from pydantic import BaseModel, EmailStr, Field


UserRole = Literal["admin", "editor", "subscriber"]

# Roles allowed to publish (create and edit) destinations.
PUBLISHER_ROLES = ("admin", "editor")

# Accounts created before editor/subscriber existed were stored as "user".
LEGACY_ROLE_MAP = {"user": "subscriber"}


def normalize_role(role: str | None) -> str:
    if not role:
        return "subscriber"
    return LEGACY_ROLE_MAP.get(role, role)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole = "subscriber"


class UserInDB(BaseModel):
    id: str | None = None
    email: EmailStr
    password_hash: str
    role: UserRole = "subscriber"


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    role: UserRole = "subscriber"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserPage(BaseModel):
    items: list[UserPublic]
    total: int
    page: int
    page_size: int
    pages: int
