import sys

from config.env_handler import ENVIRONMENT
from loguru import logger

LOG_LEVEL = "DEBUG" if ENVIRONMENT == "dev" else "INFO"

logger.remove()
logger.add(
    sys.stdout,
    format="<level>{level}</level> | <green>{time:YYYY-MM-DD HH:mm:ss}</green> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | {message}",
    level=LOG_LEVEL,
    colorize=True,
)

logger.add(
    sys.stderr,
    format="<level>{level}</level> | <green>{time:YYYY-MM-DD HH:mm:ss}</green> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan>\n{message}",
    level="ERROR",
    colorize=True,
    backtrace=True,
    diagnose=True,
)
