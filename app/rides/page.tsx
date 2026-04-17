"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/store";
import axios from "axios";

interface Ride {
  rideId: string;
  rideCode: string;
  name: string;
  createdBy: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'active' | 'disabled';
  role: 'created' | 'joined';
}

export default function RidesPage() {
  const router = useRouter();
  const token = useRideStore((state) => state.token);
  const user = useRideStore((state) => state.user);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) {
      router.push("/login");
      return;
    }

    fetchRides();
  }, [token, user, router]);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await axios.get(`${backendUrl}/api/rides/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRides(response.data.rides);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch rides";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRideClick = (ride: Ride) => {
    if (ride.status === 'disabled') {
      // View only - don't allow joining
      return;
    }
    router.push(`/ride/${ride.rideCode}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysSinceActive = (lastActiveAt: string) => {
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ←
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              My Rides
            </h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {rides.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏍️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Rides Yet</h2>
            <p className="text-gray-600 mb-6">
              Start your first ride or join an existing one to see it here.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Ride History ({rides.length})
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Disabled</span>
                </div>
              </div>
            </div>

            {rides.map((ride) => {
              const daysSinceActive = getDaysSinceActive(ride.lastActiveAt);
              const isDisabled = ride.status === 'disabled';

              return (
                <div
                  key={ride.rideId}
                  className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition hover:shadow-xl ${
                    isDisabled ? 'opacity-70' : ''
                  }`}
                  onClick={() => handleRideClick(ride)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {ride.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ride.role === 'created'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {ride.role === 'created' ? 'Created' : 'Joined'}
                        </span>
                        {isDisabled && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            View Only
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Code:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {ride.rideCode}
                          </code>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Created:</span>
                          <span>{formatDate(ride.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Last Active:</span>
                          <span>{formatDate(ride.lastActiveAt)}</span>
                          <span className="text-gray-500">
                            ({daysSinceActive} days ago)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isDisabled ? 'bg-gray-400' : 'bg-green-500'
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">
                        {isDisabled ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {isDisabled && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        This ride has been inactive for more than 7 days and is now view-only. 
                        You cannot join or reconnect to this ride.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
