import { useEffect, useRef } from "react";
import { useRideStore } from "@/store";
import { addPathPoint, getRiderPath, clearRiderPath } from "@/lib/riderPaths";

export function useRiderPaths() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const rideCode = useRideStore((state) => state.rideCode);

  const pathUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear paths when leaving a ride
    if (!rideCode) {
      clearRiderPath(localRider.riderId);
      Object.keys(remoteRiders).forEach((riderId) => {
        clearRiderPath(riderId);
      });
      return;
    }

    // Update paths periodically
    const updatePaths = () => {
      // Update local rider path
      if (localRider.gpsLocation.lat && localRider.gpsLocation.lng) {
        addPathPoint(localRider.riderId, localRider.gpsLocation.lat, localRider.gpsLocation.lng);
      }

      // Update remote rider paths
      Object.entries(remoteRiders).forEach(([riderId, rider]) => {
        if (rider.gpsLocation.lat && rider.gpsLocation.lng) {
          addPathPoint(riderId, rider.gpsLocation.lat, rider.gpsLocation.lng);
        }
      });
    };

    // Update paths every 5 seconds
    pathUpdateIntervalRef.current = setInterval(updatePaths, 5000);

    // Initial update
    updatePaths();

    return () => {
      if (pathUpdateIntervalRef.current) {
        clearInterval(pathUpdateIntervalRef.current);
      }
    };
  }, [localRider, remoteRiders, rideCode]);

  return {
    getLocalPath: () => getRiderPath(localRider.riderId),
    getRemotePath: (riderId: string) => getRiderPath(riderId),
    getAllPaths: () => {
      const paths = new Map<string, ReturnType<typeof getRiderPath>>();
      paths.set(localRider.riderId, getRiderPath(localRider.riderId));
      Object.keys(remoteRiders).forEach((riderId) => {
        paths.set(riderId, getRiderPath(riderId));
      });
      return paths;
    },
  };
}
