import db from "../db";

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
  name: string,
): Promise<User> {
  const stmt = db.prepare(`
    INSERT INTO users (user_id, email, password, name)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, email, password, name);

  const user = await getUserById(userId);
  return user!;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `);
  const user = stmt.get(email) as User | undefined;

  return user || null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `);
  const user = stmt.get(userId) as User | undefined;

  return user || null;
}

export async function updateUser(
  userId: string,
  updates: Partial<{ name: string }>,
): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push(`name = ?`);
    values.push(updates.name);
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const query = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE user_id = ?
  `;

  const stmt = db.prepare(query);
  stmt.run(...values);

  return getUserById(userId);
}
