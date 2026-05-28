import React, { useState } from "react";
import axios from "axios";
import { useAppStore } from "../store/useAppStore";

export default function RoomView() {
  const { roomId, activeDevices, deviceId, disconnectWebSocket } =
    useAppStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState({});

  const backendHost =
    window.location.hostname === "localhost"
      ? "localhost:8000"
      : `${window.location.hostname}:8000`;

  // Listen for file changes inside state store using custom event handler
  React.useEffect(() => {
    const handleWebSocketMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "manifest_updated") {
          setFiles(data.files_manifest);
        }
      } catch (err) {}
    };

    const store = useAppStore.getState();
    if (store.socket) {
      store.socket.addEventListener("message", handleWebSocketMessage);
    }

    return () => {
      if (store.socket) {
        store.socket.removeEventListener("message", handleWebSocketMessage);
      }
    };
  }, [roomId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("device_id", deviceId);

    setUploading(true);
    setProgress(0);

    try {
      await axios.post(
        `http://${backendHost}/api/v1/rooms/${roomId}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setProgress(percentage);
          },
        },
      );
      alert("File uploaded successfully.");
    } catch (err) {
      console.log(err)
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl w-full">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Active Room: {roomId}
          </h2>
          <p className="text-xs text-gray-500 font-mono">Your ID: {deviceId}</p>
        </div>
        <button
          onClick={disconnectWebSocket}
          className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          Disconnect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* QR Code section */}
        <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Scan QR code to join
          </p>
          <img
            src={`http://${backendHost}/api/v1/rooms/${roomId}/qrcode`}
            alt="Room Joining QR Code"
            className="w-40 h-40 rounded shadow-sm"
          />
          <span className="text-xs text-gray-400 mt-2">
            Must be on same WiFi
          </span>
        </div>

        {/* Upload & Device listing */}
        <div className="flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">
              Connected Devices ({activeDevices.length})
            </h3>
            <div className="bg-gray-50 p-3 rounded-xl border max-h-32 overflow-y-auto space-y-2">
              {activeDevices.map((dev, idx) => (
                <div
                  key={idx}
                  className="bg-white p-1.5 rounded shadow-xs text-xs font-mono text-gray-700"
                >
                  {dev === deviceId ? "💻 You" : `📱 ${dev}`}
                </div>
              ))}
            </div>
          </div>

          {/* Upload Widget */}
          <div className="p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-xs transition"
            >
              {uploading ? "Uploading..." : "Choose File to Send"}
            </label>
            {uploading && (
              <div className="w-full mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-1">
                  {progress}% uploaded
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Files Directory */}
      <div className="border-t pt-4">
        <h3 className="font-bold text-gray-700 mb-3">Available Files</h3>
        <div className="space-y-3">
          {Object.keys(files).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No files shared in this room yet.
            </p>
          ) : (
            Object.values(files).map((f) => (
              <div
                key={f.file_id}
                className="bg-gray-50 p-3 rounded-xl border flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {f.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(f.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                {f.owner !== deviceId && (
                  <a
                    href={`http://${backendHost}/api/v1/rooms/${roomId}/download/${f.file_id}`}
                    download
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                  >
                    Download
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
