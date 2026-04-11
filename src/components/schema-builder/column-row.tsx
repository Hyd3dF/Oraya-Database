"use client";

import { Trash2 } from "lucide-react";

import { ColumnTypeSelect } from "@/components/schema-builder/column-type-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ColumnDefinition, ValidationError } from "@/lib/sql-generator";

interface ColumnRowProps {
  column: ColumnDefinition;
  primaryKeyCount: number;
  errors?: ValidationError[];
  onChange: (patch: Partial<ColumnDefinition>) => void;
  onRemove: () => void;
}

function defaultShortcuts(column: ColumnDefinition) {
  if (column.type === "boolean") {
    return ["true", "false"];
  }

  if (column.type === "timestamp") {
    return ["now()", "CURRENT_TIMESTAMP"];
  }

  if (column.type === "uuid") {
    return ["gen_random_uuid()"];
  }

  return [];
}

function findFieldError(errors: ValidationError[], fieldSuffix: "name" | "defaultValue" | "length") {
  return errors.find((error) => error.field.endsWith(`.${fieldSuffix}`))?.message;
}

function InlineToggle({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-8 items-center justify-center">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function ColumnRow({
  column,
  primaryKeyCount,
  errors = [],
  onChange,
  onRemove,
}: ColumnRowProps) {
  const shortcuts = defaultShortcuts(column);
  const hasLength = column.type === "varchar" || column.type === "char";
  const nameError = findFieldError(errors, "name");
  const defaultError = findFieldError(errors, "defaultValue");
  const lengthError = findFieldError(errors, "length");
  const rowErrors = Array.from(new Set(errors.map((error) => error.message)));

  return (
    <div className="border-b border-slate-200/80 px-3 py-2 last:border-b-0">
      <div className="grid min-w-[980px] grid-cols-[minmax(150px,1.4fr)_128px_84px_minmax(180px,1.35fr)_72px_72px_72px_36px] items-start gap-2">
        <div className="space-y-1">
          <Label htmlFor={`column-name-${column.id}`} className="sr-only">
            Column name
          </Label>
          <Input
            id={`column-name-${column.id}`}
            value={column.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="column_name"
            className={cn(
              "h-8 rounded-md border-slate-200 bg-white px-2 text-[11px] shadow-none",
              nameError && "border-destructive/50 focus-visible:ring-destructive/20",
            )}
          />
        </div>

        <ColumnTypeSelect
          value={column.type}
          onValueChange={(value) => onChange({ type: value })}
        />

        <div className="space-y-1">
          <Label htmlFor={`column-length-${column.id}`} className="sr-only">
            Length
          </Label>
          {hasLength ? (
            <Input
              id={`column-length-${column.id}`}
              inputMode="numeric"
              value={String(column.length ?? 255)}
              onChange={(event) =>
                onChange({
                  length: Number.parseInt(event.target.value, 10) || 0,
                })
              }
              placeholder="255"
              className={cn(
                "h-8 rounded-md border-slate-200 bg-white px-2 text-[11px] shadow-none",
                lengthError && "border-destructive/50 focus-visible:ring-destructive/20",
              )}
            />
          ) : (
            <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-muted-foreground">
              -
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`column-default-${column.id}`} className="sr-only">
            Default value
          </Label>
          <Input
            id={`column-default-${column.id}`}
            value={column.defaultValue ?? ""}
            onChange={(event) => onChange({ defaultValue: event.target.value })}
            placeholder="default expression"
            className={cn(
              "h-8 rounded-md border-slate-200 bg-white px-2 text-[11px] shadow-none",
              defaultError && "border-destructive/50 focus-visible:ring-destructive/20",
            )}
          />
          {shortcuts.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut}
                  type="button"
                  className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-slate-300 hover:bg-white hover:text-foreground"
                  onClick={() => onChange({ defaultValue: shortcut })}
                >
                  {shortcut}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <InlineToggle
          id={`column-pk-${column.id}`}
          label={`Primary key ${column.id}`}
          checked={column.isPrimaryKey}
          onCheckedChange={(nextChecked) => {
            onChange({
              isPrimaryKey: nextChecked,
              isNotNull: nextChecked ? true : column.isNotNull,
            });
          }}
        />

        <InlineToggle
          id={`column-unique-${column.id}`}
          label={`Unique ${column.id}`}
          checked={column.isUnique}
          onCheckedChange={(nextChecked) => onChange({ isUnique: nextChecked })}
        />

        <InlineToggle
          id={`column-required-${column.id}`}
          label={`Required ${column.id}`}
          checked={column.isPrimaryKey ? true : column.isNotNull}
          disabled={column.isPrimaryKey}
          onCheckedChange={(nextChecked) => onChange({ isNotNull: nextChecked })}
        />

        <div className="flex h-8 items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${column.name || "column"}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {rowErrors.length > 0 ? (
        <div className="min-w-[980px] pt-1 text-[10px] text-destructive">
          {rowErrors.join(" ")}
        </div>
      ) : null}

      {column.isPrimaryKey && primaryKeyCount > 1 ? (
        <div className="min-w-[980px] pt-1 text-[10px] text-amber-700">
          Multiple primary-key columns are selected. This will save as a composite key.
        </div>
      ) : null}
    </div>
  );
}
