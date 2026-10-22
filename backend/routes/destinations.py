from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import (
    get_destination_collection,
    get_image_storages,
    get_upload_collection,
)
from models.destination import (
    MAX_PINNED_DESTINATIONS,
    DestinationCreate,
    DestinationFilters,
    DestinationPage,
    DestinationResponse,
    DestinationSort,
    FeaturedUpdate,
    PinnedUpdate,
)
from models.user import UserResponse
from routes.auth import OptionalUser, PublisherUser, require_roles
from services.destination_images import (
    random_placeholder,
    release_image,
    resolve_upload_public_id,
)
from services.destination_service import (
    count_pinned_destinations,
    get_all_destinations,
    get_pinned_destinations,
    set_destination_featured,
    set_destination_pinned,
    get_destination_countries,
    get_destination,
    get_destination_by_slug,
    get_destination_document,
    unique_slug,
    create_destination,
    update_destination,
    delete_destination,
)
from services.image_storage import ImageStorages


router = APIRouter(
    prefix="/destinations",
    tags=["Destinations"],
)


DestinationCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_destination_collection),
]

UploadCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_upload_collection),
]

Storages = Annotated[ImageStorages, Depends(get_image_storages)]


@router.get("/", response_model=DestinationPage)
async def fetch_destinations(
    collection: DestinationCollection,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=100),
    search: str = Query("", max_length=100),
    country: str | None = Query(None, max_length=100),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    min_rating: float | None = Query(None, ge=0, le=5),
    max_rating: float | None = Query(None, ge=0, le=5),
    featured: bool | None = None,
    sort: DestinationSort = "oldest",
    # Only the destinations the signed-in user created.
    mine: bool = False,
):
    if mine and not current_user:
        raise HTTPException(
            status_code=401,
            detail="Sign in to see your destinations",
        )

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
        created_by=current_user.id if mine else None,
    )

    return await get_all_destinations(
        collection,
        page,
        page_size,
        search,
        filters,
        sort,
    )


@router.get("/pinned", response_model=list[DestinationResponse])
async def fetch_pinned_destinations(
    collection: DestinationCollection,
):
    return await get_pinned_destinations(collection, MAX_PINNED_DESTINATIONS)


@router.get("/countries", response_model=list[str])
async def fetch_destination_countries(
    collection: DestinationCollection,
):
    return await get_destination_countries(collection)


@router.get("/by-slug/{slug}")
async def fetch_destination_by_slug(
    slug: str,
    collection: DestinationCollection,
):
    destination = await get_destination_by_slug(collection, slug)

    if not destination:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return destination


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


def can_edit_destination(user: UserResponse, destination: dict) -> bool:
    return user.role == "admin" or destination.get("created_by") == user.id


async def resolve_image(uploads, image: str, user: UserResponse) -> tuple[str, str | None]:
    """Return the image to store and its storage id; blank images get a placeholder."""
    if not image:
        return random_placeholder(), None

    try:
        return image, await resolve_upload_public_id(uploads, image, user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/")
async def add_destination(
    destination: DestinationCreate,
    collection: DestinationCollection,
    uploads: UploadCollection,
    current_user: PublisherUser,
):
    data = destination.model_dump()
    data["created_by"] = current_user.id
    # Featured and pinned are admin-only statuses, changed through their own PATCH routes.
    data["featured"] = False
    data["pinned"] = False
    data["image"], data["image_public_id"] = await resolve_image(
        uploads, data["image"], current_user
    )

    return await create_destination(collection, data)


@router.put("/{id}")
async def edit_destination(
    id: str,
    destination: DestinationCreate,
    collection: DestinationCollection,
    uploads: UploadCollection,
    storages: Storages,
    current_user: PublisherUser,
):
    try:
        existing = await get_destination_document(collection, id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination id",
        )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    if not can_edit_destination(current_user, existing):
        raise HTTPException(
            status_code=403,
            detail="You can only edit destinations you created",
        )

    data = destination.model_dump()
    # Featured is admin-only, so edits keep the stored value; pinned is never in the body.
    data["featured"] = existing.get("featured", False)

    # Like WordPress: a new title does not change the link. The slug changes only
    # when the editor edits it, or clears it to rebuild it from the title.
    requested_slug = data.pop("slug")
    if requested_slug is None:
        data["slug"] = existing.get("slug") or await unique_slug(
            collection, data["title"], existing["_id"]
        )
    else:
        data["slug"] = await unique_slug(
            collection, requested_slug or data["title"], existing["_id"]
        )
    previous_public_id = existing.get("image_public_id")

    if data["image"] and data["image"] == existing.get("image"):
        data["image_public_id"] = previous_public_id
    else:
        data["image"], data["image_public_id"] = await resolve_image(
            uploads, data["image"], current_user
        )

    try:
        updated = await update_destination(
            collection,
            id,
            data,
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="That link is already used by another destination",
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

    if previous_public_id != data["image_public_id"]:
        await release_image(storages, uploads, collection, previous_public_id)

    return updated


@router.delete("/{id}")
async def remove_destination(
    id: str,
    collection: DestinationCollection,
    uploads: UploadCollection,
    storages: Storages,
    current_user: AdminUser,
):
    try:
        existing = await get_destination_document(collection, id)
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

    await release_image(
        storages, uploads, collection, existing and existing.get("image_public_id")
    )

    return deleted


async def get_existing_or_404(collection, id: str) -> dict:
    try:
        existing = await get_destination(collection, id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid destination id",
        )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Destination not found",
        )

    return existing


@router.patch("/{id}/featured", response_model=DestinationResponse)
async def change_destination_featured(
    id: str,
    payload: FeaturedUpdate,
    collection: DestinationCollection,
    current_user: AdminUser,
):
    await get_existing_or_404(collection, id)

    return await set_destination_featured(collection, id, payload.featured)


@router.patch("/{id}/pinned", response_model=DestinationResponse)
async def change_destination_pinned(
    id: str,
    payload: PinnedUpdate,
    collection: DestinationCollection,
    current_user: AdminUser,
):
    existing = await get_existing_or_404(collection, id)

    adding = payload.pinned and not existing["pinned"]
    if adding and await count_pinned_destinations(collection) >= MAX_PINNED_DESTINATIONS:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Only {MAX_PINNED_DESTINATIONS} destinations can be pinned to the home page. "
                "Unpin one first."
            ),
        )

    return await set_destination_pinned(collection, id, payload.pinned)
