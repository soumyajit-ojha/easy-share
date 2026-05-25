from fastapi import APIRouter, HTTPException, Response
from app.schemas.room import RoomResponse, RoomJoin
from app.services.room_service import room_service
from app.services.qr_service import qr_service

router = APIRouter()


@router.post("/create", response_model=RoomResponse)
async def create_room():
    return await room_service.create_new_room()


@router.post("/join")
async def join_room_by_pin(join_data: RoomJoin):
    """Join using the 7-digit PIN (Manual entry)"""
    room = await room_service.get_room_by_pin(join_data.pin)
    if not room:
        raise HTTPException(status_code=404, detail="Invalid PIN")
    return {"status": "success", "room_id": room["room_id"]}


@router.get("/join/t/{token}")
async def join_room_by_token(token: str):
    """Join using the secure token (QR Scan)"""
    room = await room_service.get_room_by_token(token)
    if not room:
        raise HTTPException(status_code=404, detail="Invalid or Expired Token")
    return {"status": "success", "room_id": room["room_id"], "pin": "hidden"}


@router.get("/qr/{token}")
async def get_room_qr(token: str):
    """Generates QR using the secure token"""
    # Note: We check by token now to ensure the token is valid
    room = await room_service.get_room_by_token(token)
    if not room:
        raise HTTPException(status_code=404, detail="Token invalid")
    print("TOken", token)
    img_buf = qr_service.generate_room_qr(token)
    return Response(content=img_buf.getvalue(), media_type="image/png")
