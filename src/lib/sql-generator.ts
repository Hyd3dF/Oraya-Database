import {
  assertSafeIdentifier,
  normalizeIdentifier,
  quoteIdentifier,
  type PostgresDataType,
  type TableSchema,
} from "@/lib/shared";

export { normalizeIdentifier } from "@/lib/shared";
export type { PostgresDataType } from "@/lib/shared";

export interface ColumnDefinition {
  id: string;
  name: string;
  originalName?: string | null;
  type: PostgresDataType;
  length?: number | null;
  formattedType?: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNotNull: boolean;
  defaultValue?: string | null;
  uniqueConstraintName?: string | null;
  primaryKeyConstraintName?: string | null;
}

export interface TableDefinition {
  tableName: string;
  originalTableName?: string | null;
  columns: ColumnDefinition[];
  primaryKeyConstraintName?: string | null;
}

export interface SchemaChanges {
  previous: TableDefinition;
  next: TableDefinition;
}

export interface ValidationError {
  field: string;
  message: string;
  columnId?: string;
}

const TEXT_TYPES = new Set<PostgresDataType>([
  "text",
  "varchar",
  "char",
  "uuid",
  "date",
  "time",
  "timestamp",
]);
const NUMERIC_TYPES = new Set<PostgresDataType>([
  "integer",
  "bigint",
  "float",
  "serial",
  "bigserial",
]);
const EXPRESSION_DEFAULTS = new Set([
  "now()",
  "CURRENT_TIMESTAMP",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "gen_random_uuid()",
]);

function createColumnId() {
  return globalThis.crypto.randomUUID();
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeColumnName(value: string) {
  return normalizeIdentifier(value);
}

function normalizeTableName(value: string) {
  return normalizeIdentifier(value);
}

function normalizeLength(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function requiresLength(type: PostgresDataType) {
  return type === "varchar" || type === "char";
}

function buildUniqueConstraintName(tableName: string, columnName: string) {
  return `${normalizeTableName(tableName)}_${normalizeColumnName(columnName)}_key`;
}

function buildPrimaryKeyConstraintName(tableName: string) {
  return `${normalizeTableName(tableName)}_pkey`;
}

function getPrimaryKeyColumns(columns: ColumnDefinition[]) {
  return columns.filter((column) => column.isPrimaryKey);
}

function getRequiredNotNull(column: ColumnDefinition) {
  return column.isPrimaryKey || column.isNotNull;
}

export function coercePostgresDataType(value: string | PostgresDataType): PostgresDataType {
  const normalized = String(value).trim().toLowerCase();

  switch (normalized) {
    case "text":
    case "varchar":
    case "char":
    case "integer":
    case "bigint":
    case "boolean":
    case "timestamp":
    case "date":
    case "time":
    case "jsonb":
    case "bytea":
    case "uuid":
    case "float":
    case "serial":
    case "bigserial":
      return normalized;
    case "character varying":
      return "varchar";
    case "character":
      return "char";
    case "double precision":
    case "real":
    case "numeric":
      return "float";
    default:
      return "text";
  }
}

export function createEmptyColumnDefinition(
  overrides: Partial<ColumnDefinition> = {},
): ColumnDefinition {
  const nextType = coercePostgresDataType(overrides.type ?? "text");

  return sanitizeColumnDefinition({
    id: overrides.id ?? createColumnId(),
    name: overrides.name ?? "",
    originalName: overrides.originalName ?? null,
    type: nextType,
    length: overrides.length ?? (requiresLength(nextType) ? 255 : null),
    formattedType: overrides.formattedType,
    isPrimaryKey: overrides.isPrimaryKey ?? false,
    isUnique: overrides.isUnique ?? false,
    isNotNull: overrides.isPrimaryKey ? true : (overrides.isNotNull ?? false),
    defaultValue: overrides.defaultValue ?? "",
    uniqueConstraintName: overrides.uniqueConstraintName ?? null,
    primaryKeyConstraintName: overrides.primaryKeyConstraintName ?? null,
  });
}

export function sanitizeColumnDefinition(column: ColumnDefinition): ColumnDefinition {
  const type = coercePostgresDataType(column.type);

  return {
    ...column,
    id: column.id || createColumnId(),
    name: normalizeColumnName(column.name),
    originalName: column.originalName ? normalizeColumnName(column.originalName) : null,
    type,
    length: requiresLength(type) ? normalizeLength(column.length) ?? 255 : null,
    isPrimaryKey: Boolean(column.isPrimaryKey),
    isUnique: Boolean(column.isUnique),
    isNotNull: column.isPrimaryKey ? true : Boolean(column.isNotNull),
    defaultValue: column.defaultValue?.trim() ?? "",
    uniqueConstraintName: column.uniqueConstraintName ?? null,
    primaryKeyConstraintName: column.primaryKeyConstraintName ?? null,
  };
}

export function sanitizeTableDefinition(definition: TableDefinition): TableDefinition {
  return {
    ...definition,
    tableName: normalizeTableName(definition.tableName),
    originalTableName: definition.originalTableName
      ? normalizeTableName(definition.originalTableName)
      : null,
    columns: definition.columns.map(sanitizeColumnDefinition),
    primaryKeyConstraintName: definition.primaryKeyConstraintName ?? null,
  };
}

export function tableSchemaToDefinition(schema: TableSchema): TableDefinition {
  return {
    tableName: schema.tableName,
    originalTableName: schema.tableName,
    primaryKeyConstraintName: schema.primaryKeyConstraintName ?? null,
    columns: schema.columns.map((column) =>
      createEmptyColumnDefinition({
        id: column.originalName ?? column.name,
        name: column.name,
        originalName: column.originalName ?? column.name,
        type: column.type,
        length: column.length ?? null,
        formattedType: column.formattedType,
        isPrimaryKey: column.isPrimaryKey,
        isUnique: column.isUnique,
        isNotNull: column.isNotNull,
        defaultValue: column.defaultValue ?? "",
        uniqueConstraintName: column.uniqueConstraintName ?? null,
        primaryKeyConstraintName: column.primaryKeyConstraintName ?? null,
      }),
    ),
  };
}

export function validateTableDefinition(definition: TableDefinition) {
  const sanitized = sanitizeTableDefinition(definition);
  const errors: ValidationError[] = [];

  if (!sanitized.tableName) {
    errors.push({
      field: "tableName",
      message: "Table name is required.",
    });
  } else if (!/^[a-z_][a-z0-9_]*$/.test(sanitized.tableName)) {
    errors.push({
      field: "tableName",
      message: "Table names must use lowercase letters, numbers, and underscores.",
    });
  }

  if (sanitized.columns.length === 0) {
    errors.push({
      field: "columns",
      message: "Add at least one column before saving.",
    });
  }

  const seenNames = new Set<string>();

  sanitized.columns.forEach((column, index) => {
    const fieldPrefix = `columns.${index}`;

    if (!column.name) {
      errors.push({
        field: `${fieldPrefix}.name`,
        columnId: column.id,
        message: "Column name is required.",
      });
    } else if (!/^[a-z_][a-z0-9_]*$/.test(column.name)) {
      errors.push({
        field: `${fieldPrefix}.name`,
        columnId: column.id,
        message: "Column names must use lowercase letters, numbers, and underscores.",
      });
    } else if (seenNames.has(column.name)) {
      errors.push({
        field: `${fieldPrefix}.name`,
        columnId: column.id,
        message: "Each column name must be unique.",
      });
    }

    seenNames.add(column.name);

    if (requiresLength(column.type)) {
      if (!column.length || column.length < 1 || column.length > 65535) {
        errors.push({
          field: `${fieldPrefix}.length`,
          columnId: column.id,
          message: "Character length must be between 1 and 65535.",
        });
      }
    }

    try {
      formatDefaultValue(column);
    } catch (error) {
      errors.push({
        field: `${fieldPrefix}.defaultValue`,
        columnId: column.id,
        message:
          error instanceof Error ? error.message : "Default value is invalid.",
      });
    }
  });

  return errors;
}

function formatColumnType(column: ColumnDefinition) {
  switch (column.type) {
    case "varchar":
      return `VARCHAR(${column.length ?? 255})`;
    case "char":
      return `CHAR(${column.length ?? 1})`;
    case "text":
      return "TEXT";
    case "integer":
      return "INTEGER";
    case "bigint":
      return "BIGINT";
    case "boolean":
      return "BOOLEAN";
    case "timestamp":
      return "TIMESTAMP";
    case "date":
      return "DATE";
    case "time":
      return "TIME";
    case "jsonb":
      return "JSONB";
    case "bytea":
      return "BYTEA";
    case "uuid":
      return "UUID";
    case "float":
      return "DOUBLE PRECISION";
    case "serial":
      return "SERIAL";
    case "bigserial":
      return "BIGSERIAL";
    default:
      return "TEXT";
  }
}

function formatDefaultValue(column: ColumnDefinition) {
  const rawValue = column.defaultValue?.trim();

  if (!rawValue) {
    return null;
  }

  if (column.type === "serial" || column.type === "bigserial") {
    return null;
  }

  if (EXPRESSION_DEFAULTS.has(rawValue)) {
    if (rawValue === "gen_random_uuid()" && column.type !== "uuid") {
      throw new Error("gen_random_uuid() can only be used on UUID columns.");
    }

    if (rawValue === "CURRENT_DATE" && column.type !== "date") {
      throw new Error("CURRENT_DATE can only be used on DATE columns.");
    }

    if (rawValue === "CURRENT_TIME" && column.type !== "time") {
      throw new Error("CURRENT_TIME can only be used on TIME columns.");
    }

    if (
      (rawValue === "now()" || rawValue === "CURRENT_TIMESTAMP") &&
      column.type !== "timestamp"
    ) {
      throw new Error("Timestamp expressions can only be used on TIMESTAMP columns.");
    }

    return rawValue;
  }

  if (column.type === "boolean") {
    if (!/^(true|false)$/i.test(rawValue)) {
      throw new Error("BOOLEAN defaults must be either true or false.");
    }

    return rawValue.toLowerCase();
  }

  if (NUMERIC_TYPES.has(column.type)) {
    if (!/^-?\d+(\.\d+)?$/.test(rawValue)) {
      throw new Error("Numeric default value is invalid.");
    }

    return rawValue;
  }

  if (column.type === "jsonb") {
    JSON.parse(rawValue);
    return `${quoteLiteral(rawValue)}::jsonb`;
  }

  if (column.type === "bytea") {
    return quoteLiteral(rawValue);
  }

  if (column.type === "uuid") {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawValue,
      )
    ) {
      throw new Error("UUID default value is invalid.");
    }

    return quoteLiteral(rawValue);
  }

  if (TEXT_TYPES.has(column.type)) {
    return quoteLiteral(rawValue);
  }

  return quoteLiteral(rawValue);
}

function formatColumnClause(column: ColumnDefinition, inlinePrimaryKey: boolean) {
  const fragments = [
    quoteIdentifier(column.name),
    formatColumnType(column),
  ];

  if (inlinePrimaryKey) {
    fragments.push("PRIMARY KEY");
  }

  if (getRequiredNotNull(column)) {
    fragments.push("NOT NULL");
  }

  if (column.isUnique && !column.isPrimaryKey) {
    fragments.push("UNIQUE");
  }

  const defaultValue = formatDefaultValue(column);
  if (defaultValue) {
    fragments.push(`DEFAULT ${defaultValue}`);
  }

  return fragments.join(" ");
}

function haveSamePrimaryKeys(previous: ColumnDefinition[], next: ColumnDefinition[]) {
  const previousKeys = getPrimaryKeyColumns(previous)
    .map((column) => column.name)
    .sort();
  const nextKeys = getPrimaryKeyColumns(next)
    .map((column) => column.name)
    .sort();

  return JSON.stringify(previousKeys) === JSON.stringify(nextKeys);
}

export function generateCreateTableSQL(definition: TableDefinition) {
  const sanitized = sanitizeTableDefinition(definition);
  const errors = validateTableDefinition(sanitized);

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join(" "));
  }

  assertSafeIdentifier(sanitized.tableName);

  const primaryKeys = getPrimaryKeyColumns(sanitized.columns);
  const hasCompositePrimaryKey = primaryKeys.length > 1;
  const columnClauses = sanitized.columns.map((column) =>
    formatColumnClause(column, !hasCompositePrimaryKey && column.isPrimaryKey),
  );

  if (hasCompositePrimaryKey) {
    columnClauses.push(
      `PRIMARY KEY (${primaryKeys
        .map((column) => quoteIdentifier(column.name))
        .join(", ")})`,
    );
  }

  return `CREATE TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
    sanitized.tableName,
  )} (\n  ${columnClauses.join(",\n  ")}\n);`;
}

export function generateDropTableSQL(tableName: string) {
  const safeTableName = normalizeTableName(tableName);
  assertSafeIdentifier(safeTableName);

  return `DROP TABLE ${quoteIdentifier("public")}.${quoteIdentifier(safeTableName)};`;
}

export function generateAddColumnSQL(tableName: string, column: ColumnDefinition) {
  const safeTableName = normalizeTableName(tableName);
  const sanitizedColumn = sanitizeColumnDefinition(column);
  assertSafeIdentifier(safeTableName);
  assertSafeIdentifier(sanitizedColumn.name);

  return `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
    safeTableName,
  )} ADD COLUMN ${formatColumnClause(sanitizedColumn, false)};`;
}

export function generateDropColumnSQL(tableName: string, columnName: string) {
  const safeTableName = normalizeTableName(tableName);
  const safeColumnName = normalizeColumnName(columnName);
  assertSafeIdentifier(safeTableName);
  assertSafeIdentifier(safeColumnName);

  return `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
    safeTableName,
  )} DROP COLUMN ${quoteIdentifier(safeColumnName)};`;
}

export function generateAlterTableSQL(tableName: string, changes: SchemaChanges) {
  const previous = sanitizeTableDefinition(changes.previous);
  const next = sanitizeTableDefinition(changes.next);
  const errors = validateTableDefinition(next);

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join(" "));
  }

  const currentTableName = normalizeTableName(tableName || previous.tableName);
  const nextTableName = next.tableName;
  const statements: string[] = [];
  let workingTableName = currentTableName;

  assertSafeIdentifier(currentTableName);
  assertSafeIdentifier(nextTableName);

  if (currentTableName !== nextTableName) {
    statements.push(
      `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
        currentTableName,
      )} RENAME TO ${quoteIdentifier(nextTableName)};`,
    );
    workingTableName = nextTableName;
  }

  const previousColumnsBySource = new Map(
    previous.columns.map((column) => [column.originalName ?? column.name, column]),
  );
  const nextColumnsBySource = new Map(
    next.columns.map((column) => [column.originalName ?? column.name, column]),
  );

  const primaryKeysChanged = !haveSamePrimaryKeys(previous.columns, next.columns);
  if (primaryKeysChanged) {
    const previousPrimaryKeyConstraintName =
      previous.primaryKeyConstraintName ??
      previous.columns.find((column) => column.primaryKeyConstraintName)
        ?.primaryKeyConstraintName ??
      buildPrimaryKeyConstraintName(currentTableName);

    statements.push(
      `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
        workingTableName,
      )} DROP CONSTRAINT IF EXISTS ${quoteIdentifier(previousPrimaryKeyConstraintName)};`,
    );
  }

  for (const nextColumn of next.columns) {
    const sourceName = nextColumn.originalName ?? nextColumn.name;
    const previousColumn = previousColumnsBySource.get(sourceName);

    if (!previousColumn) {
      statements.push(generateAddColumnSQL(workingTableName, nextColumn));
      continue;
    }

    if (
      previousColumn.isUnique &&
      !nextColumn.isUnique &&
      !previousColumn.isPrimaryKey &&
      previousColumn.uniqueConstraintName
    ) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} DROP CONSTRAINT ${quoteIdentifier(previousColumn.uniqueConstraintName)};`,
      );
    }

    let effectiveColumnName = previousColumn.name;

    if (previousColumn.name !== nextColumn.name) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} RENAME COLUMN ${quoteIdentifier(previousColumn.name)} TO ${quoteIdentifier(
          nextColumn.name,
        )};`,
      );
      effectiveColumnName = nextColumn.name;
    }

    if (formatColumnType(previousColumn) !== formatColumnType(nextColumn)) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} ALTER COLUMN ${quoteIdentifier(effectiveColumnName)} TYPE ${formatColumnType(
          nextColumn,
        )};`,
      );
    }

    const previousRequiredNotNull = getRequiredNotNull(previousColumn);
    const nextRequiredNotNull = getRequiredNotNull(nextColumn);

    if (previousRequiredNotNull !== nextRequiredNotNull) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} ALTER COLUMN ${quoteIdentifier(effectiveColumnName)} ${
          nextRequiredNotNull ? "SET" : "DROP"
        } NOT NULL;`,
      );
    }

    const previousDefault = previousColumn.defaultValue?.trim() ?? "";
    const nextDefault = nextColumn.defaultValue?.trim() ?? "";

    if (previousDefault !== nextDefault) {
      if (!nextDefault) {
        statements.push(
          `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
            workingTableName,
          )} ALTER COLUMN ${quoteIdentifier(effectiveColumnName)} DROP DEFAULT;`,
        );
      } else {
        statements.push(
          `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
            workingTableName,
          )} ALTER COLUMN ${quoteIdentifier(
            effectiveColumnName,
          )} SET DEFAULT ${formatDefaultValue(nextColumn)};`,
        );
      }
    }

    if (!previousColumn.isUnique && nextColumn.isUnique && !nextColumn.isPrimaryKey) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} ADD CONSTRAINT ${quoteIdentifier(
          buildUniqueConstraintName(nextTableName, nextColumn.name),
        )} UNIQUE (${quoteIdentifier(nextColumn.name)});`,
      );
    }
  }

  for (const previousColumn of previous.columns) {
    const lookupName = previousColumn.originalName ?? previousColumn.name;

    if (!nextColumnsBySource.has(lookupName)) {
      statements.push(generateDropColumnSQL(workingTableName, previousColumn.name));
    }
  }

  if (primaryKeysChanged) {
    const nextPrimaryKeyColumns = getPrimaryKeyColumns(next.columns).map((column) =>
      quoteIdentifier(column.name),
    );

    if (nextPrimaryKeyColumns.length > 0) {
      statements.push(
        `ALTER TABLE ${quoteIdentifier("public")}.${quoteIdentifier(
          workingTableName,
        )} ADD CONSTRAINT ${quoteIdentifier(
          buildPrimaryKeyConstraintName(nextTableName),
        )} PRIMARY KEY (${nextPrimaryKeyColumns.join(", ")});`,
      );
    }
  }

  return statements;
}

