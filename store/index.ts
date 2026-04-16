import { create } from "zustand";
import axios from "axios";
import { RideState, Rider, MeshNeighbor } from "@/lib/types";
import { setToken, getToken, removeToken, fetchCurrentUser } from "@/lib/auth";

interface StoreState extends RideState {
  // Auth actions
  token: string | null;
  user: { userId: string; email: string; name: string } | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  setAuthData: (
    token: string,
    user: { userId: string; email: string; name: string },
  ) => void;
  restoreRideState: (
    rideCode: string,
    rideId: string,
    isLeader?: boolean,
  ) => void;

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
  isAuthLoading: true,
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
    const response = await axios.post(`${backendUrl}/api/auth/login`, {
      email,
      password,
    });
    const data = response.data;
    setToken(data.token);
    set({
      token: data.token,
      user: { userId: data.userId, email: data.email, name: data.name },
    });
  },

  register: async (email, password, name) => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await axios.post(`${backendUrl}/api/auth/register`, {
      email,
      password,
      name,
    });
    const data = response.data;
    setToken(data.token);
    set({
      token: data.token,
      user: { userId: data.userId, email: data.email, name: data.name },
    });
  },

  logout: () => {
    removeToken();
    set({
      token: null,
      user: null,
      rideCode: null,
      rideId: null,
      isLeader: false,
      isAudioRunning: false,
    });
  },

  initializeAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthLoading: false });
      return;
    }

    try {
      const data = await fetchCurrentUser(token);
      const { userId, email, name, activeRide } = data;

      set({ token, user: { userId, email, name }, isAuthLoading: false });

      // Redirect to ride route if active ride exists
      if (activeRide && typeof window !== "undefined") {
        window.location.href = `/ride/${activeRide.rideCode}`;
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      removeToken();
      set({ token: null, user: null, isAuthLoading: false });
    }
  },

  setAuthData: (token, user) => {
    setToken(token);
    set({ token, user });
  },

  restoreRideState: (rideCode, rideId, isLeader = false) => {
    set({ rideCode, rideId, isLeader, isAudioRunning: true });
  },

  // Methods
  startRide: async (rideName) => {
    const token = get().token;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await axios.post(
      `${backendUrl}/api/rides`,
      { name: rideName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const { rideCode } = response.data;
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
    try {
      await axios.post(
        `${backendUrl}/api/rides/${rideCode}/join`,
        { riderId: localRider.riderId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      set({ rideCode, isAudioRunning: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          (error.response?.data as { message?: string; error?: string })
            ?.message ||
          (error.response?.data as { message?: string; error?: string })
            ?.error ||
          "Failed to join ride";
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  leaveRide: async () => {
    const { rideCode, localRider, token } = get();
    if (!rideCode) return;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    await axios.delete(`${backendUrl}/api/rides/${rideCode}/leave`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: { riderId: localRider.riderId },
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
