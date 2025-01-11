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
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
FRONTEND_URL = os.getenv('FRONTEND_URL_LOCAL') if ENVIRONMENT == 'development' else os.getenv('FRONTEND_URL_PRODUCTION')
API_URL = os.getenv('API_URL_LOCAL') if ENVIRONMENT == 'development' else os.getenv('API_URL_PRODUCTION')
