import time
from contextlib import asynccontextmanager

from config.logger import logger
from db.connection import db_connection
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting database connection")
    start_time = time.time()
    await db_connection.initialize()
    logger.info(f"Database connection initialized in {time.time() - start_time:.2f} seconds")
    yield
    # Shutdown
    logger.info("Closing database connection")
    await db_connection.close_db()
    logger.info("Database connection closed")
