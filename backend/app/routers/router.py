from fastapi import APIRouter, HTTPException, status
from services.session_manager import session_manager, SessionRoom

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Local WiFi File Share Backend"
    }

@router.post("/rooms", response_model=SessionRoom, status_code=status.HTTP_201_CREATED)
async def create_session_room():
    """
    Creates a temporary room session and returns its 7-digit PIN identification.
    """
    try:
        room = await session_manager.create_room()
        return room
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to instantiate session room: {str(e)}"
        )

@router.get("/rooms/{room_id}", response_model=SessionRoom)
async def verify_session_room(room_id: str):
    """
    Verifies if a 7-digit PIN session room exists.
    """
    room = await session_manager.get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session room not found or has expired."
        )
    return room