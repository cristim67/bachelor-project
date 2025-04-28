import sys

from loguru import logger

log_level = "INFO"

logger.remove()
logger.add(
    sys.stdout,
    format="<level>{level}</level> | <green>{time:YYYY-MM-DD HH:mm:ss}</green> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | {message}",
    level=log_level,
    colorize=True,
)

logger.add(
    sys.stderr,
    format="<level>{level}</level> | <green>{time:YYYY-MM-DD HH:mm:ss}</green> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan>\n{message}",
    level=log_level,
    colorize=True,
    backtrace=True,
    diagnose=True,
)