"use client";

import { Database, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TableListItem {
  name: string;
  rowCount?: number | null;
  metaLabel?: string;
  description?: string;
}

interface TableListProps {
  tables: TableListItem[];
  selectedTableName: string;
  onSelectTable: (tableName: string) => void;
  onCreateTable: () => void;
  onDeleteTable: (tableName: string) => void;
  className?: string;
}

export function TableList({
  tables,
  selectedTableName,
  onSelectTable,
  onCreateTable,
  onDeleteTable,
  className,
}: TableListProps) {
  return (
    <div className={cn("flex h-full flex-col bg-zinc-900/40", className)}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/60 px-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Tables
        </span>
        <span className="flex h-5 min-w-[24px] items-center justify-center rounded-md bg-white/5 px-2 text-[10px] font-medium text-zinc-500">
          {tables.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tables.map((table, index) => {
          const isSelected = table.name === selectedTableName;

          return (
            <div
              key={table.name}
              onClick={() => onSelectTable(table.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTable(table.name);
                }
              }}
              className={cn(
                "flex items-center gap-3 border-b border-zinc-800/40 px-4 py-3 cursor-pointer transition-all duration-100",
                isSelected
                  ? "bg-white/5"
                  : "hover:bg-white/5",
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-colors",
                isSelected 
                  ? "bg-white/10 text-zinc-300" 
                  : "bg-white/5 text-zinc-600"
              )}>
                {index + 1}
              </span>

              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected ? "text-zinc-400" : "text-zinc-600"
              )}>
                <Database className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium leading-tight transition-colors",
                    isSelected ? "text-zinc-200" : "text-zinc-400",
                  )}
                >
                  {table.name}
                </p>
                <p className="truncate text-[10px] leading-tight text-zinc-600">
                  {table.metaLabel}
                </p>
              </div>

              <span className={cn(
                "shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums transition-colors",
                isSelected ? "text-zinc-500" : "text-zinc-600",
              )}>
                {table.rowCount?.toLocaleString() ?? 0}
              </span>
            </div>
          );
        })}

        {tables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Database className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500">No tables yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Create your first table to get started
            </p>
            <button
              onClick={onCreateTable}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              New Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
