import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "users.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface UserRecord {
  id: string;
  username: string;
  created_at: string;
}

interface UserRow extends UserRecord {
  password_hash: string;
  salt: string;
}

function hashPassword(password: string, salt: string): string {
  // Use scrypt for key derivation
  const keyLength = 64;
  const hashBuffer = scryptSync(password, salt, keyLength);
  return hashBuffer.toString("hex");
}

export function hasAnyUser(): boolean {
  const row = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  return row.count > 0;
}

export function createUser(username: string, password: string): UserRecord {
  if (hasAnyUser()) {
    throw new Error("Registration is disabled. A user already exists.");
  }
  
  const id = uuidv4();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, passwordHash, salt, createdAt);

  return { id, username, created_at: createdAt };
}

export function verifyUser(username: string, password: string): UserRecord | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  
  if (!row) {
    return null;
  }
  
  const providedHash = hashPassword(password, row.salt);
  
  // timingSafeEqual requires buffers of the same length
  const providedBuffer = Buffer.from(providedHash, "hex");
  const storedBuffer = Buffer.from(row.password_hash, "hex");
  
  if (providedBuffer.length !== storedBuffer.length || !timingSafeEqual(providedBuffer, storedBuffer)) {
    return null;
  }
  
  return {
    id: row.id,
    username: row.username,
    created_at: row.created_at,
  };
}

export function getUserById(id: string): UserRecord | null {
  const row = db.prepare("SELECT id, username, created_at FROM users WHERE id = ?").get(id) as UserRecord | undefined;
  return row ?? null;
}
