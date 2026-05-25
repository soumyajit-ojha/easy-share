import random
import string
import uuid
import hashlib
from typing import Optional
from app.schemas.room import RoomResponse


class RoomService:
    def __init__(self):
        # We use a dictionary for now.
        # To use Redis later, you only change these methods.
        self._rooms_by_pin = {}
        self._rooms_by_token = {}

    def _generate_pin(self) -> str:
        return "".join(random.choices(string.digits, k=7))

    def _generate_secure_token(self, pin: str) -> str:
        """Creates an 'encrypted-looking' token that hides the PIN."""
        # We combine the PIN with a random UUID to ensure it's unique and unguessable
        salt = uuid.uuid4().hex
        return hashlib.sha256(f"{pin}{salt}".encode()).hexdigest()[:16]

    def _generate_pin(self) -> str:
        return "".join(random.choices(string.digits, k=7))

    async def create_new_room(self) -> RoomResponse:
        pin = self._generate_pin()
        room_id = str(uuid.uuid4())
        join_token = self._generate_secure_token(pin)

        room_data = {
            "pin": pin,
            "room_id": room_id,
            "join_token": join_token,
            "peers": [],
            "files": [],
        }
        self._rooms_by_pin[pin] = room_data
        self._rooms_by_token[join_token] = room_data

        return RoomResponse(pin=pin, room_id=room_id, join_token=join_token)

    async def get_room_by_pin(self, pin: str) -> Optional[dict]:
        return self._rooms_by_pin.get(pin)

    async def get_room_by_token(self, token: str) -> Optional[dict]:
        """Finds a room via the secure token (QR scan)"""
        return self._rooms_by_token.get(token)


# Create a singleton instance
room_service = RoomService()
