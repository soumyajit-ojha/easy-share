import React, { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import CreateSession from "./components/CreateSession";
import JoinSession from "./components/JoinSession";
import RoomView from "./components/RoomView";

function App() {
  const { roomState, roomId, initializeWebSocket, setRoomId } = useAppStore();

  // If scanning a QR code, handle route parameters: /join/:room_id
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/join/")) {
      const pin = path.split("/")[2];
      if (pin && pin.length === 7) {
        setRoomId(pin);
        initializeWebSocket(pin);
        return;
      }
    }
    if (roomId) {
      initializeWebSocket(roomId);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-2">
          WiFi File Share
        </h1>
        <p className="text-gray-500 max-w-md">
          Transfer images, videos, audio, and large files directly over your
          local WiFi without logging in.
        </p>
      </header>

      <main className="w-full flex justify-center">
        {roomState === "idle" ? (
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch">
            <CreateSession />
            <JoinSession />
          </div>
        ) : (
          <RoomView />
        )}
      </main>

      <footer className="mt-12 text-center text-xs text-gray-400">
        All transfers are local and never touch external internet servers.
      </footer>
    </div>
  );
}

export default App;
