from fastapi import WebSocket
from typing import Dict, List, Set


class ConnectionManager:
    def __init__(self):
        # Dictionary mapping Room ID to a set of active WebSockets
        # { "room_uuid_123": {websocket1, websocket2}, "room_uuid_456": {...} }
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """Accepts a connection and adds it to a specific room."""
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        """Removes a connection from a room."""
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            # Cleanup: if room is empty, remove the key
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        """Sends a JSON message to everyone in a specific room."""
        if room_id in self.active_connections:
            for connection in list(self.active_connections[room_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print("Web Socket boardcast exception")
                    print(str(e))


# Singleton instance to be used across the app
WebSocket_manager = ConnectionManager()
