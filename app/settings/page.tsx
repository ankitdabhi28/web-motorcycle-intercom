"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/store";

export default function SettingsPage() {
  const router = useRouter();
  const user = useRideStore((state) => state.user);
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
      // Update user profile
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/profile`,
        { name, email },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Settings
          </h1>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rider Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-600">
                Rider ID:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {localRider.riderId}
                </code>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-sm text-green-600">
                Profile saved successfully!
              </p>
            )}
          </div>
        </section>

        {/* Audio Settings */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Noise Suppression</span>
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Echo Cancellation</span>
                <input
                  type="checkbox"
                  checked={echoCancellation}
                  onChange={(e) => setEchoCancellation(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
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
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notifications
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Rider joined ride</span>
              <input
                type="checkbox"
                checked={rideJoinNotifications}
                onChange={(e) => setRideJoinNotifications(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Rider left ride</span>
              <input
                type="checkbox"
                checked={riderLeaveNotifications}
                onChange={(e) => setRiderLeaveNotifications(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Connection alerts</span>
              <input
                type="checkbox"
                checked={connectionAlerts}
                onChange={(e) => setConnectionAlerts(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
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
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Connection Info
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-600">Battery Level</div>
              <div className="text-2xl font-bold text-gray-900">
                {localRider.batteryLevel}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-600">Signal Strength</div>
              <div className="text-2xl font-bold text-gray-900">
                {localRider.signalStrength} dBm
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-600">GPS Status</div>
              <div className="text-2xl font-bold text-green-600">Active</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-600">Audio Status</div>
              <div
                className={`text-2xl font-bold ${isAudioRunning ? "text-green-600" : "text-gray-400"}`}
              >
                {isAudioRunning ? "On" : "Off"}
              </div>
            </div>
          </div>
        </section>

        {/* Back to Dashboard */}
        <div className="pt-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
