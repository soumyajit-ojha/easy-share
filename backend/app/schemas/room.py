from pydantic import BaseModel
from typing import List, Optional


class RoomCreate(BaseModel):
    # This is what the user sends to create a room (empty for now)
    pass


class RoomJoin(BaseModel):
    # This is for your POST request requirement (Secure validation)
    pin: str


class RoomResponse(BaseModel):
    pin: str
    room_id: str
    status: str = "active"
