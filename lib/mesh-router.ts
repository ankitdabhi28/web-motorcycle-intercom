import { Rider, MeshNeighbor } from '@/lib/types';

export interface MeshPath {
  target: string;
  hops: string[]; // intermediate rider IDs
  distance: number; // total hops
  latency: number; // estimated
}

class MeshRouter {
  private neighbors: Map<string, MeshNeighbor> = new Map();
  private topology: Map<string, Set<string>> = new Map();
  private paths: Map<string, MeshPath> = new Map();

  /**
   * Update neighbor list from riders in current group
   */
  updateTopology(localRiderId: string, allRiders: Rider[]) {
    this.neighbors.clear();
    this.topology.clear();
    this.paths.clear();

    const localRider = allRiders.find((r) => r.riderId === localRiderId);
    if (!localRider) return;

    // Build neighbor list based on distance
    allRiders.forEach((rider) => {
      if (rider.riderId === localRiderId) return;

      const distance = this.calculateDistance(
        localRider.gpsLocation.lat,
        localRider.gpsLocation.lng,
        rider.gpsLocation.lat,
        rider.gpsLocation.lng
      );

      const isDirectPeer = distance < 1000; // 1km = direct neighbor

      this.neighbors.set(rider.riderId, {
        riderId: rider.riderId,
        signalStrength: rider.signalStrength || -80,
        distance,
        isDirectPeer,
        latency: isDirectPeer ? 50 : 150,
      });
    });

    // Build adjacency graph
    this.buildTopology(allRiders);

    // Calculate shortest paths to all reachable riders
    this.computeAllShortestPaths(allRiders);
  }

  /**
   * Build topology graph (who can reach whom)
   */
  private buildTopology(allRiders: Rider[]) {
    this.neighbors.forEach((neighbor) => {
      if (!this.topology.has(neighbor.riderId)) {
        this.topology.set(neighbor.riderId, new Set());
      }

      // Add direct neighbors to the graph
      this.neighbors.forEach((other) => {
        if (other.riderId !== neighbor.riderId && other.distance < 1500) {
          this.topology.get(neighbor.riderId)!.add(other.riderId);
        }
      });
    });
  }

  /**
   * Dijkstra's algorithm: find shortest path to target
   */
  private dijkstra(startId: string, targetId: string): string[] {
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited = new Set(this.topology.keys());

    // Initialize
    unvisited.forEach((id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current = startId;
      let minDist = Infinity;
      unvisited.forEach((id) => {
        const dist = distances.get(id) || Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = id;
        }
      });

      if (current === targetId) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | null = targetId;
        while (node !== null) {
          path.unshift(node);
          node = previous.get(node) || null;
        }
        return path.slice(1); // Exclude start, include target
      }

      unvisited.delete(current);
      const neighbors = this.topology.get(current) || new Set();

      neighbors.forEach((neighbor) => {
        if (!unvisited.has(neighbor)) return;

        const newDist = (distances.get(current) || 0) + 1;
        const currentNeighborDist = distances.get(neighbor) || Infinity;

        if (newDist < currentNeighborDist) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, current);
        }
      });
    }

    return []; // No path found
  }

  /**
   * Compute shortest paths to all reachable riders
   */
  private computeAllShortestPaths(allRiders: Rider[]) {
    allRiders.forEach((rider) => {
      const path = this.dijkstra('local', rider.riderId);
      if (path.length > 0) {
        this.paths.set(rider.riderId, {
          target: rider.riderId,
          hops: path,
          distance: path.length,
          latency: path.length * 100, // Rough estimate
        });
      }
    });
  }

  /**
   * Get neighbors (direct peers)
   */
  getDirectNeighbors(): MeshNeighbor[] {
    return Array.from(this.neighbors.values()).filter((n) => n.isDirectPeer);
  }

  /**
   * Get all neighbors (including indirect)
   */
  getAllNeighbors(): MeshNeighbor[] {
    return Array.from(this.neighbors.values());
  }

  /**
   * Get path to rider
   */
  getPathToRider(riderId: string): MeshPath | undefined {
    return this.paths.get(riderId);
  }

  /**
   * Calculate distance in meters (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
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
}

export const meshRouter = new MeshRouter();
export default MeshRouter;
