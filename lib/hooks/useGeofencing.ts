import { useEffect, useRef } from "react";
import { useRideStore } from "@/store";

// Calculate distance between two coordinates in meters using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useGeofencing(connectionThreshold: number = 500) {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const updateRiderConnection = useRideStore(
    (state) => state.updateRiderConnection,
  );

  const previousDistancesRef = useRef<Record<string, number>>({});
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkGeofencing = () => {
      if (!localRider.gpsLocation.lat || !localRider.gpsLocation.lng) {
        return;
      }

      Object.entries(remoteRiders).forEach(([riderId, rider]) => {
        if (!rider.gpsLocation.lat || !rider.gpsLocation.lng) {
          return;
        }

        const distance = calculateDistance(
          localRider.gpsLocation.lat,
          localRider.gpsLocation.lng,
          rider.gpsLocation.lat,
          rider.gpsLocation.lng,
        );

        const previousDistance =
          previousDistancesRef.current[riderId] || Infinity;
        previousDistancesRef.current[riderId] = distance;

        // Check if rider crossed the threshold
        const wasConnected = previousDistance <= connectionThreshold;
        const isConnected = distance <= connectionThreshold;

        if (wasConnected !== isConnected) {
          console.log(
            `Geofencing: Rider ${rider.name} ${isConnected ? "entered" : "left"} connection zone (${Math.round(distance)}m)`,
          );

          updateRiderConnection(riderId, isConnected);
        }
      });
    };

    // Check every 5 seconds
    checkIntervalRef.current = setInterval(checkGeofencing, 5000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [localRider, remoteRiders, connectionThreshold, updateRiderConnection]);

  return {
    calculateDistance,
  };
}
