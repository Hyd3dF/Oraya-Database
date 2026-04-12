import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

import {
  assertSafeIdentifier,
  quoteIdentifier,
  type ConnectionInput,
  type ConnectionSslMode,
  type ConnectionStatus,
  type TableColumnDefinition,
  type TableDataPage,
  type TableSchema,
  type TableSummary,
} from "@/lib/shared";

export type {
  ConnectionInput,
  ConnectionSslMode,
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
const POOL_MAX_SIZE = 3;
const PUBLIC_SCHEMA = "public";
const DEFAULT_CONNECTION_TIMEOUT_MILLIS = 15_000;
const DEFAULT_SSL_MODE: ConnectionSslMode = "prefer";

type PoolCache = Map<string, Pool>;
type PoolResolutionCache = Map<string, string>;

interface ConnectionCandidate {
  id: string;
  label: string;
  poolConfig: PoolConfig;
}

interface PgConnectionError extends Error {
  code?: string;
}

declare global {
  var __dbPoolCache__: PoolCache | undefined;
  var __dbPoolResolutionCache__: PoolResolutionCache | undefined;
}

function getPoolCache(): PoolCache {
  if (!globalThis.__dbPoolCache__) {
    globalThis.__dbPoolCache__ = new Map<string, Pool>();
  }

  return globalThis.__dbPoolCache__;
}

function getPoolResolutionCache(): PoolResolutionCache {
  if (!globalThis.__dbPoolResolutionCache__) {
    globalThis.__dbPoolResolutionCache__ = new Map<string, string>();
  }

  return globalThis.__dbPoolResolutionCache__;
}

function getEncryptionKey() {
  const secret =
    process.env.DB_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "development-only-cookie-secret-change-me";

  return createHash("sha256").update(secret).digest();
}

export function encryptConnectionPayload(payload: ConnectionInput) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptConnectionPayload(value: string): ConnectionInput | null {
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
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeSslMode(value: unknown): ConnectionSslMode {
  return value === "disable" || value === "require" || value === "prefer"
    ? value
    : DEFAULT_SSL_MODE;
}

function normalizeBoolean(value: unknown, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return defaultValue;
}

function fingerprintSecret(secret: string) {
  return createHash("sha1").update(secret).digest("hex").slice(0, 12);
}

function toConnectionError(error: unknown) {
  if (error instanceof Error) {
    return error as PgConnectionError;
  }

  return new Error("Unknown connection error.") as PgConnectionError;
}

function wrapConnectionError(summary: string, error: unknown) {
  const message = toConnectionError(error).message;
  return new Error(message === summary ? summary : `${summary} (${message})`);
}

function isSslCompatibilityError(error: unknown) {
  const { code, message } = toConnectionError(error);
  const normalizedMessage = message.toLowerCase();
  const normalizedCode = code?.toUpperCase();

  if (
    normalizedCode === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    normalizedCode === "SELF_SIGNED_CERT_IN_CHAIN" ||
    normalizedCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    normalizedCode === "CERT_HAS_EXPIRED" ||
    normalizedCode === "ERR_TLS_CERT_ALTNAME_INVALID"
  ) {
    return true;
  }

  return [
    "does not support ssl",
    "self-signed certificate",
    "unable to verify the first certificate",
    "certificate has expired",
    "hostname/ip does not match certificate",
    "tls",
    "ssl off",
    "ssl on",
    "pg_hba.conf entry",
  ].some((fragment) => normalizedMessage.includes(fragment));
}

function formatConnectionError(error: unknown) {
  const pgError = toConnectionError(error);
  const message = pgError.message;
  const normalizedMessage = message.toLowerCase();
  const normalizedCode = pgError.code?.toUpperCase();

  if (
    normalizedCode === "ETIMEDOUT" ||
    normalizedMessage.includes("connection timeout") ||
    normalizedMessage.includes("timeout expired")
  ) {
    return wrapConnectionError(
      "Connection timed out. Hosted deployments connect from the server runtime, not from the end user's browser. The database host must be reachable from that network, and its firewall or cloud rules must allow the connection.",
      error,
    );
  }

  if (normalizedCode === "ECONNREFUSED") {
    return wrapConnectionError(
      "Connection was refused. The host is reachable, but PostgreSQL is not accepting connections on this port. Check listen_addresses, port exposure, and firewalls.",
      error,
    );
  }

  if (normalizedCode === "ENOTFOUND" || normalizedCode === "EAI_AGAIN") {
    return wrapConnectionError(
      "The database host could not be resolved. Check the hostname or DNS configuration.",
      error,
    );
  }

  if (normalizedMessage.includes("no pg_hba.conf entry")) {
    if (normalizedMessage.includes("ssl off")) {
      return wrapConnectionError(
        "The server rejected the non-SSL connection. Switch SSL mode to Prefer or Require, or update pg_hba.conf to allow non-SSL clients.",
        error,
      );
    }

    if (normalizedMessage.includes("ssl on")) {
      return wrapConnectionError(
        "The server rejected the SSL connection. Check pg_hba.conf allowlists and the server's SSL policy.",
        error,
      );
    }

    return wrapConnectionError(
      "The database rejected this host, user, or database combination. Check pg_hba.conf and any IP allowlists in front of PostgreSQL.",
      error,
    );
  }

  if (normalizedMessage.includes("password authentication failed")) {
    return wrapConnectionError("Authentication failed. Check the PostgreSQL username and password.", error);
  }

  if (normalizedMessage.includes('database') && normalizedMessage.includes('does not exist')) {
    return wrapConnectionError("The target database does not exist on the server.", error);
  }

  if (normalizedMessage.includes("does not support ssl")) {
    return wrapConnectionError(
      "This PostgreSQL server does not support SSL. Switch SSL mode to Disable or Prefer.",
      error,
    );
  }

  if (isSslCompatibilityError(error)) {
    return wrapConnectionError(
      "SSL negotiation failed. Switch SSL mode between Prefer, Require, and Disable as needed. If the server uses a self-signed certificate, enable 'Allow self-signed certificates'.",
      error,
    );
  }

  return pgError;
}

export function validateConnectionInput(input: unknown): ConnectionInput {
  if (!input || typeof input !== "object") {
    throw new Error("Connection details are invalid.");
  }

  const candidate = input as Record<string, unknown>;
  const host = requireString(candidate.host, "Host");
  const user = requireString(candidate.user, "User");
  const password = typeof candidate.password === "string" ? candidate.password : "";
  const database = requireString(candidate.database, "Database");
  const rawPort = candidate.port;
  const port =
    typeof rawPort === "number"
      ? rawPort
      : typeof rawPort === "string"
        ? Number.parseInt(rawPort, 10)
        : Number.NaN;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be between 1 and 65535.");
  }

  const sslMode = normalizeSslMode(candidate.sslMode);
  const allowSelfSignedCertificates = normalizeBoolean(
    candidate.allowSelfSignedCertificates,
    false,
  );

  return {
    host,
    port,
    user,
    password,
    database,
    sslMode,
    allowSelfSignedCertificates,
  };
}

function serializeConnectionKey(config: ConnectionInput) {
  return [
    config.host,
    config.port,
    config.user,
    config.database,
    fingerprintSecret(config.password),
    config.sslMode ?? DEFAULT_SSL_MODE,
    config.allowSelfSignedCertificates ? "self-signed" : "verified",
  ].join(":");
}

function serializeCandidateCacheKey(config: ConnectionInput, candidateId: string) {
  return `${serializeConnectionKey(config)}:${candidateId}`;
}

function buildTlsConfig(config: ConnectionInput): PoolConfig["ssl"] {
  return {
    rejectUnauthorized: !config.allowSelfSignedCertificates,
  };
}

function buildBasePoolConfig(config: ConnectionInput): PoolConfig {
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: POOL_MAX_SIZE,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MILLIS,
    keepAlive: true,
  };
}

function reorderCandidates(candidates: ConnectionCandidate[], preferredId: string | undefined) {
  if (!preferredId) {
    return candidates;
  }

  const preferredCandidate = candidates.find((candidate) => candidate.id === preferredId);
  if (!preferredCandidate) {
    return candidates;
  }

  return [preferredCandidate, ...candidates.filter((candidate) => candidate.id !== preferredId)];
}

function buildConnectionCandidates(config: ConnectionInput): ConnectionCandidate[] {
  const basePoolConfig = buildBasePoolConfig(config);
  const sslMode = config.sslMode ?? DEFAULT_SSL_MODE;
  const preferredCandidateId = getPoolResolutionCache().get(serializeConnectionKey(config));
  const plainCandidate: ConnectionCandidate = {
    id: "plain",
    label: "non-SSL",
    poolConfig: {
      ...basePoolConfig,
      ssl: false,
    },
  };
  const tlsCandidate: ConnectionCandidate = {
    id: config.allowSelfSignedCertificates ? "tls-relaxed" : "tls-verified",
    label: config.allowSelfSignedCertificates ? "SSL (self-signed allowed)" : "SSL",
    poolConfig: {
      ...basePoolConfig,
      ssl: buildTlsConfig(config),
    },
  };

  if (sslMode === "disable") {
    return [plainCandidate];
  }

  if (sslMode === "require") {
    return [tlsCandidate];
  }

  return reorderCandidates([tlsCandidate, plainCandidate], preferredCandidateId);
}

function createPool(config: ConnectionInput, candidate: ConnectionCandidate) {
  const cache = getPoolCache();
  const cacheKey = serializeCandidateCacheKey(config, candidate.id);
  const existing = cache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const baseCacheKey = serializeConnectionKey(config);
  const pool = new Pool(candidate.poolConfig);

  pool.on("error", () => {
    cache.delete(cacheKey);

    if (getPoolResolutionCache().get(baseCacheKey) === candidate.id) {
      getPoolResolutionCache().delete(baseCacheKey);
    }
  });

  cache.set(cacheKey, pool);
  return pool;
}

function disposePool(config: ConnectionInput, candidate: ConnectionCandidate) {
  const cache = getPoolCache();
  const cacheKey = serializeCandidateCacheKey(config, candidate.id);
  const pool = cache.get(cacheKey);

  cache.delete(cacheKey);

  if (getPoolResolutionCache().get(serializeConnectionKey(config)) === candidate.id) {
    getPoolResolutionCache().delete(serializeConnectionKey(config));
  }

  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

function shouldTryNextCandidate(error: unknown, currentIndex: number, candidateCount: number) {
  return currentIndex < candidateCount - 1 && isSslCompatibilityError(error);
}

async function withPoolClient<T>(
  config: ConnectionInput,
  executor: (client: PoolClient) => Promise<T>,
) {
  const candidates = buildConnectionCandidates(config);

  for (const [index, candidate] of candidates.entries()) {
    const pool = createPool(config, candidate);
    let client: PoolClient;

    try {
      client = await pool.connect();
      getPoolResolutionCache().set(serializeConnectionKey(config), candidate.id);
    } catch (error) {
      disposePool(config, candidate);

      if (!shouldTryNextCandidate(error, index, candidates.length)) {
        throw formatConnectionError(error);
      }

      continue;
    }

    try {
      return await executor(client);
    } finally {
      client.release();
    }
  }

  throw new Error("Connection could not be established.");
}

export async function getConnectionConfigFromCookies() {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(CONNECTION_COOKIE_NAME)?.value;

  if (!encrypted) {
    return null;
  }

  return decryptConnectionPayload(encrypted);
}

export async function saveConnectionConfigToCookies(
  config: ConnectionInput,
  request?: Pick<Request, "url">,
) {
  const headersList = await headers();
  const forwardedProto = headersList.get("x-forwarded-proto");
  const requestUrlProto = request?.url ? new URL(request.url).protocol.replace(":", "") : null;
  const originProto = headersList.get("origin")?.split("://")[0]?.toLowerCase();
  const refererProto = headersList.get("referer")?.split("://")[0]?.toLowerCase();
  const requestProtocol =
    forwardedProto?.split(",")[0]?.trim().toLowerCase() ??
    requestUrlProto ??
    originProto ??
    refererProto ??
    "http";
  const shouldUseSecureCookies = requestProtocol === "https";
  const cookieStore = await cookies();
  cookieStore.set(CONNECTION_COOKIE_NAME, encryptConnectionPayload(config), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies,
    path: "/",
    maxAge: CONNECTION_COOKIE_MAX_AGE,
  });
}

export async function clearConnectionConfigCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CONNECTION_COOKIE_NAME);
}

async function requireStoredConnectionConfig() {
  const config = await getConnectionConfigFromCookies();

  if (!config) {
    throw new Error("You must establish a database connection first.");
  }

  return config;
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
      message: "Connection not configured.",
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
      message: "Connected to database.",
    });
  } catch (error) {
    return buildConnectionStatus({
      connected: false,
      configured: true,
      host: config.host,
      database: config.database,
      user: config.user,
      message: "Connection initialization failed.",
      error: error instanceof Error ? error.message : "Unknown connection error.",
    });
  }
}

export async function queryWithConnection<T extends QueryResultRow>(
  config: ConnectionInput,
  queryText: string,
  values: unknown[] = [],
) {
  return withPoolClient(config, async (client) => client.query<T>(queryText, values));
}

export async function queryWithStoredConnection<T extends QueryResultRow>(
  queryText: string,
  values: unknown[] = [],
) {
  return queryWithConnection<T>(await requireStoredConnectionConfig(), queryText, values);
}

export async function executeStatementsWithConnection(
  config: ConnectionInput,
  statements: string[],
) {
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

export async function executeStatementsWithStoredConnection(statements: string[]) {
  return executeStatementsWithConnection(await requireStoredConnectionConfig(), statements);
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

export async function getTableSchemaForConnection(
  config: ConnectionInput,
  tableName: string,
): Promise<TableSchema> {
  const safeTableName = assertSafeIdentifier(tableName);
  const result = await queryWithConnection<{
    column_name: string;
    formatted_type: string;
    is_not_null: boolean;
    default_value: string | null;
    is_primary_key: boolean;
    unique_constraint_name: string | null;
    primary_key_constraint_name: string | null;
  }>(
    config,
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

  if (result.rows.length === 0) {
    throw new Error(`Table "${safeTableName}" was not found.`);
  }

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

export async function getTableSchema(tableName: string): Promise<TableSchema> {
  return getTableSchemaForConnection(await requireStoredConnectionConfig(), tableName);
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

export async function getTableDataForConnection(
  config: ConnectionInput,
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
    queryWithConnection<{ total_count: string }>(
      config,
      `SELECT COUNT(*)::text AS total_count FROM ${tableReference}`,
    ),
    queryWithConnection<Record<string, unknown>>(
      config,
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

export async function getTableData(
  tableName: string,
  optionsOrLimit: { limit: number; offset: number } | number,
  maybeOffset?: number,
): Promise<TableDataPage> {
  return getTableDataForConnection(
    await requireStoredConnectionConfig(),
    tableName,
    optionsOrLimit,
    maybeOffset,
  );
}

function isInsertableRow(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function insertRowsForConnection(
  config: ConnectionInput,
  tableName: string,
  rows: Record<string, unknown>[],
) {
  const safeTableName = assertSafeIdentifier(tableName);

  if (rows.length === 0) {
    throw new Error("At least one row is required.");
  }

  if (!rows.every(isInsertableRow)) {
    throw new Error("Each row must be a JSON object.");
  }

  const firstRowKeys = Object.keys(rows[0]);

  if (firstRowKeys.length === 0) {
    throw new Error("At least one column value is required.");
  }

  const normalizedColumnKeys = firstRowKeys.map((key) => assertSafeIdentifier(key));
  const tableSchema = await getTableSchemaForConnection(config, safeTableName);
  const schemaColumns = new Set(tableSchema.columns.map((column) => column.name));

  for (const columnKey of normalizedColumnKeys) {
    if (!schemaColumns.has(columnKey)) {
      throw new Error(`Column "${columnKey}" was not found in "${safeTableName}".`);
    }
  }

  rows.forEach((row, rowIndex) => {
    const rowKeys = Object.keys(row);

    if (rowKeys.length !== firstRowKeys.length) {
      throw new Error(`Row ${rowIndex + 1} must use the same columns as the first row.`);
    }

    const normalizedRowKeys = rowKeys.map((key) => assertSafeIdentifier(key)).sort();
    const normalizedFirstKeys = [...normalizedColumnKeys].sort();

    if (normalizedRowKeys.some((key, keyIndex) => key !== normalizedFirstKeys[keyIndex])) {
      throw new Error(`Row ${rowIndex + 1} must use the same columns as the first row.`);
    }
  });

  const tableReference = `${quoteIdentifier(PUBLIC_SCHEMA)}.${quoteIdentifier(safeTableName)}`;
  const quotedColumns = normalizedColumnKeys.map((columnKey) => quoteIdentifier(columnKey));
  const values: unknown[] = [];
  const valueGroups = rows.map((row, rowIndex) => {
    const placeholders = normalizedColumnKeys.map((columnKey, columnIndex) => {
      values.push(row[columnKey]);
      return `$${rowIndex * normalizedColumnKeys.length + columnIndex + 1}`;
    });

    return `(${placeholders.join(", ")})`;
  });

  const result = await queryWithConnection<Record<string, unknown>>(
    config,
    `
      INSERT INTO ${tableReference} (${quotedColumns.join(", ")})
      VALUES ${valueGroups.join(", ")}
      RETURNING *
    `,
    values,
  );

  return {
    tableName: safeTableName,
    insertedCount: result.rowCount ?? result.rows.length,
    rows: result.rows,
  };
}

export async function updateRowsForConnection(
  config: ConnectionInput,
  tableName: string,
  searchParams: URLSearchParams,
  body: unknown,
) {
  const safeTableName = assertSafeIdentifier(tableName);
  
  if (!isInsertableRow(body)) {
    throw new Error("Update payload must be a JSON object.");
  }
  
  const updateKeys = Object.keys(body);
  if (updateKeys.length === 0) {
    throw new Error("At least one column value is required to update.");
  }
  
  const tableSchema = await getTableSchemaForConnection(config, safeTableName);
  const schemaColumns = new Set(tableSchema.columns.map((col) => col.name));
  
  const normalizedUpdateKeys = updateKeys.map((key) => assertSafeIdentifier(key));
  for (const col of normalizedUpdateKeys) {
    if (!schemaColumns.has(col)) {
      throw new Error(`Column "${col}" was not found in "${safeTableName}".`);
    }
  }
  
  const whereConditions: string[] = [];
  const queryValues: unknown[] = [];
  
  searchParams.forEach((value, key) => {
    if (key === "limit" || key === "offset") return;
    const safeKey = assertSafeIdentifier(key);
    if (!schemaColumns.has(safeKey)) {
      throw new Error(`Filter column "${key}" was not found in "${safeTableName}".`);
    }
    queryValues.push(value);
    whereConditions.push(`${quoteIdentifier(safeKey)} = $${queryValues.length}`);
  });
  
  if (whereConditions.length === 0) {
    throw new Error("At least one filter (e.g. ?id=5) is required for update.");
  }
  
  const setClauses: string[] = [];
  normalizedUpdateKeys.forEach((key) => {
    queryValues.push(body[key]);
    setClauses.push(`${quoteIdentifier(key)} = $${queryValues.length}`);
  });
  
  const tableReference = `${quoteIdentifier(PUBLIC_SCHEMA)}.${quoteIdentifier(safeTableName)}`;
  
  const result = await queryWithConnection<Record<string, unknown>>(
    config,
    `
      UPDATE ${tableReference}
      SET ${setClauses.join(", ")}
      WHERE ${whereConditions.join(" AND ")}
      RETURNING *
    `,
    queryValues,
  );
  
  return {
    tableName: safeTableName,
    updatedCount: result.rowCount ?? result.rows.length,
    rows: result.rows,
  };
}

export async function deleteRowsForConnection(
  config: ConnectionInput,
  tableName: string,
  searchParams: URLSearchParams,
) {
  const safeTableName = assertSafeIdentifier(tableName);
  const tableSchema = await getTableSchemaForConnection(config, safeTableName);
  const schemaColumns = new Set(tableSchema.columns.map((col) => col.name));
  
  const whereConditions: string[] = [];
  const queryValues: unknown[] = [];
  
  searchParams.forEach((value, key) => {
    if (key === "limit" || key === "offset") return;
    const safeKey = assertSafeIdentifier(key);
    if (!schemaColumns.has(safeKey)) {
      throw new Error(`Filter column "${key}" was not found in "${safeTableName}".`);
    }
    queryValues.push(value);
    whereConditions.push(`${quoteIdentifier(safeKey)} = $${queryValues.length}`);
  });
  
  if (whereConditions.length === 0) {
    throw new Error("At least one filter (e.g. ?id=5) is required for delete.");
  }
  
  const tableReference = `${quoteIdentifier(PUBLIC_SCHEMA)}.${quoteIdentifier(safeTableName)}`;
  
  const result = await queryWithConnection<Record<string, unknown>>(
    config,
    `
      DELETE FROM ${tableReference}
      WHERE ${whereConditions.join(" AND ")}
      RETURNING *
    `,
    queryValues,
  );
  
  return {
    tableName: safeTableName,
    deletedCount: result.rowCount ?? result.rows.length,
    rows: result.rows,
  };
}
