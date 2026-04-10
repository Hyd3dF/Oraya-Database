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
}

export function TableList({
  tables,
  selectedTableName,
  onSelectTable,
  onCreateTable,
  onDeleteTable,
}: TableListProps) {
  const selectedTable =
    tables.find((table) => table.name === selectedTableName) ?? null;

  return (
    <Card className="surface-panel border-white/80">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-[22px] font-semibold tracking-[-0.02em]">
              Tables
            </CardTitle>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Browse the public schema in a calmer, easier-to-scan list.
            </p>
          </div>
          <Button
            onClick={onCreateTable}
            className="h-11 shrink-0 rounded-[18px] px-4 shadow-[0_20px_36px_-24px_rgba(0,122,255,0.55)]"
          >
            <Plus className="size-4" />
            New Table
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <ScrollArea className="h-[520px] pr-2">
          <div className="space-y-3">
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
                    "group w-full rounded-[26px] border px-4 py-4 text-left transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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
                            "flex size-11 items-center justify-center rounded-[18px] transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/90 text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          <Database className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                            {table.name}
                          </p>
                          <p className="truncate text-[13px] leading-5 text-muted-foreground">
                            {table.description ?? "Schema and row preview"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="rounded-full px-3 py-1 text-[11px]"
                    >
                      {isSelected ? "Selected" : `${table.rowCount ?? 0} rows`}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/70 pt-3">
                    <p className="text-[12px] leading-5 text-muted-foreground">
                      {table.metaLabel ?? `Estimated rows: ${table.rowCount ?? 0}`}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full px-3 text-destructive/90 hover:bg-destructive/10 hover:text-destructive"
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
          <div className="rounded-[24px] border border-destructive/15 bg-[linear-gradient(180deg,rgba(255,59,48,0.08),rgba(255,59,48,0.04))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Remove selected table
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  This area is only a shortcut. The real delete confirmation is
                  still handled in the confirmation dialog.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-full"
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
