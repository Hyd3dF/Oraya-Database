"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PostgresDataType } from "@/lib/sql-generator";

const dataTypeGroups: Array<{
  label: string;
  items: Array<{ value: PostgresDataType; description: string }>;
}> = [
  {
    label: "Text",
    items: [
      { value: "text", description: "Long-form, flexible text content." },
      { value: "varchar", description: "Length-limited text values." },
      { value: "char", description: "Fixed-width character values." },
    ],
  },
  {
    label: "Numeric",
    items: [
      { value: "integer", description: "Standard whole-number values." },
      { value: "bigint", description: "Large whole-number values." },
      { value: "float", description: "Decimal values." },
      { value: "serial", description: "Auto-incrementing integer values." },
      { value: "bigserial", description: "Auto-incrementing large integer values." },
    ],
  },
  {
    label: "Boolean",
    items: [{ value: "boolean", description: "Stores true or false." }],
  },
  {
    label: "Date & Time",
    items: [
      { value: "timestamp", description: "Date and time values." },
      { value: "date", description: "Date only." },
      { value: "time", description: "Time only." },
    ],
  },
  {
    label: "Other",
    items: [
      { value: "uuid", description: "Globally unique identifier." },
      { value: "jsonb", description: "Structured JSON data." },
      { value: "bytea", description: "Binary payloads." },
    ],
  },
];

function findTypeDescription(type: PostgresDataType) {
  return dataTypeGroups
    .flatMap((group) => group.items)
    .find((item) => item.value === type)?.description;
}

interface ColumnTypeSelectProps {
  value: PostgresDataType;
  onValueChange: (value: PostgresDataType) => void;
}

export function ColumnTypeSelect({
  value,
  onValueChange,
}: ColumnTypeSelectProps) {
  const description = findTypeDescription(value);

  return (
    <div className="space-y-1">
      <p className="sr-only">Data type</p>
      <Select value={value} onValueChange={(next) => onValueChange(next as PostgresDataType)}>
        <SelectTrigger
          aria-label="Column data type"
          title={description}
          className="h-8 rounded-md border-slate-200 bg-white px-2 text-[11px] font-medium shadow-none focus:ring-1"
        >
          <SelectValue placeholder="Choose a type" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-slate-200 bg-white/95 backdrop-blur-xl">
          {dataTypeGroups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </SelectLabel>
              {group.items.map((item) => (
                <SelectItem key={item.value} value={item.value} className="py-1 pl-2 pr-7 text-[11px]">
                  <div className="flex min-w-[160px] items-center justify-between gap-3">
                    <span>{item.value.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground">{group.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
