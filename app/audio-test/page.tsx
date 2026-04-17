"use client";

import { useEffect, useState, useRef } from "react";
import { socketClient } from "@/lib/socket-client";

interface SignalData {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  to: string;
  from: string;
}

export default function AudioTestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "connected"
  >("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [audioQuality, setAudioQuality] = useState<string>("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const latencyTestIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateAudioQuality = () => {
    if (latency === null) return "Unknown";
    if (latency < 50) return "Excellent";
    if (latency < 100) return "Good";
    if (latency < 200) return "Fair";
    return "Poor";
  };

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = socketClient.getSocket();
        if (socket) {
          socket.emit("ICE_CANDIDATE", {
            candidate: event.candidate,
            to: remotePeerId,
            from: peerId,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setCallStatus(pc.connectionState === "connected" ? "connected" : "idle");
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(stream);
      return stream;
    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      if (error.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please grant microphone access to use audio features.",
        );
      } else if (error.name === "NotFoundError") {
        alert(
          "No microphone found. Please connect a microphone to use audio features.",
        );
      } else {
        alert(
          "Could not access microphone. Please check your permissions and try again.",
        );
      }
      return null;
    }
  };

  const startLatencyTest = () => {
    if (latencyTestIntervalRef.current) {
      clearInterval(latencyTestIntervalRef.current);
    }

    latencyTestIntervalRef.current = setInterval(() => {
      const dataChannel = dataChannelRef.current;
      if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(Date.now().toString());
      }
    }, 1000);
  };

  const startCall = async () => {
    if (!remotePeerId) {
      alert("Please enter a remote peer ID");
      return;
    }

    const stream = await startLocalStream();
    if (!stream) return;

    const pc = setupPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const dataChannel = pc.createDataChannel("latency");
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log("Data channel opened");
      startLatencyTest();
    };

    dataChannel.onmessage = (event) => {
      const timestamp = parseFloat(event.data);
      const currentLatency = Date.now() - timestamp;
      setLatency(currentLatency);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit("OFFER", {
        offer,
        to: remotePeerId,
        from: peerId,
      });
    }

    setCallStatus("calling");
  };

  const handleOffer = async (data: SignalData) => {
    const pc = setupPeerConnection();
    peerConnectionRef.current = pc;

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log("Data channel opened");
        startLatencyTest();
      };

      dataChannel.onmessage = (event) => {
        const timestamp = parseFloat(event.data);
        const currentLatency = Date.now() - timestamp;
        setLatency(currentLatency);
        dataChannel.send(Date.now().toString());
      };
    };

    await pc.setRemoteDescription(new RTCSessionDescription(data.offer!));

    const stream = await startLocalStream();
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit("ANSWER", {
        answer,
        to: data.from,
        from: peerId,
      });
    }

    setCallStatus("connected");
  };

  const handleAnswer = async (data: SignalData) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(data.answer!));
  };

  const handleIceCandidate = async (data: SignalData) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.addIceCandidate(new RTCIceCandidate(data.candidate!));
  };

  useEffect(() => {
    socketClient.connect("http://localhost:3001", "").catch((err) => {
      console.error("Socket connection error:", err);
    });

    const socket = socketClient.getSocket();
    if (socket) {
      socket.on("connect", () => {
        setIsConnected(true);
      });
      socket.on("disconnect", () => {
        setIsConnected(false);
      });
    }

    const id = `peer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setPeerId(id);

    if (socket) {
      socket.on("OFFER", handleOffer);
      socket.on("ANSWER", handleAnswer);
      socket.on("ICE_CANDIDATE", handleIceCandidate);
    }

    return () => {
      if (socket) {
        socket.off("OFFER", handleOffer);
        socket.off("ANSWER", handleAnswer);
        socket.off("ICE_CANDIDATE", handleIceCandidate);
      }
      socketClient.disconnect();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (latencyTestIntervalRef.current) {
        clearInterval(latencyTestIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    setAudioQuality(calculateAudioQuality());
  }, [latency]);

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallStatus("idle");
    setLatency(null);
    if (latencyTestIntervalRef.current) {
      clearInterval(latencyTestIntervalRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ←
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Audio Test
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          WebRTC Audio Test
        </h2>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Socket Connected</p>
              <p
                className={`font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}
              >
                {isConnected ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Your Peer ID</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                {peerId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Call Status</p>
              <p
                className={`font-semibold ${
                  callStatus === "connected"
                    ? "text-green-600"
                    : callStatus === "calling"
                      ? "text-yellow-600"
                      : "text-gray-600"
                }`}
              >
                {callStatus}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Latency</p>
              <p className="font-semibold">
                {latency !== null ? `${latency} ms` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Audio Quality</p>
              <p
                className={`font-semibold ${
                  audioQuality === "Excellent"
                    ? "text-green-600"
                    : audioQuality === "Good"
                      ? "text-blue-600"
                      : audioQuality === "Fair"
                        ? "text-yellow-600"
                        : audioQuality === "Poor"
                          ? "text-red-600"
                          : "text-gray-600"
                }`}
              >
                {audioQuality}
              </p>
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Call Controls</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remote Peer ID
              </label>
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter peer ID from another tab"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={startCall}
                disabled={callStatus !== "idle"}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                Start Call
              </button>
              <button
                onClick={endCall}
                disabled={callStatus === "idle"}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                End Call
              </button>
            </div>
          </div>
        </div>

        {/* Audio Visualizers */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audio Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Local Audio</p>
              <div
                className={`h-16 rounded-lg flex items-center justify-center ${
                  localStream ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <span
                  className={localStream ? "text-green-600" : "text-gray-400"}
                >
                  {localStream ? "🎤 Active" : "🔇 Muted"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Remote Audio</p>
              <div
                className={`h-16 rounded-lg flex items-center justify-center ${
                  remoteStream ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                <span
                  className={remoteStream ? "text-blue-600" : "text-gray-400"}
                >
                  {remoteStream ? "🔊 Receiving" : "🔇 Silent"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">
            How to Test
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Open this page in two separate browser tabs</li>
            <li>Copy the Peer ID from one tab</li>
            <li>Paste it into the "Remote Peer ID" field in the other tab</li>
            <li>Click "Start Call" in the second tab</li>
            <li>Grant microphone permission when prompted</li>
            <li>Monitor latency and audio quality metrics</li>
            <li>Test audio by speaking and verifying reception</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
