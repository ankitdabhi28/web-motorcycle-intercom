"use client";

import { useState } from "react";
import { useRideStore } from "@/store";
import { useWebRTC } from "@/lib/hooks/useWebRTC";

export default function AudioControls() {
  const localRider = useRideStore((state) => state.localRider);
  const isAudioRunning = useRideStore((state) => state.isAudioRunning);
  const toggleMute = useRideStore((state) => state.toggleMute);
  const { setAudioEnabled } = useWebRTC();
  const [volume, setVolume] = useState(80);

  const handleMuteToggle = () => {
    const newMutedState = !localRider.isMuted;
    toggleMute(newMutedState);
    setAudioEnabled(!newMutedState);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    // TODO: Implement actual volume control
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Audio Controls</h3>

      <div className="space-y-4">
        {/* Mute button */}
        <button
          onClick={handleMuteToggle}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            localRider.isMuted
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          {localRider.isMuted ? "🔇 Unmute" : "🎤 Mute"}
        </button>

        {/* Volume slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span
            className={`font-medium ${
              isAudioRunning ? "text-green-600" : "text-gray-500"
            }`}
          >
            {isAudioRunning ? "🔴 Live" : "⚫ Offline"}
          </span>
        </div>

        {/* Audio quality indicator */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <p>
            Latency: <span className="text-green-600">~50ms</span>
          </p>
          <p>
            Quality: <span className="text-green-600">Good</span>
          </p>
        </div>
      </div>
    </div>
  );
}
