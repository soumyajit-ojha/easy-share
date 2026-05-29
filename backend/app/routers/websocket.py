import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.connection_manager import connection_manager
from services.session_manager import session_manager

websocket_router = APIRouter()


@websocket_router.websocket("/ws/{room_id}/{device_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, device_id: str):
    room = await session_manager.get_room(room_id)
    if not room:
        await websocket.close(code=4004)
        return

    await connection_manager.connect(websocket, room_id)
    await session_manager.add_device_to_room(room_id, device_id)

    # Send the current room state immediately to the connecting device
    await websocket.send_text(
        json.dumps(
            {
                "event": "room_state",
                "active_devices": room.active_devices,
                "files_manifest": room.files_manifest,
            }
        )
    )

    # Notify others that a new device joined
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
            data = await websocket.receive_text()
            message = json.loads(data)
            event_type = message.get("event")

            # Relay signaling and transfer control events directly to the target device
            direct_relay_events = [
                "webrtc_offer",
                "webrtc_answer",
                "webrtc_ice_candidate",
                "transfer_request",
                "transfer_response",
            ]

            if event_type in direct_relay_events:
                target_device = message.get("target")
                await connection_manager.broadcast_to_room(
                    room_id,
                    {
                        "event": event_type,
                        "sender": device_id,
                        "target": target_device,
                        "payload": message.get("payload"),
                    },
                )
            else:
                # Standard fallback broadcast
                await connection_manager.broadcast_to_room(
                    room_id,
                    {
                        "event": event_type,
                        "sender": device_id,
                        "payload": message.get("payload"),
                    },
                )

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, room_id)
        await session_manager.remove_device_from_room(room_id, device_id)

        room_check = await session_manager.get_room(room_id)
        if room_check:
            await connection_manager.broadcast_to_room(
                room_id,
                {
                    "event": "device_left",
                    "device_id": device_id,
                    "active_devices": room_check.active_devices,
                },
            )
