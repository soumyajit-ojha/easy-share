import io
import qrcode

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from services.session_manager import session_manager, SessionRoom
from services.network import get_local_ip_address

router = APIRouter()


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
            detail=f"Failed to instantiate session room: {str(e)}",
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
            detail="Session room not found or has expired.",
        )
    return room


@router.get("/rooms/{room_id}/qrcode")
async def generate_room_qrcode(room_id: str):
    """
    Generates a QR code image directing clients to scan and join the session.
    """
    room = await session_manager.get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session room does not exist."
        )

    # Obtain local IP and build target path pointing to React client setup on port 5173
    local_ip = get_local_ip_address()
    target_url = f"http://{local_ip}:5173/join/{room_id}"

    try:
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(target_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Stream the image back to the client
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        return StreamingResponse(img_byte_arr, media_type="image/png")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not generate QR code: {str(e)}",
        )
