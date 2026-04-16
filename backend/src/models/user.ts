import pool from "../db";

export interface User {
  userId: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createUser(
  userId: string,
  email: string,
  password: string,
  name: string
): Promise<User> {
  const query = `
    INSERT INTO users (user_id, email, password, name)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [userId, email, password, name];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT * FROM users WHERE email = $1
  `;
  const result = await pool.query(query, [email]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function getUserById(userId: string): Promise<User | null> {
  const query = `
    SELECT * FROM users WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function updateUser(userId: string, updates: Partial<{ name: string }>): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount}`);
    values.push(updates.name);
    paramCount++;
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const query = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE user_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}
