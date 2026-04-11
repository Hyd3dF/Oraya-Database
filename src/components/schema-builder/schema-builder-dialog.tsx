"use client";

import { LoaderCircle, Plus, Redo2, Save, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ColumnRow } from "@/components/schema-builder/column-row";
import { useSchemaBuilder, type SchemaBuilderMode } from "@/hooks/use-schema-builder";
import { Badge } from "@/components/ui/badge";
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
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-[#f3f5f8] px-3 py-2">
      <div className="grid min-w-[980px] grid-cols-[minmax(150px,1.4fr)_128px_84px_minmax(180px,1.35fr)_72px_72px_72px_36px] gap-2">
        {[
          "Column",
          "Type",
          "Length",
          "Default",
          "PK",
          "Unique",
          "Required",
          "",
        ].map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
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
    canUndo,
    canRedo,
    updateTableName,
    addColumn,
    removeColumn,
    updateColumn,
    undo,
    redo,
  } = useSchemaBuilder({
    mode,
    initialDefinition,
  });

  const modeLabel = mode === "create" ? "Create table" : "Edit table";
  const badgeLabel = mode === "create" ? "New table" : "Editing";
  const tableNameError = validationErrors.find((error) => error.field === "tableName")?.message;
  const generalErrors = validationErrors.filter(
    (error) => !error.columnId && error.field !== "tableName",
  );

  async function handleSubmit() {
    if (validationErrors.length > 0) {
      toast.error("Resolve the validation issues before saving.");
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
        throw new Error(payload.error ?? "Unable to save schema changes.");
      }

      const nextTableName = payload.tableName ?? sanitizedDefinition.tableName;
      toast.success(
        mode === "create"
          ? `${nextTableName} was created successfully.`
          : `${nextTableName} was updated successfully.`,
      );
      onOpenChange(false);
      onSaved(nextTableName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save schema changes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="flex h-[88vh] max-w-[1240px] flex-col overflow-hidden rounded-[22px] border border-white/85 bg-white/96 p-0 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
      <DialogHeader className="shrink-0 gap-3 border-b border-slate-200/80 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-md bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/10">
              {badgeLabel}
            </Badge>
            <div className="space-y-1">
              <DialogTitle className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">
                {modeLabel}
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-[12px] leading-5 text-muted-foreground">
                Define the table in a dense spreadsheet-style editor, then persist the schema directly to PostgreSQL.
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUndo || isSubmitting}
              onClick={undo}
              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[11px]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canRedo || isSubmitting}
              onClick={redo}
              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[11px]"
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Table name
            </p>
            <Input
              value={definition.tableName}
              onChange={(event) => updateTableName(event.target.value)}
              placeholder="users"
              className="h-9 max-w-sm rounded-lg border-slate-200 bg-white px-3 text-[12px] font-medium shadow-none"
            />
            {tableNameError ? (
              <p className="text-[10px] text-destructive">{tableNameError}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2.5 py-1 text-[10px]">
              {sanitizedDefinition.columns.length} columns
            </Badge>
            <Button
              type="button"
              onClick={addColumn}
              disabled={isSubmitting}
              className="h-9 rounded-lg px-3.5 text-[11px] shadow-[0_18px_28px_-20px_rgba(0,122,255,0.45)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add column
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[980px]">
          <TableHeaderRow />

          <div className="bg-white">
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

            {generalErrors.length > 0 ? (
              <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                {generalErrors.map((error) => error.message).join(" ")}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DialogFooter className="shrink-0 border-t border-slate-200/80 px-4 py-3">
        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {validationErrors.length === 0
                ? `${sanitizedDefinition.columns.length} columns are ready to save.`
                : `${validationErrors.length} validation fields still need attention.`}
            </p>
            {primaryKeyCount > 1 ? (
              <p className="text-[10px] text-amber-700">
                Multiple primary-key columns will be saved as a composite key.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={validationErrors.length > 0 || isSubmitting}
              className="h-8 rounded-lg px-3 text-[11px] shadow-[0_18px_28px_-20px_rgba(0,122,255,0.45)]"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
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
