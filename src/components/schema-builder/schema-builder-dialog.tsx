"use client";

import { LoaderCircle, Plus, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ColumnRow } from "@/components/schema-builder/column-row";
import { useSchemaBuilder, type SchemaBuilderMode } from "@/hooks/use-schema-builder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TableDefinition } from "@/lib/sql-generator";

interface SchemaBuilderDialogProps {
  open: boolean;
  mode: SchemaBuilderMode;
  initialDefinition?: TableDefinition | null;
  originalTableName?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (tableName: string) => void;
}

interface SchemaBuilderContentProps {
  mode: SchemaBuilderMode;
  initialDefinition?: TableDefinition | null;
  originalTableName?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (tableName: string) => void;
}

function TableHeaderRow() {
  return (
    <div className="flex h-9 items-center border-b border-zinc-800/60 bg-white/5 px-4">
      <div className="grid w-full grid-cols-[1fr_120px_80px_1fr_60px_60px_60px_40px] gap-2">
        {["Column", "Type", "Length", "Default", "PK", "Unique", "Null", ""].map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="text-[10px] font-medium uppercase tracking-wider text-zinc-500"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaBuilderContent({
  mode,
  initialDefinition,
  originalTableName,
  onOpenChange,
  onSaved,
}: SchemaBuilderContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    definition,
    sanitizedDefinition,
    validationErrors,
    errorsByColumnId,
    primaryKeyCount,
    updateTableName,
    addColumn,
    removeColumn,
    updateColumn,
  } = useSchemaBuilder({
    mode,
    initialDefinition,
  });

  const modeLabel = mode === "create" ? "New Table" : "Edit Table";
  const tableNameError = validationErrors.find((error) => error.field === "tableName")?.message;
  const generalErrors = validationErrors.filter(
    (error) => !error.columnId && error.field !== "tableName",
  );

  async function handleSubmit() {
    if (validationErrors.length > 0) {
      toast.error("Resolve the issues before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/tables"
          : `/api/tables/${encodeURIComponent(
              originalTableName ?? initialDefinition?.tableName ?? sanitizedDefinition.tableName,
            )}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          definition: sanitizedDefinition,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        tableName?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save.");
      }

      const nextTableName = payload.tableName ?? sanitizedDefinition.tableName;
      toast.success(
        mode === "create"
          ? `${nextTableName} created.`
          : `${nextTableName} updated.`,
      );
      onOpenChange(false);
      onSaved(nextTableName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="flex h-[85vh] max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/95 p-0 shadow-xl shadow-black/20 [&>button]:hidden">
      <DialogHeader className="shrink-0 border-b border-zinc-800/60 bg-zinc-900/95 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
            <Table2 className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-zinc-100">
              {modeLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Define columns and constraints for your table.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Table Name
            </label>
            <Input
              value={definition.tableName}
              onChange={(event) => updateTableName(event.target.value)}
              placeholder="users"
              className="h-9 rounded-lg border border-zinc-800 bg-white/5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
            {tableNameError && (
              <p className="text-[10px] text-red-400">{tableNameError}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-5">
            <span className="rounded-md border border-zinc-800 bg-white/5 px-2.5 py-1 text-xs text-zinc-500">
              {sanitizedDefinition.columns.length} columns
            </span>
            <Button
              type="button"
              onClick={addColumn}
              disabled={isSubmitting}
              className="h-9 rounded-lg bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Column
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[900px]">
          <TableHeaderRow />

          <div className="bg-zinc-900/95">
            {definition.columns.map((column) => (
              <ColumnRow
                key={column.id}
                column={column}
                primaryKeyCount={primaryKeyCount}
                errors={errorsByColumnId.get(column.id)}
                onChange={(patch) => updateColumn(column.id, patch)}
                onRemove={() => removeColumn(column.id)}
              />
            ))}

            {generalErrors.length > 0 && (
              <div className="border-t border-zinc-800/60 bg-white/5 px-4 py-2 text-xs text-red-400">
                {generalErrors.map((error) => error.message).join(" ")}
              </div>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="shrink-0 border-t border-zinc-800/60 bg-zinc-900/95 px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">
              {validationErrors.length === 0 ? (
                <span className="text-zinc-400">{sanitizedDefinition.columns.length} columns ready</span>
              ) : (
                <span className="text-red-400">{validationErrors.length} issues need attention</span>
              )}
            </p>
            {primaryKeyCount > 1 && (
              <p className="text-[10px] text-amber-400">
                Multiple primary keys will be saved as a composite key.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-white/5 px-4 text-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={validationErrors.length > 0 || isSubmitting}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save Table
            </button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function SchemaBuilderDialog({
  open,
  mode,
  initialDefinition,
  originalTableName,
  onOpenChange,
  onSaved,
}: SchemaBuilderDialogProps) {
  const dialogKey = useMemo(
    () =>
      [
        mode,
        originalTableName ?? initialDefinition?.tableName ?? "new",
        initialDefinition?.columns
          .map((column) => `${column.id}:${column.name}:${column.type}`)
          .join("|") ?? "",
      ].join("::"),
    [initialDefinition, mode, originalTableName],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SchemaBuilderContent
          key={dialogKey}
          mode={mode}
          initialDefinition={initialDefinition}
          originalTableName={originalTableName}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}
