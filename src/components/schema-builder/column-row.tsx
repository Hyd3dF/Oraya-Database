"use client";

import { Trash2 } from "lucide-react";

import { ColumnTypeSelect } from "@/components/schema-builder/column-type-select";
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
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-8 items-center justify-center">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-zinc-600 data-[state=unchecked]:bg-zinc-800"
      />
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
    <div className="border-b border-zinc-800/40 px-4 py-2.5 last:border-b-0 hover:bg-white/[0.02]">
      <div className="grid min-w-[900px] grid-cols-[1fr_120px_80px_1fr_60px_60px_60px_40px] items-start gap-2">
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
              "h-8 rounded-lg border border-zinc-800 bg-white/5 px-2.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50",
              nameError && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
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
                "h-8 rounded-lg border border-zinc-800 bg-white/5 px-2.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50",
                lengthError && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
              )}
            />
          ) : (
            <div className="flex h-8 items-center rounded-lg border border-zinc-800 bg-white/5 px-2.5 text-xs text-zinc-700">
              —
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
              "h-8 rounded-lg border border-zinc-800 bg-white/5 px-2.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50",
              defaultError && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
            )}
          />
          {shortcuts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut}
                  type="button"
                  className="rounded border border-zinc-800 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-600 transition-colors hover:border-zinc-700 hover:bg-white/10 hover:text-zinc-400"
                  onClick={() => onChange({ defaultValue: shortcut })}
                >
                  {shortcut}
                </button>
              ))}
            </div>
          )}
        </div>

        <InlineToggle
          id={`column-pk-${column.id}`}
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
          checked={column.isUnique}
          onCheckedChange={(nextChecked) => onChange({ isUnique: nextChecked })}
        />

        <InlineToggle
          id={`column-required-${column.id}`}
          checked={column.isPrimaryKey ? true : column.isNotNull}
          disabled={column.isPrimaryKey}
          onCheckedChange={(nextChecked) => onChange({ isNotNull: nextChecked })}
        />

        <div className="flex h-8 items-center justify-center">
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-all hover:bg-white/10 hover:text-zinc-400"
            title={`Remove ${column.name || "column"}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {rowErrors.length > 0 && (
        <div className="min-w-[900px] pt-1.5 text-[10px] text-red-400">
          {rowErrors.join(" ")}
        </div>
      )}

      {column.isPrimaryKey && primaryKeyCount > 1 && (
        <div className="min-w-[900px] pt-1.5 text-[10px] text-amber-400">
          Multiple primary keys selected — this will be saved as a composite key.
        </div>
      )}
    </div>
  );
}
