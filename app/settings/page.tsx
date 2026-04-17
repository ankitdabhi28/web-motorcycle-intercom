"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/store";

export default function SettingsPage() {
  const router = useRouter();
  const user = useRideStore((state) => state.user);
  const token = useRideStore((state) => state.token);
  const localRider = useRideStore((state) => state.localRider);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const logout = useRideStore((state) => state.logout);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio settings
  const [micVolume, setMicVolume] = useState(80);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);

  // Notification settings
  const [rideJoinNotifications, setRideJoinNotifications] = useState(true);
  const [riderLeaveNotifications, setRiderLeaveNotifications] = useState(true);
  const [connectionAlerts, setConnectionAlerts] = useState(true);
  const [lowBatteryAlerts, setLowBatteryAlerts] = useState(true);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      await axios.put(
        `${backendUrl}/api/auth/profile`,
        { name },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading settings...</p>
        </div>
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
              Settings
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profile</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rider Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                placeholder="your@email.com"
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600">
                Rider ID:{" "}
                <code className="bg-gray-100 px-3 py-1 rounded text-sm">
                  {localRider.riderId}
                </code>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-sm text-green-600 flex items-center">
                <span className="mr-2">✅</span>
                Profile saved successfully!
              </p>
            )}
          </div>
        </section>

        {/* Audio Settings */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Audio Settings
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Microphone Volume: {micVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={micVolume}
                onChange={(e) => setMicVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speaker Volume: {speakerVolume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={speakerVolume}
                onChange={(e) => setSpeakerVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="text-sm text-gray-700">Noise Suppression</span>
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="text-sm text-gray-700">Echo Cancellation</span>
                <input
                  type="checkbox"
                  checked={echoCancellation}
                  onChange={(e) => setEchoCancellation(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className="text-sm text-gray-700">Auto Gain Control</span>
                <input
                  type="checkbox"
                  checked={autoGainControl}
                  onChange={(e) => setAutoGainControl(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Notifications
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <span className="text-sm text-gray-700">Rider joined ride</span>
              <input
                type="checkbox"
                checked={rideJoinNotifications}
                onChange={(e) => setRideJoinNotifications(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <span className="text-sm text-gray-700">Rider left ride</span>
              <input
                type="checkbox"
                checked={riderLeaveNotifications}
                onChange={(e) => setRiderLeaveNotifications(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <span className="text-sm text-gray-700">Connection alerts</span>
              <input
                type="checkbox"
                checked={connectionAlerts}
                onChange={(e) => setConnectionAlerts(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <span className="text-sm text-gray-700">Low battery alerts</span>
              <input
                type="checkbox"
                checked={lowBatteryAlerts}
                onChange={(e) => setLowBatteryAlerts(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </section>

        {/* Connection Quality Info */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Connection Info
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-gray-600 mb-1">Battery Level</div>
              <div className="text-2xl font-bold text-gray-900">
                {localRider.batteryLevel}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-gray-600 mb-1">Signal Strength</div>
              <div className="text-2xl font-bold text-gray-900">
                {localRider.signalStrength} dBm
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-gray-600 mb-1">GPS Status</div>
              <div className="text-2xl font-bold text-green-600">Active</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="text-gray-600 mb-1">Audio Status</div>
              <div
                className={`text-2xl font-bold ${isAudioRunning ? "text-green-600" : "text-gray-400"}`}
              >
                {isAudioRunning ? "On" : "Off"}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
