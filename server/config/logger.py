import sys
import traceback

from loguru import logger

LOG_LEVEL = "INFO"

logger.remove()


def format_log(record):
    return f"{record['level']} | {record['time'].strftime('%Y-%m-%d %H:%M:%S')} | {record['name']}:{record['function']}:{record['line']} | {record['message']}"


def info_handler(message):
    print(format_log(message.record))


def error_handler(message):
    error_text = (
        f"{message.record['level']} | {message.record['time'].strftime('%Y-%m-%d %H:%M:%S')} | "
        f"{message.record['name']}:{message.record['function']}:{message.record['line']}\n"
        f"⚠️ Error: {message.record['message']}\n"
    )

    exception_data = message.record["exception"]
    if exception_data:
        if isinstance(exception_data, tuple) and len(exception_data) == 3:
            exc_type, exc_value, exc_tb = exception_data
            formatted_tb = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
            error_text += f"Stack trace:\n{formatted_tb}"
        else:
            error_text += f"Stack trace:\n{exception_data}"

    print(error_text)


logger.add(info_handler, level="INFO", filter=lambda record: record["level"].name == "INFO")
logger.add(error_handler, level="ERROR", backtrace=True, diagnose=True)

original_error = logger.error


def new_error(message, *args, **kwargs):
    exc_info = sys.exc_info()

    if exc_info[0] is not None:
        logger.opt(exception=exc_info).error(message, *args, **kwargs)
    else:
        original_error(message, *args, **kwargs)


logger.error = new_error
