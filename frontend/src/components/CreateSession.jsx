import React, { useState } from "react";
import axios from "axios";
import { useAppStore } from "../store/useAppStore";

export default function CreateSession() {
  const { setRoomId, initializeWebSocket } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const backendHost =
        window.location.hostname === "localhost"
          ? "localhost:8000"
          : `${window.location.hostname}:8000`;

      const response = await axios.post(`http://${backendHost}/api/v1/rooms`);
      const { room_id } = response.data;

      setRoomId(room_id);
      initializeWebSocket(room_id);
    } catch (err) {
      alert("Could not create room session. Ensure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md text-center max-w-md w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Host a Session</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Start a temporary network session to transfer files with devices on your
        local WiFi.
      </p>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Create Room Session"}
      </button>
    </div>
  );
}
