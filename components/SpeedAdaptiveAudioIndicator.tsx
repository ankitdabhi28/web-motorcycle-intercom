/**
 * Speed-Adaptive Audio Indicator Component
 *
 * Displays the current speed-based audio mode and allows users to
 * see the active configuration (city vs highway mode).
 */

"use client";

import { SpeedMode } from "@/lib/speedAdaptiveAudio";

interface SpeedAdaptiveAudioIndicatorProps {
  currentMode: SpeedMode;
  currentSpeed: number;
  isMonitoring: boolean;
}

export default function SpeedAdaptiveAudioIndicator({
  currentMode,
  currentSpeed,
  isMonitoring,
}: SpeedAdaptiveAudioIndicatorProps) {
  const getModeColor = () => {
    return currentMode.name === "highway" ? "text-orange-500" : "text-green-500";
  };

  const getModeBgColor = () => {
    return currentMode.name === "highway"
      ? "bg-orange-100 border-orange-300"
      : "bg-green-100 border-green-300";
  };

  const getModeIcon = () => {
    return currentMode.name === "highway" ? "🛣️" : "🏙️";
  };

  return (
    <div className={`p-3 rounded-lg border ${getModeBgColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getModeIcon()}</span>
          <div>
            <div className={`font-semibold ${getModeColor()}`}>
              {currentMode.name === "highway" ? "Highway Mode" : "City Mode"}
            </div>
            <div className="text-xs text-gray-600">
              {currentSpeed.toFixed(1)} mph
            </div>
          </div>
        </div>
        <div
          className={`text-xs px-2 py-1 rounded ${
            isMonitoring ? "bg-green-500 text-white" : "bg-gray-400 text-white"
          }`}
        >
          {isMonitoring ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Volume:</span>
          <span className="ml-1 font-medium">
            {Math.round(currentMode.volume * 100)}%
          </span>
        </div>
        <div>
          <span className="text-gray-600">Noise Suppression:</span>
          <span className="ml-1 font-medium capitalize">
            {currentMode.noiseSuppression}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Echo Cancellation:</span>
          <span className="ml-1 font-medium">
            {currentMode.echoCancellation ? "On" : "Off"}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Wind Filter:</span>
          <span className="ml-1 font-medium">
            {currentMode.windFilter ? "On" : "Off"}
          </span>
        </div>
      </div>
    </div>
  );
}
