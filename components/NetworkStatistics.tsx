"use client";

import { useMemo } from "react";
import { useRideStore } from "@/store";

export default function NetworkStatistics() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const neighbors = useRideStore((state) => state.neighbors);
  const meshPaths = useRideStore((state) => state.meshPaths);

  const stats = useMemo(() => {
    const totalRiders = 1 + Object.keys(remoteRiders).length;
    const onlineRiders = Object.values(remoteRiders).filter((r) => r.isOnline).length;
    const mutedRiders = Object.values(remoteRiders).filter((r) => r.isMuted).length;
    
    const avgSignalStrength = neighbors.length > 0
      ? neighbors.reduce((sum, n) => sum + n.signalStrength, 0) / neighbors.length
      : 0;
    
    const avgLatency = neighbors.length > 0
      ? neighbors.reduce((sum, n) => sum + n.latency, 0) / neighbors.length
      : 0;
    
    const directConnections = neighbors.filter((n) => n.isDirectPeer).length;
    const relayConnections = neighbors.filter((n) => !n.isDirectPeer).length;
    
    const totalDistance = neighbors.reduce((sum, n) => sum + n.distance, 0);
    const avgDistance = neighbors.length > 0 ? totalDistance / neighbors.length : 0;

    const activeMeshPaths = Object.values(meshPaths).filter((path) => path.length > 1).length;

    return {
      totalRiders,
      onlineRiders,
      mutedRiders,
      avgSignalStrength,
      avgLatency,
      directConnections,
      relayConnections,
      avgDistance,
      activeMeshPaths,
    };
  }, [remoteRiders, neighbors, meshPaths]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Network Statistics</h3>
      
      <div className="space-y-3">
        {/* Rider Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-lg font-bold text-gray-900">{stats.totalRiders}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-bold text-green-600">{stats.onlineRiders}</div>
            <div className="text-xs text-gray-600">Online</div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="text-lg font-bold text-red-600">{stats.mutedRiders}</div>
            <div className="text-xs text-gray-600">Muted</div>
          </div>
        </div>

        {/* Connection Stats */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Direct Connections</span>
            <span className="font-medium text-gray-900">{stats.directConnections}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Relay Connections</span>
            <span className="font-medium text-gray-900">{stats.relayConnections}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Active Mesh Paths</span>
            <span className="font-medium text-gray-900">{stats.activeMeshPaths}</span>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Avg Signal</span>
            <span className={`font-medium ${
              stats.avgSignalStrength > -60 ? "text-green-600" : 
              stats.avgSignalStrength > -70 ? "text-yellow-600" : "text-red-600"
            }`}>
              {Math.round(stats.avgSignalStrength)} dBm
            </span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Avg Latency</span>
            <span className={`font-medium ${
              stats.avgLatency < 50 ? "text-green-600" : 
              stats.avgLatency < 100 ? "text-yellow-600" : "text-red-600"
            }`}>
              {Math.round(stats.avgLatency)} ms
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Avg Distance</span>
            <span className="font-medium text-gray-900">
              {Math.round(stats.avgDistance)} m
            </span>
          </div>
        </div>

        {/* Local Rider Stats */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Your Battery</span>
            <span className={`font-medium ${
              localRider.batteryLevel > 50 ? "text-green-600" : 
              localRider.batteryLevel > 25 ? "text-yellow-600" : "text-red-600"
            }`}>
              {localRider.batteryLevel}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Your Signal</span>
            <span className={`font-medium ${
              localRider.signalStrength > -60 ? "text-green-600" : 
              localRider.signalStrength > -70 ? "text-yellow-600" : "text-red-600"
            }`}>
              {localRider.signalStrength} dBm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
