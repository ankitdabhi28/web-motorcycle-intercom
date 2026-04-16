"use client";

import { useEffect, useState } from "react";
import { useRideStore } from "@/store";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const token = useRideStore((state) => state.token);
  const user = useRideStore((state) => state.user);
  const isAuthLoading = useRideStore((state) => state.isAuthLoading);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && (!token || !user)) {
      router.push("/login");
    }
  }, [isAuthLoading, token, user, router]);

  const handleStartRide = async () => {
    try {
      const { rideCode: newCode } = await useRideStore
        .getState()
        .startRide("My Ride");
      console.log("Ride started with code:", newCode);
      alert(`Ride started! Share this code with others: ${newCode}`);
      // Redirect to ride page
      router.push(`/ride/${newCode}`);
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
        // Redirect to ride page
        router.push(`/ride/${code.toUpperCase()}`);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to join ride";
        setError(errorMessage);
        console.error(err);
      }
    }
  };

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
            <p>Welcome, {user?.name || "Rider"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
