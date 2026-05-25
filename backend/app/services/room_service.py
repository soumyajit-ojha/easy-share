import random
import string
import uuid
from typing import Optional
from app.schemas.room import RoomResponse


class RoomService:
    def __init__(self):
        # We use a dictionary for now.
        # To use Redis later, you only change these methods.
        self._storage = {}

    def _generate_pin(self) -> str:
        return "".join(random.choices(string.digits, k=7))

    async def create_new_room(self) -> RoomResponse:
        pin = self._generate_pin()
        room_id = str(uuid.uuid4())

        room_data = {"pin": pin, "room_id": room_id, "peers": [], "files": []}
        self._storage[pin] = room_data

        return RoomResponse(pin=pin, room_id=room_id)

    async def validate_room(self, pin: str) -> Optional[dict]:
        return self._storage.get(pin)


# Create a singleton instance
room_service = RoomService()
