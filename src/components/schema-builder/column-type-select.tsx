"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="ios-caption">Data type</p>
        {description ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/80 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] rounded-2xl border-white/80 bg-white/95 text-foreground shadow-soft">
                {description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="ios-field-shell flex-1">
          <Select value={value} onValueChange={(next) => onValueChange(next as PostgresDataType)}>
            <SelectTrigger className="h-14 rounded-[22px] border-0 bg-transparent px-4 text-[15px] font-medium shadow-none focus:ring-0">
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent className="rounded-[26px] border-white/80 bg-white/95 backdrop-blur-xl">
              {dataTypeGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <div className="flex min-w-[180px] items-center justify-between gap-4">
                        <span>{item.value.toUpperCase()}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {group.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge
          variant="secondary"
          className="rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-[11px] tracking-[0.12em] text-foreground/75"
        >
          {value.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}
