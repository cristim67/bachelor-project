from config.env_handler import PORT
from context.lifespan import lifespan
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.error_handler import create_error_handler
from routes import auth, chat, project

app = FastAPI(
    lifespan=lifespan,
    title="Bachelor Project API",
    description="API for the Bachelor Project",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Cristi Miloiu",
        "url": "https://github.com/cristim67/bachelor-project",
        "email": "miloiuc4@gmail.com",
    },
    license={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware
create_error_handler(app)

# Routes
app.include_router(auth.router, prefix="/v1/auth", tags=["Auth"])
app.include_router(project.router, prefix="/v1/project", tags=["Projects"])
app.include_router(chat.router, prefix="/v1/chat", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT or 3000)
