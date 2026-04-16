# Mesh Motorcycle Intercom - Implementation Guide

## Week 1-2: Project Setup & Architecture

### Step 1: Initialize Next.js Project

```bash
# Create project with TypeScript, Tailwind, App Router
npx create-next-app@latest motorcycle-intercom \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-src-dir

cd motorcycle-intercom

# Install dependencies
npm install socket.io-client zustand leaflet react-leaflet axios
npm install -D @types/leaflet @types/node

# Create directory structure
mkdir -p lib/{hooks,utils} components/{layout,common} store public/icons
mkdir -p backend/src/{routes,services,models,sockets,db,utils,middleware}
```

### Step 2: Setup Environment Variables

**`.env.local`:**
```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Backend (create .env in backend/ folder)
# DATABASE_URL=postgresql://postgres:password@localhost:5432/intercom
# JWT_SECRET=your-secret-key-min-32-chars
# NODE_ENV=development
# PORT=3001
```

### Step 3: Create TypeScript Configuration

**`tsconfig.json` (update paths):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"]
    },
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## Week 3-4: WebRTC Peer Manager

### Create WebRTC Manager Class

**`lib/webrtc-manager.ts`:**
```typescript
import { EventEmitter } from 'events';

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
  private dataChanels: Map<string, RTCDataChannel> = new Map();
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
        constraints || defaultConstraints
      );
      console.log('[WebRTC] Local audio initialized');
      this.emit('localAudioReady', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to get user media:', error);
      this.emit('error', { type: 'MIC_ERROR', error });
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
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        // Add TURN server if needed for NAT traversal
        // { urls: ['turn:your-turn-server.com'], username: 'user', credential: 'pass' }
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // Add local audio tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote audio
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from', peerId);
      this.emit('remoteAudioReady', {
        peerId,
        stream: event.streams[0],
        track: event.track,
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('iceCandidate', {
          peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state change: ${peerId} -> ${state}`);
      this.emit('connectionStateChange', { peerId, state });

      if (state === 'failed' || state === 'disconnected') {
        this.emit('peerDisconnected', peerId);
        this.closePeerConnection(peerId);
      } else if (state === 'connected') {
        this.emit('peerConnected', peerId);
      }
    };

    // Create data channel for signaling/metadata
    const dataChannel = pc.createDataChannel('signaling', { ordered: true });
    this.setupDataChannel(peerId, dataChannel);

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // Store connection
    this.peerConnections.set(peerId, pc);
    this.stats.set(peerId, {
      peerId,
      connectionState: 'new',
      iceConnectionState: 'new',
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
      this.emit('error', { type: 'OFFER_ERROR', peerId, error });
      return null;
    }
  }

  /**
   * Handle received offer and send answer
   */
  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit
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
      this.emit('error', { type: 'ANSWER_ERROR', peerId, error });
      return null;
    }
  }

  /**
   * Handle received answer
   */
  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`No peer connection for ${peerId}`);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`[WebRTC] Answer set for ${peerId}`);
    } catch (error) {
      console.error(`[WebRTC] Failed to set answer for ${peerId}:`, error);
      this.emit('error', { type: 'SET_ANSWER_ERROR', peerId, error });
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] No peer connection for ${peerId}, skipping ICE candidate`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      // Ignore errors for invalid candidates (common during handshake)
      console.debug(`[WebRTC] ICE candidate error for ${peerId}:`, error);
    }
  }

  /**
   * Setup data channel for messaging
   */
  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      console.log(`[WebRTC] Data channel opened for ${peerId}`);
      this.dataChanels.set(peerId, dataChannel);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit('dataMessage', { peerId, message });
      } catch (e) {
        console.error(`[WebRTC] Failed to parse data message from ${peerId}:`, e);
      }
    };

    dataChannel.onclose = () => {
      console.log(`[WebRTC] Data channel closed for ${peerId}`);
      this.dataChanels.delete(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`[WebRTC] Data channel error for ${peerId}:`, error);
      this.emit('error', { type: 'DATA_CHANNEL_ERROR', peerId, error });
    };
  }

  /**
   * Send message via data channel
   */
  sendData(peerId: string, data: any): boolean {
    const dc = this.dataChanels.get(peerId);
    if (!dc || dc.readyState !== 'open') {
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
      this.dataChanels.delete(peerId);
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
    this.dataChanels.clear();
    this.stats.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    console.log('[WebRTC] All connections closed');
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
          this.emit('stats', stats);
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
      if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
        packetLoss = stat.packetsLost || 0;
        jitter = (stat.jitter || 0) * 1000; // Convert to ms
      }
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
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
}

export const webrtcManager = new WebRTCManager();
export default WebRTCManager;
```

### Create WebRTC Hook

**`lib/hooks/useWebRTC.ts`:**
```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useRideStore } from '@/store';
import { webrtcManager } from '@/lib/webrtc-manager';

export function useWebRTC() {
  const rideCode = useRideStore((state) => state.rideCode);
  const localRider = useRideStore((state) => state.localRider);
  const updateRemoteRider = useRideStore((state) => state.updateRemoteRider);
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await webrtcManager.initLocalAudio();
      return stream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }, []);

  const connectToPeer = useCallback(async (peerId: string) => {
    try {
      const pc = await webrtcManager.createPeerConnection(peerId);
      const offer = await webrtcManager.sendOffer(peerId);
      // Send offer to other peer via Socket.io (handled in socket listener)
      return pc;
    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      throw error;
    }
  }, []);

  const disconnectFromPeer = useCallback((peerId: string) => {
    webrtcManager.closePeerConnection(peerId);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    webrtcManager.setAudioEnabled(enabled);
  }, []);

  useEffect(() => {
    if (!rideCode) return;

    // Initialize local audio when ride starts
    initializeAudio().catch(console.error);

    // Listen for remote audio
    const onRemoteAudio = ({ peerId, stream }: any) => {
      remoteStreams.current.set(peerId, stream);
      // Play audio immediately
      playRemoteAudio(peerId, stream);
    };

    // Listen for connection state changes
    const onConnectionChange = ({ peerId, state }: any) => {
      console.log(`Peer ${peerId} connection state: ${state}`);
    };

    webrtcManager.on('remoteAudioReady', onRemoteAudio);
    webrtcManager.on('connectionStateChange', onConnectionChange);

    return () => {
      webrtcManager.off('remoteAudioReady', onRemoteAudio);
      webrtcManager.off('connectionStateChange', onConnectionChange);
      webrtcManager.closeAll();
    };
  }, [rideCode, initializeAudio]);

  const playRemoteAudio = (peerId: string, stream: MediaStream) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.play().catch((e) => console.error('Failed to play audio:', e));
  };

  return {
    initializeAudio,
    connectToPeer,
    disconnectFromPeer,
    setAudioEnabled,
    remoteStreams: remoteStreams.current,
  };
}
```

---

## Week 5-6: Basic Mesh Router & Socket.io Integration

### Create Mesh Router

**`lib/mesh-router.ts`:**
```typescript
import { Rider, MeshNeighbor } from '@/lib/types';

export interface MeshPath {
  target: string;
  hops: string[]; // intermediate rider IDs
  distance: number; // total hops
  latency: number; // estimated
}

class MeshRouter {
  private neighbors: Map<string, MeshNeighbor> = new Map();
  private topology: Map<string, Set<string>> = new Map();
  private paths: Map<string, MeshPath> = new Map();

  /**
   * Update neighbor list from riders in current group
   */
  updateTopology(localRiderId: string, allRiders: Rider[]) {
    this.neighbors.clear();
    this.topology.clear();
    this.paths.clear();

    const localRider = allRiders.find((r) => r.riderId === localRiderId);
    if (!localRider) return;

    // Build neighbor list based on distance
    allRiders.forEach((rider) => {
      if (rider.riderId === localRiderId) return;

      const distance = this.calculateDistance(
        localRider.gpsLocation.lat,
        localRider.gpsLocation.lng,
        rider.gpsLocation.lat,
        rider.gpsLocation.lng
      );

      const isDirectPeer = distance < 1000; // 1km = direct neighbor

      this.neighbors.set(rider.riderId, {
        riderId: rider.riderId,
        signalStrength: rider.signalStrength || -80,
        distance,
        isDirectPeer,
        latency: isDirectPeer ? 50 : 150,
      });
    });

    // Build adjacency graph
    this.buildTopology(allRiders);

    // Calculate shortest paths to all reachable riders
    this.computeAllShortestPaths(allRiders);
  }

  /**
   * Build topology graph (who can reach whom)
   */
  private buildTopology(allRiders: Rider[]) {
    this.neighbors.forEach((neighbor) => {
      if (!this.topology.has(neighbor.riderId)) {
        this.topology.set(neighbor.riderId, new Set());
      }

      // Add direct neighbors to the graph
      this.neighbors.forEach((other) => {
        if (other.riderId !== neighbor.riderId && other.distance < 1500) {
          this.topology.get(neighbor.riderId)!.add(other.riderId);
        }
      });
    });
  }

  /**
   * Dijkstra's algorithm: find shortest path to target
   */
  private dijkstra(startId: string, targetId: string): string[] {
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited = new Set(this.topology.keys());

    // Initialize
    unvisited.forEach((id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current = startId;
      let minDist = Infinity;
      unvisited.forEach((id) => {
        const dist = distances.get(id) || Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = id;
        }
      });

      if (current === targetId) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | null = targetId;
        while (node !== null) {
          path.unshift(node);
          node = previous.get(node) || null;
        }
        return path.slice(1); // Exclude start, include target
      }

      unvisited.delete(current);
      const neighbors = this.topology.get(current) || new Set();

      neighbors.forEach((neighbor) => {
        if (!unvisited.has(neighbor)) return;

        const newDist = (distances.get(current) || 0) + 1;
        const currentNeighborDist = distances.get(neighbor) || Infinity;

        if (newDist < currentNeighborDist) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, current);
        }
      });
    }

    return []; // No path found
  }

  /**
   * Compute shortest paths to all reachable riders
   */
  private computeAllShortestPaths(allRiders: Rider[]) {
    allRiders.forEach((rider) => {
      const path = this.dijkstra('local', rider.riderId);
      if (path.length > 0) {
        this.paths.set(rider.riderId, {
          target: rider.riderId,
          hops: path,
          distance: path.length,
          latency: path.length * 100, // Rough estimate
        });
      }
    });
  }

  /**
   * Get neighbors (direct peers)
   */
  getDirectNeighbors(): MeshNeighbor[] {
    return Array.from(this.neighbors.values()).filter((n) => n.isDirectPeer);
  }

  /**
   * Get all neighbors (including indirect)
   */
  getAllNeighbors(): MeshNeighbor[] {
    return Array.from(this.neighbors.values());
  }

  /**
   * Get path to rider
   */
  getPathToRider(riderId: string): MeshPath | undefined {
    return this.paths.get(riderId);
  }

  /**
   * Calculate distance in meters (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const meshRouter = new MeshRouter();
export default MeshRouter;
```

### Create Socket.io Client Handler

**`lib/socket-client.ts`:**
```typescript
import io, { Socket } from 'socket.io-client';
import { webrtcManager } from '@/lib/webrtc-manager';
import { meshRouter } from '@/lib/mesh-router';
import { useRideStore } from '@/store';

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

      this.socket.on('connect', () => {
        console.log('[Socket] Connected');
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        reject(error);
      });

      this.setupMessageHandlers();
    });
  }

  private setupMessageHandlers() {
    if (!this.socket) return;

    // Receive HELLO messages from other riders
    this.socket.on('HELLO', async (data) => {
      console.log('[Socket] Received HELLO from', data.from);
      const store = useRideStore.getState();
      store.updateRemoteRider(data.rider);

      // If this is a new rider, initiate connection
      if (!webrtcManager.getPeerIds().includes(data.from)) {
        await this.initiateConnection(data.from);
      }
    });

    // Receive WebRTC offer
    this.socket.on('OFFER', async (data) => {
      console.log('[Socket] Received OFFER from', data.from);
      const answer = await webrtcManager.handleOffer(data.from, data.offer);
      if (answer) {
        this.sendAnswer(data.from, answer);
      }
    });

    // Receive WebRTC answer
    this.socket.on('ANSWER', async (data) => {
      console.log('[Socket] Received ANSWER from', data.from);
      await webrtcManager.handleAnswer(data.from, data.answer);
    });

    // Receive ICE candidates
    this.socket.on('ICE_CANDIDATE', (data) => {
      console.log('[Socket] Received ICE candidate from', data.from);
      webrtcManager.addIceCandidate(data.from, data.candidate).catch(console.error);
    });

    // Receive topology/route updates from server
    this.socket.on('ROUTE_UPDATE', (data) => {
      console.log('[Socket] Received ROUTE_UPDATE', data);
      const store = useRideStore.getState();
      data.paths.forEach((path: any) => {
        store.updateMeshPath(path.target, path.hops);
      });
    });

    // Handle disconnection
    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      webrtcManager.closeAll();
    });

    // WebRTC manager events → send via Socket
    webrtcManager.on('iceCandidate', (data) => {
      this.sendICECandidate(data.peerId, data.candidate);
    });

    webrtcManager.on('offerReady', (data) => {
      this.sendOffer(data.peerId, data.offer);
    });
  }

  /**
   * Broadcast HELLO to all riders
   */
  sendHello(rider: any) {
    this.socket?.emit('HELLO', { from: rider.riderId, rider });
  }

  /**
   * Send WebRTC offer to specific peer
   */
  private sendOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('OFFER', {
      from: this.socket.id,
      to: peerId,
      offer,
    });
  }

  /**
   * Send WebRTC answer to specific peer
   */
  private sendAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('ANSWER', {
      from: this.socket.id,
      to: peerId,
      answer,
    });
  }

  /**
   * Send ICE candidate
   */
  private sendICECandidate(peerId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('ICE_CANDIDATE', {
      from: this.socket.id,
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
```

---

## Week 7-8: React Components & Audio Processing

### Dashboard Component

**`app/dashboard/page.tsx`:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRideStore } from '@/store';
import { useWebRTC } from '@/lib/hooks/useWebRTC';
import { socketClient } from '@/lib/socket-client';
import RiderList from '@/components/RiderList';
import RiderMap from '@/components/RiderMap';
import AudioControls from '@/components/AudioControls';

export default function Dashboard() {
  const rideCode = useRideStore((state) => state.rideCode);
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const { setAudioEnabled } = useWebRTC();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rideCode) return;

    // Start broadcasting HELLO messages
    const helloInterval = setInterval(() => {
      socketClient.getSocket()?.emit('HELLO', {
        from: localRider.riderId,
        rider: localRider,
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(helloInterval);
  }, [rideCode, localRider]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Ride: {rideCode}</h1>
            <p className="text-gray-600">Riders: {Object.keys(remoteRiders).length + 1}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{localRider.name}</p>
            <p className="text-sm text-gray-500">
              {isAudioRunning ? '🔴 Live' : '⚫ Offline'}
            </p>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-6 py-3">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Map (left) */}
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
          <RiderMap />
        </div>

        {/* Sidebar (right) */}
        <div className="w-80 flex flex-col gap-4">
          {/* Rider list */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            <RiderList />
          </div>

          {/* Audio controls */}
          <AudioControls onError={setError} />
        </div>
      </div>
    </div>
  );
}
```

### Rider List Component

**`components/RiderList.tsx`:**
```typescript
'use client';

import { useRideStore } from '@/store';
import SignalStrength from '@/components/SignalStrength';

export default function RiderList() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const neighbors = useRideStore((state) => state.neighbors);

  const allRiders = [
    { ...localRider, isLocal: true },
    ...Object.values(remoteRiders).map((r) => ({ ...r, isLocal: false })),
  ];

  const getConnectionType = (riderId: string) => {
    const neighbor = neighbors.find((n) => n.riderId === riderId);
    if (neighbor?.isDirectPeer) return 'Direct';
    return 'Relayed';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800">Riders ({allRiders.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allRiders.map((rider) => (
          <div
            key={rider.riderId}
            className={`px-4 py-3 border-b ${
              rider.isLocal ? 'bg-blue-50' : ''
            } hover:bg-gray-100 transition`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {rider.name} {rider.isLocal && '(You)'}
                </p>
                <p className="text-xs text-gray-500">
                  {getConnectionType(rider.riderId)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Battery */}
                <span className="text-sm text-gray-600">
                  🔋 {rider.batteryLevel}%
                </span>

                {/* Signal strength */}
                <SignalStrength strength={rider.signalStrength} />

                {/* Mute indicator */}
                {rider.isMuted && (
                  <span className="text-lg">🔇</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Audio Controls Component

**`components/AudioControls.tsx`:**
```typescript
'use client';

import { useState } from 'react';
import { useRideStore } from '@/store';
import { useWebRTC } from '@/lib/hooks/useWebRTC';

export default function AudioControls({ onError }: { onError: (msg: string) => void }) {
  const localRider = useRideStore((state) => state.localRider);
  const toggleMute = useRideStore((state) => state.toggleMute);
  const startAudio = useRideStore((state) => state.startAudio);
  const stopAudio = useRideStore((state) => state.stopAudio);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const { setAudioEnabled } = useWebRTC();

  const [volume, setVolume] = useState(75);

  const handleToggleMute = () => {
    const newMuted = !localRider.isMuted;
    toggleMute(newMuted);
    setAudioEnabled(!newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    // Apply volume to audio elements (implementation varies)
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleToggleMute}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
            localRider.isMuted
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {localRider.isMuted ? '🔇 Muted' : '🔊 Unmuted'}
        </button>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Volume: {volume}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full"
        />
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>✓ Microphone enabled</p>
        <p>✓ Echo cancellation active</p>
        <p>{isAudioRunning ? '✓' : '✗'} Audio stream running</p>
      </div>
    </div>
  );
}
```

---

## Continue in Backend Implementation

The next section would cover:
- Express API endpoints
- Socket.io server setup
- PostgreSQL database schema
- Authentication system
- Mesh routing service

Would you like me to create the backend implementation files next?

