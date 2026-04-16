import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// SQLite database file path
const dbPath = path.join(__dirname, "..", "..", "motorcycle_intercom.db");

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

console.log(`Connected to SQLite database: ${dbPath}`);

export default db;
