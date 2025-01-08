from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.not_found_handler import create_not_found_handler
from middleware.error_handler import create_error_handler
from routes import auth
from config.env_handler import PORT
from routes.db import lifespan

app = FastAPI(lifespan=lifespan)

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins= ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Middleware
create_not_found_handler(app)
create_error_handler(app)

# Routes
app.include_router(auth.router, prefix="/auth")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=PORT or 3000)
