from typing import Literal

from pydantic import BaseModel, EmailStr, Field


UserRole = Literal["user", "admin"]


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole = "user"


class UserInDB(BaseModel):
    id: str | None = None
    email: EmailStr
    password_hash: str
    role: UserRole = "user"


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    role: UserRole = "user"


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
