import { create } from "zustand";

const getPersistedRoomId = () =>
  sessionStorage.getItem("WIFI_SHARE_ROOM_ID") || null;
const getPersistedDeviceId = () => {
  let id = sessionStorage.getItem("WIFI_SHARE_DEVICE_ID");
  if (!id) {
    id = `device_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("WIFI_SHARE_DEVICE_ID", id);
  }
  return id;
};

export const useAppStore = create((set, get) => ({
  roomId: getPersistedRoomId(),
  deviceId: getPersistedDeviceId(),
  activeDevices: [],
  socket: null,
  isConnected: false,
  roomState: getPersistedRoomId() ? "joined" : "idle",

  files: {},
  // transferRequests: [], // Holds file transfer proposals

  setRoomId: (roomId) => {
    if (roomId) {
      sessionStorage.setItem("WIFI_SHARE_ROOM_ID", roomId);
      set({ roomId, roomState: "joined" });
    } else {
      sessionStorage.removeItem("WIFI_SHARE_ROOM_ID");
      set({ roomId: null, roomState: "idle", files: {}, activeDevices: [] });
    }
  },
  // setRoomState: (roomState) => set({ roomState }),

  initializeWebSocket: (roomId) => {
    const { deviceId, socket: currentSocket } = get();
    if (currentSocket) {
      currentSocket.close();
    }

    // Connect using host IP address
    const backendHost =
      window.location.hostname === "localhost"
        ? "localhost:8000"
        : `${window.location.hostname}:8000`;

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${backendHost}/ws/${roomId}/${deviceId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ socket: ws, isConnected: true, roomState: "joined" });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.event) {
          case "room_state":
            set({
              activeDevices: data.active_devices || [],
              files: data.files_manifest || {},
            });
            break;
          case "device_joined":
          case "device_left":
            set({ activeDevices: data.active_devices || [] });
            break;
          // case "transfer_offer":
          //   // Add transfer offer to list
          //   set((state) => ({
          //     transferRequests: [...state.transferRequests, data.payload],
          //   }));
          //   break;
          case "manifest_updated":
            set({ files: data.files_manifest || {} });
            break;
          default:
            break;
          // case "transfer_response":
          //   // Handle response inside transfer execution flow (handled in Phase 10)
          //   break;
          // default:
          //   break;
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      set({ socket: null, isConnected: false, activeDevices: [] });
    };

    ws.onerror = () => {
      set({ isConnected: false });
    };
  },

  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
    }
    sessionStorage.removeItem("WIFI_SHARE_ROOM_ID");
    set({
      socket: null,
      isConnected: false,
      roomId: null,
      roomState: "idle",
      files: {},
    });
  },
}));
