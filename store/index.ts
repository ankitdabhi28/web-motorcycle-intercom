import { create } from "zustand";
import { RideState, Rider, MeshNeighbor } from "@/lib/types";

interface StoreState extends RideState {
  // Auth actions
  token: string | null;
  user: { userId: string; email: string; name: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;

  // Ride actions
  startRide: (rideName: string) => Promise<{ rideCode: string }>;
  joinRide: (rideCode: string) => Promise<void>;
  leaveRide: () => Promise<void>;

  // Rider actions
  setLocalRider: (rider: Rider) => void;
  updateRemoteRider: (rider: Rider) => void;
  removeRemoteRider: (riderId: string) => void;
  updateRiderConnection: (riderId: string, isConnected: boolean) => void;

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
  token: null,
  user: null,
  rideId: null,
  rideCode: null,
  isLeader: false,
  localRider: {
    riderId: "",
    name: "",
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

  // Auth methods
  login: async (email, password) => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Login failed");
    }
    const data = await response.json();
    set({
      token: data.token,
      user: { userId: data.userId, email: data.email, name: data.name },
    });
  },

  register: async (email, password, name) => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Registration failed");
    }
    const data = await response.json();
    set({
      token: data.token,
      user: { userId: data.userId, email: data.email, name: data.name },
    });
  },

  logout: () => {
    set({
      token: null,
      user: null,
      rideCode: null,
      rideId: null,
      isLeader: false,
      isAudioRunning: false,
    });
  },

  // Methods
  startRide: async (rideName) => {
    const token = get().token;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/rides`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    const token = get().token;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const localRider = get().localRider;
    const response = await fetch(`${backendUrl}/api/rides/${rideCode}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ riderId: localRider.riderId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || errorData.error || "Failed to join ride",
      );
    }
    set({ rideCode, isAudioRunning: true });
  },

  leaveRide: async () => {
    const { rideCode, localRider, token } = get();
    if (!rideCode) return;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    await fetch(`${backendUrl}/api/rides/${rideCode}/leave`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ riderId: localRider.riderId }),
    });
    set({
      rideCode: null,
      rideId: null,
      isLeader: false,
      isAudioRunning: false,
    });
  },

  setLocalRider: (rider) => set({ localRider: rider }),

  updateRemoteRider: (rider) =>
    set((state) => ({
      remoteRiders: {
        ...state.remoteRiders,
        [rider.riderId]: rider,
      },
    })),

  removeRemoteRider: (riderId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [riderId]: _, ...rest } = state.remoteRiders;
      return { remoteRiders: rest };
    }),

  updateRiderConnection: (riderId, isConnected) =>
    set((state) => {
      const rider = state.remoteRiders[riderId];
      if (!rider) return state;

      return {
        remoteRiders: {
          ...state.remoteRiders,
          [riderId]: {
            ...rider,
            isOnline: isConnected,
            timestamp: Date.now(),
          },
        },
      };
    }),

  updateNeighbors: (neighbors) => set({ neighbors }),

  updateMeshPath: (targetRiderId, path) =>
    set((state) => ({
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

  toggleMute: (muted) =>
    set((state) => ({
      localRider: { ...state.localRider, isMuted: muted },
    })),

  updateLocation: (lat, lng) =>
    set((state) => ({
      localRider: {
        ...state.localRider,
        gpsLocation: { lat, lng },
      },
    })),
}));
