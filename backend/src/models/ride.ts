import db from "../db";

export interface Ride {
  rideId: string;
  rideCode: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  lastActiveAt: Date;
  status: "active" | "disabled";
}

export async function createRide(
  rideId: string,
  rideCode: string,
  name: string,
  createdBy: string,
): Promise<Ride> {
  try {
    const stmt = db.prepare(`
      INSERT INTO rides (ride_id, ride_code, name, created_by)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(rideId, rideCode, name, createdBy);

    const ride = await getRideById(rideId);
    return ride!;
  } catch (error) {
    console.error("Error in createRide:", error);
    throw error;
  }
}

export async function getRideByCode(rideCode: string): Promise<Ride | null> {
  const stmt = db.prepare(`
    SELECT
      ride_id as rideId,
      ride_code as rideCode,
      name,
      created_by as createdBy,
      created_at as createdAt,
      last_active_at as lastActiveAt,
      status
    FROM rides WHERE ride_code = ?
  `);
  const ride = stmt.get(rideCode) as Ride | undefined;

  return ride || null;
}

export async function getRideById(rideId: string): Promise<Ride | null> {
  const stmt = db.prepare(`
    SELECT
      ride_id as rideId,
      ride_code as rideCode,
      name,
      created_by as createdBy,
      created_at as createdAt,
      last_active_at as lastActiveAt,
      status
    FROM rides WHERE ride_id = ?
  `);
  const ride = stmt.get(rideId) as Ride | undefined;

  return ride || null;
}

export async function getAllRides(): Promise<Ride[]> {
  const stmt = db.prepare(`
    SELECT
      ride_id as rideId,
      ride_code as rideCode,
      name,
      created_by as createdBy,
      created_at as createdAt,
      last_active_at as lastActiveAt,
      status
    FROM rides ORDER BY created_at DESC
  `);
  const rides = stmt.all() as Ride[];

  return rides;
}

export async function deleteRide(rideId: string): Promise<boolean> {
  const stmt = db.prepare(`
    DELETE FROM rides WHERE ride_id = ?
  `);
  const result = stmt.run(rideId);

  return result.changes > 0;
}

export async function addParticipant(
  rideId: string,
  riderId: string,
): Promise<void> {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO ride_participants (ride_id, rider_id)
    VALUES (?, ?)
  `);
  stmt.run(rideId, riderId);
}

export async function removeParticipant(
  rideId: string,
  riderId: string,
): Promise<void> {
  const stmt = db.prepare(`
    DELETE FROM ride_participants
    WHERE ride_id = ? AND rider_id = ?
  `);
  stmt.run(rideId, riderId);
}

export async function getRideParticipants(rideId: string): Promise<string[]> {
  const stmt = db.prepare(`
    SELECT rider_id FROM ride_participants WHERE ride_id = ?
  `);
  const participants = stmt.all(rideId) as { rider_id: string }[];

  return participants.map((row) => row.rider_id);
}

export async function getActiveRidesByRiderId(
  riderId: string,
): Promise<Ride[]> {
  const stmt = db.prepare(`
    SELECT
      r.ride_id as rideId,
      r.ride_code as rideCode,
      r.name,
      r.created_by as createdBy,
      r.created_at as createdAt,
      r.last_active_at as lastActiveAt,
      r.status
    FROM rides r
    INNER JOIN ride_participants rp ON r.ride_id = rp.ride_id
    WHERE rp.rider_id = ?
    ORDER BY r.created_at DESC
  `);
  const rides = stmt.all(riderId) as Ride[];
  return rides;
}

export async function getRidesByUserId(userId: string): Promise<Ride[]> {
  const stmt = db.prepare(`
    SELECT
      r.ride_id as rideId,
      r.ride_code as rideCode,
      r.name,
      r.created_by as createdBy,
      r.created_at as createdAt,
      r.last_active_at as lastActiveAt,
      r.status,
      CASE WHEN r.created_by = ? THEN 'created' ELSE 'joined' END as role
    FROM rides r
    LEFT JOIN ride_participants rp ON r.ride_id = rp.ride_id
    WHERE r.created_by = ? OR rp.rider_id = ?
    GROUP BY r.ride_id
    ORDER BY r.created_at DESC
  `);
  const rides = stmt.all(userId, userId, userId) as any[];
  return rides;
}

export async function updateRideActivity(rideId: string): Promise<void> {
  const stmt = db.prepare(`
    UPDATE rides
    SET last_active_at = CURRENT_TIMESTAMP
    WHERE ride_id = ?
  `);
  stmt.run(rideId);
}

export async function disableOldRides(): Promise<number> {
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const stmt = db.prepare(`
    UPDATE rides
    SET status = 'disabled'
    WHERE status = 'active' AND last_active_at < ?
  `);
  const result = stmt.run(oneWeekAgo);
  return result.changes;
}
