# Motorcycle Intercom - Next.js Project Structure

```
motorcycle-intercom/
│
├── frontend/                          # Next.js Application
│   ├── app/
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home/landing
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main ride dashboard
│   │   ├── ride-setup/
│   │   │   └── page.tsx              # Create/join ride
│   │   ├── settings/
│   │   │   └── page.tsx              # User settings
│   │   └── api/
│   │       └── auth/
│   │           ├── login/route.ts
│   │           ├── register/route.ts
│   │           └── refresh/route.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts             # HTTP client wrapper
│   │   ├── socket-client.ts          # Socket.io initialization
│   │   ├── webrtc-manager.ts         # WebRTC peer connections
│   │   ├── mesh-router.ts            # Mesh routing logic (OLSR)
│   │   ├── audio-processor.ts        # Audio capture, encoding
│   │   ├── ride-manager.ts           # Ride state & lifecycle
│   │   ├── types.ts                  # Shared TypeScript types
│   │   └── hooks/
│   │       ├── useWebRTC.ts
│   │       ├── useMesh.ts
│   │       ├── useAudio.ts
│   │       └── useRide.ts
│   │
│   ├── components/
│   │   ├── RiderMap.tsx              # Leaflet map display
│   │   ├── RiderList.tsx             # List of active riders
│   │   ├── AudioControls.tsx         # Mute, volume, settings
│   │   ├── RideCode.tsx              # Display/copy ride code
│   │   ├── SignalStrength.tsx        # Signal bars indicator
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   │
│   ├── hooks/
│   │   └── useStore.ts               # Zustand store hook
│   │
│   ├── store/
│   │   └── index.ts                  # Zustand state management
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.module.css
│   │
│   ├── public/
│   │   └── manifest.json             # PWA manifest
│   │
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.local                    # Local environment vars
│   └── .env.example
│
├── backend/                           # Node.js Signaling Server
│   ├── src/
│   │   ├── index.ts                  # Express + Socket.io server
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /auth/* endpoints
│   │   │   ├── rides.ts              # POST/GET /rides/* endpoints
│   │   │   └── riders.ts             # GET /riders/* endpoints
│   │   ├── services/
│   │   │   ├── rideService.ts        # Ride creation, joining
│   │   │   ├── meshService.ts        # Mesh topology logic
│   │   │   ├── authService.ts        # JWT, user management
│   │   │   └── gpsService.ts         # Location tracking
│   │   ├── models/
│   │   │   ├── User.ts               # User table schema
│   │   │   ├── Ride.ts               # Ride table schema
│   │   │   └── RideParticipant.ts    # Join table
│   │   ├── sockets/
│   │   │   └── handlers.ts           # Socket.io event handlers
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── jwt.ts
│   │   │   └── validators.ts
│   │   └── db/
│   │       ├── connection.ts         # PostgreSQL pool
│   │       ├── migrations/           # Database schema
│   │       │   ├── 001_create_users.sql
│   │       │   ├── 002_create_rides.sql
│   │       │   └── 003_create_participants.sql
│   │       └── queries/              # SQL query builders
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   └── meshService.test.ts
│   │   └── integration/
│   │       └── api.test.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── docker-compose.yml            # Local PostgreSQL + Redis
│   ├── Dockerfile                    # Container image
│   ├── .env.local
│   └── .env.example
│
├── docs/
│   ├── API.md                        # API documentation (Swagger)
│   ├── ARCHITECTURE.md               # System design
│   └── DEPLOYMENT.md                 # Deploy guide
│
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

---

## Key Files to Create First

### 1. `frontend/lib/types.ts` - Shared Types
```typescript
// Rider state
export interface Rider {
  riderId: string;
  name: string;
  gpsLocation: { lat: number; lng: number };
  signalStrength: number; // dBm (-100 to -30)
  isOnline: boolean;
  isMuted: boolean;
  batteryLevel: number; // 0-100
  isAudioEnabled: boolean;
  timestamp: number;
}

// Ride (group)
export interface Ride {
  rideId: string;
  rideCode: string; // 6-char code
  name: string;
  createdBy: string; // riderId
  createdAt: number;
  isActive: boolean;
  riders: Rider[];
}

// WebRTC Offer/Answer
export interface SignalingMessage {
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'HELLO' | 'ROUTE_UPDATE';
  from: string; // senderId
  to: string; // recipientId
  data: any;
  timestamp: number;
}

// Mesh neighbor
export interface MeshNeighbor {
  riderId: string;
  signalStrength: number;
  distance: number; // meters (estimated)
  isDirectPeer: boolean;
  latency: number; // ms
}

// Ride state (in Zustand)
export interface RideState {
  rideId: string | null;
  rideCode: string | null;
  isLeader: boolean;
  localRider: Rider;
  remoteRiders: Record<string, Rider>; // riderId -> Rider
  neighbors: MeshNeighbor[];
  meshPaths: Record<string, string[]>; // riderId -> path of intermediate riderIds
  isAudioRunning: boolean;
}
```

### 2. `frontend/store/index.ts` - Zustand Store
```typescript
import { create } from 'zustand';
import { RideState, Rider, MeshNeighbor } from '@/lib/types';

interface StoreState extends RideState {
  // Ride actions
  startRide: (rideName: string) => Promise<{ rideCode: string }>;
  joinRide: (rideCode: string) => Promise<void>;
  leaveRide: () => Promise<void>;
  
  // Rider actions
  setLocalRider: (rider: Rider) => void;
  updateRemoteRider: (rider: Rider) => void;
  removeRemoteRider: (riderId: string) => void;
  
  // Mesh actions
  updateNeighbors: (neighbors: MeshNeighbor[]) => void;
  updateMeshPath: (targetRiderId: string, path: string[]) => void;
  
  // Audio actions
  startAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  toggleMute: (muted: boolean) => void;
  
  // GPS
  updateLocation: (lat: number, lng: number) => void;
}

export const useRideStore = create<StoreState>((set, get) => ({
  // Initial state
  rideId: null,
  rideCode: null,
  isLeader: false,
  localRider: {
    riderId: '',
    name: '',
    gpsLocation: { lat: 0, lng: 0 },
    signalStrength: 0,
    isOnline: false,
    isMuted: false,
    batteryLevel: 100,
    isAudioEnabled: false,
    timestamp: Date.now(),
  },
  remoteRiders: {},
  neighbors: [],
  meshPaths: {},
  isAudioRunning: false,

  // Methods
  startRide: async (rideName) => {
    const response = await fetch('/api/rides', {
      method: 'POST',
      body: JSON.stringify({ name: rideName }),
    });
    const { rideCode } = await response.json();
    set({ 
      rideCode, 
      isLeader: true,
      isAudioRunning: true,
    });
    return { rideCode };
  },

  joinRide: async (rideCode) => {
    const response = await fetch(`/api/rides/${rideCode}/join`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to join ride');
    set({ rideCode, isAudioRunning: true });
  },

  leaveRide: async () => {
    const { rideCode } = get();
    if (!rideCode) return;
    await fetch(`/api/rides/${rideCode}/leave`, { method: 'DELETE' });
    set({ 
      rideCode: null, 
      rideId: null,
      isLeader: false,
      isAudioRunning: false,
    });
  },

  setLocalRider: (rider) => set({ localRider: rider }),
  
  updateRemoteRider: (rider) => set((state) => ({
    remoteRiders: {
      ...state.remoteRiders,
      [rider.riderId]: rider,
    },
  })),

  removeRemoteRider: (riderId) => set((state) => {
    const { [riderId]: _, ...rest } = state.remoteRiders;
    return { remoteRiders: rest };
  }),

  updateNeighbors: (neighbors) => set({ neighbors }),

  updateMeshPath: (targetRiderId, path) => set((state) => ({
    meshPaths: {
      ...state.meshPaths,
      [targetRiderId]: path,
    },
  })),

  startAudio: async () => {
    set({ isAudioRunning: true });
    // Actual audio start in WebRTC manager
  },

  stopAudio: async () => {
    set({ isAudioRunning: false });
  },

  toggleMute: (muted) => set((state) => ({
    localRider: { ...state.localRider, isMuted: muted },
  })),

  updateLocation: (lat, lng) => set((state) => ({
    localRider: {
      ...state.localRider,
      gpsLocation: { lat, lng },
    },
  })),
}));
```

### 3. `frontend/lib/webrtc-manager.ts` - WebRTC Peer Manager
```typescript
import { EventEmitter } from 'events';

class WebRTCManager extends EventEmitter {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  async initLocalAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false, // Let user control volume
      },
    });
    this.localStream = stream;
    this.emit('localAudioReady', stream);
    return stream;
  }

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local audio track
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote audio
    pc.ontrack = (event) => {
      this.emit('remoteAudioReady', {
        peerId,
        stream: event.streams[0],
      });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('iceCandidate', {
          peerId,
          candidate: event.candidate,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      this.emit('connectionStateChange', {
        peerId,
        state: pc.connectionState,
      });
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(peerId);
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  async sendOffer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.emit('offerReady', {
      peerId,
      offer: pc.localDescription,
    });
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = await this.createPeerConnection(peerId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.emit('answerReady', {
      peerId,
      answer: pc.localDescription,
    });
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Failed to add ICE candidate:', e);
    }
  }

  closePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      this.emit('peerClosed', peerId);
    }
  }

  getStats(peerId: string): Promise<RTCStatsReport> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    return pc.getStats();
  }

  closeAll() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
  }
}

export const webrtcManager = new WebRTCManager();
```

### 4. `frontend/lib/mesh-router.ts` - Mesh Routing Logic
```typescript
import { Rider, MeshNeighbor } from '@/lib/types';

class MeshRouter {
  private neighbors: Map<string, MeshNeighbor> = new Map();
  private topology: Map<string, Set<string>> = new Map(); // graph adjacency

  /**
   * Update neighbor list from server
   * Builds graph for routing
   */
  updateNeighbors(riders: Rider[], localRiderId: string) {
    this.neighbors.clear();
    this.topology.clear();

    riders.forEach((rider) => {
      if (rider.riderId === localRiderId) return;

      const isDirectPeer = riders.some(
        (r) =>
          r.riderId === rider.riderId &&
          this.isWithinRange(r.gpsLocation, riders.find((r) => r.riderId === localRiderId)?.gpsLocation)
      );

      this.neighbors.set(rider.riderId, {
        riderId: rider.riderId,
        signalStrength: rider.signalStrength,
        distance: this.estimateDistance(rider.gpsLocation.lat, rider.gpsLocation.lng),
        isDirectPeer,
        latency: isDirectPeer ? 50 : 150, // rough estimate
      });
    });

    this.buildTopology();
  }

  /**
   * Dijkstra's shortest path (minimum hop count for now)
   */
  calculateShortestPath(targetRiderId: string): string[] {
    const graph = this.topology;
    const queue = [{ id: targetRiderId, path: [] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const neighbors = graph.get(current.id) || new Set();
      if (neighbors.size === 0) {
        return current.path; // Found direct path
      }

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, path: [...current.path, neighbor] });
        }
      }
    }

    return []; // No path found
  }

  private buildTopology() {
    this.neighbors.forEach((neighbor, riderId) => {
      if (!this.topology.has(riderId)) {
        this.topology.set(riderId, new Set());
      }
      this.topology.get(riderId)!.add(neighbor.riderId);
    });
  }

  private isWithinRange(loc1: { lat: number; lng: number } | undefined, loc2: { lat: number; lng: number } | undefined): boolean {
    if (!loc1 || !loc2) return false;
    const distance = this.estimateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    return distance < 1000; // 1km range
  }

  private estimateDistance(lat1: number, lng1: number, lat2: number = 0, lng2: number = 0): number {
    // Simplified distance (should use Haversine formula for accuracy)
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + 
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  getNeighbors(): MeshNeighbor[] {
    return Array.from(this.neighbors.values());
  }

  getDirectPeers(): MeshNeighbor[] {
    return Array.from(this.neighbors.values()).filter((n) => n.isDirectPeer);
  }
}

export const meshRouter = new MeshRouter();
```

### 5. `backend/src/index.ts` - Express + Socket.io Server
```typescript
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/auth/register', async (req, res) => {
  // TODO: Register user
});

app.post('/auth/login', async (req, res) => {
  // TODO: Login user
});

app.post('/rides', async (req, res) => {
  // TODO: Create ride
});

app.get('/rides/:rideCode', async (req, res) => {
  // TODO: Get ride details
});

app.post('/rides/:rideCode/join', async (req, res) => {
  // TODO: Join ride
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('HELLO', (data) => {
    // Broadcast to all riders in same group
    socket.broadcast.emit('HELLO', data);
  });

  socket.on('OFFER', (data) => {
    // Forward offer to specific peer
    io.to(data.to).emit('OFFER', data);
  });

  socket.on('ANSWER', (data) => {
    // Forward answer to specific peer
    io.to(data.to).emit('ANSWER', data);
  });

  socket.on('ICE_CANDIDATE', (data) => {
    // Forward ICE candidate to specific peer
    io.to(data.to).emit('ICE_CANDIDATE', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Initial Setup Commands

```bash
# Create Next.js project
npx create-next-app@latest motorcycle-intercom --typescript --tailwind --app

# Install WebRTC & Socket.io
cd motorcycle-intercom
npm install socket.io-client zustand leaflet react-leaflet

# Install dev dependencies
npm install -D @types/leaflet

# Create backend directory
mkdir backend
cd backend
npm init -y
npm install express socket.io cors dotenv
npm install -D typescript @types/express @types/node nodemon

# Start development
npm run dev  # Next.js on localhost:3000
cd backend && npm run dev  # Server on localhost:3001
```

