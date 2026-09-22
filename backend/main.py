from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import create_mongo_client, get_database
from routes.auth import router as auth_router
from routes.destinations import router as destination_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    app.state.mongo_client = client
    app.state.database = get_database(client)

    yield

    client.close()


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(destination_router)


@app.get("/")
async def root():
    return {"message": "FARM Stack API running"}
