import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Local WiFi File Share"
    API_V1_STR: str = "/api/v1"

    # Store temporary uploads inside the backend root folder
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure upload directory exists
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)


settings = Settings()
