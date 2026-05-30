import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export default function RoomView() {
  const {
    roomId,
    activeDevices,
    deviceId,
    disconnectWebSocket,
    sendSignalingMessage,
    registerWebRTCCallbacks,
  } = useAppStore();

  const [progress, setProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState("idle"); // 'idle' | 'proposal_pending' | 'sending' | 'receiving'
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileSize, setCurrentFileSize] = useState(0);

  // Proposal modal visibility states
  const [showIncomingRequestModal, setShowIncomingRequestModal] =
    useState(false);
  const [incomingRequestDetails, setIncomingRequestDetails] = useState(null); // { sender, name, size }

  // Connection and Channel References
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const fileToTransmitRef = useRef(null);
  const targetPeerRef = useRef(null);

  // Synchronization References (Prevents WebRTC state race conditions)
  const isRemoteDescriptionSetRef = useRef(false);
  const iceCandidatesQueueRef = useRef([]);

  // Receiving buffer references
  const receivedChunksRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const incomingFileMetaRef = useRef(null);

  // Configuration for ICE candidate exchange
  const iceConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    // Register the WebRTC signaling and consent callbacks
    registerWebRTCCallbacks(
      handleIncomingOffer,
      handleIncomingAnswer,
      handleIncomingIceCandidate,
      handleIncomingTransferRequest,
      handleIncomingTransferResponse,
    );

    return () => {
      cleanupPeerConnection();
    };
  }, []);

  const cleanupPeerConnection = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    fileToTransmitRef.current = null;
    targetPeerRef.current = null;
    isRemoteDescriptionSetRef.current = false;
    iceCandidatesQueueRef.current = [];
    receivedChunksRef.current = [];
    receivedSizeRef.current = 0;
    incomingFileMetaRef.current = null;
    setTransferStatus("idle");
    setProgress(0);
  };

  // --- STAGE 1: PROPOSAL HANDLING ---
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const targetPeer = activeDevices.find((id) => id !== deviceId);
    if (!targetPeer) {
      alert("No other receivers connected to this room yet.");
      return;
    }

    fileToTransmitRef.current = file;
    targetPeerRef.current = targetPeer;

    setTransferStatus("proposal_pending");
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);

    // Propose the file transfer to the receiver
    sendSignalingMessage("transfer_request", targetPeer, {
      name: file.name,
      size: file.size,
    });
  };

  function handleIncomingTransferRequest(senderId, payload) {
    setIncomingRequestDetails({
      sender: senderId,
      name: payload.name,
      size: payload.size,
    });
    setShowIncomingRequestModal(true);
  }

  const handleAcceptRequest = () => {
    if (!incomingRequestDetails) return;
    setShowIncomingRequestModal(false);
    setTransferStatus("receiving");
    setProgress(0);
    setCurrentFileName(incomingRequestDetails.name);

    sendSignalingMessage("transfer_response", incomingRequestDetails.sender, {
      approved: true,
    });
  };

  const handleDeclineRequest = () => {
    if (!incomingRequestDetails) return;
    setShowIncomingRequestModal(false);

    sendSignalingMessage("transfer_response", incomingRequestDetails.sender, {
      approved: false,
    });
    cleanupPeerConnection();
  };

  function handleIncomingTransferResponse(senderId, payload) {
    if (payload.approved) {
      initiateSenderPeerConnection();
    } else {
      alert("The receiver declined your file transfer request.");
      cleanupPeerConnection();
    }
  }

  // --- STAGE 2: WEBRTC FILE TRANSFER ---
  const initiateSenderPeerConnection = async () => {
    const file = fileToTransmitRef.current;
    const targetDevice = targetPeerRef.current;
    if (!file || !targetDevice) return;

    setTransferStatus("sending");
    setProgress(0);

    const pc = new RTCPeerConnection(iceConfiguration);
    peerConnectionRef.current = pc;
    isRemoteDescriptionSetRef.current = false;
    iceCandidatesQueueRef.current = [];

    const dc = pc.createDataChannel("file-transfer", { ordered: true });
    dataChannelRef.current = dc;

    dc.onopen = () => {
      dc.send(
        JSON.stringify({
          type: "meta",
          name: file.name,
          size: file.size,
        }),
      );
      transmitFileChunks(file, dc);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage(
          "webrtc_ice_candidate",
          targetDevice,
          event.candidate,
        );
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignalingMessage("webrtc_offer", targetDevice, offer);
  };

  const transmitFileChunks = async (file, dataChannel) => {
    // High-performance network pipelining constants
    const chunkSize = 262144; // 256KB Chunks (minimizes packet processing overhead)
    const maxBufferLimit = 4194304; // 4MB Outbound Queue Ceiling (Saturates modern routers)
    const lowBufferThreshold = 2097152; // 2MB Low Watermark Queue Trigger

    dataChannel.bufferedAmountLowThreshold = lowBufferThreshold;
    let offset = 0;

    // Fast asynchronous chunk transmission loop
    while (offset < file.size) {
      // Backpressure Check: If our unsent queue is full (above 4MB),
      // pause the transmission loop and wait for the buffer to drain below 2MB.
      if (dataChannel.bufferedAmount > maxBufferLimit) {
        await new Promise((resolve) => {
          dataChannel.onbufferedamountlow = () => {
            dataChannel.onbufferedamountlow = null; // Unbind immediately
            resolve();
          };
        });
      }

      try {
        const slice = file.slice(offset, offset + chunkSize);

        // Native Blob.arrayBuffer() processes file reads in native C++,
        // bypassing slow JavaScript FileReader threads.
        const chunkData = await slice.arrayBuffer();

        dataChannel.send(chunkData);
        offset += chunkData.byteLength;

        // Optimization: Update progress state only once per 1MB to prevent
        // heavy React UI renders from throttling transmission speeds.
        if (offset % 1048576 === 0 || offset >= file.size) {
          setProgress(Math.round((offset / file.size) * 100));
        }
      } catch (err) {
        console.error("P2P chunk transmission exception:", err);
        cleanupPeerConnection();
        return;
      }
    }

    // Notify receiver that the transfer is complete
    dataChannel.send(JSON.stringify({ type: "done" }));
    setProgress(100);
    setTimeout(() => {
      alert("File transfer completed successfully!");
      cleanupPeerConnection();
    }, 1000);
  };

  // --- WEBRTC SIGNALLING HANDSHAKE & QUEUE SYSTEM ---
  async function handleIncomingOffer(senderId, offer) {
    cleanupPeerConnection();
    setTransferStatus("receiving");
    setProgress(0);

    const pc = new RTCPeerConnection(iceConfiguration);
    peerConnectionRef.current = pc;
    isRemoteDescriptionSetRef.current = false;
    iceCandidatesQueueRef.current = [];

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dataChannelRef.current = dc;
      setupReceiverDataChannelEvents(dc);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage("webrtc_ice_candidate", senderId, event.candidate);
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      isRemoteDescriptionSetRef.current = true;

      // Drain any queued candidates that arrived before setRemoteDescription finished
      for (const candidate of iceCandidatesQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesQueueRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignalingMessage("webrtc_answer", senderId, answer);
    } catch (err) {
      console.error("WebRTC offer setup exception:", err);
      cleanupPeerConnection();
    }
  }

  async function handleIncomingAnswer(senderId, answer) {
    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        isRemoteDescriptionSetRef.current = true;

        // Drain any queued candidates
        for (const candidate of iceCandidatesQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidatesQueueRef.current = [];
      } catch (err) {
        console.error("WebRTC set remote description exception:", err);
        cleanupPeerConnection();
      }
    }
  }

  async function handleIncomingIceCandidate(senderId, candidate) {
    const pc = peerConnectionRef.current;
    if (pc) {
      // If our remote description isn't set yet, queue the candidate to prevent connection loss
      if (!isRemoteDescriptionSetRef.current) {
        iceCandidatesQueueRef.current.push(candidate);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("WebRTC add ice candidate exception:", err);
        }
      }
    }
  }

  const setupReceiverDataChannelEvents = (dataChannel) => {
    receivedChunksRef.current = [];
    receivedSizeRef.current = 0;
    dataChannel.binaryType = "arraybuffer";

    dataChannel.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "meta") {
          incomingFileMetaRef.current = msg;
          setCurrentFileName(msg.name);
        } else if (msg.type === "done") {
          triggerFileReconstructionAndDownload();
        }
      } else {
        // Collect incoming binary chunks in memory
        receivedChunksRef.current.push(event.data);
        receivedSizeRef.current += event.data.byteLength;

        if (incomingFileMetaRef.current) {
          const totalSize = incomingFileMetaRef.current.size;
          // Progress update throttling for the receiver
          if (
            receivedSizeRef.current % 1048576 === 0 ||
            receivedSizeRef.current >= totalSize
          ) {
            setProgress(
              Math.round((receivedSizeRef.current / totalSize) * 100),
            );
          }
        }
      }
    };
  };

  const triggerFileReconstructionAndDownload = () => {
    const meta = incomingFileMetaRef.current;
    if (!meta) return;

    // Convert accumulated array buffers back into a downloadable file
    const fileBlob = new Blob(receivedChunksRef.current);
    const downloadUrl = URL.createObjectURL(fileBlob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = meta.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Free up browser memory immediately
    URL.revokeObjectURL(downloadUrl);
    cleanupPeerConnection();
    alert(`Successfully received ${meta.name}!`);
  };

  const backendHost =
    window.location.hostname === "localhost"
      ? "localhost:8000"
      : `${window.location.hostname}:8000`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl w-full relative">
      {/* --- POP-UP CONSENT MODAL --- */}
      {showIncomingRequestModal && incomingRequestDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border text-center animate-bounce-short">
            <span className="text-4xl">📁</span>
            <h3 className="text-lg font-bold text-gray-800 mt-2">
              Incoming File Request
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              From: {incomingRequestDetails.sender}
            </p>

            <div className="bg-gray-50 p-3 rounded-xl border text-left mb-6">
              <p className="text-sm font-semibold text-gray-700 truncate">
                {incomingRequestDetails.name}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Size: {(incomingRequestDetails.size / (1024 * 1024)).toFixed(2)}{" "}
                MB
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDeclineRequest}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptRequest}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md shadow-blue-200"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BASE ROOM UI --- */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Active P2P Room: {roomId}
          </h2>
          <p className="text-xs text-gray-500 font-mono">
            Your Device ID: {deviceId}
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
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Scan QR to join
          </p>
          <img
            src={`http://${backendHost}/api/v1/rooms/${roomId}/qrcode`}
            alt="Room Joining QR"
            className="w-40 h-40 rounded shadow-sm"
          />
          <span className="text-xs text-gray-400 mt-2">
            Must be on the same local network
          </span>
        </div>

        {/* Room Info & Controls */}
        <div className="flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">
              Active Devices ({activeDevices.length})
            </h3>
            <div className="bg-gray-50 p-3 rounded-xl border max-h-32 overflow-y-auto space-y-2 mb-4">
              {activeDevices.map((dev, idx) => (
                <div
                  key={idx}
                  className="bg-white p-1.5 rounded shadow-xs text-xs font-mono text-gray-700"
                >
                  {dev === deviceId ? "💻 You" : `📱 Peer Device (${dev})`}
                </div>
              ))}
            </div>
          </div>

          {/* WebRTC Upload / Transfer Actions */}
          {transferStatus === "idle" && (
            <div className="p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
              <input
                type="file"
                id="file-p2p-upload"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="file-p2p-upload"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition text-center w-full shadow-md shadow-blue-100"
              >
                Send File Directly (P2P)
              </label>
              <p className="text-xxs text-gray-400 mt-1 text-center">
                Files transfer directly to peers without server storage.
              </p>
            </div>
          )}

          {transferStatus === "proposal_pending" && (
            <div className="p-4 border rounded-xl bg-yellow-50 border-yellow-200 text-center">
              <div className="animate-pulse space-y-2">
                <span className="text-lg">⏳</span>
                <p className="text-xs font-semibold text-yellow-800">
                  Waiting for receiver to accept...
                </p>
                <p className="text-xxs text-yellow-600 truncate">
                  {currentFileName}
                </p>
              </div>
              <button
                onClick={cleanupPeerConnection}
                className="mt-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-1 px-3 rounded-lg text-xxs font-medium transition"
              >
                Cancel Request
              </button>
            </div>
          )}

          {(transferStatus === "sending" || transferStatus === "receiving") && (
            <div className="p-4 border rounded-xl bg-blue-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-700 capitalize">
                  {transferStatus === "sending"
                    ? "Sending File..."
                    : "Receiving File..."}
                </span>
                <span className="text-xs font-bold text-blue-700">
                  {progress}%
                </span>
              </div>
              <p className="text-xs text-gray-600 truncate mb-3">
                {currentFileName}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <button
                onClick={cleanupPeerConnection}
                className="w-full mt-4 bg-red-100 hover:bg-red-200 text-red-700 py-1.5 rounded-xl text-xs font-medium transition"
              >
                Cancel Transfer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
