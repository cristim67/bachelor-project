import httpx
from config.env_handler import GENEZIO_TOKEN
from config.logger import logger
from utils.name_generator import NameGenerator

name_generator = NameGenerator()


async def create_mongodb_uri():
    return "disabled for now"
    try:
        async with httpx.AsyncClient() as client:
            create_response = await client.post(
                "https://dev.api.genez.io/databases",
                headers={
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json",
                    "accept-version": "genezio-webapp/undefined",
                    "authorization": f"Bearer {GENEZIO_TOKEN}",
                },
                json={"name": name_generator.generate_animal_name(), "type": "mongo-atlas", "region": "eu-central-1"},
            )

            logger.info(f"Create response: {create_response.json()}")
            if create_response.status_code != 200:
                raise Exception(f"Failed to create MongoDB database: {create_response.text}")

            database_id = create_response.json()["databaseId"]

            get_response = await client.get(
                f"https://dev.api.genez.io/databases/{database_id}",
                headers={
                    "accept": "application/json, text/plain, */*",
                    "authorization": f"Bearer {GENEZIO_TOKEN}",
                    "accept-version": "genezio-webapp/undefined",
                },
            )

            logger.info(f"Get response: {get_response.json()}")
            if get_response.status_code != 200:
                raise Exception(f"Failed to get MongoDB connection URL: {get_response.text}")

            return get_response.json()["connectionUrl"]

    except httpx.HTTPError as e:
        raise Exception(f"HTTP error occurred while creating MongoDB database: {str(e)}")
    except KeyError as e:
        raise Exception(f"Missing expected field in response: {str(e)}")
    except Exception as e:
        raise Exception(f"Error creating MongoDB database: {str(e)}")


async def create_postgres_uri():
    return "disabled for now"
    try:
        async with httpx.AsyncClient() as client:
            # First create the PostgreSQL database
            create_response = await client.post(
                "https://dev.api.genez.io/databases",
                headers={
                    "accept": "application/json, text/plain, */*",
                    "content-type": "application/json",
                    "accept-version": "genezio-webapp/undefined",
                    "authorization": f"Bearer {GENEZIO_TOKEN}",
                },
                json={
                    "name": name_generator.generate_animal_name(),
                    "type": "postgres-neon",
                    "region": "aws-eu-central-1",
                },
            )

            logger.info(f"Create response: {create_response.json()}")
            if create_response.status_code != 200:
                raise Exception(f"Failed to create PostgreSQL database: {create_response.text}")

            database_id = create_response.json()["databaseId"]

            # Then get the connection URL
            get_response = await client.get(
                f"https://dev.api.genez.io/databases/{database_id}",
                headers={
                    "accept": "application/json, text/plain, */*",
                    "authorization": f"Bearer {GENEZIO_TOKEN}",
                    "accept-version": "genezio-webapp/undefined",
                },
            )

            logger.info(f"Get response: {get_response.json()}")
            if get_response.status_code != 200:
                raise Exception(f"Failed to get PostgreSQL connection URL: {get_response.text}")

            return get_response.json()["connectionUrl"]

    except httpx.HTTPError as e:
        raise Exception(f"HTTP error occurred while creating PostgreSQL database: {str(e)}")
    except KeyError as e:
        raise Exception(f"Missing expected field in response: {str(e)}")
    except Exception as e:
        raise Exception(f"Error creating PostgreSQL database: {str(e)}")
