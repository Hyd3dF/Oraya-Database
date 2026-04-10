"use client";

import { Hash, Trash2 } from "lucide-react";

import { ColumnTypeSelect } from "@/components/schema-builder/column-type-select";
import { ConstraintSwitches } from "@/components/schema-builder/constraint-switches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="rounded-[30px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(252,252,253,0.78))] p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.34)] backdrop-blur-xl transition-all duration-200 ease-out">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <Hash className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Column details
            </p>
            <p className="ios-support-text">
              Adjust the name, type, default value, and constraints in one place.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 rounded-full px-4 text-destructive/90 hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.95fr_0.85fr]">
        <div>
          <Label htmlFor={`column-name-${column.id}`} className="ios-caption">
            Column name
          </Label>
          <div className="mt-2 ios-field-shell" data-invalid={nameError ? "true" : "false"}>
            <Input
              id={`column-name-${column.id}`}
              value={column.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="e.g. user_email"
              className="h-14 rounded-[22px] border-0 bg-transparent px-4 text-[15px] shadow-none backdrop-blur-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <FieldError message={nameError} />
        </div>

        <div>
          <ColumnTypeSelect value={column.type} onValueChange={(value) => onChange({ type: value })} />
        </div>

        <div>
          <Label htmlFor={`column-default-${column.id}`} className="ios-caption">
            Default value
          </Label>
          <div className="mt-2 ios-field-shell" data-invalid={defaultError ? "true" : "false"}>
            <Input
              id={`column-default-${column.id}`}
              value={column.defaultValue ?? ""}
              onChange={(event) => onChange({ defaultValue: event.target.value })}
              placeholder="e.g. now()"
              className="h-14 rounded-[22px] border-0 bg-transparent px-4 text-[15px] shadow-none backdrop-blur-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <FieldError message={defaultError} />

          {shortcuts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-white/80 bg-white/72 px-3 text-[12px] font-medium text-foreground/80 shadow-none hover:bg-white"
                  onClick={() => onChange({ defaultValue: shortcut })}
                >
                  {shortcut}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {hasLength ? (
        <div className="mt-5 max-w-[240px]">
          <Label htmlFor={`column-length-${column.id}`} className="ios-caption">
            Length
          </Label>
          <div className="mt-2 ios-field-shell" data-invalid={lengthError ? "true" : "false"}>
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
              className="h-14 rounded-[22px] border-0 bg-transparent px-4 text-[15px] shadow-none backdrop-blur-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <FieldError message={lengthError} />
        </div>
      ) : null}

      <div className="mt-6">
        <ConstraintSwitches
          column={column}
          primaryKeyCount={primaryKeyCount}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
