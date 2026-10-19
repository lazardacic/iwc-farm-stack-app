from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database.connection import create_mongo_client, get_database
from routes.auth import router as auth_router
from routes.destinations import router as destination_router
from routes.users import router as user_router
from services.destination_service import ensure_destination_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    app.state.mongo_client = client
    app.state.database = get_database(client)

    await ensure_destination_indexes(app.state.database["destinations"])

    yield

    client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(destination_router)
app.include_router(user_router)


@app.get("/")
async def root():
    return {"message": "FARM Stack API running"}
