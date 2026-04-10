import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "node:crypto";

export interface ApiKeyRecord {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "api-keys.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export function getAllApiKeys(): ApiKeyRecord[] {
  const rows = db.prepare("SELECT * FROM api_keys ORDER BY created_at DESC").all() as any[];
  return rows.map((row) => ({
    ...row,
    is_active: Boolean(row.is_active),
  }));
}

export function createApiKey(name: string): ApiKeyRecord {
  const id = uuidv4();
  // Generate a random key: ora_ + 32 random hex characters
  const key = `ora_${randomBytes(16).toString("hex")}`;
  const created_at = new Date().toISOString();
  
  db.prepare("INSERT INTO api_keys (id, key, name, is_active, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, key, name, 1, created_at);
    
  return {
    id,
    key,
    name,
    is_active: true,
    created_at,
  };
}

export function deleteApiKey(id: string): boolean {
  const info = db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);
  return info.changes > 0;
}

export function updateApiKeyActiveStatus(id: string, is_active: boolean): boolean {
  const info = db.prepare("UPDATE api_keys SET is_active = ? WHERE id = ?")
    .run(is_active ? 1 : 0, id);
  return info.changes > 0;
}

export function getApiKeyById(id: string): ApiKeyRecord | undefined {
  const row = db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    is_active: Boolean(row.is_active),
  };
}