import pool from "./index";

export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create rides table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rides (
        ride_id VARCHAR(255) PRIMARY KEY,
        ride_code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create ride_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ride_participants (
        id SERIAL PRIMARY KEY,
        ride_id VARCHAR(255) NOT NULL,
        rider_id VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
        UNIQUE (ride_id, rider_id)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rides_code ON rides(ride_code)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_ride ON ride_participants(ride_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_rider ON ride_participants(rider_id)
    `);

    await client.query("COMMIT");
    console.log("Database schema initialized successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}
