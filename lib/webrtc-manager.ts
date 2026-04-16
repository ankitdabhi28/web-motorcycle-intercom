import { EventEmitter } from "events";

export interface WebRTCStats {
  peerId: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  rtt: number; // milliseconds
  jitter: number;
  packetLoss: number; // percentage
}

class WebRTCManager extends EventEmitter {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localStream: MediaStream | null = null;
  private stats: Map<string, WebRTCStats> = new Map();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startStatsCollection();
  }

  /**
   * Initialize local microphone stream
   */
  async initLocalAudio(constraints?: MediaStreamConstraints) {
    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
        sampleRate: { ideal: 48000 },
      },
      video: false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints,
      );
      console.log("[WebRTC] Local audio initialized");
      this.emit("localAudioReady", this.localStream);
      return this.localStream;
    } catch (error) {
      console.error("[WebRTC] Failed to get user media:", error);
      this.emit("error", { type: "MIC_ERROR", error });
      throw error;
    }
  }

  /**
   * Create peer connection to another rider
   */
  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    // Check if already exists
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
      ],
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    // Add local audio tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote audio
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track from", peerId);
      this.emit("remoteAudioReady", {
        peerId,
        stream: event.streams[0],
        track: event.track,
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit("iceCandidate", {
          peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state change: ${peerId} -> ${state}`);
      this.emit("connectionStateChange", { peerId, state });

      if (state === "failed" || state === "disconnected") {
        this.emit("peerDisconnected", peerId);
        this.closePeerConnection(peerId);
      } else if (state === "connected") {
        this.emit("peerConnected", peerId);
      }
    };

    // Create data channel for signaling/metadata
    const dataChannel = pc.createDataChannel("signaling", { ordered: true });
    this.setupDataChannel(peerId, dataChannel);

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // Store connection
    this.peerConnections.set(peerId, pc);
    this.stats.set(peerId, {
      peerId,
      connectionState: "new",
      iceConnectionState: "new",
      rtt: 0,
      jitter: 0,
      packetLoss: 0,
    });

    return pc;
  }

  /**
   * Send SDP offer to peer
   */
  async sendOffer(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error(`[WebRTC] No peer connection for ${peerId}`);
      return null;
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      console.log(`[WebRTC] Offer created for ${peerId}`);
      return pc.localDescription?.toJSON() || null;
    } catch (error) {
      console.error(`[WebRTC] Failed to create offer for ${peerId}:`, error);
      this.emit("error", { type: "OFFER_ERROR", peerId, error });
      return null;
    }
  }

  /**
   * Handle received offer and send answer
   */
  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit | null> {
    try {
      let pc = this.peerConnections.get(peerId);
      if (!pc) {
        pc = await this.createPeerConnection(peerId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`[WebRTC] Answer created for ${peerId}`);
      return pc.localDescription?.toJSON() || null;
    } catch (error) {
      console.error(`[WebRTC] Failed to handle offer from ${peerId}:`, error);
      this.emit("error", { type: "ANSWER_ERROR", peerId, error });
      return null;
    }
  }

  /**
   * Handle received answer
   */
  async handleAnswer(
    peerId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`No peer connection for ${peerId}`);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`[WebRTC] Answer set for ${peerId}`);
    } catch (error) {
      console.error(`[WebRTC] Failed to set answer for ${peerId}:`, error);
      this.emit("error", { type: "SET_ANSWER_ERROR", peerId, error });
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(
        `[WebRTC] No peer connection for ${peerId}, skipping ICE candidate`,
      );
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.debug(`[WebRTC] ICE candidate error for ${peerId}:`, error);
    }
  }

  /**
   * Setup data channel for messaging
   */
  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      console.log(`[WebRTC] Data channel opened for ${peerId}`);
      this.dataChannels.set(peerId, dataChannel);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit("dataMessage", { peerId, message });
      } catch (e) {
        console.error(
          `[WebRTC] Failed to parse data message from ${peerId}:`,
          e,
        );
      }
    };

    dataChannel.onclose = () => {
      console.log(`[WebRTC] Data channel closed for ${peerId}`);
      this.dataChannels.delete(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`[WebRTC] Data channel error for ${peerId}:`, error);
      this.emit("error", { type: "DATA_CHANNEL_ERROR", peerId, error });
    };
  }

  /**
   * Send message via data channel
   */
  sendData(peerId: string, data: unknown): boolean {
    const dc = this.dataChannels.get(peerId);
    if (!dc || dc.readyState !== "open") {
      console.warn(`[WebRTC] Data channel not ready for ${peerId}`);
      return false;
    }
    dc.send(JSON.stringify(data));
    return true;
  }

  /**
   * Mute/unmute local audio
   */
  setAudioEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Close specific peer connection
   */
  closePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      this.dataChannels.delete(peerId);
      this.stats.delete(peerId);
      console.log(`[WebRTC] Peer connection closed: ${peerId}`);
    }
  }

  /**
   * Close all peer connections
   */
  closeAll() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.stats.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    console.log("[WebRTC] All connections closed");
  }

  /**
   * Get connection stats periodically
   */
  private startStatsCollection() {
    this.statsInterval = setInterval(async () => {
      for (const [peerId, pc] of this.peerConnections) {
        try {
          const report = await pc.getStats();
          const stats = this.parseStats(report);
          this.stats.set(peerId, {
            peerId,
            ...stats,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
          });
          this.emit("stats", stats);
        } catch (error) {
          console.error(`[WebRTC] Failed to get stats for ${peerId}:`, error);
        }
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Parse WebRTC stats report
   */
  private parseStats(report: RTCStatsReport) {
    let rtt = 0;
    let packetLoss = 0;
    let jitter = 0;

    report.forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === "audio") {
        packetLoss = stat.packetsLost || 0;
        jitter = (stat.jitter || 0) * 1000; // Convert to ms
      }
      if (stat.type === "candidate-pair" && stat.state === "succeeded") {
        rtt = (stat.currentRoundTripTime || 0) * 1000; // Convert to ms
      }
    });

    return { rtt, packetLoss, jitter };
  }

  /**
   * Get stats for a peer
   */
  getStats(peerId: string): WebRTCStats | undefined {
    return this.stats.get(peerId);
  }

  /**
   * Get all peer IDs
   */
  getPeerIds(): string[] {
    return Array.from(this.peerConnections.keys());
  }

  /**
   * Update audio constraints based on speed-adaptive mode
   */
  async updateAudioConstraints(
    noiseSuppression: "low" | "medium" | "aggressive",
    echoCancellation: boolean,
    volume: number,
  ): Promise<void> {
    if (!this.localStream) {
      console.warn("[WebRTC] No local stream to update");
      return;
    }

    // Map noise suppression levels to Web Audio API values
    const noiseSuppressionValue =
      noiseSuppression === "aggressive"
        ? 1.0
        : noiseSuppression === "medium"
          ? 0.5
          : 0.2;

    // Update audio tracks with new constraints
    const audioTracks = this.localStream.getAudioTracks();
    for (const track of audioTracks) {
      try {
        // Note: Not all browsers support updating constraints after stream is created
        // This is a best-effort approach
        if ("applyConstraints" in track) {
          await (track as any).applyConstraints({
            echoCancellation,
            noiseSuppression: noiseSuppressionValue > 0.3,
            autoGainControl: true,
          });
          console.log("[WebRTC] Audio constraints updated:", {
            noiseSuppression,
            echoCancellation,
          });
        }
      } catch (error) {
        console.error("[WebRTC] Failed to update audio constraints:", error);
      }
    }

    // Apply volume gain to all peer connections
    this.peerConnections.forEach((connection) => {
      connection.getReceivers().forEach((receiver) => {
        if (receiver.track && receiver.track.kind === "audio") {
          const stream = new MediaStream([receiver.track]);
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const gainNode = audioContext.createGain();
          gainNode.gain.value = volume;

          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
        }
      });
    });

    this.emit("audioConstraintsUpdated", {
      noiseSuppression,
      echoCancellation,
      volume,
    });
  }
}

export const webrtcManager = new WebRTCManager();
export default WebRTCManager;
