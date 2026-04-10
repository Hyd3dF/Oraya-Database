import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

import {
  assertSafeIdentifier,
  quoteIdentifier,
  type ConnectionInput,
  type ConnectionStatus,
  type TableColumnDefinition,
  type TableDataPage,
  type TableSchema,
  type TableSummary,
} from "@/lib/shared";

export type {
  ConnectionInput,
  ConnectionStatus,
  PostgresDataType,
  TableColumnDefinition,
  TableDataPage,
  TableSchema,
  TableSummary,
} from "@/lib/shared";
export { assertSafeIdentifier, normalizeIdentifier, quoteIdentifier } from "@/lib/shared";

export const CONNECTION_COOKIE_NAME = "dbp_connection";

const CONNECTION_COOKIE_MAX_AGE = 60 * 60 * 8;
const DEFAULT_PAGE_SIZE = 100;
const POOL_MAX_SIZE = 10;
const PUBLIC_SCHEMA = "public";

type PoolCache = Map<string, Pool>;

declare global {
  var __dbPoolCache__: PoolCache | undefined;
}

function getPoolCache(): PoolCache {
  if (!globalThis.__dbPoolCache__) {
    globalThis.__dbPoolCache__ = new Map<string, Pool>();
  }

  return globalThis.__dbPoolCache__;
}

function getEncryptionKey() {
  const secret =
    process.env.DB_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "development-only-cookie-secret-change-me";

  return createHash("sha256").update(secret).digest();
}

function encryptPayload(payload: ConnectionInput) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function decryptPayload(value: string): ConnectionInput | null {
  try {
    const decoded = Buffer.from(value, "base64url");
    const iv = decoded.subarray(0, 12);
    const authTag = decoded.subarray(12, 28);
    const encrypted = decoded.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    return validateConnectionInput(JSON.parse(decrypted));
  } catch {
    return null;
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} zorunludur.`);
  }

  return value.trim();
}

export function validateConnectionInput(input: unknown): ConnectionInput {
  if (!input || typeof input !== "object") {
    throw new Error("Bağlantı bilgileri geçersiz.");
  }

  const candidate = input as Record<string, unknown>;
  const host = requireString(candidate.host, "Sunucu");
  const user = requireString(candidate.user, "Kullanıcı");
  const password = typeof candidate.password === "string" ? candidate.password : "";
  const database = requireString(candidate.database, "Veritabanı");
  const rawPort = candidate.port;
  const port =
    typeof rawPort === "number"
      ? rawPort
      : typeof rawPort === "string"
        ? Number.parseInt(rawPort, 10)
        : Number.NaN;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port 1 ile 65535 arasında olmalıdır.");
  }

  return {
    host,
    port,
    user,
    password,
    database,
  };
}

function serializeConnectionKey(config: ConnectionInput) {
  return `${config.host}:${config.port}:${config.user}:${config.database}`;
}

function createPool(config: ConnectionInput) {
  const cache = getPoolCache();
  const cacheKey = serializeConnectionKey(config);
  const existing = cache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: POOL_MAX_SIZE,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", () => {
    cache.delete(cacheKey);
  });

  cache.set(cacheKey, pool);
  return pool;
}

async function withPoolClient<T>(
  config: ConnectionInput,
  executor: (client: PoolClient) => Promise<T>,
) {
  const pool = createPool(config);
  const client = await pool.connect();

  try {
    return await executor(client);
  } finally {
    client.release();
  }
}

export async function getConnectionConfigFromCookies() {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(CONNECTION_COOKIE_NAME)?.value;

  if (!encrypted) {
    return null;
  }

  return decryptPayload(encrypted);
}

export async function saveConnectionConfigToCookies(config: ConnectionInput) {
  const cookieStore = await cookies();
  cookieStore.set(CONNECTION_COOKIE_NAME, encryptPayload(config), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONNECTION_COOKIE_MAX_AGE,
  });
}

export async function clearConnectionConfigCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CONNECTION_COOKIE_NAME);
}

export async function pingConnection(config: ConnectionInput) {
  return withPoolClient(config, async (client) => {
    await client.query("SELECT 1");
  });
}

function buildConnectionStatus(
  status: Omit<ConnectionStatus, "checkedAt">,
): ConnectionStatus {
  return {
    ...status,
    checkedAt: new Date().toISOString(),
  };
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const config = await getConnectionConfigFromCookies();

  if (!config) {
    return buildConnectionStatus({
      connected: false,
      configured: false,
      message: "Bağlantı yapılandırılmadı.",
    });
  }

  try {
    await pingConnection(config);

    return buildConnectionStatus({
      connected: true,
      configured: true,
      host: config.host,
      database: config.database,
      user: config.user,
      message: "Veritabanına bağlı.",
    });
  } catch (error) {
    return buildConnectionStatus({
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      user: config.user,
      message: "Bağlantı doğrulanamadı.",
      error: error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası.",
    });
  }
}

export async function queryWithStoredConnection<T extends QueryResultRow>(
  queryText: string,
  values: unknown[] = [],
) {
  const config = await getConnectionConfigFromCookies();

  if (!config) {
    throw new Error("Önce veritabanı bağlantısı kurmalısınız.");
  }

  return withPoolClient(config, async (client) => client.query<T>(queryText, values));
}

export async function executeStatementsWithStoredConnection(statements: string[]) {
  const config = await getConnectionConfigFromCookies();

  if (!config) {
    throw new Error("Önce veritabanı bağlantısı kurmalısınız.");
  }

  return withPoolClient(config, async (client) => {
    await client.query("BEGIN");

    try {
      for (const statement of statements) {
        await client.query(statement);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function executeSql(statement: string) {
  return executeStatementsWithStoredConnection([statement]);
}

export async function executeSqlStatements(statements: string[]) {
  return executeStatementsWithStoredConnection(statements);
}

function normalizePgType(
  formattedType: string,
  defaultValue: string | null,
): Pick<TableColumnDefinition, "type" | "length"> {
  const normalized = formattedType.toLowerCase();

  if (defaultValue?.startsWith("nextval(")) {
    if (normalized === "integer") {
      return { type: "serial", length: null };
    }

    if (normalized === "bigint") {
      return { type: "bigserial", length: null };
    }
  }

  if (normalized.startsWith("character varying(")) {
    const match = normalized.match(/\((\d+)\)/);
    return {
      type: "varchar",
      length: match ? Number.parseInt(match[1], 10) : 255,
    };
  }

  if (normalized.startsWith("character(")) {
    const match = normalized.match(/\((\d+)\)/);
    return {
      type: "char",
      length: match ? Number.parseInt(match[1], 10) : 1,
    };
  }

  if (normalized === "text") return { type: "text", length: null };
  if (normalized === "integer") return { type: "integer", length: null };
  if (normalized === "bigint") return { type: "bigint", length: null };
  if (normalized === "boolean") return { type: "boolean", length: null };
  if (normalized.startsWith("timestamp")) return { type: "timestamp", length: null };
  if (normalized === "date") return { type: "date", length: null };
  if (normalized.startsWith("time")) return { type: "time", length: null };
  if (normalized === "jsonb") return { type: "jsonb", length: null };
  if (normalized === "bytea") return { type: "bytea", length: null };
  if (normalized === "uuid") return { type: "uuid", length: null };
  if (normalized === "real" || normalized === "double precision" || normalized === "numeric") {
    return { type: "float", length: null };
  }

  return { type: "text", length: null };
}

function stripWrappedQuotes(value: string) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function normalizeDefaultValue(value: string | null) {
  if (!value || value.startsWith("nextval(")) {
    return undefined;
  }

  const quotedCastMatch = value.match(/^'(.*)'::[\w\s."[\]]+$/);
  if (quotedCastMatch) {
    return stripWrappedQuotes(`'${quotedCastMatch[1]}'`);
  }

  const castMatch = value.match(/^(.*)::[\w\s."[\]]+$/);
  if (castMatch) {
    return castMatch[1];
  }

  return value;
}

export async function listTables() {
  const result = await queryWithStoredConnection<{
    table_name: string;
    row_count_estimate: string | null;
    column_count: string;
    has_primary_key: boolean;
  }>(
    `
      WITH base_tables AS (
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = $1
          AND t.table_type = 'BASE TABLE'
      ),
      column_counts AS (
        SELECT c.table_schema, c.table_name, COUNT(*)::text AS column_count
        FROM information_schema.columns c
        WHERE c.table_schema = $1
        GROUP BY c.table_schema, c.table_name
      ),
      primary_key_tables AS (
        SELECT tc.table_schema, tc.table_name, TRUE AS has_primary_key
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = $1
          AND tc.constraint_type = 'PRIMARY KEY'
        GROUP BY tc.table_schema, tc.table_name
      ),
      table_stats AS (
        SELECT
          ns.nspname AS table_schema,
          cls.relname AS table_name,
          cls.reltuples::bigint::text AS row_count_estimate
        FROM pg_class cls
        JOIN pg_namespace ns
          ON ns.oid = cls.relnamespace
        WHERE ns.nspname = $1
          AND cls.relkind = 'r'
      )
      SELECT
        bt.table_name,
        ts.row_count_estimate,
        COALESCE(cc.column_count, '0') AS column_count,
        COALESCE(pk.has_primary_key, FALSE) AS has_primary_key
      FROM base_tables bt
      LEFT JOIN column_counts cc
        ON cc.table_schema = bt.table_schema
       AND cc.table_name = bt.table_name
      LEFT JOIN primary_key_tables pk
        ON pk.table_schema = bt.table_schema
       AND pk.table_name = bt.table_name
      LEFT JOIN table_stats ts
        ON ts.table_schema = bt.table_schema
       AND ts.table_name = bt.table_name
      ORDER BY bt.table_name ASC
    `,
    [PUBLIC_SCHEMA],
  );

  return result.rows.map<TableSummary>((row) => ({
    name: row.table_name,
    rowCountEstimate: row.row_count_estimate
      ? Number.parseInt(row.row_count_estimate, 10)
      : null,
    columnCount: Number.parseInt(row.column_count, 10),
    hasPrimaryKey: row.has_primary_key,
  }));
}

export async function getTableSchema(tableName: string): Promise<TableSchema> {
  const safeTableName = assertSafeIdentifier(tableName);
  const result = await queryWithStoredConnection<{
    column_name: string;
    formatted_type: string;
    is_not_null: boolean;
    default_value: string | null;
    is_primary_key: boolean;
    unique_constraint_name: string | null;
    primary_key_constraint_name: string | null;
  }>(
    `
      SELECT
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
        a.attnotnull AS is_not_null,
        pg_get_expr(ad.adbin, ad.adrelid) AS default_value,
        EXISTS (
          SELECT 1
          FROM pg_index idx
          WHERE idx.indrelid = t.oid
            AND idx.indisprimary
            AND a.attnum = ANY(idx.indkey)
        ) AS is_primary_key,
        (
          SELECT c.conname
          FROM pg_constraint c
          WHERE c.conrelid = t.oid
            AND c.contype = 'u'
            AND array_length(c.conkey, 1) = 1
            AND c.conkey[1] = a.attnum
          LIMIT 1
        ) AS unique_constraint_name,
        (
          SELECT c.conname
          FROM pg_constraint c
          WHERE c.conrelid = t.oid
            AND c.contype = 'p'
          LIMIT 1
        ) AS primary_key_constraint_name
      FROM pg_attribute a
      JOIN pg_class t
        ON t.oid = a.attrelid
      JOIN pg_namespace n
        ON n.oid = t.relnamespace
      LEFT JOIN pg_attrdef ad
        ON ad.adrelid = a.attrelid
       AND ad.adnum = a.attnum
      WHERE n.nspname = $1
        AND t.relname = $2
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum ASC
    `,
    [PUBLIC_SCHEMA, safeTableName],
  );

  const columns = result.rows.map<TableColumnDefinition>((row) => {
    const defaultValue = normalizeDefaultValue(row.default_value);
    const normalizedType = normalizePgType(row.formatted_type, row.default_value);

    return {
      name: row.column_name,
      originalName: row.column_name,
      formattedType: row.formatted_type,
      type: normalizedType.type,
      length: normalizedType.length,
      isPrimaryKey: row.is_primary_key,
      isUnique: Boolean(row.unique_constraint_name),
      isNotNull: row.is_not_null,
      defaultValue,
      uniqueConstraintName: row.unique_constraint_name,
      primaryKeyConstraintName: row.primary_key_constraint_name,
    };
  });

  return {
    tableName: safeTableName,
    columns,
    primaryKeyConstraintName: columns.find((column) => column.isPrimaryKey)
      ?.primaryKeyConstraintName,
  };
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = value ? Number.parseInt(value, 10) : fallback;

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function getPagingParams(searchParams: URLSearchParams) {
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), DEFAULT_PAGE_SIZE);
  const rawOffset = parsePositiveInteger(searchParams.get("offset"), 0);

  return {
    limit: Math.min(Math.max(rawLimit, 1), 500),
    offset: rawOffset,
  };
}

export async function getTableData(
  tableName: string,
  optionsOrLimit: { limit: number; offset: number } | number,
  maybeOffset?: number,
): Promise<TableDataPage> {
  const safeTableName = assertSafeIdentifier(tableName);
  const tableReference = `${quoteIdentifier(PUBLIC_SCHEMA)}.${quoteIdentifier(safeTableName)}`;
  const options =
    typeof optionsOrLimit === "number"
      ? {
          limit: Math.min(Math.max(optionsOrLimit, 1), 500),
          offset: Math.max(maybeOffset ?? 0, 0),
        }
      : optionsOrLimit;

  const [countResult, rowResult] = await Promise.all([
    queryWithStoredConnection<{ total_count: string }>(
      `SELECT COUNT(*)::text AS total_count FROM ${tableReference}`,
    ),
    queryWithStoredConnection<Record<string, unknown>>(
      `SELECT * FROM ${tableReference} ORDER BY 1 LIMIT $1 OFFSET $2`,
      [options.limit, options.offset],
    ),
  ]);

  return {
    tableName: safeTableName,
    columns: rowResult.fields.map((field) => field.name),
    rows: rowResult.rows,
    totalCount: Number.parseInt(countResult.rows[0]?.total_count ?? "0", 10),
    limit: options.limit,
    offset: options.offset,
  };
}
