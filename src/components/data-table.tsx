"use client";

import { useState, type ReactNode } from "react";

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
  className?: string;
  contentClassName?: string;
  viewportClassName?: string;
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
    return <span className="text-[11px] text-muted-foreground">-</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className="text-[11px] font-medium text-foreground/85">
        {value ? "True" : "False"}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="font-medium tabular-nums text-[11px] text-foreground/90">
        {formatNumberValue(value)}
      </span>
    );
  }

  if (typeof value === "string" && isIsoDateString(value)) {
    return (
      <span className="block max-w-[24rem] truncate text-[11px] text-foreground/90">
        {formatDateValue(value)}
      </span>
    );
  }

  if (Array.isArray(value) || typeof value === "object") {
    return (
      <span className="inline-flex max-w-full items-center rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
        JSON - {summarizeJson(value as Record<string, unknown> | unknown[])}
      </span>
    );
  }

  if (typeof value === "string" && value.length > 72) {
    return (
      <span className="block max-w-[24rem] truncate text-[11px] text-foreground/90">
        {value}
      </span>
    );
  }

  return (
    <span className="block max-w-[24rem] truncate text-[11px] text-foreground/90">
      {String(value)}
    </span>
  );
}

function getAutoAlignment() {
  return "left";
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  rows,
  emptyState = "No data is available for this table yet.",
  className,
  contentClassName,
  viewportClassName,
}: DataTableProps<T>) {
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/90 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl",
        className,
      )}
    >
      <CardHeader className="shrink-0 space-y-1 border-b border-slate-200/80 px-3 py-2.5">
        <CardTitle className="text-[13px] font-semibold tracking-[-0.02em]">
          {title}
        </CardTitle>
        {description ? (
          <p className="max-w-3xl text-[11px] leading-4 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className={cn("min-h-0 flex-1 px-0 pb-0 pt-0", contentClassName)}>
        {rows.length > 0 ? (
          <Table
            containerClassName={cn("max-h-[320px]", viewportClassName)}
            className="min-w-full table-auto"
          >
            <TableHeader>
              <TableRow className="border-none bg-transparent hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "sticky top-0 z-10 border-b border-r border-slate-200 bg-[#f3f5f8] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:border-l",
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
                      "group cursor-pointer border-none transition-colors duration-100",
                      isSelected ? "bg-primary/[0.05]" : "hover:bg-slate-50/90",
                    )}
                  >
                    {columns.map((column) => {
                      const value = row[column.key];
                      const effectiveAlign = column.align ?? getAutoAlignment();

                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "border-b border-r border-slate-200/80 px-2 py-1 align-middle text-[11px] text-foreground first:border-l",
                            effectiveAlign === "center" && "text-center",
                            effectiveAlign === "right" && "text-right",
                          )}
                        >
                          <div
                            className={cn(
                              "min-w-0",
                              effectiveAlign === "right" && "ml-auto flex w-fit justify-end",
                              effectiveAlign === "center" && "mx-auto flex w-fit justify-center",
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
        ) : (
          <div className="px-3 py-4">
            <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50/80 p-3 text-[11px] leading-4 text-muted-foreground">
              {emptyState}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
