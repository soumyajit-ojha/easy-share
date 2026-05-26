import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.services.connection_manager import WebSocket_manager
from app.services.room_service import room_service

router = APIRouter()


@router.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    all_rooms = room_service._rooms_by_pin.values()
    room_exists = any(r["room_id"] == room_id for r in all_rooms)

    if not room_exists:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await WebSocket_manager.connect(websocket, room_id)
    current_peers = await room_service.add_peer_to_room(room_id, client_id)
    await websocket.send_json({
        "event": "room_sync",
        "peers": current_peers
    })

    # Notify others that someone joined
    await WebSocket_manager.broadcast_to_room(
        room_id,
        {
            "event": "device_connected",
            "client_id": client_id,
            "message": f"User {client_id} joined the room",
        },
    )

    try:
        while True:
            # Wait for messages from this client
            data = await websocket.receive_text()
            message = json.loads(data)

            # For now, just echo the message back to the room
            # In Phase 10, this will handle "Accept/Decline" logic
            await WebSocket_manager.broadcast_to_room(
                room_id,
                {"event": "message_received", "sender": client_id, "data": message},
            )

    except WebSocketDisconnect:
        # 3. Handle Disconnect
        WebSocket_manager.disconnect(websocket, room_id)
        await room_service.remove_peer_from_room(room_id, client_id)
        await WebSocket_manager.broadcast_to_room(
            room_id, {"event": "peer_left", "client_id": client_id}
        )
