"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRideStore } from "@/store";
import { socketClient } from "@/lib/socket-client";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useGeofencing } from "@/lib/hooks/useGeofencing";
import { useMeshRouting } from "@/lib/hooks/useMeshRouting";
import { useRouter } from "next/navigation";

const RiderList = lazy(() => import("@/components/RiderList"));
const RiderMap = lazy(() => import("@/components/RiderMap"));
const AudioControls = lazy(() => import("@/components/AudioControls"));
const ConnectionQuality = lazy(() => import("@/components/ConnectionQuality"));
const NetworkStatistics = lazy(() => import("@/components/NetworkStatistics"));

export default function Dashboard() {
  const router = useRouter();
  const token = useRideStore((state) => state.token);
  const user = useRideStore((state) => state.user);
  const rideCode = useRideStore((state) => state.rideCode);
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const setLocalRider = useRideStore((state) => state.setLocalRider);
  const updateLocation = useRideStore((state) => state.updateLocation);
  const logout = useRideStore((state) => state.logout);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { position } = useGeolocation();
  useGeofencing(500); // 500 meter threshold for automatic connection
  useMeshRouting(); // Enable multi-hop mesh routing

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token || !user) {
      router.push("/login");
    }
  }, [token, user, router]);

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
          token || "", // Use auth token
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

    return () => clearInterval(helloInterval);
  }, [rideCode, localRider, isConnected]);

  const handleStartRide = async () => {
    try {
      const { rideCode: newCode } = await useRideStore
        .getState()
        .startRide("My Ride");
      console.log("Ride started with code:", newCode);
      alert(`Ride started! Share this code with others: ${newCode}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start ride";
      setError(errorMessage);
      console.error(err);
    }
  };

  const handleJoinRide = async () => {
    const code = prompt("Enter ride code (e.g., ABC123):");
    if (code) {
      try {
        await useRideStore.getState().joinRide(code.toUpperCase());
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to join ride";
        setError(errorMessage);
        console.error(err);
      }
    }
  };

  if (!rideCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Motorcycle Intercom
          </h1>
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <button
              onClick={handleStartRide}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
            >
              Start New Ride
            </button>
            <button
              onClick={handleJoinRide}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition"
            >
              Join Existing Ride
            </button>
            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Your ID: {localRider.riderId}</p>
              <p>Server: {isConnected ? "✅ Connected" : "❌ Disconnected"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Ride: {rideCode}</h1>
            <p className="text-gray-600 text-sm">
              Riders: {Object.keys(remoteRiders).length + 1}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
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
              <p className="font-semibold">{localRider.name}</p>
              <p className="text-sm text-gray-500">
                {isAudioRunning ? "🔴 Live" : "⚫ Offline"}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-6 py-3">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Map (left/top) */}
        <div className="flex-1 lg:flex-[2] bg-white rounded-lg shadow overflow-hidden min-h-[400px] lg:min-h-0">
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
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden min-h-[300px]">
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
