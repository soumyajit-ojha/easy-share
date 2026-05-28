Here is the complete **Tech Stack & Architecture Blueprint (`TECH_STACK_DOCUMENTATION.md`)**. This document is designed to act as an onboarding guide for incoming interns and junior developers, breaking down the application's design choices, workflows, and core engineering patterns.

---

# Tech Stack & Architecture Blueprint

Welcome to the **Local WiFi File Sharing Project** onboarding blueprint. This document explains the system design, architectural workflows, and technical choices of our application. Reading this guide will help you understand _why_ the application was built this way and _how_ the data flows from one device to another across a local network.

---

## Architectural Topology Diagram

The diagram below shows how devices on the same local area network (LAN) interact with our application services. Notice that all communication stays within the local network; no external cloud servers or databases are used.

```text
       +-----------------------------------------------------------------------------------------+
       |                                LOCAL WIFI/LAN NETWORK                                   |
       |                                                                                         |
       |    +----------------------+                                 +----------------------+    |
       |    |     Host PC Client   |                                 |    Receiver Client   |    |
       |    | (React + Zustand JS) |                                 | (React + Zustand JS) |    |
       |    +----------+-----------+                                 +----------+-----------+    |
       |               |           \                                            /               |
       |          HTTP |            \ WebSocket Events                         / WebSocket      |
       |        Upload |             \ (Port 8000)                            /  (Port 8000)    |
       |       (Chunks)|              v                                      v                  |
       |               |       +-------------------------------------------------+              |
       |               |       |             FASTAPI ASGI SERVER                 |              |
       |               |       |                                                 |              |
       |               |       |  +-------------------------------------------+  |              |
       |               |       |  |               API Routers                 |  |              |
       |               |       |  |  (Endpoints: Create, Verify, QR, Stream)  |  |              |
       |               |       |  +--------------------+----------------------+  |              |
       |               |       |                       |                         |              |
       |               |       |                       v                         |              |
       |               |       |  +-------------------------------------------+  |              |
       |               |       |  |             Service Layer                 |  |              |
       |               |       |  |   - SessionManager (In-Memory Rooms State) |  |              |
       |               |       |  |   - ConnectionManager (WebSocket registry) |  |              |
       |               |       |  +--------------------+----------------------+  |              |
       |               v       +-----------------------|-------------------------+              |
       |  +------------+------------+                  |                                        |
       |  |      Server Disk        |<-----------------+ (On disconnect, unlinks files)         |
       |  |  (Temp Uploads Folder)  |                                                           |
       |  +-------------------------+                                                           |
       +-----------------------------------------------------------------------------------------+
```

---

## Technical Stack Decisions & Rationale

When building lightweight, real-time applications, selecting the right tool for the job is essential. Below is a breakdown of our technical choices and their use cases.

### Backend Tech Stack

#### 1. FastAPI

- **What it is**: A modern, high-performance web framework for building APIs with Python 3.10+ based on standard Python type hints.
- **Why we use it**:
  - **Native Asynchronous Support**: Built natively on ASGI, making it efficient at handling concurrent, long-lived connections (like WebSockets and stream processing).
  - **Automatic Validation**: Uses **Pydantic** models to validate request data, preventing invalid data from entering the application.
  - **Self-Documenting**: Generates interactive API documentation on-the-fly at `/docs`. This allows frontend developers and interns to test endpoints without writing extra code.

#### 2. Uvicorn

- **What it is**: A lightning-fast, production-ready **ASGI** (Asynchronous Server Gateway Interface) web server implementation for Python.
- **Why we use it**: Standard WSGI servers (like Gunicorn or Flask's built-in runner) are synchronous and block the system thread for each request. Uvicorn uses an asynchronous event loop to handle thousands of concurrent requests—such as multiple simultaneous file uploads—over a single system process.

#### 3. aiofiles

- **What it is**: An asynchronous file utility library for Python.
- **Why we use it**: Standard Python file operations (`open()`, `read()`, `write()`) are **blocking**. When a program reads a large file from disk, the entire system thread pauses to wait for the storage hardware. `aiofiles` handles file I/O using non-blocking, asynchronous system calls, ensuring the server can continue routing WebSocket events and API requests during large file writes.

#### 4. qrcode (with Pillow)

- **What it is**: A programmatic QR code generation library.
- **Why we use it**: Generates scannable QR images directly on the backend. This enables mobile devices to join session rooms instantly on scan, without requiring manual URL entries.

---

### Frontend Tech Stack

#### 1. React.js (via Vite)

- **What it is**: A component-based user interface library paired with a modern development build tool.
- **Why we use it**:
  - **Vite** compile speeds are near-instantaneous, offering a faster developer feedback loop compared to legacy tools like Create React App.
  - **Component Reuse**: Allows us to write clean, modular UI components (like `CreateSession`, `JoinSession`, and `RoomView`) that manage their own visual state.

#### 2. Zustand

- **What it is**: A lightweight, modern state management library for React.
- **Why we use it**: Legacy tools like Redux introduce significant code boilerplate. Zustand provides a clean, hook-based store that allows different components to access shared variables (such as connection state, device lists, and active rooms) without complex setup.

#### 3. Axios

- **What it is**: A promise-based HTTP client for the browser.
- **Why we use it**: It provides built-in progress tracking via `onUploadProgress`. This makes it simple to display accurate, real-time progress bars to the user during file uploads.

#### 4. Tailwind CSS

- **What it is**: A utility-first CSS framework.
- **Why we use it**: It allows developers to build responsive, modern interfaces rapidly using utility classes (e.g., `flex items-center justify-between`) directly inside JSX files, removing the need for separate stylesheet files.

---

## Core System Workflows

This section outlines how the application handles core processes step-by-step.

### Workflow A: Session Creation and QR Code Scan

```text
Host PC (Browser)               FastAPI Server                  Mobile Client (Camera)
      |                               |                                |
      |-- 1. POST /api/v1/rooms ----->|                                |
      |   (Create Room Request)       |                                |
      |                               |-- 2. Generate 7-Digit PIN      |
      |                               |      (e.g., "4829302")         |
      |<-- 3. Return Room ID ---------|                                |
      |                               |                                |
      |-- 4. GET /rooms/PIN/qrcode -->|                                |
      |   (Fetch QR Image)            |-- 5. Auto-detect LAN IP        |
      |                               |      & encode target URL       |
      |<-- 6. Render Binary PNG ------|                                |
      |                               |                                |
      |                               |<- 7. Scans Host QR Code -------|
      |                               |   (Navigates to LAN address)   |
      |                               |                                |
```

1. The **Host Client** requests a new session room.
2. The server's `SessionManager` generates a unique 7-digit PIN and initializes an in-memory session object.
3. The **Host Client** uses this PIN to request a QR code.
4. The server programmatically discovers its host machine's local IP address (e.g., `192.168.1.15`), constructs a target URL (e.g., `http://192.168.1.15:5173/join/4829302`), and streams a scannable PNG QR code back to the host browser.
5. The **Mobile Client** scans the QR code and automatically loads the application at the correct local network address.

---

### Workflow B: Low-Memory Chunked Upload & Manifest Broadcast

To transfer large files without consuming high amounts of RAM, we stream data in small, manageable pieces.

```text
Sender Client                     FastAPI Server                    Active Peers
      |                                 |                                |
      |=== 1. POST Stream to Upload ===>|                                |
      |    (Streams in 1MB Chunks)      |                                |
      |                                 |-- 2. Async write to disk       |
      |                                 |      (using aiofiles)          |
      |                                 |                                |
      |                                 |-- 3. Update room manifest      |
      |                                 |      with file details         |
      |                                 |                                |
      |                                 |== 4. Broadcast Update =========>|
      |                                 |      (via WebSocket)           |
      |<== 5. Success Acknowledgement --|                                |
```

1. The sending client reads a file and posts it to the `/upload` endpoint, streaming it in **1MB chunks**.
2. Instead of loading the entire file into memory, FastAPI reads each chunk as it arrives and writes it to disk asynchronously using `aiofiles`.
3. Once the file is written completely, its metadata (filename, size, path, owner) is registered in the room's manifest.
4. The server broadcasts the updated manifest to all active WebSockets in the room. This triggers receiving clients to display the new file as available for download.

---

### Workflow C: Streamed Chunked Download

```text
Receiver Client                   FastAPI Server                    Server Disk
      |                                 |                                |
      |-- 1. GET /download/{file_id} -->|                                |
      |   (Download Request)            |                                |
      |                                 |-- 2. Verify file exists -------|
      |                                 |   and fetch local path         |
      |                                 |<--3. File verified ------------|
      |                                 |                                |
      |                                 |-- 4. Initialize async generator|
      |                                 |      reading 1MB disk chunks   |
      |                                 |                                |
      |<== 5. Stream binary payload ====|                                |
      |    (Receives 1MB Chunks)        |                                |
```

1. The receiver requests a file via its unique `file_id`.
2. The server looks up the file path in the room manifest and verifies that it exists in temporary storage.
3. The server runs an asynchronous generator that reads the file from disk in **1MB increments** and streams each chunk to the client over the network.
4. The receiver's browser processes the stream chunk-by-chunk, assembling the complete file directly on the target machine.

---

### Workflow D: Automated Disconnect and Disk Cleanup

```text
Peers (Browsers)                 WebSocket Manager                Session Manager
      |                                 |                                |
      |--- 1. Connections close ------->|                                |
      |    (User closes tab / leaves)   |                                |
      |                                 |-- 2. Unregister connections    |
      |                                 |                                |
      |                                 |-- 3. Query active count -------|
      |                                 |                                |
      |                                 |   [ Active Device Count == 0 ] |
      |                                 |                                |
      |                                 |-- 4. Delete room directory ----|
      |                                 |      and physical files        |
      |                                 |                                |
```

1. When users close their browser tabs or leave the page, their active WebSockets disconnect.
2. The `ConnectionManager` catches the disconnect events and updates the active device list.
3. If the active device count in a room drops to zero, the `SessionManager` deletes the room from memory and unlinks (deletes) all temporary files associated with that room from the server's disk, keeping the host system clean.

---

## Software Design Patterns Applied

To ensure our application remains clean, maintainable, and easy to scale, we use three core software design principles:

### 1. Single Responsibility Principle (SRP)

Every class and module has a single, well-defined responsibility.

- **`SessionManager`**: Responsible _only_ for the business logic of room lifecycle operations (CRUD room structures). It does not handle network transport or protocols.
- **`ConnectionManager`**: Responsible _only_ for managing WebSocket connections, broadcasts, and dispatches. It does not handle room management or database states.
- **`API Endpoints`**: Responsible _only_ for routing network requests, validating inputs, and returning responses.

### 2. Observer Pattern (via WebSockets)

The `ConnectionManager` serves as a classic Observer subject. It maintains a registry of active, listening sockets (observers) grouped by room. When an event occurs (such as a device joining or a file upload completing), the manager broadcasts the update to all active connections in that room, keeping all clients in sync.

### 3. Service Layer Pattern

We separate our HTTP routers from our core logic. Instead of writing database updates or session handling directly inside API endpoint paths, we delegate those tasks to dedicated services (`session_manager` and `connection_manager`). This separation of concerns keeps the codebase clean, readable, and easy to maintain.
