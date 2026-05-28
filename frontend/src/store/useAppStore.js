import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  roomId: null,
  deviceId: `device_${Math.random().toString(36).substring(2, 9)}`,
  activeDevices: [],
  socket: null,
  isConnected: false,
  roomState: "idle", // 'idle' | 'creating' | 'joined'
  transferRequests: [], // Holds file transfer proposals

  setRoomId: (roomId) => set({ roomId }),
  setRoomState: (roomState) => set({ roomState }),

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
      const data = JSON.parse(event.data);

      switch (data.event) {
        case "device_joined":
        case "device_left":
          set({ activeDevices: data.active_devices || [] });
          break;
        case "transfer_offer":
          // Add transfer offer to list
          set((state) => ({
            transferRequests: [...state.transferRequests, data.payload],
          }));
          break;
        case "transfer_response":
          // Handle response inside transfer execution flow (handled in Phase 10)
          break;
        default:
          break;
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
    set({ socket: null, isConnected: false, roomId: null, roomState: "idle" });
  },
}));
