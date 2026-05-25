import qrcode
from io import BytesIO
from app.utils import get_local_ip


class QRService:
    def generate_room_qr(self, token: str):  # Accepts token now, not pin
        local_ip = get_local_ip()
        # The URL now uses /t/ (token) instead of the raw pin
        join_url = f"http://{local_ip}:5173/join/t/{token}"

        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(join_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf


qr_service = QRService()
