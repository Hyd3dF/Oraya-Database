"use client";

import { useMemo, useState } from "react";

import {
  createEmptyColumnDefinition,
  normalizeIdentifier,
  sanitizeTableDefinition,
  validateTableDefinition,
  type ColumnDefinition,
  type PostgresDataType,
  type TableDefinition,
  type ValidationError,
} from "@/lib/sql-generator";

export type SchemaBuilderMode = "create" | "edit";

interface UseSchemaBuilderOptions {
  mode: SchemaBuilderMode;
  initialDefinition?: TableDefinition | null;
}

function createInitialDefinition(
  mode: SchemaBuilderMode,
  definition?: TableDefinition | null,
) {
  if (definition) {
    return {
      ...definition,
      columns: definition.columns.map((column) => ({
        ...column,
        id: column.id || crypto.randomUUID(),
        originalName: column.originalName ?? column.name,
      })),
    } satisfies TableDefinition;
  }

  return {
    tableName: "",
    columns: [
      createEmptyColumnDefinition({
        isPrimaryKey: true,
        isNotNull: true,
        name: mode === "create" ? "id" : "",
        type: "uuid",
        defaultValue: "gen_random_uuid()",
      }),
    ],
  } satisfies TableDefinition;
}

export function useSchemaBuilder({
  mode,
  initialDefinition,
}: UseSchemaBuilderOptions) {
  const [definition, setDefinition] = useState<TableDefinition>(() =>
    createInitialDefinition(mode, initialDefinition),
  );
  const [history, setHistory] = useState<TableDefinition[]>([]);
  const [future, setFuture] = useState<TableDefinition[]>([]);

  function commit(nextDefinition: TableDefinition) {
    setHistory((current) => [...current, definition]);
    setFuture([]);
    setDefinition(nextDefinition);
  }

  function updateTableName(value: string) {
    commit({
      ...definition,
      tableName: normalizeIdentifier(value),
    });
  }

  function addColumn() {
    commit({
      ...definition,
      columns: [
        ...definition.columns,
        createEmptyColumnDefinition({
          originalName: null,
        }),
      ],
    });
  }

  function removeColumn(columnId: string) {
    commit({
      ...definition,
      columns: definition.columns.filter((column) => column.id !== columnId),
    });
  }

  function updateColumn(columnId: string, patch: Partial<ColumnDefinition>) {
    commit({
      ...definition,
      columns: definition.columns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        const nextType = (patch.type ?? column.type) as PostgresDataType;
        const nextIsPrimaryKey = patch.isPrimaryKey ?? column.isPrimaryKey;

        return {
          ...column,
          ...patch,
          name:
            patch.name !== undefined
              ? normalizeIdentifier(patch.name)
              : column.name,
          originalName:
            patch.originalName !== undefined
              ? patch.originalName
              : column.originalName ?? null,
          type: nextType,
          length:
            nextType === "varchar" || nextType === "char"
              ? patch.length ?? column.length ?? 255
              : null,
          isPrimaryKey: nextIsPrimaryKey,
          isNotNull: nextIsPrimaryKey
            ? true
            : patch.isNotNull ?? column.isNotNull,
          defaultValue:
            patch.defaultValue !== undefined
              ? patch.defaultValue
              : column.defaultValue ?? "",
        };
      }),
    });
  }

  function undo() {
    const previous = history.at(-1);

    if (!previous) {
      return;
    }

    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [definition, ...current]);
    setDefinition(previous);
  }

  function redo() {
    const [next, ...rest] = future;

    if (!next) {
      return;
    }

    setHistory((current) => [...current, definition]);
    setFuture(rest);
    setDefinition(next);
  }

  const sanitizedDefinition = useMemo(
    () => sanitizeTableDefinition(definition),
    [definition],
  );
  const validationErrors = useMemo(
    () => validateTableDefinition(sanitizedDefinition),
    [sanitizedDefinition],
  );
  const errorsByColumnId = useMemo(() => {
    const grouped = new Map<string, ValidationError[]>();

    for (const error of validationErrors) {
      if (!error.columnId) {
        continue;
      }

      const currentErrors = grouped.get(error.columnId) ?? [];
      currentErrors.push(error);
      grouped.set(error.columnId, currentErrors);
    }

    return grouped;
  }, [validationErrors]);
  const primaryKeyCount = definition.columns.filter(
    (column) => column.isPrimaryKey,
  ).length;

  return {
    definition,
    sanitizedDefinition,
    validationErrors,
    errorsByColumnId,
    primaryKeyCount,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    updateTableName,
    addColumn,
    removeColumn,
    updateColumn,
    undo,
    redo,
  };
}
