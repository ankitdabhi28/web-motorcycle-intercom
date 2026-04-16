import { useMemo } from "react";
import { useRideStore } from "@/store";
import {
  clusterRiders,
  shouldEnableClustering,
  getClusterColor,
  getClusterRadius,
} from "@/lib/mapClustering";

export function useMapClustering() {
  const localRider = useRideStore((state) => state.localRider);
  const remoteRiders = useRideStore((state) => state.remoteRiders);

  const { clusteredMarkers, enableClustering } = useMemo(() => {
    // Convert riders to marker format
    const allRiders = [
      {
        riderId: localRider.riderId,
        position: [localRider.gpsLocation.lat, localRider.gpsLocation.lng] as [number, number],
        name: localRider.name,
      },
      ...Object.entries(remoteRiders).map(([id, rider]) => ({
        riderId: id,
        position: [rider.gpsLocation.lat, rider.gpsLocation.lng] as [number, number],
        name: rider.name,
      })),
    ];

    const totalRiders = allRiders.length;
    const enable = shouldEnableClustering(totalRiders, 10); // Enable clustering at 10+ riders

    let clusteredMarkers: Array<{
      type: "cluster" | "single";
      id: string;
      position: [number, number];
      riderIds?: string[];
      count?: number;
      color?: string;
      radius?: number;
      riderId?: string;
      name?: string;
    }> = [];

    if (enable) {
      // Use clustering
      const clusters = clusterRiders(allRiders, 100); // 100m cluster radius

      clusteredMarkers = clusters.map((cluster) => ({
        type: "cluster" as const,
        id: cluster.id,
        position: cluster.center as [number, number],
        riderIds: cluster.riderIds,
        count: cluster.count,
        color: getClusterColor(cluster.count),
        radius: getClusterRadius(cluster.count),
      }));
    } else {
      // Show individual markers
      clusteredMarkers = allRiders.map((rider) => ({
        type: "single" as const,
        id: rider.riderId,
        position: rider.position,
        riderId: rider.riderId,
        name: rider.name,
      }));
    }

    return {
      clusteredMarkers,
      enableClustering: enable,
    };
  }, [localRider, remoteRiders]);

  return {
    clusteredMarkers,
    enableClustering,
    totalRiders: 1 + Object.keys(remoteRiders).length,
  };
}
