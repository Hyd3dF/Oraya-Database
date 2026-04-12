import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "node:crypto";

import {
  decryptConnectionPayload,
  encryptConnectionPayload,
  type ConnectionInput,
} from "@/lib/db";

export interface ApiKeyRecord {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  connection_host?: string | null;
  connection_database?: string | null;
}

interface ApiKeyRow {
  id: string;
  key: string;
  name: string;
  is_active: number;
  created_at: string;
  connection_payload?: string | null;
  connection_host?: string | null;
  connection_database?: string | null;
}

type ApiKeyAccessResult =
  | { state: "missing" }
  | { state: "inactive"; apiKey: ApiKeyRecord }
  | { state: "unbound"; apiKey: ApiKeyRecord }
  | { state: "ready"; apiKey: ApiKeyRecord; connection: ConnectionInput };

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

function ensureColumn(columnName: string, definition: string) {
  const columns = db.prepare("PRAGMA table_info(api_keys)").all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE api_keys ADD COLUMN ${columnName} ${definition}`);
}

ensureColumn("connection_payload", "TEXT");
ensureColumn("connection_host", "TEXT");
ensureColumn("connection_database", "TEXT");

function mapApiKeyRow(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    connection_host: row.connection_host ?? null,
    connection_database: row.connection_database ?? null,
  };
}

export function getAllApiKeys(): ApiKeyRecord[] {
  const rows = db
    .prepare("SELECT * FROM api_keys ORDER BY created_at DESC")
    .all() as ApiKeyRow[];
  return rows.map(mapApiKeyRow);
}

export function createApiKey(name: string, connection: ConnectionInput): ApiKeyRecord {
  const id = uuidv4();
  // Generate a random key: ora_ + 32 random hex characters
  const key = `ora_${randomBytes(16).toString("hex")}`;
  const created_at = new Date().toISOString();
  const connectionPayload = encryptConnectionPayload(connection);
  
  db.prepare(
    `
      INSERT INTO api_keys (
        id,
        key,
        name,
        is_active,
        created_at,
        connection_payload,
        connection_host,
        connection_database
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    key,
    name,
    1,
    created_at,
    connectionPayload,
    connection.host,
    connection.database,
  );
     
  return {
    id,
    key,
    name,
    is_active: true,
    created_at,
    connection_host: connection.host,
    connection_database: connection.database,
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
  const row = db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as
    | ApiKeyRow
    | undefined;
  if (!row) return undefined;

  return mapApiKeyRow(row);
}

export function resolveApiKeyAccess(apiKeyValue: string): ApiKeyAccessResult {
  const row = db.prepare("SELECT * FROM api_keys WHERE key = ?").get(apiKeyValue) as
    | ApiKeyRow
    | undefined;

  if (!row) {
    return { state: "missing" };
  }

  const apiKey = mapApiKeyRow(row);

  if (!apiKey.is_active) {
    return { state: "inactive", apiKey };
  }

  if (!row.connection_payload) {
    return { state: "unbound", apiKey };
  }

  const connection = decryptConnectionPayload(row.connection_payload);

  if (!connection) {
    return { state: "unbound", apiKey };
  }

  return {
    state: "ready",
    apiKey,
    connection,
  };
}
