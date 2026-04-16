# Mesh Motorcycle Intercom - Next.js Development Guide

## Project Overview

Building a **scalable, peer-to-peer mesh network intercom system** for motorcycle groups using Next.js as the primary web application framework, with hybrid Web Audio & WebRTC for P2P communication.

**Key Differences from Mobile-First Approach:**
- Works in browsers (desktop, tablet, phone)
- Easier testing (no app store delays)
- Faster iteration (refresh, no recompile)
- Can eventually wrap with Electron/Capacitor for native apps

---

## Technology Stack (Revised for Next.js)

### Frontend
- **Framework:** Next.js 14+ (React 18+)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + custom CSS modules
- **State Management:** Zustand (lightweight, performant)
- **Real-time Communication:**
  - WebRTC (peer-to-peer audio/video)
  - Socket.io (signaling, mesh routing metadata)
- **Audio Processing:** Web Audio API + Opus codec (via libopus.js)
- **Mapping:** Leaflet.js (shows rider positions via GPS)
- **Build Tool:** Next.js built-in (Webpack 5)

### Backend (Signaling Server)
- **Runtime:** Node.js 18+
- **Framework:** Express.js (or Fastify for performance)
- **Database:** PostgreSQL (user auth, ride history, mesh topology)
- **Real-time:** Socket.io (signaling for WebRTC offer/answer/ICE)
- **Caching:** Redis (session management, mesh state)
- **Authentication:** JWT (stateless, distributed)
- **Containerization:** Docker + Docker Compose (local dev)
- **Deployment:** AWS (ECS, RDS), DigitalOcean, or Vercel (frontend only)

### Client-Side Mesh Logic
- **Routing Protocol:** Simplified custom OLSR-inspired (Optimized Link State Routing)
  - Why custom: OLSR is overkill for this use case, need lightweight JS implementation
  - Detects neighbors, calculates best path to distant riders
  - Runs every 5-10 seconds (mobile devices can't handle higher frequency)
- **Codec:** Opus (20ms frames, variable bitrate 8-128kbps)
- **Transport:** RTP over UDP (via WebRTC)

### Development Tools
- **Version Control:** Git + GitHub
- **Package Manager:** npm or pnpm (faster)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting:** ESLint + Prettier
- **API Documentation:** Swagger/OpenAPI
- **Monitoring:** Sentry (errors), LogRocket (session replay for debugging)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Rider Browser (Next.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ UI Layer (React Components)                          │   │
│  │ - Ride Dashboard, Rider List, Map, Settings         │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                        ↓           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ State Management (Zustand)                           │   │
│  │ - Rider state, mesh topology, audio settings        │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                        ↓           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Mesh Routing Engine (Custom JS)                      │   │
│  │ - OLSR-lite: neighbor detection, path calculation   │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                        ↓           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ WebRTC Peer Manager                                  │   │
│  │ - Establish P2P connections to neighbors            │   │
│  │ - RTP/Audio streaming                                │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                        ↓           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Web Audio API                                        │   │
│  │ - Microphone input, echo cancellation, mixing       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
        ↓                                      ↓
   ┌────────────────────────┐       ┌────────────────────────┐
   │  Socket.io             │       │  WebRTC (Peer A)       │
   │  (Signaling)           │       │  (Peer B - Direct)     │
   │  - Offers/Answers      │       │  - Audio Stream RTP    │
   │  - ICE candidates      │       │                        │
   │  - Topology updates    │       │  (Peer C via Peer B)   │
   │  - Routing info        │       │  - Relayed RTP         │
   └────────────────────────┘       └────────────────────────┘
        ↓
   ┌─────────────────────────────────────────────┐
   │   Signaling Server (Node.js + Express)     │
   │                                              │
   │  ┌─────────────────────────────────────┐   │
   │  │ Socket.io Server                    │   │
   │  │ - Manage live WebSocket connections│   │
   │  │ - Forward offer/answer between      │   │
   │  │   riders in group                   │   │
   │  └─────────────────────────────────────┘   │
   │  ┌─────────────────────────────────────┐   │
   │  │ REST API Endpoints                  │   │
   │  │ - Create ride, join ride            │   │
   │  │ - Get group roster, GPS locations   │   │
   │  │ - Auth (JWT)                        │   │
   │  └─────────────────────────────────────┘   │
   │  ┌─────────────────────────────────────┐   │
   │  │ Database (PostgreSQL)               │   │
   │  │ - Users, Rides, Mesh topology logs  │   │
   │  └─────────────────────────────────────┘   │
   └─────────────────────────────────────────────┘
```

---

## Mesh Routing Logic (Simplified OLSR)

### How Riders Discover Each Other

1. **Broadcast HELLO (every 5 sec)**
   - Each rider sends a `HELLO` message via Socket.io
   - Contains: rider_id, GPS location, signal_strength
   - Only visible to server initially

2. **Server computes neighbors**
   - Signal strength threshold: -70 dBm (configurable)
   - Distance: riders within ~1km are potential neighbors
   - Updates all riders with "who's near me"

3. **Riders establish P2P connections**
   - For each neighbor: initiate WebRTC connection
   - Exchange SDP offer/answer via Socket.io signaling
   - Once connected: direct RTP audio stream

4. **Multi-hop relay (mesh)**
   - Rider A wants to hear Rider D (not direct neighbor)
   - Server calculated path: A → B → C → D
   - When D speaks: audio sent to C, C relays to B, B relays to A
   - Latency: ~100ms per hop (acceptable for voice)

### Data Structures

**Rider State (client-side Zustand store):**
```javascript
{
  riderId: "uuid-123",
  name: "John",
  gpsLocation: { lat: 40.7128, lng: -74.0060 },
  isAudioEnabled: true,
  isMuted: false,
  signalStrength: -65, // dBm
  neighbors: [
    { riderId: "uuid-456", name: "Jane", distance: 200, rssi: -60 },
    { riderId: "uuid-789", name: "Bob", distance: 1500, rssi: -72 }
  ],
  meshPath: {
    "uuid-789": ["uuid-456"] // reach Bob via Jane
  },
  webrtcConnections: {
    "uuid-456": RTCPeerConnection, // direct
    "uuid-789": null // relayed via Jane
  }
}
```

**Network Message (via Socket.io):**
```json
{
  "type": "HELLO",
  "riderId": "uuid-123",
  "name": "John",
  "gpsLocation": { "lat": 40.7128, "lng": -74.0060 },
  "timestamp": 1712345678000,
  "neighborList": [
    { "riderId": "uuid-456", "signalStrength": -60 }
  ]
}
```

---

## Key Components & Modules

### 1. WebRTC Manager (`lib/webrtc-manager.ts`)
```typescript
class WebRTCManager {
  // Manage peer connections
  async createPeerConnection(peerId: string): RTCPeerConnection
  async addIceCandidate(peerId: string, candidate: RTCIceCandidate)
  async sendOffer(peerId: string)
  async handleAnswer(peerId: string, sdp: RTCSessionDescription)
  closePeerConnection(peerId: string)
  
  // Audio routing
  async addLocalAudioTrack(stream: MediaStream)
  getRemoteAudioStream(peerId: string): MediaStream
}
```

### 2. Mesh Router (`lib/mesh-router.ts`)
```typescript
class MeshRouter {
  // Topology management
  updateNeighbors(neighborList: Rider[])
  calculateShortestPath(targetRiderId: string): string[] // chain of rider IDs
  
  // Relay logic
  async relayAudioToNextHop(peerId: string, audioData: Uint8Array, nextHopId: string)
  
  // Metrics
  getLatency(peerId: string): number
  getSignalStrength(peerId: string): number
}
```

### 3. Audio Processor (`lib/audio-processor.ts`)
```typescript
class AudioProcessor {
  // Microphone input
  async initMicrophone(constraints: MediaStreamConstraints)
  
  // Echo cancellation, noise suppression
  applyAEC(audioContext: AudioContext)
  
  // Opus encoding
  encodeAudioFrame(pcmData: Uint8Array): Uint8Array // Opus bitstream
  decodeAudioFrame(opusData: Uint8Array): Uint8Array // PCM
  
  // Playback
  playRemoteAudio(audioData: Uint8Array)
}
```

### 4. Ride Manager (`lib/ride-manager.ts`)
```typescript
class RideManager {
  async createRide(name: string): Ride
  async joinRide(rideCode: string): void
  async leaveRide(): void
  getRideState(): RideState
  updateRiderLocation(lat: number, lng: number)
}
```

### React Components

1. **Dashboard (`pages/dashboard.tsx`)**
   - Displays active ride, rider list, map, audio controls

2. **Ride Setup (`pages/ride-setup.tsx`)**
   - Create new ride, input code to join, scan QR

3. **Settings (`pages/settings.tsx`)**
   - Microphone selection, audio levels, privacy settings

4. **Map (`components/RiderMap.tsx`)**
   - Shows all riders on Leaflet map, real-time updates

5. **RiderList (`components/RiderList.tsx`)**
   - List of riders, signal strength, battery level

6. **AudioControls (`components/AudioControls.tsx`)**
   - Mute button, volume slider, echo test

---

## API Endpoints (Signaling Server)

### Authentication
- `POST /auth/register` - Register new rider account
- `POST /auth/login` - Login, get JWT token
- `POST /auth/refresh` - Refresh JWT

### Rides
- `POST /rides` - Create new ride
- `GET /rides/:rideCode` - Get ride details
- `POST /rides/:rideCode/join` - Join ride (WebSocket connects afterward)
- `DELETE /rides/:rideCode/leave` - Leave ride

### Mesh Topology (realtime via Socket.io)
- `HELLO` - Broadcast rider presence + GPS
- `OFFER` - WebRTC offer to peer
- `ANSWER` - WebRTC answer from peer
- `ICE_CANDIDATE` - ICE candidate for NAT traversal
- `ROUTE_UPDATE` - Server-sent mesh path update
- `AUDIO_RELAY` - Audio frame for multi-hop delivery

### GPS & Status
- `POST /riders/location` - Update current GPS
- `GET /rides/:rideCode/roster` - Get all riders in group with locations

---

## Development Roadmap (Phases)

### Phase 1: MVP (Weeks 1-12) - Direct P2P + Basic Mesh
**Goals:**
- Establish WebRTC P2P audio between 2-3 riders
- Basic mesh with 1 relay hop
- Ride creation & joining UI
- GPS tracking on map

**Deliverables:**
- [ ] Next.js project scaffold with TypeScript
- [ ] Signaling server (Express + Socket.io) running locally
- [ ] WebRTC peer manager (establish connections)
- [ ] Basic mesh router (calculate neighbors)
- [ ] React components (dashboard, ride setup)
- [ ] Audio capture & playback
- [ ] Deploy to test environment

**Week Breakdown:**
- Week 1-2: Project setup, architecture decisions, boilerplate
- Week 3-4: WebRTC peer manager, signaling server
- Week 5-6: Basic mesh router, HELLO/OFFER/ANSWER flow
- Week 7-8: Audio processor, echo cancellation
- Week 9-10: React UI components, ride lifecycle
- Week 11-12: Testing, bug fixes, load testing (5-10 riders)

---

### Phase 2: Advanced Mesh (Weeks 13-20) - Multi-hop, Optimization
**Goals:**
- Support 3+ relay hops
- Implement proper OLSR routing
- Optimize for latency & battery
- Handle rider mobility (dynamic topology)

**Deliverables:**
- [ ] Full OLSR implementation
- [ ] Path calculation algorithm (Dijkstra)
- [ ] Dynamic re-routing when riders move
- [ ] Codec bitrate adaptation (poor signal → lower kbps)
- [ ] Load testing (20+ riders)
- [ ] Performance profiling & optimization

**Week Breakdown:**
- Week 13-14: OLSR protocol (MPR selection, etc.)
- Week 15-16: Path calculation & dynamic rerouting
- Week 17-18: Bitrate adaptation, codec selection
- Week 19-20: Load testing, scaling fixes

---

### Phase 3: Production Ready (Weeks 21-28)
**Goals:**
- Deploy to production (AWS or DigitalOcean)
- Mobile responsiveness & PWA
- User authentication & profiles
- Ride recording & playback

**Deliverables:**
- [ ] PostgreSQL database schema
- [ ] User auth system (JWT, email verification)
- [ ] Persistent storage (ride history, contacts)
- [ ] PWA setup (offline support, installable)
- [ ] Mobile optimization
- [ ] Monitoring & analytics (Sentry, custom logging)
- [ ] Launch beta (100-500 users)

---

## Local Development Setup

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+
Docker & Docker Compose (optional, for PostgreSQL)
pnpm or npm
```

### Installation

1. **Clone repo & install dependencies**
```bash
git clone <repo>
cd motorcycle-intercom
pnpm install
```

2. **Setup PostgreSQL (via Docker)**
```bash
docker-compose up -d postgres
# Creates database at localhost:5432
```

3. **Setup environment variables**
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/intercom
JWT_SECRET=your-secret-key
```

4. **Start signaling server**
```bash
cd backend
npm install
npm run dev
# Listens on http://localhost:3001
```

5. **Start Next.js frontend**
```bash
cd frontend
pnpm dev
# Listens on http://localhost:3000
```

6. **Test WebRTC connection**
   - Open http://localhost:3000 in 2-3 browsers
   - Create a ride, join from other browsers
   - Exchange offers/answers in browser console
   - Hear audio if microphone is enabled

---

## Testing Strategy

### Unit Tests (Vitest)
```bash
# Test router algorithms, state management
pnpm test lib/mesh-router.test.ts
pnpm test lib/webrtc-manager.test.ts
```

### E2E Tests (Playwright)
```bash
# Test full user flow: create ride → join → audio
pnpm test:e2e
```

### Load Testing
```bash
# Simulate 20+ riders joining same ride
npm run test:load -- --riders 20 --duration 300
```

### Network Simulation
- Use Chrome DevTools to throttle connection
- Test mesh fallback when direct link fails
- Verify relay logic under packet loss (20-30%)

---

## Common Challenges & Solutions

### Challenge 1: NAT Traversal
**Problem:** Two riders behind different NAT/firewalls can't connect P2P

**Solution:**
- Use STUN servers (free: stun.l.google.com:19302)
- If STUN fails, fallback to relay via signaling server
- TURN server (paid option: coturn)

**Code Example:**
```javascript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
});
```

### Challenge 2: Echo & Feedback
**Problem:** Riders hear themselves delayed (echo)

**Solution:**
- Use headphones (not speakers)
- Enable Web Audio AEC (Automatic Echo Cancellation)
- Filter out own audio stream from playback

**Code:**
```javascript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};
```

### Challenge 3: Mobile Battery Drain
**Problem:** Phone dies after 2-3 hours of riding

**Solution:**
- Reduce codec bitrate on cellular (8kbps Opus)
- Disable GPS updates when stationary
- Use wake lock API to prevent screen sleep (but allow CPU sleep)
- Profile with DevTools Lighthouse

### Challenge 4: Latency Over Relays
**Problem:** Rider 3 relaying through Rider 2 to Rider 1 has 200ms+ latency

**Solution:**
- Limit relay hops to 3 maximum
- If >3 hops needed, encourage riders to move closer
- Compress audio more aggressively on long paths
- Warn user: "Poor signal, consider moving closer"

### Challenge 5: Dynamic Topology Changes
**Problem:** Rider leaves group suddenly, breaking paths for others

**Solution:**
- Detect connection loss within 2 seconds
- Trigger re-routing immediately
- Notify affected riders: "Reconnecting..."
- Cache alternate paths for quick failover

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Audio latency** | < 150ms (direct), < 250ms (1-hop relay) | Acceptable for real-time chat |
| **Call setup time** | < 5 seconds | Offer/answer/ICE exchange |
| **Codec bitrate** | 16-32 kbps (Opus) | Quality audio without draining battery |
| **CPU usage** | < 15% on mobile | Keep processor cool, extend battery |
| **Memory** | < 100 MB | Per browser tab |
| **Battery drain** | < 20% per hour | 5-hour ride on single charge |
| **Packet loss tolerance** | < 5% | Opus gracefully degrades |
| **Max riders per group** | 20 | With proper mesh routing |

---

## Security Considerations

1. **Authentication:** JWT tokens, refresh tokens, secure storage (httpOnly cookies)
2. **Encryption:** DTLS-SRTP for audio (WebRTC built-in), TLS for signaling
3. **Input validation:** Sanitize GPS coordinates, rider names, messages
4. **Rate limiting:** Prevent spam (max 10 HELLO messages per second per rider)
5. **Privacy:** Option to hide GPS from other riders, disable location tracking
6. **Ride codes:** Use 6-char alphanumeric codes (36^6 = 2 billion combinations)

---

## Deployment Options

### Option 1: Vercel (Frontend) + AWS (Backend)
- Frontend: Vercel (free tier, automatic deployments)
- Backend: AWS ECS (containers) + RDS (PostgreSQL)
- WebSocket: AWS API Gateway or self-hosted Socket.io
- Cost: ~$50-200/month

### Option 2: DigitalOcean (All-in-one)
- App Platform (auto-scaling)
- Managed PostgreSQL
- Single $12-24/month droplet to start
- Cost: ~$30-100/month

### Option 3: Self-hosted (Kubernetes)
- Your own servers or on-prem
- Full control, higher complexity
- Not recommended for MVP

**Recommendation for MVP:** Vercel + DigitalOcean App Platform (simplest, cheapest)

---

## Next Steps

1. **Create Next.js project**
   ```bash
   npx create-next-app@latest motorcycle-intercom --typescript --tailwind
   ```

2. **Setup backend folder structure**
   ```
   backend/
   ├── src/
   │   ├── routes/
   │   ├── services/
   │   ├── models/
   │   └── middleware/
   ├── package.json
   ├── docker-compose.yml
   └── .env
   ```

3. **Initialize Git + GitHub repo**
   ```bash
   git init
   git remote add origin <your-repo>
   ```

4. **Create first PR:** WebRTC peer manager skeleton

5. **Deploy signaling server to staging:** DigitalOcean App Platform

---

## Resources

- **WebRTC MDN Docs:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Socket.io Docs:** https://socket.io/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **Opus Codec:** https://opus-codec.org/
- **OLSR Protocol (reference):** https://www.ietf.org/rfc/rfc3626.txt
- **Leaflet.js (Maps):** https://leafletjs.com/

