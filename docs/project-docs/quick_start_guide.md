# Mesh Motorcycle Intercom - Quick Start Guide

## TL;DR - Get Running in 15 Minutes

```bash
# 1. Create Next.js project
npx create-next-app@latest motorcycle-intercom --typescript --tailwind --app

# 2. Install dependencies
cd motorcycle-intercom
npm install socket.io-client zustand leaflet react-leaflet axios dotenv

# 3. Create backend folder and install
mkdir backend
cd backend
npm init -y
npm install express socket.io cors dotenv
npm install -D typescript @types/express @types/node nodemon

# 4. Add start scripts to backend/package.json
# "scripts": {
#   "dev": "nodemon --exec ts-node src/index.ts",
#   "start": "node dist/index.js"
# }

# 5. Copy files from implementation guide into your project

# 6. Start both servers
# Terminal 1:
cd motorcycle-intercom
npm run dev

# Terminal 2:
cd motorcycle-intercom/backend
npm run dev

# Visit http://localhost:3000
```

---

## Step-by-Step Setup (Detailed)

### Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager
- Git for version control
- A text editor (VS Code recommended)

### 1. Create Next.js Project Structure

```bash
# Create main project
npx create-next-app@latest motorcycle-intercom \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-src-dir

cd motorcycle-intercom

# Install core dependencies
npm install socket.io-client zustand leaflet react-leaflet axios

# Install dev dependencies
npm install -D @types/leaflet
```

### 2. Create Folder Structure

```bash
# Frontend structure
mkdir -p lib/{hooks,utils} components/{layout,common} store public/icons

# Backend structure
mkdir -p backend/src/{routes,services,sockets,db,utils,middleware}
```

### 3. Setup Environment Files

**`motorcycle-intercom/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**`backend/.env`:**
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 4. Create Core TypeScript Files

Start by creating the core library files from the implementation guide:
1. `lib/types.ts` - Shared types
2. `lib/webrtc-manager.ts` - WebRTC manager
3. `lib/mesh-router.ts` - Mesh routing logic
4. `lib/socket-client.ts` - Socket.io client
5. `store/index.ts` - Zustand store

### 5. Create React Components

Create these components from the implementation guide:
1. `app/dashboard/page.tsx` - Main dashboard
2. `components/RiderList.tsx` - Rider list component
3. `components/RiderMap.tsx` - Map display
4. `components/AudioControls.tsx` - Audio controls

### 6. Setup Backend Server

**`backend/src/index.ts`:**
```typescript
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('HELLO', (data) => {
    socket.broadcast.emit('HELLO', {
      from: socket.id,
      ...data,
    });
  });

  socket.on('OFFER', (data) => {
    io.to(data.to).emit('OFFER', {
      from: socket.id,
      ...data,
    });
  });

  socket.on('ANSWER', (data) => {
    io.to(data.to).emit('ANSWER', {
      from: socket.id,
      ...data,
    });
  });

  socket.on('ICE_CANDIDATE', (data) => {
    io.to(data.to).emit('ICE_CANDIDATE', {
      from: socket.id,
      ...data,
    });
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

**`backend/package.json`:**
```json
{
  "name": "motorcycle-intercom-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "npx ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/express": "^4.17.20",
    "@types/node": "^20.5.0",
    "ts-node": "^10.9.1"
  }
}
```

### 7. Run Both Servers

**Terminal 1 - Frontend (http://localhost:3000):**
```bash
cd motorcycle-intercom
npm run dev
```

**Terminal 2 - Backend (http://localhost:3001):**
```bash
cd motorcycle-intercom/backend
npm run dev
```

### 8. Test the Connection

1. Open http://localhost:3000 in browser
2. Open browser DevTools (F12) → Console
3. You should see logs like:
   ```
   [Socket] Connected
   [WebRTC] Local audio initialized
   ```

---

## Project Structure Reference

```
motorcycle-intercom/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (home)
│   └── dashboard/
│       └── page.tsx (main UI)
│
├── lib/
│   ├── types.ts (shared types)
│   ├── webrtc-manager.ts (WebRTC)
│   ├── mesh-router.ts (routing)
│   ├── socket-client.ts (Socket.io)
│   └── hooks/
│       └── useWebRTC.ts
│
├── components/
│   ├── RiderList.tsx
│   ├── RiderMap.tsx
│   ├── AudioControls.tsx
│   └── SignalStrength.tsx
│
├── store/
│   └── index.ts (Zustand state)
│
├── backend/
│   └── src/
│       └── index.ts (Express + Socket.io)
│
├── .env.local
├── next.config.js
├── tsconfig.json
└── tailwind.config.ts
```

---

## Common Issues & Fixes

### Issue 1: "Cannot find module 'socket.io-client'"
**Fix:**
```bash
npm install socket.io-client
```

### Issue 2: Backend server won't connect
**Check:**
- Backend is running on port 3001
- CORS is enabled (check `corsOrigin` in backend/src/index.ts)
- Frontend URL matches in backend .env

### Issue 3: Microphone permission denied
**Fix:**
- Chrome requires HTTPS (or localhost)
- Check browser microphone permissions
- Grant permission when prompted

### Issue 4: WebRTC connection fails
**Likely causes:**
- Both riders not in same Socket.io room
- Firewall blocking WebRTC
- Browser doesn't support WebRTC (use Chrome, Firefox, Safari)

**Debug:**
```javascript
// In browser console
// Check if WebRTC is available
console.log('RTCPeerConnection available:', !!window.RTCPeerConnection)

// Check Socket.io connection
console.log('Socket connected:', io.connection.connected)
```

---

## Next Steps After Setup

1. **Test WebRTC P2P Audio** (Week 3-4)
   - Open 2 browser tabs on localhost:3000
   - Verify audio stream between tabs
   - Check latency, quality

2. **Build Mesh Routing** (Week 5-6)
   - Test with 3+ riders
   - Verify relay works
   - Monitor path calculation

3. **Add UI Refinements** (Week 7-8)
   - Better visual feedback
   - Settings/preferences
   - Ride creation UI

4. **Deploy to Staging** (Week 9-10)
   - Move backend to cloud (DigitalOcean, AWS)
   - Test with real network conditions
   - Load testing

---

## Development Workflow

### Daily Development
```bash
# Terminal 1: Frontend dev server
cd motorcycle-intercom
npm run dev

# Terminal 2: Backend dev server
cd motorcycle-intercom/backend
npm run dev

# Terminal 3: Watch logs (optional)
npm run logs
```

### Testing Locally
```bash
# Test with multiple riders
# Open http://localhost:3000 in multiple browser tabs/windows
# Each tab creates a separate WebRTC connection

# Monitor network traffic
# DevTools → Network tab → WS filter (WebSocket)
# DevTools → Console to see logs
```

### Git Workflow
```bash
git init
git add .
git commit -m "Initial commit: Next.js setup with WebRTC"
git remote add origin <your-repo-url>
git push -u origin main

# Feature branches
git checkout -b feature/mesh-routing
# ... make changes ...
git commit -am "Implement mesh routing"
git push origin feature/mesh-routing
# Open PR
```

---

## File Checklist

Before starting development, you should have these files:

**Frontend (`/`):**
- [ ] `lib/types.ts`
- [ ] `lib/webrtc-manager.ts`
- [ ] `lib/mesh-router.ts`
- [ ] `lib/socket-client.ts`
- [ ] `lib/hooks/useWebRTC.ts`
- [ ] `store/index.ts`
- [ ] `components/RiderList.tsx`
- [ ] `components/RiderMap.tsx`
- [ ] `components/AudioControls.tsx`
- [ ] `app/layout.tsx`
- [ ] `app/dashboard/page.tsx`

**Backend (`/backend`):**
- [ ] `src/index.ts`
- [ ] `package.json` (with dev script)
- [ ] `.env`

---

## Performance Targets for MVP

| Metric | Target |
|--------|--------|
| **Page Load** | < 3 seconds |
| **WebRTC Setup** | < 5 seconds |
| **Audio Latency** | < 150ms |
| **Mesh Hop Latency** | ~100ms per hop |
| **Browser Memory** | < 100MB |
| **CPU Usage** | < 15% |

---

## Getting Help

### Useful Resources
- **WebRTC**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Next.js**: https://nextjs.org/docs
- **Socket.io**: https://socket.io/docs/
- **Zustand**: https://github.com/pmndrs/zustand

### Debugging Tips
1. **Enable Socket.io debug logs**
   ```javascript
   import { io } from 'socket.io-client';
   const socket = io('http://localhost:3001', {
     reconnection: true,
     debug: true, // Enable socket.io debug
   });
   ```

2. **Check WebRTC stats**
   ```javascript
   // In browser console
   // Get stats from peer connection
   peerConnection.getStats().then(report => {
     report.forEach(stat => {
       if (stat.type === 'inbound-rtp') {
         console.log('RTT:', stat.roundTripTime);
         console.log('Jitter:', stat.jitter);
         console.log('Packets Lost:', stat.packetsLost);
       }
     });
   });
   ```

3. **Monitor Socket.io events**
   ```javascript
   // In browser console
   const socket = window.socketClient.getSocket();
   ['connect', 'disconnect', 'HELLO', 'OFFER', 'ANSWER', 'ICE_CANDIDATE'].forEach(event => {
     socket.on(event, (data) => console.log(`[${event}]`, data));
   });
   ```

---

## Deployment Preview (Future)

Once MVP is working:

### Deploy Frontend (Vercel)
```bash
npm install -g vercel
vercel
# Automatic deployment from GitHub
```

### Deploy Backend (DigitalOcean)
```bash
# Push Docker image
docker build -t motorcycle-intercom:latest .
docker tag motorcycle-intercom:latest registry.digitalocean.com/your-registry/motorcycle-intercom:latest
docker push registry.digitalocean.com/your-registry/motorcycle-intercom:latest

# Deploy via App Platform
# Choose Docker image from registry
# Set environment variables
# Click deploy
```

---

## Quick Command Reference

```bash
# Start everything
npm run dev           # Frontend (terminal 1)
cd backend && npm run dev  # Backend (terminal 2)

# Debugging
npm run lint          # Check code quality
npm run type-check    # TypeScript check
npm run build         # Production build
npm run test          # Run tests (when added)

# Backend
cd backend
npm install <package> # Add dependency
npm run dev           # Start server
npm run build         # Compile TypeScript
```

---

## Success Criteria for MVP

✅ **Week 2:** Backend running, Socket.io connected
✅ **Week 4:** WebRTC P2P audio working between 2 browsers
✅ **Week 6:** Basic mesh routing (1-hop relay)
✅ **Week 8:** UI complete, 5+ riders testable
✅ **Week 10:** Ready for beta launch (100 users)

---

## Next Document to Read

1. **mesh_intercom_nextjs_dev_guide.md** - Full architecture details
2. **implementation_guide.md** - Code examples for each component
3. **project_structure.md** - Complete folder reference

Happy coding! 🚀

