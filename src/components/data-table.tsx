"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T extends Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  title: string;
  description?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyState?: string;
}

function isIsoDateString(value: string) {
  if (value.length < 10) {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /\d{4}-\d{2}-\d{2}/.test(value);
}

function formatDateValue(value: string) {
  const date = new Date(value);
  const hasTime = /T|\d{2}:\d{2}/.test(value);

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function formatNumberValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function summarizeJson(value: Record<string, unknown> | unknown[]) {
  if (Array.isArray(value)) {
    return `${value.length} item array`;
  }

  const keys = Object.keys(value);
  return `${keys.length} field object`;
}

function renderDefaultCell(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-white/85 bg-white/75 px-3 py-1 text-[11px] font-medium text-muted-foreground"
      >
        No value
      </Badge>
    );
  }

  if (typeof value === "boolean") {
    return value ? (
      <Badge className="rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-500/12">
        True
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="rounded-full border-zinc-200 bg-zinc-100/85 px-3 py-1 text-[11px] text-zinc-600"
      >
        False
      </Badge>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="font-medium tabular-nums text-foreground/90">
        {formatNumberValue(value)}
      </span>
    );
  }

  if (typeof value === "string" && isIsoDateString(value)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground/90">{formatDateValue(value)}</span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          date
        </span>
      </div>
    );
  }

  if (Array.isArray(value) || typeof value === "object") {
    return (
      <div className="rounded-[16px] border border-white/80 bg-white/65 px-3 py-2 transition-colors duration-300 group-hover:bg-white/80">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          JSON
        </div>
        <div className="mt-1 text-[13px] leading-5 text-foreground/85">
          {summarizeJson(value as Record<string, unknown> | unknown[])}
        </div>
      </div>
    );
  }

  if (typeof value === "string" && value.length > 72) {
    return (
      <div className="max-w-[420px] text-[14px] leading-6 text-foreground/90">
        <span className="line-clamp-2">{value}</span>
      </div>
    );
  }

  return <span className="text-foreground/90">{String(value)}</span>;
}

function getAutoAlignment(value: unknown) {
  if (typeof value === "number") {
    return "right";
  }

  return "left";
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  rows,
  emptyState = "No data is available for this table yet.",
}: DataTableProps<T>) {
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden rounded-[32px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,251,0.8))] shadow-[0_30px_90px_-58px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <CardHeader className="space-y-2 border-b border-white/75 px-6 py-5 sm:px-7">
        <CardTitle className="text-[20px] font-semibold tracking-[-0.02em]">
          {title}
        </CardTitle>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="px-0 pb-0 pt-0">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/70 bg-white/55 hover:bg-white/55">
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "h-14 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:px-7",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                      )}
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIndex) => {
                  const rowKey = `${title}-${rowIndex}`;
                  const isSelected = selectedRowKey === rowKey;

                  return (
                    <TableRow
                      key={rowKey}
                      data-state={isSelected ? "selected" : "idle"}
                      onClick={() =>
                        setSelectedRowKey((current) => (current === rowKey ? null : rowKey))
                      }
                      className={cn(
                        "group cursor-pointer border-white/60 transition-all duration-300 ease-out",
                        "hover:-translate-y-[1px] hover:bg-primary/[0.045] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
                        "active:translate-y-0 active:bg-primary/[0.06]",
                        isSelected &&
                          "bg-primary/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
                      )}
                    >
                      {columns.map((column) => {
                        const value = row[column.key];
                        const effectiveAlign = column.align ?? getAutoAlignment(value);

                        return (
                          <TableCell
                            key={column.key}
                            className={cn(
                              "px-6 py-4 align-middle text-[14px] leading-7 text-foreground transition-[background-color,transform] duration-300 sm:px-7",
                              effectiveAlign === "center" && "text-center",
                              effectiveAlign === "right" && "text-right",
                            )}
                          >
                            <div
                              className={cn(
                                "min-h-[38px] transition-transform duration-300 ease-out group-hover:translate-x-[1px]",
                                isSelected && "translate-x-[1px]",
                                effectiveAlign === "right" && "ml-auto flex w-fit justify-end",
                                effectiveAlign === "center" &&
                                  "mx-auto flex w-fit justify-center group-hover:translate-x-0",
                              )}
                            >
                              {column.render ? column.render(value, row) : renderDefaultCell(value)}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-6 py-12 sm:px-7">
            <div className="rounded-[24px] border border-dashed border-white/85 bg-white/60 p-8 text-sm leading-6 text-muted-foreground">
              {emptyState}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
