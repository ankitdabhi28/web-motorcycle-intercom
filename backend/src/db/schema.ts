import db from "./index";

export async function initializeDatabase() {
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create rides table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rides (
        ride_id TEXT PRIMARY KEY,
        ride_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create ride_participants table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ride_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ride_id TEXT NOT NULL,
        rider_id TEXT NOT NULL,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
        UNIQUE (ride_id, rider_id)
      )
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rides_code ON rides(ride_code)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_participants_ride ON ride_participants(ride_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_participants_rider ON ride_participants(rider_id)
    `);

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  }
}
