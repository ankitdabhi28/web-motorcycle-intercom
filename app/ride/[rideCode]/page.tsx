"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRideStore } from "@/store";
import { socketClient } from "@/lib/socket-client";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useGeofencing } from "@/lib/hooks/useGeofencing";
import { useMeshRouting } from "@/lib/hooks/useMeshRouting";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

const RiderList = lazy(() => import("@/components/RiderList"));
const RiderMap = lazy(() => import("@/components/RiderMap"));
const AudioControls = lazy(() => import("@/components/AudioControls"));
const ConnectionQuality = lazy(() => import("@/components/ConnectionQuality"));
const NetworkStatistics = lazy(() => import("@/components/NetworkStatistics"));

export default function RidePage() {
  const router = useRouter();
  const params = useParams();
  const rideCode = params.rideCode as string;
  const token = useRideStore((state) => state.token);
  const user = useRideStore((state) => state.user);
  const isAuthLoading = useRideStore((state) => state.isAuthLoading);
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const setLocalRider = useRideStore((state) => state.setLocalRider);
  const updateLocation = useRideStore((state) => state.updateLocation);
  const setRideState = useRideStore((state) => state.restoreRideState);
  const logout = useRideStore((state) => state.logout);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { position } = useGeolocation();
  useGeofencing(500); // 500 meter threshold for automatic connection
  useMeshRouting(); // Enable multi-hop mesh routing

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && (!token || !user)) {
      router.push("/login");
    }
  }, [isAuthLoading, token, user, router]);

  // Initialize ride state from URL
  useEffect(() => {
    if (rideCode) {
      setRideState(rideCode, rideCode, false);
    }
  }, [rideCode, setRideState]);

  useEffect(() => {
    // Initialize local rider with authenticated user info
    setLocalRider({
      riderId: `rider-${Math.random().toString(36).substr(2, 9)}`,
      name: user?.name || "Anonymous Rider",
      gpsLocation: { lat: 40.7128, lng: -74.006 }, // Default NYC coordinates
      signalStrength: -60,
      isOnline: true,
      isMuted: false,
      batteryLevel: 95,
      isAudioEnabled: false,
      timestamp: Date.now(),
    });

    // Connect to socket server
    const connectSocket = async () => {
      try {
        await socketClient.connect(
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
          token || "",
        );
        setIsConnected(true);
      } catch (err) {
        setError("Failed to connect to server");
        console.error(err);
      }
    };

    connectSocket();

    return () => {
      socketClient.disconnect();
    };
  }, [setLocalRider, user?.name, token]);

  // Update location from GPS
  useEffect(() => {
    if (position) {
      updateLocation(position.coords.latitude, position.coords.longitude);

      // Broadcast location update to other riders
      const socket = socketClient.getSocket();
      if (socket && rideCode) {
        socket.emit("LOCATION_UPDATE", {
          riderId: localRider.riderId,
          rideCode,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          timestamp: position.timestamp,
        });
      }
    }
  }, [position, localRider.riderId, rideCode, updateLocation]);

  useEffect(() => {
    if (!rideCode || !isConnected) return;

    // Start broadcasting HELLO messages
    const helloInterval = setInterval(() => {
      socketClient.getSocket()?.emit("HELLO", {
        from: localRider.riderId,
        rider: localRider,
      });
    }, 5000); // Every 5 seconds

    // Update ride activity periodically
    const activityInterval = setInterval(async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        await axios.post(
          `${backendUrl}/api/rides/${rideCode}/activity`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (error) {
        console.error("Failed to update ride activity:", error);
      }
    }, 60000); // Every minute

    return () => {
      clearInterval(helloInterval);
      clearInterval(activityInterval);
    };
  }, [rideCode, localRider, isConnected, token]);

  const handleLeaveRide = async () => {
    try {
      await useRideStore.getState().leaveRide();
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to leave ride";
      setError(errorMessage);
      console.error(err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Ride: {rideCode}</h1>
            <p className="text-gray-600 text-sm">
              Riders: {Object.keys(remoteRiders).length + 1}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/rides")}
              className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
            >
              My Rides
            </button>
            <button
              onClick={() => router.push("/audio-test")}
              className="text-blue-500 hover:underline text-sm sm:text-base"
            >
              Audio Test
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="text-blue-500 hover:underline text-sm sm:text-base"
            >
              Settings
            </button>
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm">{localRider.name}</p>
              <p className="text-xs text-gray-500">
                {isAudioRunning ? "🔴 Live" : "⚫ Offline"}
              </p>
            </div>
            <button
              onClick={handleLeaveRide}
              className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm whitespace-nowrap"
            >
              Leave Ride
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 underline text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Map (left/top) */}
        <div className="flex-1 lg:flex-[2] bg-white rounded-lg shadow overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                Loading map...
              </div>
            }
          >
            <RiderMap />
          </Suspense>
        </div>

        {/* Sidebar (right/bottom) */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Connection quality */}
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow p-4">
                Loading quality...
              </div>
            }
          >
            <ConnectionQuality />
          </Suspense>

          {/* Network statistics */}
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow p-4">
                Loading stats...
              </div>
            }
          >
            <NetworkStatistics />
          </Suspense>

          {/* Rider list */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden min-h-[200px] sm:min-h-[300px]">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  Loading riders...
                </div>
              }
            >
              <RiderList />
            </Suspense>
          </div>

          {/* Audio controls */}
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow p-4">
                Loading controls...
              </div>
            }
          >
            <AudioControls />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
