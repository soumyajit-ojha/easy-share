from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers.rooms import router

# from routers.rooms import rooms_router


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Transfer files locally over WiFi safely and quickly.",
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows our React frontend (running on another port/host) to talk to the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In a local network MVP, allow any local device to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints under the configured path prefix (e.g., /api/v1)
app.include_router(router, prefix=settings.API_V1_STR, tags=["Rooms"])


@app.get("/")
async def root_redirect():
    return {"message": "Welcome to Local WiFi File Share API. Access docs at /docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
