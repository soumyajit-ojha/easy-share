import { useEffect, useRef } from "react";
import useRoomStore from "../sockets/userRoom";

export const useWebSocket = (roomId) => {
  const socket = useRef(null);
  const myClientId = useRoomStore((state) => state.myClientId);
  const addPeer = useRoomStore((state) => state.addPeer);
  const removePeer = useRoomStore((state) => state.removePeer);
  const setConnected = useRoomStore((state) => state.setConnected);

  useEffect(() => {
    if (!roomId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // CRITICAL: Ensure we use the exact room ID and client ID
    const wsUrl = `${protocol}//${host}:8000/ws/${roomId}/${myClientId}`;

    console.log("Attempting Connection to:", wsUrl);
    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      console.log("WebSocket connected as:", myClientId);
      setConnected(true);
    };

    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Incoming WebSocket Event:", data);

        if (data.event === "peer_joined") {
          console.log("New peer detected:", data.client_id);
          addPeer(data.client_id);
        } else if (data.event === "peer_left") {
          removePeer(data.client_id);
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    socket.current.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false);
    };

    return () => {
      if (socket.current) socket.current.close();
    };
  }, [roomId, myClientId, addPeer, removePeer, setConnected]);

  return socket.current;
};
