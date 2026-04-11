"use client";

import { Database, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const selectedTable =
    tables.find((table) => table.name === selectedTableName) ?? null;

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border-white/80 bg-white/84",
        className,
      )}
    >
      <CardHeader className="shrink-0 space-y-3 border-b border-slate-200/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-[16px] font-semibold tracking-[-0.02em]">
              Tables
            </CardTitle>
            <p className="max-w-xs text-[12px] leading-5 text-muted-foreground">
              {tables.length} schema objects available for live inspection.
            </p>
          </div>
          <Button
            onClick={onCreateTable}
            className="h-9 shrink-0 rounded-xl px-3.5 text-[12px] shadow-[0_20px_36px_-24px_rgba(0,122,255,0.55)]"
          >
            <Plus className="size-4" />
            New Table
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <ScrollArea className="min-h-0 flex-1 pr-1">
          <div className="space-y-2 pr-3">
            {tables.map((table) => {
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
                     "group w-full rounded-[18px] border px-3.5 py-3 text-left transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                     isSelected
                       ? "border-primary/16 bg-primary/[0.075] shadow-[0_22px_48px_-36px_rgba(0,122,255,0.38)]"
                       : "border-white/82 bg-white/76 hover:-translate-y-0.5 hover:border-white/95 hover:bg-white/88",
                   )}
                 >
                   <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0 flex-1">
                       <div className="flex items-center gap-3">
                         <div
                           className={cn(
                             "flex size-9 items-center justify-center rounded-[14px] transition-colors",
                             isSelected
                               ? "bg-primary text-primary-foreground"
                               : "bg-muted/90 text-muted-foreground group-hover:text-foreground",
                           )}
                         >
                           <Database className="size-4" />
                         </div>
                          <div className="min-w-0 space-y-1">
                           <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                             {table.name}
                           </p>
                           <p className="truncate text-[11px] leading-4 text-muted-foreground">
                             {table.description ?? "Schema and row preview"}
                           </p>
                         </div>
                       </div>
                    </div>

                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="rounded-md px-2 py-0.5 text-[10px]"
                    >
                      {isSelected ? "Selected" : `${table.rowCount ?? 0} rows`}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/70 pt-2.5">
                    <p className="truncate text-[11px] leading-4 text-muted-foreground">
                      {table.metaLabel ?? `Estimated rows: ${table.rowCount ?? 0}`}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2.5 text-[11px] text-destructive/90 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteTable(table.name);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {selectedTable ? (
          <div className="rounded-[18px] border border-destructive/15 bg-[linear-gradient(180deg,rgba(255,59,48,0.08),rgba(255,59,48,0.04))] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-foreground">
                  Remove selected table
                </p>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Shortcut only. Final removal still requires dialog confirmation.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-lg px-3 text-[11px]"
                onClick={() => onDeleteTable(selectedTable.name)}
              >
                <Trash2 className="size-4" />
                {selectedTable.name}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
