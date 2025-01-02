from dotenv import load_dotenv
import os

load_dotenv()

PORT = int(os.getenv('PORT'))
ENVIRONMENT = os.getenv('ENVIRONMENT')
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = os.getenv('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
MONGO_DB_DATABASE_URL = os.getenv('MONGO_DB_DATABASE_URL')
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = os.getenv('SMTP_PORT')
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
OTP_EXPIRATION_MINUTES = int(os.getenv('OTP_EXPIRATION_MINUTES'))
OTP_CODE_LENGTH = int(os.getenv('OTP_CODE_LENGTH'))

if ENVIRONMENT == 'development':
    APP_URL = f'http://localhost:{PORT}'
elif ENVIRONMENT == 'production':
    APP_URL = f'https://api.example.com'
else:
    raise ValueError(f'Invalid environment: {ENVIRONMENT}')
