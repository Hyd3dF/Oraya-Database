import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ApiKeyRecord {
  id: string;
  key: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

declare global {
  var __apiKeysDb__: Database.Database | undefined;
}

const dataDirectory = join(process.cwd(), "data");
const databasePath = join(dataDirectory, "api-keys.db");

function ensureDataDirectory() {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }
}

function toBoolean(value: number): boolean {
  return value === 1;
}

function toInteger(value: boolean): number {
  return value ? 1 : 0;
}

function toApiKeyRecord(record: {
  id: string;
  key: string;
  name: string;
  created_at: string;
  is_active: number;
}): ApiKeyRecord {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    created_at: record.created_at,
    is_active: toBoolean(record.is_active),
  };
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
  `);
}

function getDb() {
  if (!globalThis.__apiKeysDb__) {
    ensureDataDirectory();
    const db = new Database(databasePath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDatabase(db);
    globalThis.__apiKeysDb__ = db;
  }

  return globalThis.__apiKeysDb__;
}

export function createApiKey(name: string): ApiKeyRecord {
  const db = getDb();
  const trimmedName = name.trim();
  const key = `dbp_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO api_keys (id, key, name, created_at, is_active) VALUES (?, ?, ?, ?, 1)",
  ).run(id, key, trimmedName, createdAt);

  const record = db
    .prepare(
      "SELECT id, key, name, created_at, is_active FROM api_keys WHERE id = ?",
    )
    .get(id) as
    | {
        id: string;
        key: string;
        name: string;
        created_at: string;
        is_active: number;
      }
    | undefined;

  if (!record) {
    throw new Error("API anahtarı oluşturuldu fakat geri okunamadı.");
  }

  return toApiKeyRecord(record);
}

export function getAllApiKeys(): ApiKeyRecord[] {
  const db = getDb();
  const result = db
    .prepare(
      "SELECT id, key, name, created_at, is_active FROM api_keys ORDER BY created_at DESC",
    )
    .all() as Array<{
    id: string;
    key: string;
    name: string;
    created_at: string;
    is_active: number;
  }>;

  return result.map(toApiKeyRecord);
}

export function getApiKeyById(id: string): ApiKeyRecord | null {
  const db = getDb();
  const record = db
    .prepare("SELECT id, key, name, created_at, is_active FROM api_keys WHERE id = ?")
    .get(id) as
    | {
        id: string;
        key: string;
        name: string;
        created_at: string;
        is_active: number;
      }
    | undefined;

  return record ? toApiKeyRecord(record) : null;
}

export function getApiKeyByKey(key: string): ApiKeyRecord | null {
  const db = getDb();
  const record = db
    .prepare("SELECT id, key, name, created_at, is_active FROM api_keys WHERE key = ?")
    .get(key) as
    | {
        id: string;
        key: string;
        name: string;
        created_at: string;
        is_active: number;
      }
    | undefined;

  return record ? toApiKeyRecord(record) : null;
}

export function deleteApiKey(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateApiKeyActiveStatus(id: string, isActive: boolean): boolean {
  const db = getDb();
  const result = db
    .prepare("UPDATE api_keys SET is_active = ? WHERE id = ?")
    .run(toInteger(isActive), id);

  return result.changes > 0;
}

export function getActiveApiKeysCount(): number {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) AS count FROM api_keys WHERE is_active = 1")
    .get() as { count: number } | undefined;

  return Number(result?.count ?? 0);
}
