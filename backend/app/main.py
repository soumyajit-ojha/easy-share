from time import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socket

from .routers.v1 import rooms

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Helper function to get your Local IP Address
# This is how other devices on your WiFi will find your computer
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(("10.255.255.255", 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP



app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["Rooms"])

@app.get("/")
async def read_root():
    return {"message": "Backend is running", "local_ip": get_local_ip(), "port": 8000}


@app.get("/status")
async def get_status():
    return {"status": "online", "server_time": f"{time():.2f}"}
