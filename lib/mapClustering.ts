import { LatLngExpression } from "leaflet";

export interface Cluster {
  id: string;
  center: LatLngExpression;
  riderIds: string[];
  count: number;
}

export interface RiderMarker {
  riderId: string;
  position: [number, number];
  name: string;
}

// Cluster riders based on proximity
export function clusterRiders(
  riders: RiderMarker[],
  clusterRadius: number = 100, // meters
): Cluster[] {
  if (riders.length === 0) return [];

  const clusters: Cluster[] = [];
  const processedRiders = new Set<string>();

  for (const rider of riders) {
    if (processedRiders.has(rider.riderId)) continue;

    // Create a new cluster
    const cluster: Cluster = {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      center: rider.position,
      riderIds: [rider.riderId],
      count: 1,
    };

    processedRiders.add(rider.riderId);

    // Find nearby riders to add to this cluster
    for (const otherRider of riders) {
      if (processedRiders.has(otherRider.riderId)) continue;

      const distance = calculateDistance(
        rider.position[0],
        rider.position[1],
        otherRider.position[0],
        otherRider.position[1],
      );

      if (distance <= clusterRadius) {
        cluster.riderIds.push(otherRider.riderId);
        cluster.count++;
        processedRiders.add(otherRider.riderId);

        // Update cluster center to be the average of all riders in the cluster
        const avgLat =
          cluster.riderIds.reduce((sum, id) => {
            const r = riders.find((r) => r.riderId === id);
            return sum + (r?.position[0] ?? 0);
          }, 0) / cluster.count;

        const avgLng =
          cluster.riderIds.reduce((sum, id) => {
            const r = riders.find((r) => r.riderId === id);
            return sum + (r?.position[1] ?? 0);
          }, 0) / cluster.count;

        cluster.center = [avgLat, avgLng];
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// Calculate distance between two coordinates in meters
function calculateDistance(
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

// Determine if clustering should be enabled based on rider count
export function shouldEnableClustering(
  riderCount: number,
  threshold: number = 10,
): boolean {
  return riderCount >= threshold;
}

// Get cluster color based on cluster size
export function getClusterColor(count: number): string {
  if (count <= 3) return "#10b981"; // green
  if (count <= 7) return "#f59e0b"; // amber
  if (count <= 15) return "#ef4444"; // red
  return "#8b5cf6"; // purple for very large clusters
}

// Get cluster radius based on cluster size
export function getClusterRadius(count: number): number {
  const baseRadius = 30;
  const growthFactor = 3;
  return baseRadius + Math.sqrt(count) * growthFactor;
}
