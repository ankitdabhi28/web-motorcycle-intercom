# 🏍️ Motorcycle Intercom

A real-time motorcycle intercom system built with Next.js, WebRTC, and Socket.io. Enables group audio communication between riders with GPS tracking, mesh networking, and automatic geofencing.

## Features

- **Real-time Audio Communication**: WebRTC-based peer-to-peer audio between riders
- **GPS Location Tracking**: Real-time rider positions on interactive map
- **Mesh Networking**: Multi-hop relay for extended range using Dijkstra's algorithm
- **Automatic Geofencing**: Auto-connect/disconnect based on rider proximity (500m threshold)
- **Map Clustering**: Intelligent rider grouping for large groups (10+ riders)
- **Rider Paths/Trails**: Visual historical tracking of rider movements
- **User Authentication**: JWT-based secure authentication
- **Responsive Design**: Mobile-friendly interface for on-the-go use

## Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Leaflet**: Interactive maps
- **Zustand**: Lightweight state management
- **Socket.io Client**: Real-time communication

### Backend
- **Express**: Node.js web framework
- **Socket.io**: WebSocket server for real-time events
- **SQLite**: Database (development) / PostgreSQL (production)
- **JWT**: Authentication
- **WebRTC**: Peer-to-peer audio

## Prerequisites

- Node.js 18+ and npm/yarn
- Modern web browser with WebRTC support
- PostgreSQL 12+ (for production deployment only)

## Quick Start

### Option 1: Run Both Servers (Recommended)

**Linux/macOS:**
```bash
chmod +x dev-all.sh
./dev-all.sh
```

**Windows:**
```bash
dev-all.bat
```

This will start both frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

### Option 2: Manual Setup

**1. Install Dependencies**

Frontend:
```bash
yarn install
```

Backend:
```bash
cd backend
yarn install
cd ..
```

**2. Configure Environment**

Create `backend/.env`:
```env
# Database - SQLite (file-based, no installation needed)
# Database file will be created at: backend/motorcycle_intercom.db

# JWT Secret (change this in production)
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Server Port
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

**3. Setup Database (Optional)**

The database will be automatically created as `motorcycle_intercom.db` in the backend directory on first run.

For production deployment with PostgreSQL, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

**4. Start Servers**

Backend:
```bash
cd backend
yarn dev
```

Frontend (in new terminal):
```bash
yarn dev
```

**5. Access Application**

Open http://localhost:3000 in your browser.

## Project Structure

```
motorcycle-intercom/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── login/              # Authentication pages
│   └── audio-test/         # WebRTC audio testing
├── backend/                # Express backend server
│   ├── src/
│   │   ├── db/            # Database schema and connection
│   │   ├── routes/        # API routes
│   │   └── socket/        # Socket.io handlers
│   └── .env               # Backend environment variables
├── components/             # React components
│   ├── RiderList.tsx      # Rider list display
│   ├── RiderMap.tsx      # Interactive map
│   └── AudioControls.tsx  # Audio controls
├── lib/                   # Core libraries
│   ├── socket-client.ts   # Socket.io client wrapper
│   ├── webrtc-manager.ts  # WebRTC management
│   ├── meshRouting.ts     # Mesh routing algorithms
│   ├── mapClustering.ts   # Map clustering logic
│   └── riderPaths.ts      # Path tracking algorithms
├── lib/hooks/             # React hooks
│   ├── useGeolocation.ts  # GPS location tracking
│   ├── useGeofencing.ts   # Proximity-based connections
│   ├── useMeshRouting.ts  # Mesh routing logic
│   ├── useMapClustering.ts # Map clustering hook
│   └── useRiderPaths.ts   # Path tracking hook
├── store/                 # Zustand state management
│   └── index.ts           # Global state store
├── docs/                  # Documentation
│   └── DATABASE_SETUP.md  # Database setup guide
└── PROGRESS_LOG.md        # Development progress tracking
```

## Usage

### 1. Create Account
- Register a new account on the login page
- Provide email, password, and rider name

### 2. Start or Join a Ride
- Create a new ride (becomes leader) or join with a ride code
- Share the 6-character ride code with other riders

### 3. Enable Audio
- Click "Start Audio" to begin WebRTC audio communication
- Allow microphone access when prompted

### 4. Track Riders
- View rider positions on the interactive map
- See rider paths/trails showing movement history
- Check connection status and signal strength

### 5. Manage Connections
- Automatic geofencing connects nearby riders
- Manual mute/unmute individual riders
- View connection type (Direct/Relayed)

## Development

### Available Scripts

**Frontend:**
```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
```

**Backend:**
```bash
cd backend
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
```

### Testing WebRTC

Visit `/audio-test` to test WebRTC peer-to-peer audio connections without joining a ride.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Rides
- `POST /api/rides` - Create new ride
- `POST /api/rides/join` - Join existing ride
- `POST /api/rides/leave` - Leave ride
- `GET /api/rides/:code` - Get ride details

### WebSocket Events
- `HELLO` - Initial connection handshake
- `OFFER` - WebRTC offer
- `ANSWER` - WebRTC answer
- `ICE_CANDIDATE` - ICE candidate exchange
- `LOCATION_UPDATE` - GPS location broadcast
- `RIDER_UPDATE` - Rider status updates

## Configuration

### Environment Variables

**Backend (.env):**
```env
# Database (Development: SQLite, Production: PostgreSQL)
# For development, SQLite is used automatically (no config needed)
# For production, set PostgreSQL credentials:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=motorcycle_intercom
# DB_USER=intercom_user
# DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Geofencing Settings

Default threshold: 500 meters
Configurable in `lib/hooks/useGeofencing.ts`

### Mesh Routing

Update interval: 10 seconds
Latency estimate: ~50ms per hop
Configurable in `lib/hooks/useMeshRouting.ts`

## Troubleshooting

### Database Connection Issues
- **Development (SQLite):** Database file is auto-created at `backend/motorcycle_intercom.db`
- **Production (PostgreSQL):** Ensure PostgreSQL is running and credentials in backend/.env are correct
- Check database exists: `sudo -u postgres psql -l`

### WebRTC Not Working
- Ensure HTTPS is used in production (required for WebRTC)
- Check browser permissions for microphone
- Verify STUN/TURN server configuration

### Map Not Loading
- Check browser console for errors
- Verify OpenStreetMap tiles are accessible
- Ensure Leaflet CSS is loaded

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Environment variable configuration
- CORS configuration for API
- Secure WebSocket connections

## Performance Optimizations

- Lazy loading for dashboard components
- Map clustering for large groups
- Path simplification (Douglas-Peucker algorithm)
- Automatic cleanup of old path points
- Connection pooling for database

## License

MIT License - feel free to use this project for your motorcycle intercom needs.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on the GitHub repository.
