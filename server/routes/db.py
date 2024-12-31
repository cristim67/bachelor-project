from fastapi import APIRouter
from db.connection import db_connection
router = APIRouter()

@router.on_event("startup")
async def startup():
    await db_connection.initialize()

@router.on_event("shutdown")
async def shutdown():
    await db_connection.close_db()