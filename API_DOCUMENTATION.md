Here is the complete **API Reference Manual (`API_DOCUMENTATION.md`)**. This document provides detailed specifications for all HTTP endpoints, database models, and WebSocket channels.

---

# Local WiFi File Sharing - API Reference Manual

This document provides a comprehensive specification of the application's programming interfaces (APIs). It covers HTTP REST endpoints, data structures, and the real-time WebSocket protocol.

_For installation and environment configuration instructions, see the **[README.md](README.md)**._

---

## Table of Contents

1. [General Configuration](#general-configuration)
2. [HTTP REST API Reference](#http-rest-api-reference)
   - [System Health Status](#1-system-health-status)
   - [Instantiate Session Room](#2-instantiate-session-room)
   - [Verify Session Room Existence](#3-verify-session-room-existence)
   - [Fetch Room QR Code Image](#4-fetch-room-qr-code-image)
   - [Stream-Upload File to Session](#5-stream-upload-file-to-session)
   - [Stream-Download File from Session](#6-stream-download-file-from-session)
3. [WebSocket Protocol Reference](#websocket-protocol-reference)
   - [Handshake and Connection Lifecycle](#1-handshake-and-connection-lifecycle)
   - [Data Transmission Payload Protocol](#2-data-transmission-payload-protocol)
   - [Server-to-Client Event Broadcasts](#3-server-to-client-event-broadcasts)
4. [Internal Pydantic Validation Schemas](#internal-pydantic-validation-schemas)

---

## General Configuration

### Base Network Interfaces

The server binds to address `0.0.0.0` on port `8000`. This configuration exposes the API over your local network interface so other devices can access it.

| Protocol      | Path Context      | Local Development Endpoint     | Local Network Endpoint              |
| :------------ | :---------------- | :----------------------------- | :---------------------------------- |
| **HTTP**      | API Endpoint      | `http://localhost:8000/api/v1` | `http://<your-host-ip>:8000/api/v1` |
| **WebSocket** | Real-time Channel | `ws://localhost:8000/ws`       | `ws://<your-host-ip>:8000/ws`       |

---

## HTTP REST API Reference

### 1. System Health Status

Checks if the backend API service is active and responsive.

- **Method**: `GET`
- **Path**: `/api/v1/health`
- **Response Status**: `200 OK`
- **Response Payload (JSON)**:
  ```json
  {
    "status": "healthy",
    "service": "Local WiFi File Share Backend"
  }
  ```

---

### 2. Instantiate Session Room

Creates a temporary room session and generates a unique, 7-digit numeric PIN code.

- **Method**: `POST`
- **Path**: `/api/v1/rooms`
- **Response Status**: `201 Created`
- **Response Payload (JSON)**:
  ```json
  {
    "room_id": "4829302",
    "created_at": 1711200344.23,
    "active_devices": [],
    "files_manifest": {}
  }
  ```

---

### 3. Verify Session Room Existence

Checks if a given 7-digit PIN session room exists and is currently active. This is useful for validating PIN entries before attempting to connect to a WebSocket.

- **Method**: `GET`
- **Path**: `/api/v1/rooms/{room_id}`
- **Path Parameters**:
  - `room_id` (string): The 7-digit PIN of the target room.
- **Success Response Status**: `200 OK`
- **Success Response Payload (JSON)**:
  ```json
  {
    "room_id": "4829302",
    "created_at": 1711200344.23,
    "active_devices": ["device_h1j3k4a"],
    "files_manifest": {}
  }
  ```
- **Error Response Status**: `404 Not Found`
- **Error Response Payload (JSON)**:
  ```json
  {
    "detail": "Session room not found or has expired."
  }
  ```

---

### 4. Fetch Room QR Code Image

Generates a raw, scannable PNG QR code image. The QR code contains an encoded join URL pointing to the host's local IP address (e.g., `http://192.168.1.15:5173/join/4829302`).

- **Method**: `GET`
- **Path**: `/api/v1/rooms/{room_id}/qrcode`
- **Path Parameters**:
  - `room_id` (string): The 7-digit PIN of the room.
- **Success Response Status**: `200 OK`
- **Response Content-Type**: `image/png`
- **Error Response Status**: `404 Not Found`

---

### 5. Stream-Upload File to Session

Streams an uploaded file in 1MB chunks and writes it asynchronously to local disk space. This keeps RAM usage low and constant, regardless of the file size.

- **Method**: `POST`
- **Path**: `/api/v1/rooms/{room_id}/upload`
- **Content-Type**: `multipart/form-data`
- **Path Parameters**:
  - `room_id` (string): The 7-digit PIN of the active room.
- **Form-Data Parameters**:
  - `file` (UploadFile): The raw binary payload of the file.
  - `device_id` (string): The unique client string identifying the sender.
- **Success Response Status**: `200 OK`
- **Success Response Payload (JSON)**:
  ```json
  {
    "status": "success",
    "file_id": "file_4721"
  }
  ```
- **Error Response Status**: `404 Not Found` (Room missing) or `500 Internal Server Error` (Disk write failures)

---

### 6. Stream-Download File from Session

Retrieves a file from temporary storage and streams it to the receiving client in 1MB chunks.

- **Method**: `GET`
- **Path**: `/api/v1/rooms/{room_id}/download/{file_id}`
- **Path Parameters**:
  - `room_id` (string): The active 7-digit PIN room.
  - `file_id` (string): The unique identifier of the target file.
- **Success Response Status**: `200 OK`
- **Response Content-Type**: `application/octet-stream`
- **Headers Returned**:
  - `Content-Disposition`: `attachment; filename=your_file_name.mp4`
  - `Content-Length`: Size of the file in bytes.

---

## WebSocket Protocol Reference

### 1. Handshake and Connection Lifecycle

A client establishes a bidirectional real-time connection using the following WebSocket URL structure:

```text
ws://<host-ip>:8000/ws/{room_id}/{device_id}
```

- **`room_id`**: The target 7-digit PIN room.
- **`device_id`**: A unique string generated by the client to identify the device (e.g., `device_a9f1b2c`).

If the target `room_id` is invalid or expired, the server will refuse the handshake and close the connection with code `4004`.

---

### 2. Data Transmission Payload Protocol

Clients communicate through the WebSocket by sending JSON text strings with the following schema:

```json
{
  "event": "string_identifying_the_event_type",
  "payload": {
    "key_1": "value_1",
    "key_2": "value_2"
  }
}
```

---

### 3. Server-to-Client Event Broadcasts

Whenever an event occurs inside a room, the server broadcasts updates to all active connections in that room.

#### A. `device_joined`

Broadcasted when a new device connects to the room.

```json
{
  "event": "device_joined",
  "device_id": "device_a9f1b2c",
  "active_devices": ["device_host", "device_a9f1b2c"]
}
```

#### B. `device_left`

Broadcasted when a client connection is closed or lost.

```json
{
  "event": "device_left",
  "device_id": "device_a9f1b2c",
  "active_devices": ["device_host"]
}
```

#### C. `manifest_updated`

Broadcasted when a file is successfully uploaded and written to disk. This triggers all clients in the room to update their lists of available files.

```json
{
  "event": "manifest_updated",
  "files_manifest": {
    "file_4721": {
      "file_id": "file_4721",
      "filename": "vacation_video.mp4",
      "local_path": "C:\\wifi-share\\backend\\uploads\\4829302_vacation_video.mp4",
      "size": 157286400,
      "owner": "device_host"
    }
  }
}
```

---

## Internal Pydantic Validation Schemas

These represent the core Python structures used to validate data models in the system.

### `SessionRoom` Model

```python
class SessionRoom(BaseModel):
    room_id: str                      # Unique 7-digit PIN string identifier
    created_at: float                 # Epoch UNIX timestamp of room instantiation
    active_devices: List[str]         # List of device_id strings in the room
    files_manifest: Dict[str, dict]   # Map of file_id strings to file metadata dictionaries
```
