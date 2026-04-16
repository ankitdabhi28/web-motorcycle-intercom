"use client";

import { useRideStore } from "@/store";

export default function RiderList() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const neighbors = useRideStore((state) => state.neighbors);

  const allRiders = [
    { ...localRider, isLocal: true },
    ...Object.values(remoteRiders).map((r) => ({ ...r, isLocal: false })),
  ];

  const getConnectionType = (riderId: string) => {
    const neighbor = neighbors.find((n) => n.riderId === riderId);
    if (neighbor?.isDirectPeer) return "Direct";
    return "Relayed";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800">
          Riders ({allRiders.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allRiders.map((rider) => (
          <div
            key={rider.riderId}
            className={`px-4 py-3 border-b ${
              rider.isLocal ? "bg-blue-50" : ""
            } hover:bg-gray-100 transition`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {rider.name} {rider.isLocal && "(You)"}
                </p>
                <p className="text-xs text-gray-500">
                  {getConnectionType(rider.riderId)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Battery */}
                <span className="text-sm text-gray-600">
                  🔋 {rider.batteryLevel}%
                </span>

                {/* Signal strength indicator */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-sm ${
                        rider.signalStrength > -30 - i * 15
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                      style={{ height: 8 + i * 3 }}
                    />
                  ))}
                </div>

                {/* Mute indicator */}
                {rider.isMuted && <span className="text-lg">🔇</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
