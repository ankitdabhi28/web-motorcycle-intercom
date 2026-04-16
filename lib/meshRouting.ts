import { MeshNeighbor } from "@/lib/types";

export interface MeshPath {
  targetRiderId: string;
  path: string[];
  hopCount: number;
  latency: number;
}

// Calculate the shortest path between riders using Dijkstra's algorithm
export function calculateShortestPath(
  sourceId: string,
  targetId: string,
  neighbors: MeshNeighbor[],
): string[] | null {
  if (sourceId === targetId) return [sourceId];

  // Build adjacency list from neighbors
  const adjacencyList = new Map<string, MeshNeighbor[]>();
  neighbors.forEach((neighbor) => {
    if (!adjacencyList.has(neighbor.riderId)) {
      adjacencyList.set(neighbor.riderId, []);
    }
    adjacencyList.get(neighbor.riderId)!.push(neighbor);
  });

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  // Initialize
  distances.set(sourceId, 0);
  previous.set(sourceId, null);
  unvisited.add(sourceId);

  adjacencyList.forEach((_, riderId) => {
    if (riderId !== sourceId) {
      distances.set(riderId, Infinity);
      previous.set(riderId, null);
      unvisited.add(riderId);
    }
  });

  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((riderId) => {
      const dist = distances.get(riderId) || Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentNode = riderId;
      }
    });

    if (currentNode === null || minDistance === Infinity) break;
    if (currentNode === targetId) break;

    unvisited.delete(currentNode);

    // Check neighbors
    const currentNeighbors = adjacencyList.get(currentNode!) || [];
    currentNeighbors.forEach((neighbor) => {
      if (!unvisited.has(neighbor.riderId)) return;

      const alt = (distances.get(currentNode!) || 0) + neighbor.signalStrength;
      if (alt < (distances.get(neighbor.riderId) || Infinity)) {
        distances.set(neighbor.riderId, alt);
        previous.set(neighbor.riderId, currentNode!);
      }
    });
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = targetId;

  if (previous.get(current) === null && current !== sourceId) {
    return null; // No path found
  }

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return path.length > 0 ? path : null;
}

// Estimate latency based on hop count
export function estimateLatency(hopCount: number): number {
  // Base latency ~50ms per hop
  return hopCount * 50;
}

// Find optimal relay nodes for multi-hop communication
export function findRelayNodes(
  sourceId: string,
  targetId: string,
  allRiders: string[],
  neighbors: MeshNeighbor[],
): MeshPath[] {
  const paths: MeshPath[] = [];

  // Try to find multiple paths for redundancy
  for (let i = 0; i < 3; i++) {
    const path = calculateShortestPath(sourceId, targetId, neighbors);
    if (path) {
      paths.push({
        targetRiderId: targetId,
        path,
        hopCount: path.length - 1,
        latency: estimateLatency(path.length - 1),
      });
    }
  }

  // Sort by latency (shortest path first)
  return paths.sort((a, b) => a.latency - b.latency);
}

// Calculate distance between two coordinates in meters using Haversine formula
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

// Update mesh network topology based on signal strength
export function updateMeshTopology(
  localRiderId: string,
  localGpsLocation: { lat: number; lng: number },
  remoteRiders: Record<
    string,
    {
      isOnline: boolean;
      signalStrength: number;
      gpsLocation: { lat: number; lng: number };
    }
  >,
): MeshNeighbor[] {
  const neighbors: MeshNeighbor[] = [];

  Object.entries(remoteRiders).forEach(([riderId, rider]) => {
    // Only consider online riders with signal strength
    if (rider.isOnline && rider.signalStrength > 0) {
      const distance = calculateDistance(
        localGpsLocation.lat,
        localGpsLocation.lng,
        rider.gpsLocation.lat,
        rider.gpsLocation.lng,
      );

      neighbors.push({
        riderId,
        signalStrength: rider.signalStrength,
        distance,
        isDirectPeer: rider.signalStrength > 70,
        latency: estimateLatency(1), // Direct connection
      });
    }
  });

  return neighbors;
}

// Validate mesh path and suggest alternatives if needed
export function validateMeshPath(
  path: string[],
  neighbors: MeshNeighbor[],
): { isValid: boolean; alternativePath?: string[] } {
  if (path.length < 2) {
    return { isValid: true };
  }

  // Check if each hop is valid
  for (let i = 0; i < path.length - 1; i++) {
    const next = path[i + 1];

    const hasConnection = neighbors.some(
      (n) => n.riderId === next && n.signalStrength > 0,
    );

    if (!hasConnection) {
      return { isValid: false };
    }
  }

  return { isValid: true };
}
