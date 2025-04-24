from config.env_handler import PORT
from context.lifespan import lifespan
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from middleware.error_handler import create_error_handler
from middleware.exception_handlers import handle_validation_exception
from routes import auth, chat, project

app = FastAPI(
    lifespan=lifespan,
    title="Bachelor Project API",
    description="API for the Bachelor Project",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    contact={
        "name": "Cristi Miloiu",
        "url": "https://github.com/cristim67/bachelor-project",
        "email": "miloiuc4@gmail.com",
    },
    license={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_url="/api/openapi.json",
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return await handle_validation_exception(request, exc)


# Routes
app.include_router(auth.router, prefix="/v1/auth", tags=["Auth"])
app.include_router(project.router, prefix="/v1/project", tags=["Projects"])
app.include_router(chat.router, prefix="/v1/chat", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT or 3000)
