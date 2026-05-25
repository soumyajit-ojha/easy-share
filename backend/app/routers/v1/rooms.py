from fastapi import APIRouter, HTTPException, status
from app.schemas.room import RoomResponse, RoomJoin
from app.services.room_service import room_service

router = APIRouter()


@router.post("/create", response_model=RoomResponse)
async def create_room():
    """Create a new session"""
    return await room_service.create_new_room()


@router.post("/join")
async def join_room(join_data: RoomJoin):
    """Securely validate and join a room via POST"""
    room = await room_service.validate_room(join_data.pin)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid PIN")
    return {"status": "success", "room_id": room["room_id"]}

