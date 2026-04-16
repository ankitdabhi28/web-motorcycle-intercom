import pool from "../db";

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
  createdBy: string
): Promise<Ride> {
  const query = `
    INSERT INTO rides (ride_id, ride_code, name, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [rideId, rideCode, name, createdBy];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getRideByCode(rideCode: string): Promise<Ride | null> {
  const query = `
    SELECT * FROM rides WHERE ride_code = $1
  `;
  const result = await pool.query(query, [rideCode]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function getRideById(rideId: string): Promise<Ride | null> {
  const query = `
    SELECT * FROM rides WHERE ride_id = $1
  `;
  const result = await pool.query(query, [rideId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function getAllRides(): Promise<Ride[]> {
  const query = `
    SELECT * FROM rides ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function deleteRide(rideId: string): Promise<boolean> {
  const query = `
    DELETE FROM rides WHERE ride_id = $1
  `;
  const result = await pool.query(query, [rideId]);
  return (result.rowCount || 0) > 0;
}

export async function addParticipant(rideId: string, riderId: string): Promise<void> {
  const query = `
    INSERT INTO ride_participants (ride_id, rider_id)
    VALUES ($1, $2)
    ON CONFLICT (ride_id, rider_id) DO NOTHING
  `;
  await pool.query(query, [rideId, riderId]);
}

export async function removeParticipant(rideId: string, riderId: string): Promise<void> {
  const query = `
    DELETE FROM ride_participants
    WHERE ride_id = $1 AND rider_id = $2
  `;
  await pool.query(query, [rideId, riderId]);
}

export async function getRideParticipants(rideId: string): Promise<string[]> {
  const query = `
    SELECT rider_id FROM ride_participants WHERE ride_id = $1
  `;
  const result = await pool.query(query, [rideId]);
  return result.rows.map((row) => row.rider_id);
}
