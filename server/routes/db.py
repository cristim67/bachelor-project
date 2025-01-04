from fastapi import APIRouter
from db.connection import db_connection

router = APIRouter()

@router.on_event("startup")
async def startup():
    print("Starting database connection")
    await db_connection.initialize()

@router.on_event("shutdown")
async def shutdown():
    print("Closing database connection")
    await db_connection.close_db()