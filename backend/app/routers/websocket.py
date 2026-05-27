import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.connection_manager import connection_manager
from services.session_manager import session_manager

websocket_router = APIRouter()


@websocket_router.websocket("/ws/{room_id}/{device_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, device_id: str):
    """
    WebSocket endpoint that handles real-time messaging between users in a room.
    """
    # Verify room exists before accepting connection
    room = await session_manager.get_room(room_id)
    if not room:
        await websocket.close(code=4004)  # Not Found
        return

    await connection_manager.connect(websocket, room_id)
    await session_manager.add_device_to_room(room_id, device_id)

    # Broadcast to the room that a new user has joined
    await connection_manager.broadcast_to_room(
        room_id,
        {
            "event": "device_joined",
            "device_id": device_id,
            "active_devices": room.active_devices,
        },
    )

    try:
        while True:
            # Keep the connection open and listen for incoming messages from the client
            data = await websocket.receive_text()
            message = json.loads(data)

            # Forward messages to everyone in the room
            await connection_manager.broadcast_to_room(
                room_id,
                {
                    "event": message.get("event"),
                    "sender": device_id,
                    "payload": message.get("payload"),
                },
            )

    except WebSocketDisconnect:
        # Handle disconnect cleanups
        connection_manager.disconnect(websocket, room_id)
        await session_manager.remove_device_from_room(room_id, device_id)

        # Notify remaining devices in the room
        await connection_manager.broadcast_to_room(
            room_id,
            {
                "event": "device_left",
                "device_id": device_id,
                "active_devices": room.active_devices if room else [],
            },
        )
