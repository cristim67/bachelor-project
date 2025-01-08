from contextlib import asynccontextmanager
from db.connection import db_connection
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app:FastAPI):
    # Startup
    print("Starting database connection")
    await db_connection.initialize()
    yield
    # Shutdown
    print("Closing database connection")
    await db_connection.close_db()