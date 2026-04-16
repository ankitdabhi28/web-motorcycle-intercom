import db from "../db";

export interface Ride {
  rideId: string;
  rideCode: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export async function createRide(
  rideId: string,
  rideCode: string,
  name: string,
  createdBy: string,
): Promise<Ride> {
  const stmt = db.prepare(`
    INSERT INTO rides (ride_id, ride_code, name, created_by)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(rideId, rideCode, name, createdBy);

  const ride = await getRideById(rideId);
  return ride!;
}

export async function getRideByCode(rideCode: string): Promise<Ride | null> {
  const stmt = db.prepare(`
    SELECT * FROM rides WHERE ride_code = ?
  `);
  const ride = stmt.get(rideCode) as Ride | undefined;

  return ride || null;
}

export async function getRideById(rideId: string): Promise<Ride | null> {
  const stmt = db.prepare(`
    SELECT * FROM rides WHERE ride_id = ?
  `);
  const ride = stmt.get(rideId) as Ride | undefined;

  return ride || null;
}

export async function getAllRides(): Promise<Ride[]> {
  const stmt = db.prepare(`
    SELECT * FROM rides ORDER BY created_at DESC
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
