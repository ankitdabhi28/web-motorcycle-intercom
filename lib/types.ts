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
