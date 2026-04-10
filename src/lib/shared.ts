export type PostgresDataType =
  | "uuid"
  | "text"
  | "varchar"
  | "char"
  | "integer"
  | "bigint"
  | "boolean"
  | "timestamp"
  | "date"
  | "time"
  | "jsonb"
  | "bytea"
  | "float"
  | "serial"
  | "bigserial";

export interface ConnectionInput {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ConnectionStatus {
  connected: boolean;
  configured: boolean;
  host?: string;
  database?: string;
  user?: string;
  message: string;
  checkedAt: string;
  error?: string;
}

export interface TableSummary {
  name: string;
  rowCountEstimate: number | null;
  columnCount: number;
  hasPrimaryKey: boolean;
}

export interface TableColumnDefinition {
  name: string;
  originalName?: string | null;
  type: PostgresDataType;
  formattedType: string;
  length?: number | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNotNull: boolean;
  defaultValue?: string | null;
  uniqueConstraintName?: string | null;
  primaryKeyConstraintName?: string | null;
}

export interface TableSchema {
  tableName: string;
  columns: TableColumnDefinition[];
  primaryKeyConstraintName?: string | null;
}

export interface TableDataPage {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
}

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

export function normalizeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+/, "");
}

export function assertSafeIdentifier(identifier: string) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Geçersiz tanımlayıcı: ${identifier}`);
  }

  return identifier;
}

export function quoteIdentifier(identifier: string) {
  return `"${assertSafeIdentifier(identifier).replace(/"/g, "\"\"")}"`;
}
