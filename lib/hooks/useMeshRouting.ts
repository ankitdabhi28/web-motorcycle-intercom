import { useEffect, useRef } from "react";
import { useRideStore } from "@/store";
import {
  calculateShortestPath,
  findRelayNodes,
  updateMeshTopology,
  validateMeshPath,
} from "@/lib/meshRouting";

export function useMeshRouting() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);
  const updateNeighbors = useRideStore((state) => state.updateNeighbors);
  const updateMeshPath = useRideStore((state) => state.updateMeshPath);

  const routingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateRouting = () => {
      if (!localRider.riderId) return;

      // Update mesh topology based on current rider positions and signal
      const neighbors = updateMeshTopology(
        localRider.riderId,
        localRider.gpsLocation,
        remoteRiders,
      );
      updateNeighbors(neighbors);

      // Calculate paths to all remote riders
      Object.keys(remoteRiders).forEach((riderId) => {
        if (riderId === localRider.riderId) return;

        const path = calculateShortestPath(
          localRider.riderId,
          riderId,
          neighbors,
        );

        if (path && path.length > 0) {
          // Validate the path
          const validation = validateMeshPath(path, neighbors);

          if (validation.isValid) {
            updateMeshPath(riderId, path);
            console.log(
              `Mesh path to ${riderId}: ${path.join(" -> ")} (${path.length - 1} hops)`,
            );
          } else if (validation.alternativePath) {
            updateMeshPath(riderId, validation.alternativePath);
          }
        }
      });
    };

    // Update routing every 10 seconds
    routingIntervalRef.current = setInterval(updateRouting, 10000);

    // Initial update
    updateRouting();

    return () => {
      if (routingIntervalRef.current) {
        clearInterval(routingIntervalRef.current);
      }
    };
  }, [localRider, remoteRiders, updateNeighbors, updateMeshPath]);

  return {
    calculatePath: (targetId: string) => {
      if (!localRider.riderId) return null;
      const neighbors = updateMeshTopology(
        localRider.riderId,
        localRider.gpsLocation,
        remoteRiders,
      );
      return calculateShortestPath(localRider.riderId, targetId, neighbors);
    },
    getRelayNodes: (targetId: string) => {
      if (!localRider.riderId) return [];
      const neighbors = updateMeshTopology(
        localRider.riderId,
        localRider.gpsLocation,
        remoteRiders,
      );
      const allRiders = [localRider.riderId, ...Object.keys(remoteRiders)];
      return findRelayNodes(localRider.riderId, targetId, allRiders, neighbors);
    },
  };
}
