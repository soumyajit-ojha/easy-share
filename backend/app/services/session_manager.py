import os
import random
import time
import asyncio
from pydantic import BaseModel
from typing import Dict, List, Optional


class SessionRoom(BaseModel):
    room_id: str
    created_at: float
    active_devices: List[str] = []
    files_manifest: Dict[str, dict] = {}


class SessionManager:
    """
    Manages temporary file sharing rooms.
    Ensures single responsibility (SRP) over session CRUD and memory safety.
    """

    def __init__(self):
        self._rooms: Dict[str, SessionRoom] = {}
        self._cleanup_tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def create_room(self) -> SessionRoom:
        """
        Generates and registers a unique 7-digit PIN room.
        """
        async with self._lock:
            # Generate a unique 7-digit room PIN that is not currently active
            while True:
                room_id = f"{random.randint(1000000, 9999999)}"
                if room_id not in self._rooms:
                    break

            new_room = SessionRoom(room_id=room_id, created_at=time.time())
            self._rooms[room_id] = new_room
            return new_room

    async def get_room(self, room_id: str) -> Optional[SessionRoom]:
        """
        Retrieves an active room by its ID.
        """
        async with self._lock:
            return self._rooms.get(room_id)

    async def add_device_to_room(self, room_id: str, device_id: str) -> bool:
        """
        Registers a unique device identity into a session.
        """
        async with self._lock:
            if room_id in self._rooms:
                room = self._rooms[room_id]
                if room_id in self._cleanup_tasks:
                    self._cleanup_tasks[room_id].cancel()
                    del self._cleanup_tasks[room_id]

                if device_id not in room.active_devices:
                    room.active_devices.append(device_id)
                return True
            return False

    async def remove_device_from_room(self, room_id: str, device_id: str) -> bool:
        """
        Removes a disconnected device from a room and cleans up resources if empty.
        """
        async with self._lock:
            if room_id in self._rooms:
                room = self._rooms[room_id]
                if device_id in room.active_devices:
                    room.active_devices.remove(device_id)

                # If there are no devices left in the room, clean up files and delete the room
                if not room.active_devices:
                    if room_id not in self._cleanup_tasks:
                        task = asyncio.create_task(
                            self._delayed_cleanup(room_id, delay_seconds=30)
                        )
                        self._cleanup_tasks[room_id] = task
                return True
            return False

    async def _delayed_cleanup(self, room_id: str, delay_seconds: int):
        """
        Deletes the room and its associated files after the grace period ends.
        """
        try:
            await asyncio.sleep(delay_seconds)
            async with self._lock:
                if room_id in self._rooms:
                    room = self._rooms[room_id]

                    # Delete the files in the room from the server's disk
                    for file_id, file_data in list(room.files_manifest.items()):
                        filepath = file_data.get("local_path")
                        try:
                            if filepath and os.path.exists(filepath):
                                os.remove(filepath)
                        except Exception as e:
                            print(f"Error removing file during cleanup: {e}")

                    # Remove the room from memory
                    del self._rooms[room_id]

                if room_id in self._cleanup_tasks:
                    del self._cleanup_tasks[room_id]

        except asyncio.CancelledError:
            # Reconnection occurred; cancel the cleanup
            pass


# Global instance provider
session_manager = SessionManager()
