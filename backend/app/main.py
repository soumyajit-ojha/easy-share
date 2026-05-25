from time import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.v1 import rooms
from app.utils import get_local_ip
from app.routers.v1 import rooms, websockets

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["Rooms"])
app.include_router(websockets.router, tags=["WebSockets"])

@app.get("/")
async def read_root():
    return {"message": "Backend is running", "local_ip": get_local_ip(), "port": 8000}


@app.get("/status")
async def get_status():
    return {"status": "online", "server_time": f"{time():.2f}"}
