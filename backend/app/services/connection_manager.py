import json

from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    """
    Manages active WebSocket connections by room.
    Ensures single responsibility for real-time delivery.
    """

    def __init__(self):
        # Maps room_id -> list of active WebSocket connections
        self._active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """
        Accepts and registers an incoming WebSocket connection.
        """
        await websocket.accept()
        if room_id not in self._active_connections:
            self._active_connections[room_id] = []
        self._active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        """
        Cleans up stale connections when a client leaves.
        """
        if room_id in self._active_connections:
            if websocket in self._active_connections[room_id]:
                self._active_connections[room_id].remove(websocket)
            # Clean up empty room listings
            if not self._active_connections[room_id]:
                del self._active_connections[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        """
        Broadcasts a JSON message payload to all active connections in a room.
        """
        if room_id in self._active_connections:
            payload = json.dumps(message)
            for connection in self._active_connections[room_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    # Connection is dead; skip it. Cleanup will handle it on disconnect.
                    pass


connection_manager = ConnectionManager()
