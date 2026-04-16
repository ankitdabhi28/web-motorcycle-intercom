"use client";

import { useMemo } from "react";
import { useRideStore } from "@/store";

interface ConnectionQuality {
  level: "excellent" | "good" | "fair" | "poor";
  score: number;
  color: string;
  icon: string;
}

export default function ConnectionQuality() {
  const localRider = useRideStore((state) => state.localRider);
  const neighbors = useRideStore((state) => state.neighbors);

  const quality = useMemo((): ConnectionQuality => {
    // Calculate overall connection quality based on multiple factors
    let score = 100;

    // Signal strength factor (0-30 points)
    const signalStrength = localRider.signalStrength;
    if (signalStrength > -50) {
      score += 30;
    } else if (signalStrength > -60) {
      score += 20;
    } else if (signalStrength > -70) {
      score += 10;
    } else {
      score += 0;
    }

    // Battery level factor (0-20 points)
    const batteryLevel = localRider.batteryLevel;
    if (batteryLevel > 75) {
      score += 20;
    } else if (batteryLevel > 50) {
      score += 15;
    } else if (batteryLevel > 25) {
      score += 10;
    } else {
      score += 5;
    }

    // Neighbor count factor (0-20 points)
    const neighborCount = neighbors.length;
    if (neighborCount >= 3) {
      score += 20;
    } else if (neighborCount >= 2) {
      score += 15;
    } else if (neighborCount >= 1) {
      score += 10;
    } else {
      score += 0;
    }

    // Latency factor (0-30 points)
    const avgLatency =
      neighbors.length > 0
        ? neighbors.reduce((sum, n) => sum + n.latency, 0) / neighbors.length
        : 0;

    if (avgLatency < 50) {
      score += 30;
    } else if (avgLatency < 100) {
      score += 20;
    } else if (avgLatency < 200) {
      score += 10;
    } else {
      score += 0;
    }

    // Determine quality level
    if (score >= 90) {
      return { level: "excellent", score, color: "text-green-600", icon: "🟢" };
    } else if (score >= 70) {
      return { level: "good", score, color: "text-blue-600", icon: "🔵" };
    } else if (score >= 50) {
      return { level: "fair", score, color: "text-yellow-600", icon: "🟡" };
    } else {
      return { level: "poor", score, color: "text-red-600", icon: "🔴" };
    }
  }, [localRider.signalStrength, localRider.batteryLevel, neighbors]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Connection Quality
      </h3>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{quality.icon}</span>
          <span className={`text-lg font-bold ${quality.color} capitalize}`}>
            {quality.level}
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{quality.score}%</div>
      </div>

      {/* Quality bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            quality.level === "excellent"
              ? "bg-green-500"
              : quality.level === "good"
                ? "bg-blue-500"
                : quality.level === "fair"
                  ? "bg-yellow-500"
                  : "bg-red-500"
          }`}
          style={{ width: `${quality.score}%` }}
        />
      </div>

      {/* Detailed metrics */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Signal Strength</span>
          <span
            className={`font-medium ${localRider.signalStrength > -60 ? "text-green-600" : localRider.signalStrength > -70 ? "text-yellow-600" : "text-red-600"}`}
          >
            {localRider.signalStrength} dBm
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Battery Level</span>
          <span
            className={`font-medium ${localRider.batteryLevel > 50 ? "text-green-600" : localRider.batteryLevel > 25 ? "text-yellow-600" : "text-red-600"}`}
          >
            {localRider.batteryLevel}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Connected Riders</span>
          <span className="font-medium text-gray-900">{neighbors.length}</span>
        </div>
        {neighbors.length > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Latency</span>
            <span
              className={`font-medium ${neighbors.reduce((sum, n) => sum + n.latency, 0) / neighbors.length < 100 ? "text-green-600" : neighbors.reduce((sum, n) => sum + n.latency, 0) / neighbors.length < 200 ? "text-yellow-600" : "text-red-600"}`}
            >
              {Math.round(
                neighbors.reduce((sum, n) => sum + n.latency, 0) /
                  neighbors.length,
              )}{" "}
              ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
