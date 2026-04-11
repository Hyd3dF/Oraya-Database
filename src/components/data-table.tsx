"use client";

import { useState, useRef, useCallback, type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  render?: (value: unknown, row: Record<string, unknown>, rowIndex: number) => ReactNode;
}

interface DataTableProps {
  dataColumns: DataTableColumn[];
  dataRows: Record<string, unknown>[];
  selectedRows: Set<number>;
  onToggleRow: (index: number) => void;
  onToggleAllRows: () => void;
  offset: number;
  totalCount: number;
  limit: number;
  isLoadingDetails: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const SELECTOR_WIDTH = 44;
const ROWNUM_WIDTH = 56;
const MIN_COLUMN_WIDTH = 80;
const RESIZE_HANDLE_WIDTH = 8;

function isIsoDateString(value: string) {
  if (value.length < 10) return false;
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
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatNumberValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function summarizeJson(value: Record<string, unknown> | unknown[]) {
  if (Array.isArray(value)) return `${value.length} items`;
  return `${Object.keys(value).length} fields`;
}

function renderDefaultCell(value: unknown, align: "left" | "center" | "right" = "left") {
  if (value === null || value === undefined || value === "") {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", value ? "bg-zinc-500" : "bg-zinc-700")} />
    );
  }

  if (typeof value === "number") {
    return <span className="tabular-nums text-xs text-zinc-300">{formatNumberValue(value)}</span>;
  }

  if (typeof value === "string" && isIsoDateString(value)) {
    return <span className="text-xs text-zinc-500">{formatDateValue(value)}</span>;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return (
      <span className="inline-flex items-center rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
        {summarizeJson(value as Record<string, unknown> | unknown[])}
      </span>
    );
  }

  if (typeof value === "string" && value.length > 50) {
    return (
      <span className="text-xs text-zinc-400" title={value}>
        {value.slice(0, 50)}…
      </span>
    );
  }

  return <span className="text-xs text-zinc-300">{String(value)}</span>;
}

function getAutoAlignment(value: unknown): "left" | "center" | "right" {
  return typeof value === "number" ? "right" : "left";
}

export function DataTable({
  dataColumns,
  dataRows,
  selectedRows,
  onToggleRow,
  onToggleAllRows,
  offset,
  totalCount,
  limit,
  isLoadingDetails,
  onPrevPage,
  onNextPage,
}: DataTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    dataColumns.forEach((col) => {
      widths[col.key] = col.width ?? 150;
    });
    return widths;
  });

  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const widths: Record<string, number> = {};
    dataColumns.forEach((col) => {
      widths[col.key] = col.width ?? 150;
    });
    setColumnWidths(widths);
  }, [dataColumns]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizing) return;
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, resizing.startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizing.key]: newWidth }));
    },
    [resizing]
  );

  const handleMouseUp = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({ key, startX: e.clientX, startWidth: columnWidths[key] });
  };

  const totalWidth = SELECTOR_WIDTH + ROWNUM_WIDTH + Object.values(columnWidths).reduce((a, b) => a + b, 0) + dataColumns.length * RESIZE_HANDLE_WIDTH;
  const hasData = dataRows.length > 0;

  const renderHeaderCell = (col: DataTableColumn, isLast: boolean) => (
    <div
      key={col.key}
      className="relative flex items-center bg-white/5 border-r border-zinc-800/60"
      style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}
    >
      <div
        className={cn(
          "flex-1 truncate px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500",
          col.align === "center" && "text-center",
          col.align === "right" && "text-right"
        )}
      >
        {col.label}
      </div>
      {!isLast && (
        <div
          className="absolute right-0 top-0 h-full w-[8px] cursor-col-resize hover:bg-white/10 active:bg-white/20"
          onMouseDown={(e) => startResize(col.key, e)}
        />
      )}
    </div>
  );

  const renderBodyCell = (col: DataTableColumn, value: unknown, row: Record<string, unknown>, rowIndex: number, isLast: boolean) => {
    const align = col.align ?? getAutoAlignment(value);
    return (
      <div
        key={col.key}
        className="relative flex items-center border-r border-zinc-800/40 border-b border-zinc-800/40"
        style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}
      >
        <div
          className={cn(
            "flex-1 truncate px-3 py-2 text-xs",
            align === "center" && "text-center",
            align === "right" && "text-right"
          )}
        >
          {col.render ? col.render(value, row, rowIndex) : renderDefaultCell(value, align)}
        </div>
        {!isLast && (
          <div
            className="absolute right-0 top-0 h-full w-[8px] cursor-col-resize hover:bg-white/10 active:bg-white/20"
            onMouseDown={(e) => startResize(col.key, e)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-900/40">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-none flex-col" style={{ minWidth: totalWidth }}>
          <div className="flex h-10 border-b border-zinc-800/60" style={{ minWidth: totalWidth }}>
            <div
              className="flex items-center justify-center border-r border-zinc-800/60 bg-white/5 px-2"
              style={{ width: SELECTOR_WIDTH, minWidth: SELECTOR_WIDTH }}
            >
              <input
                type="checkbox"
                checked={hasData && selectedRows.size === dataRows.length}
                onChange={onToggleAllRows}
                className="h-4 w-4 cursor-pointer rounded border-zinc-700 bg-white/5 accent-zinc-500"
              />
            </div>
            <div
              className="flex items-center justify-center border-r border-zinc-800/60 bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              style={{ width: ROWNUM_WIDTH, minWidth: ROWNUM_WIDTH }}
            >
              #
            </div>
            {dataColumns.map((col, i) => renderHeaderCell(col, i === dataColumns.length - 1))}
          </div>
        </div>

        <div ref={tableRef} className="flex-1 overflow-auto" style={{ minWidth: totalWidth }}>
          {hasData ? (
            <div style={{ minWidth: totalWidth }}>
              {dataRows.map((row, rowIndex) => {
                const isSelected = selectedRows.has(rowIndex);
                return (
                  <div
                    key={rowIndex}
                    className={cn(
                      "flex h-10 border-b border-zinc-800/40 transition-colors",
                      isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"
                    )}
                    style={{ minWidth: totalWidth }}
                  >
                    <div
                      className="flex items-center justify-center border-r border-zinc-800/40 px-2"
                      style={{ width: SELECTOR_WIDTH, minWidth: SELECTOR_WIDTH }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleRow(rowIndex)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-700 bg-white/5 accent-zinc-500"
                      />
                    </div>
                    <div
                      className="flex items-center justify-center border-r border-zinc-800/40 px-2 text-xs text-zinc-600"
                      style={{ width: ROWNUM_WIDTH, minWidth: ROWNUM_WIDTH }}
                    >
                      {offset + rowIndex + 1}
                    </div>
                    {dataColumns.map((col, i) =>
                      renderBodyCell(col, row[col.key], row, rowIndex, i === dataColumns.length - 1)
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col" style={{ minWidth: totalWidth }}>
              {Array.from({ length: 12 }).map((_, rowIndex) => (
                <div
                  key={`empty-${rowIndex}`}
                  className="flex h-10 border-b border-zinc-800/40"
                  style={{ minWidth: totalWidth }}
                >
                  <div
                    className="flex items-center justify-center border-r border-zinc-800/40 px-2"
                    style={{ width: SELECTOR_WIDTH, minWidth: SELECTOR_WIDTH }}
                  >
                    <div className="h-4 w-4 rounded border border-zinc-800" />
                  </div>
                  <div
                    className="flex items-center border-r border-zinc-800/40 px-3 text-xs text-zinc-800"
                    style={{ width: ROWNUM_WIDTH, minWidth: ROWNUM_WIDTH }}
                  >
                    {rowIndex + 1}
                  </div>
                  {dataColumns.map((col) => (
                    <div
                      key={`empty-${col.key}`}
                      className="flex items-center border-r border-zinc-800/40 border-b border-zinc-800/40 px-3"
                      style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}
                    >
                      <div className="h-2 w-20 rounded bg-zinc-900" />
                    </div>
                  ))}
                </div>
              ))}
              <div
                className="flex items-center justify-center py-16 text-xs text-zinc-600"
                style={{ minWidth: totalWidth }}
              >
                No data available in this table
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between border-t border-zinc-800/60 bg-white/5 px-4">
        <span className="text-xs text-zinc-500">
          {offset + 1}–{Math.min(offset + dataRows.length, totalCount)} of{" "}
          <span className="text-zinc-300">{totalCount.toLocaleString()}</span> rows
          {selectedRows.size > 0 && (
            <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
              {selectedRows.size} selected
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevPage}
            disabled={offset === 0 || isLoadingDetails}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button
            onClick={onNextPage}
            disabled={offset + limit >= totalCount || isLoadingDetails}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-700"
          >
            Next
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
