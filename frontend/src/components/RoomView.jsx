import React from "react";
import useRoomStore from "../sockets/userRoom";
import { useWebSocket } from "../hooks/useWebSocket";

const RoomView = () => {
  // const { roomInfo, peers, isConnected, myClientId, resetRoom } =
  //   useRoomStore();
  const peers = useRoomStore((state) => state.peers); 
  const roomInfo = useRoomStore((state) => state.roomInfo);
  const isConnected = useRoomStore((state) => state.isConnected);
  const myClientId = useRoomStore((state) => state.myClientId);
  const resetRoom = useRoomStore((state) => state.resetRoom);

  // The hook is called here, strictly within the RoomView
  useWebSocket(roomInfo.room_id);

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-between items-center">
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${isConnected ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
        >
          {isConnected ? "● LIVE" : "○ CONNECTING..."}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          ID: {myClientId}
        </span>
      </div>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
          Room PIN
        </p>
        <div className="text-5xl font-black text-blue-600 tracking-tighter">
          {roomInfo.pin || "------"}
        </div>
      </div>

      {/* Only show QR to the creator (if pin exists) */}
      {roomInfo.join_token && (
        <img
          src={`http://${window.location.hostname}:8000/api/v1/rooms/qr/${roomInfo.join_token}`}
          className="mx-auto w-40 h-40 p-2 bg-white border border-slate-100 rounded-xl shadow-sm"
          alt="Join QR"
        />
      )}

      <div className="text-left border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Connected Devices ({peers.length})
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {peers.length === 0 ? (
            <p className="text-slate-400 text-xs italic">
              Waiting for others to join...
            </p>
          ) : (
            peers.map((peer) => (
              <div
                key={peer}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-slate-700">
                    {peer}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-500">
                  Receiver
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={resetRoom}
        className="text-xs text-red-400 hover:text-red-600 transition-colors"
      >
        Leave Session
      </button>
    </div>
  );
};

export default RoomView;
