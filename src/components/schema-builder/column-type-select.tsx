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
          className="h-8 rounded-lg border border-zinc-800 bg-white/5 px-2.5 text-xs font-medium text-zinc-400 shadow-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 data-[placeholder]:text-zinc-700"
        >
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/20">
          {dataTypeGroups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.label}
              </SelectLabel>
              {group.items.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="py-1.5 pl-2 pr-8 text-xs text-zinc-400 focus:bg-white/10 focus:text-zinc-200"
                >
                  <div className="flex min-w-[140px] items-center justify-between gap-3">
                    <span className="font-medium uppercase">{item.value}</span>
                    <span className="text-[10px] text-zinc-600">{group.label}</span>
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
