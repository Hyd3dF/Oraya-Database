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
import { ScrollArea } from "@/components/ui/scroll-area";
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

function FieldError({ message }: { message?: string }) {
  return (
    <p
      className="ios-inline-error"
      style={{
        maxHeight: message ? 32 : 0,
        opacity: message ? 1 : 0,
        marginTop: message ? 8 : 0,
      }}
    >
      {message ?? ""}
    </p>
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
    <DialogContent className="h-[94vh] max-w-[1180px] overflow-hidden rounded-[36px] border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,250,0.9))] p-0 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.48)] backdrop-blur-2xl">
      <DialogHeader className="border-b border-white/80 px-7 pb-6 pt-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              {badgeLabel}
            </Badge>
            <div className="space-y-2">
              <DialogTitle className="text-[30px] font-semibold tracking-[-0.03em] text-foreground">
                {modeLabel}
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-[15px] leading-7 text-muted-foreground">
                Shape the table name and column structure in one calm, readable
                workspace. When you save, the visual definition is translated into
                SQL and applied directly to PostgreSQL in the background.
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
              className="rounded-full border-white/80 bg-white/80 px-4"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canRedo || isSubmitting}
              onClick={redo}
              className="rounded-full border-white/80 bg-white/80 px-4"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="ios-caption">Table name</p>
            <div
              className="mt-2 ios-field-shell max-w-xl"
              data-invalid={tableNameError ? "true" : "false"}
            >
              <Input
                value={definition.tableName}
                onChange={(event) => updateTableName(event.target.value)}
                placeholder="e.g. users"
                className="h-16 rounded-[22px] border-0 bg-transparent px-5 text-[17px] font-medium tracking-[-0.01em] shadow-none backdrop-blur-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <FieldError message={tableNameError} />
          </div>

          <div className="flex items-start lg:items-end">
            <Button
              type="button"
              onClick={addColumn}
              disabled={isSubmitting}
              className="h-14 rounded-[22px] px-5 shadow-[0_20px_36px_-24px_rgba(0,122,255,0.55)]"
            >
              <Plus className="h-4 w-4" />
              Add column
            </Button>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="h-full px-7 py-6">
        <div className="space-y-5 pb-8">
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
            <div className="rounded-[24px] border border-amber-400/18 bg-amber-400/10 px-5 py-4 text-sm text-amber-800">
              {generalErrors.map((error) => error.message).join(" ")}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <DialogFooter className="border-t border-white/80 px-7 py-5">
        <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            {validationErrors.length === 0
              ? `${sanitizedDefinition.columns.length} columns are ready to save.`
              : `${validationErrors.length} validation fields still need attention.`}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-full border-white/80 bg-white/80 px-5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={validationErrors.length > 0 || isSubmitting}
              className="rounded-full px-5 shadow-[0_20px_36px_-24px_rgba(0,122,255,0.55)]"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
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
