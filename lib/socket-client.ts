import io, { Socket } from "socket.io-client";
import { webrtcManager } from "@/lib/webrtc-manager";
import { Rider } from "@/lib/types";
import { useRideStore } from "@/store";

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(serverUrl: string, token: string) {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.socket.on("connect", () => {
        console.log("[Socket] Connected");
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      this.socket.on("connect_error", (error) => {
        console.error("[Socket] Connection error:", error);
        reject(error);
      });

      this.setupMessageHandlers();
    });
  }

  private setupMessageHandlers() {
    if (!this.socket) return;

    // Receive HELLO messages from other riders
    this.socket.on("HELLO", async (data) => {
      console.log("[Socket] Received HELLO from", data.from);
      const store = useRideStore.getState();
      store.updateRemoteRider(data.rider);

      // If this is a new rider, initiate connection
      if (!webrtcManager.getPeerIds().includes(data.from)) {
        await this.initiateConnection(data.from);
      }
    });

    // Receive WebRTC offer
    this.socket.on("OFFER", async (data) => {
      console.log("[Socket] Received OFFER from", data.from);
      const answer = await webrtcManager.handleOffer(data.from, data.offer);
      if (answer) {
        this.sendAnswer(data.from, answer);
      }
    });

    // Receive WebRTC answer
    this.socket.on("ANSWER", async (data) => {
      console.log("[Socket] Received ANSWER from", data.from);
      await webrtcManager.handleAnswer(data.from, data.answer);
    });

    // Receive ICE candidates
    this.socket.on("ICE_CANDIDATE", (data) => {
      console.log("[Socket] Received ICE candidate from", data.from);
      webrtcManager
        .addIceCandidate(data.from, data.candidate)
        .catch(console.error);
    });

    // Receive topology/route updates from server
    this.socket.on("ROUTE_UPDATE", (data) => {
      console.log("[Socket] Received ROUTE_UPDATE", data);
      const store = useRideStore.getState();
      data.paths.forEach((path: { target: string; hops: string[] }) => {
        store.updateMeshPath(path.target, path.hops);
      });
    });

    // Receive location updates from other riders
    this.socket.on("LOCATION_UPDATE", (data) => {
      console.log("[Socket] Received LOCATION_UPDATE from", data.riderId);
      const store = useRideStore.getState();
      const existingRider = store.remoteRiders[data.riderId];
      if (existingRider) {
        store.updateRemoteRider({
          ...existingRider,
          gpsLocation: { lat: data.location.lat, lng: data.location.lng },
          timestamp: data.timestamp,
        });
      }
    });

    // Handle disconnection
    this.socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      webrtcManager.closeAll();
    });

    // WebRTC manager events → send via Socket
    webrtcManager.on("iceCandidate", (data) => {
      this.sendICECandidate(data.peerId, data.candidate);
    });

    webrtcManager.on("offerReady", (data) => {
      this.sendOffer(data.peerId, data.offer);
    });
  }

  /**
   * Broadcast HELLO to all riders
   */
  sendHello(rider: Rider) {
    this.socket?.emit("HELLO", { from: rider.riderId, rider });
  }

  /**
   * Send WebRTC offer to specific peer
   */
  private sendOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit("OFFER", {
      from: this.socket?.id,
      to: peerId,
      offer,
    });
  }

  /**
   * Send WebRTC answer to specific peer
   */
  private sendAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit("ANSWER", {
      from: this.socket?.id,
      to: peerId,
      answer,
    });
  }

  /**
   * Send ICE candidate
   */
  private sendICECandidate(peerId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit("ICE_CANDIDATE", {
      from: this.socket?.id,
      to: peerId,
      candidate,
    });
  }

  /**
   * Initiate connection to new peer
   */
  private async initiateConnection(peerId: string) {
    try {
      await webrtcManager.createPeerConnection(peerId);
      const offer = await webrtcManager.sendOffer(peerId);
      if (offer) {
        this.sendOffer(peerId, offer);
      }
    } catch (error) {
      console.error(`Failed to initiate connection to ${peerId}:`, error);
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    webrtcManager.closeAll();
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
export default SocketClient;
