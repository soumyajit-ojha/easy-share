import io
import os
import qrcode
import random
import aiofiles

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from services.session_manager import session_manager, SessionRoom
from services.connection_manager import connection_manager
from services.network import get_local_ip_address
from core.config import settings

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


# # Update your endpoints.py file to include this endpoint
# @router.post("/rooms/{room_id}/upload")
# async def upload_file_stream(
#     room_id: str, file: UploadFile = File(...), device_id: str = Form(...)
# ):
#     """
#     Handles chunked file uploads and saves them directly to disk.
#     Ensures safe memory usage, even with files larger than 500MB.
#     """
#     try:
#         room = await session_manager.get_room(room_id)
#         if not room:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND, detail="Session room not found."
#             )

#         # Clean file name and define safe local target path
#         safe_filename = os.path.basename(file.filename)
#         # Prefixing with room_id avoids collisions between different rooms
#         unique_filename = f"{room_id}_{safe_filename}"
#         target_filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)
#     except Exception as e:
#         print("Exception while upload")
#         print(str(e))
#     try:
#         # Open local target file for writing binary chunks asynchronously
#         async with aiofiles.open(target_filepath, "wb") as out_file:
#             # Stream the upload in 1MB chunks (1024 * 1024 bytes)
#             while chunk := await file.read(1024 * 1024):
#                 await out_file.write(chunk)

#         # Register file inside room manifest
#         file_id = f"file_{random.randint(1000, 9999)}"
#         room.files_manifest[file_id] = {
#             "file_id": file_id,
#             "filename": safe_filename,
#             "local_path": target_filepath,
#             "size": os.path.getsize(target_filepath),
#             "owner": device_id,
#         }

#         # Broadcast update to the room so other devices can download it
        

#         await connection_manager.broadcast_to_room(
#             room_id,
#             {"event": "manifest_updated", "files_manifest": room.files_manifest},
#         )

#         return {"status": "success", "file_id": file_id}

#     except Exception as e:
#         # Clean up partial files if upload fails
#         if os.path.exists(target_filepath):
#             os.remove(target_filepath)
#         print("Exception while upload")
#         print(str(e))
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to stream and write file: {str(e)}",
#         )


# @router.get("/rooms/{room_id}/download/{file_id}")
# async def download_file_stream(room_id: str, file_id: str):
#     """
#     Streams requested files to receivers in 1MB chunks to minimize memory usage.
#     """
#     room = await session_manager.get_room(room_id)
#     if not room or file_id not in room.files_manifest:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="File requested does not exist or has expired.",
#         )

#     file_meta = room.files_manifest[file_id]
#     filepath = file_meta["local_path"]

#     if not os.path.exists(filepath):
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="File payload missing from temporary server disk.",
#         )

#     # File reader generator that streams chunks asynchronously
#     async def file_chunk_generator():
#         async with aiofiles.open(filepath, mode="rb") as f:
#             while chunk := await f.read(1024 * 1024):  # Stream in 1MB chunks
#                 yield chunk

#     # Return StreamingResponse with headers that trigger a file download in the browser
#     return StreamingResponse(
#         file_chunk_generator(),
#         media_type="application/octet-stream",
#         headers={
#             "Content-Disposition": f"attachment; filename={file_meta['filename']}",
#             "Content-Length": str(file_meta["size"]),
#         },
#     )
