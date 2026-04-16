export interface PathPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface RiderPath {
  riderId: string;
  points: PathPoint[];
  lastUpdate: number;
}

// Store for rider paths
const pathStore = new Map<string, RiderPath>();

// Maximum number of points to keep per rider (prevents memory issues)
const MAX_POINTS_PER_RIDER = 1000;

// Maximum age of path points in milliseconds (1 hour)
const MAX_POINT_AGE = 60 * 60 * 1000;

/**
 * Add a new point to a rider's path
 */
export function addPathPoint(riderId: string, lat: number, lng: number): void {
  const now = Date.now();
  
  if (!pathStore.has(riderId)) {
    pathStore.set(riderId, {
      riderId,
      points: [],
      lastUpdate: now,
    });
  }

  const path = pathStore.get(riderId)!;
  
  // Add new point
  path.points.push({
    lat,
    lng,
    timestamp: now,
  });
  
  path.lastUpdate = now;

  // Remove old points beyond max count
  if (path.points.length > MAX_POINTS_PER_RIDER) {
    path.points = path.points.slice(-MAX_POINTS_PER_RIDER);
  }

  // Remove points that are too old
  const cutoffTime = now - MAX_POINT_AGE;
  path.points = path.points.filter((point) => point.timestamp > cutoffTime);
}

/**
 * Get a rider's path
 */
export function getRiderPath(riderId: string): PathPoint[] {
  const path = pathStore.get(riderId);
  return path ? path.points : [];
}

/**
 * Get all rider paths
 */
export function getAllPaths(): Map<string, PathPoint[]> {
  const allPaths = new Map<string, PathPoint[]>();
  
  pathStore.forEach((path, riderId) => {
    allPaths.set(riderId, path.points);
  });
  
  return allPaths;
}

/**
 * Clear a rider's path
 */
export function clearRiderPath(riderId: string): void {
  pathStore.delete(riderId);
}

/**
 * Clear all paths
 */
export function clearAllPaths(): void {
  pathStore.clear();
}

/**
 * Get path statistics
 */
export function getPathStats(riderId: string): {
  pointCount: number;
  totalDistance: number; // in meters
  duration: number; // in milliseconds
  averageSpeed: number; // in m/s
} {
  const points = getRiderPath(riderId);
  
  if (points.length < 2) {
    return {
      pointCount: points.length,
      totalDistance: 0,
      duration: 0,
      averageSpeed: 0,
    };
  }

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }

  const duration = points[points.length - 1].timestamp - points[0].timestamp;
  const averageSpeed = duration > 0 ? (totalDistance / duration) * 1000 : 0;

  return {
    pointCount: points.length,
    totalDistance,
    duration,
    averageSpeed,
  };
}

/**
 * Calculate distance between two points in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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

/**
 * Simplify path using Douglas-Peucker algorithm to reduce points
 */
export function simplifyPath(
  points: PathPoint[],
  tolerance: number = 0.0001 // degrees
): PathPoint[] {
  if (points.length <= 2) return points;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i],
      firstPoint,
      lastPoint
    );
    
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    
    return [...left.slice(0, -1), ...right];
  }

  return [firstPoint, lastPoint];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: PathPoint,
  lineStart: PathPoint,
  lineEnd: PathPoint
): number {
  const { lat: x, lng: y } = point;
  const { lat: x1, lng: y1 } = lineStart;
  const { lat: x2, lng: y2 } = lineEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}
