import React, { useState, useEffect } from "react";
import useRoomStore from "./sockets/userRoom";
import client from "./api/client";
import RoomView from "./components/RoomView";

function App() {
  const { roomInfo, setRoomInfo } = useRoomStore();
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);

  // AUTO-JOIN LOGIC (For QR Scanning)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/join/t/")) {
      const token = path.split("/join/t/")[1];
      autoJoinByToken(token);
    }
  }, []);

  const autoJoinByToken = async (token) => {
    setLoading(true);
    try {
      const res = await client.get(`/rooms/join/t/${token}`);
      setRoomInfo({
        room_id: res.data.room_id,
        pin: "QR JOINED",
        join_token: token,
      });
    } catch (err) {
      alert("Invalid or Expired QR Link");
      window.history.replaceState({}, "", "/");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res = await client.post("/rooms/create");
      setRoomInfo(res.data);
    } catch (err) {
      alert("Server Offline");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByPin = async () => {
    if (pinInput.length !== 7) return alert("Enter 7-digit PIN");
    setLoading(true);
    try {
      const res = await client.post("/rooms/join", { pin: pinInput });
      setRoomInfo({ room_id: res.data.room_id, pin: pinInput });
    } catch (err) {
      alert("Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] p-8 border border-slate-100">
        {!roomInfo.room_id ? (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                WiFi Share
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                No internet needed. Just WiFi.
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create New Session"}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-300 text-xs font-bold uppercase">
                or join by pin
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="0000000"
                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none rounded-2xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] transition-all"
                maxLength={7}
              />
              <button
                onClick={handleJoinByPin}
                disabled={loading}
                className="w-full text-blue-600 font-bold py-2 hover:text-blue-800 transition-colors"
              >
                Join Now
              </button>
            </div>
          </div>
        ) : (
          <RoomView />
        )}
      </main>
    </div>
  );
}

export default App;
