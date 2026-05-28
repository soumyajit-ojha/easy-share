Here is the comprehensive, production-grade `README.md` for the Local WiFi File Sharing application. This document serves as the entry point and setup guide for developers of all skill levels, including incoming interns.

---

# Local WiFi File Sharing Application

A lightweight, zero-configuration, browser-based file-sharing application designed for transferring files (including large files >500MB) directly between devices on the same local area network (LAN) or WiFi connection.

```
                  +------------------------------------------+
                  |            Local WiFi Router             |
                  +------------------------------------------+
                               /              \
                              /                \
                             v                  v
                 +-------------------+      +-------------------+
                 |   Host Computer   |      |   Mobile Device   |
                 | (React Client)    |      | (React Client)    |
                 +---------+---------+      +---------+---------+
                           |                          |
                           |   HTTP Upload (Chunks)   |
                           +------------+-------------+
                                        |
                                        v
                            +-----------------------+
                            |    FastAPI Backend    |
                            |                       |
                            |  [Temporary Storage]  |
                            +-----------------------+
```

---

## Table of Contents

1. [Core Features](#core-features)
2. [Project Directory Layout](#project-directory-layout)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Installation & Setup (Windows 11)](#step-by-step-installation--setup-windows-11)
   - [Backend Setup](#1-backend-setup)
   - [Frontend Setup](#2-frontend-setup)
5. [How to Run & Verify (Manual Test Scenarios)](#how-to-run--verify-manual-test-scenarios)
6. [Common Troubleshooting & OS Warnings](#common-troubleshooting--os-warnings)
7. [Associated Documentation Directories](#associated-documentation-directories)

---

## Core Features

- **Zero Authentication**: No logins, signups, or cloud database storage. Files and rooms exist transiently.
- **Low-Memory Streaming Architecture**: Built entirely on async chunk-based reading and writing. Large files (500MB+) transfer safely without causing system RAM spikes.
- **Real-Time Synchronization**: Instant state propagation (device joins, departures, file lists) powered by WebSockets.
- **Smart Network Discovery**: Automatically scans the active local host interface IP and generates a scannable QR code directing local mobile clients to join the session.
- **Automated Cleanup Engine**: Automatically deletes uploaded files from the server's disk space and destroys the session room from memory when all connected room sockets close.

---

## Project Directory Layout

```text
wifi-share/
├── backend/                             # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      # Application Entry point & CORS
│   │   ├── core/config.py                    # Environment & Directory Configuration
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints.py             # REST Endpoints (Upload, Download, QR)
│   │   │   └── websocket.py             # WebSocket routing & dispatch
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── connection_manager.py    # WebSocket Connection Store
│   │       ├── network.py               # Local Interface IP Discovery
│   │       └── session_manager.py       # In-Memory Session Rooms Store
│   ├── uploads/                         # Temporary Local Disk Storage Directory
│   ├── requirements.txt                 # Backend Python package lockfile
│   └── .gitignore
│   └── .venv/                           # Virtual environment directory
└── frontend/                            # React.js SPA Frontend
    ├── src/
    │   ├── components/
    │   │   ├── CreateSession.jsx        # Room creation panel
    │   │   ├── JoinSession.jsx          # Room PIN join form
    │   │   └── RoomView.jsx             # Active session room view & upload zone
    │   ├── store/
    │   │   └── useAppStore.js           # Zustand global state manager
    │   ├── App.jsx                      # Component layout router
    │   ├── index.css                    # Tailwind configurations loader
    │   └── main.jsx                     # Vite mount point
    ├── eslint.config.js
    └── vite.config.js                   # Vite configuration rules
```

---

## Prerequisites

Before beginning the installation, ensure the following are installed and running locally:

- **Operating System**: Windows 11 (also compatible with macOS and Linux)
- **Python Runtime**: Version `3.10` or higher ([Official Installer](https://www.python.org/downloads/))
- **Node.js**: Version `18` or higher ([Official Installer](https://nodejs.org/))

---

## Step-by-Step Installation & Setup (Windows 11)

### 1. Backend Setup

Open a **PowerShell** or **Command Prompt (CMD)** window on Windows 11:

```powershell
# Clone the project's backend directory
# Note: open IDE in easy-share dir.
git clone "https://github.com/soumyajit-ojha/easy-share.git"

# Navigate into the project's backend directory
cd backend

# Create a local isolated virtual environment
python -m venv .venv

# Activate the virtual environment
# Note: If PowerShell displays an execution policy error, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\.venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt

# Run the backend using the Uvicorn command-line interface
python app\main.py
```

_The backend server should now be running. You can confirm by opening `http://localhost:8000/api/v1/health` in your browser._

---

### 2. Frontend Setup

Open a **second** terminal window:

```powershell
# Navigate to the frontend directory
cd frontend

# Install node dependencies
npm install

# Start the Vite development build server, binding it to the network host interfaces
npm run dev -- --host
```

_The CLI output will display a Local URL (e.g., `http://localhost:5173`) and a Network URL (e.g., `http://192.168.1.15:5173`). Write down the Network URL._

---

## How to Run & Verify (Manual Test Scenarios)

### Scenario 1: Hosting a Session Room from your PC

1. Navigate to the local address `http://localhost:5173` on your computer.
2. Click **Create Room Session**.
3. A panel will load displaying a unique **7-Digit PIN** and a **QR Code**.

### Scenario 2: Connecting a Mobile Client

1. Ensure your mobile phone is connected to the **same WiFi network** as your PC.
2. Open the native camera application on your phone and point it at the QR Code displayed on your PC monitor.
3. Open the scanned URL. Your phone should join the room session and display its connection status in real-time. Both devices will now list each other under the "Connected Devices" index.

### Scenario 3: Uploading and Downloading a File

1. On either device, click **Choose File to Send** and select a file (e.g., an image or video).
2. The UI will display a progress indicator while uploading. Once complete, the file will be registered in the "Available Files" section.
3. Tap **Download** on the receiving device. The browser will download the file stream directly from the host.

---

## Common Troubleshooting & OS Warnings

### 1. PowerShell Script Execution Restrictions

- **Symptom**: PowerShell throws a security exception when trying to run `.\venv\Scripts\Activate.ps1`.
- **Remedy**: Open PowerShell with administrative privileges and execute:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 2. Windows Firewall Blocking Network Traffic

- **Symptom**: Your mobile phone cannot load the page, or the QR code URL times out.
- **Remedy**: Windows Defender Firewall may block traffic on port `8000` or `5173`.
  1. Open Windows Search and type **Windows Defender Firewall with Advanced Security**.
  2. Click **Inbound Rules** -> **New Rule**.
  3. Choose **Port**, specify TCP ports `8000, 5173`, and select **Allow the connection**.

### 3. Loop Teardown Failures (`WinError 10038`)

- **Symptom**: The terminal displays `OSError: [WinError 10038] An operation was attempted on something that is not a socket` on shutdown.
- **Reason**: This is caused by standard async processes clashing with the legacy `SelectorEventLoop` when closing connections.
- **Remedy**: Our application automatically switches to `WindowsProactorEventLoopPolicy` if it detects it is running on a Windows system. Starting Uvicorn with the direct terminal command `uvicorn app.main:app` ensures standard stability and prevents these system loop failures.

---

## Associated Documentation Directories

- **[Detailed API Reference Manual](API_DOCUMENTATION.md)**: Standard protocols, data structures, and WebSocket event payloads.
- **[Tech Stack & Architecture Blueprint](TECH_STACK_DOCUMENTATION.md)**: Intern guide to design patterns, class structures, data flows, and technology use cases.
