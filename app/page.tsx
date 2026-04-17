"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/store";

export default function Home() {
  const router = useRouter();
  const token = useRideStore((state) => state.token);

  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏍️</span>
              <span className="text-xl font-bold text-gray-900">
                Motorcycle Intercom
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Stay Connected on Every Ride
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Real-time motorcycle intercom system with GPS tracking, mesh
            networking, and automatic geofencing. Communicate seamlessly with
            your riding group no matter where the road takes you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <button
              onClick={() => router.push("/login")}
              className="px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-base sm:text-lg"
            >
              Get Started Free
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-20">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Real-time Audio
            </h3>
            <p className="text-gray-600">
              Crystal-clear peer-to-peer audio communication using WebRTC
              technology. Talk naturally with your riding group without delay.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GPS Tracking
            </h3>
            <p className="text-gray-600">
              Real-time location tracking on interactive maps. See where
              everyone is and track rider paths with historical visualization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Mesh Networking
            </h3>
            <p className="text-gray-600">
              Multi-hop relay extends your range. Connect through intermediate
              riders using intelligent Dijkstra&apos;s algorithm routing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Auto Geofencing
            </h3>
            <p className="text-gray-600">
              Automatic connection/disconnection based on rider proximity. Stay
              connected when nearby, save battery when apart.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Group Clustering
            </h3>
            <p className="text-gray-600">
              Intelligent rider grouping for large groups. Automatically cluster
              nearby riders for better map visualization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure & Private
            </h3>
            <p className="text-gray-600">
              JWT-based authentication with encrypted connections. Your
              conversations and location data stay private.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Create Account
              </h3>
              <p className="text-gray-600 text-sm">
                Sign up with email and set your rider name
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Start or Join Ride
              </h3>
              <p className="text-gray-600 text-sm">
                Create a new ride or join with a 6-character code
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Enable Audio</h3>
              <p className="text-gray-600 text-sm">
                Start WebRTC audio and allow microphone access
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Ride & Communicate
              </h3>
              <p className="text-gray-600 text-sm">
                Track riders on map and talk in real-time
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-blue-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Stay Connected?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of riders who trust Motorcycle Intercom for seamless
            group communication on every adventure.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium text-lg"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 Motorcycle Intercom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
