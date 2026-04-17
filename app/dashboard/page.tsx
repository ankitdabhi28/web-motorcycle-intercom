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

  const handleLogout = () => {
    useRideStore.getState().logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏍️</span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Motorcycle Intercom
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-600">
              {user?.name || "Rider"}
            </span>
            <button
              onClick={() => router.push("/rides")}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition font-medium"
            >
              My Rides
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Start Your Ride
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create a new ride for your group or join an existing ride to start
            communicating with fellow riders.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Start New Ride Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer group">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-200 transition">
                <span className="text-4xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Start New Ride
              </h3>
              <p className="text-gray-600 mb-6">
                Create a new ride and share the code with your riding group
              </p>
              <button
                onClick={handleStartRide}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Start Ride
              </button>
            </div>
          </div>

          {/* Join Existing Ride Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer group">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-200 transition">
                <span className="text-4xl">🤝</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Join Existing Ride
              </h3>
              <p className="text-gray-600 mb-6">
                Enter a ride code to join an existing riding group
              </p>
              <button
                onClick={handleJoinRide}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Join Ride
              </button>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-8">
            What You Can Do
          </h3>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-3xl mb-3">🎤</div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Real-time Audio
              </h4>
              <p className="text-sm text-gray-600">
                Crystal-clear communication with your riding group
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <h4 className="font-semibold text-gray-900 mb-2">GPS Tracking</h4>
              <p className="text-sm text-gray-600">
                See rider locations on an interactive map
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-3xl mb-3">🔗</div>
              <h4 className="font-semibold text-gray-900 mb-2">Mesh Network</h4>
              <p className="text-sm text-gray-600">
                Multi-hop relay extends your communication range
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
