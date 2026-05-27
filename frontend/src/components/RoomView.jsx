import React from "react";
import { useAppStore } from "../store/useAppStore";

export default function RoomView() {
  const { roomId, activeDevices, disconnectWebSocket } = useAppStore();

  const backendHost =
    window.location.hostname === "localhost"
      ? "localhost:8000"
      : `${window.location.hostname}:8000`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl w-full">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Active Room: {roomId}
          </h2>
          <p className="text-xs text-gray-500">
            Connected devices share files directly over your local network.
          </p>
        </div>
        <button
          onClick={disconnectWebSocket}
          className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          Disconnect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code section */}
        <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Scan QR code to join
          </p>
          <img
            src={`http://${backendHost}/api/v1/rooms/${roomId}/qrcode`}
            alt="Room Joining QR Code"
            className="w-48 h-48 rounded shadow-inner"
          />
          <span className="text-xs text-gray-400 mt-2">
            Must be on the same WiFi
          </span>
        </div>

        {/* Room information & Device listing */}
        <div className="flex flex-col">
          <h3 className="font-bold text-gray-700 mb-2">
            Connected Devices ({activeDevices.length})
          </h3>
          <div className="flex-1 bg-gray-50 p-3 rounded-xl border max-h-48 overflow-y-auto space-y-2">
            {activeDevices.length === 0 ? (
              <p className="text-sm text-gray-400">
                Waiting for other devices to connect...
              </p>
            ) : (
              activeDevices.map((dev, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2 rounded shadow-sm text-xs font-mono text-gray-700 flex items-center justify-between"
                >
                  <span>📱 {dev}</span>
                  <span className="text-green-500 font-bold">● Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
