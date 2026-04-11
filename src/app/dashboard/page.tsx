"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, LoaderCircle, Pencil, Plus, Trash2, Table2 } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { SchemaBuilderDialog } from "@/components/schema-builder/schema-builder-dialog";
import { TableList, type TableListItem } from "@/components/table-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConnection } from "@/hooks/use-connection";
import type { ConnectionStatus } from "@/lib/shared";
import type { TableDefinition } from "@/lib/sql-generator";

type BuilderMode = "create" | "edit";

interface TablesResponse {
  tables: Array<{
    name: string;
    rowCountEstimate: number | null;
    columnCount: number;
    hasPrimaryKey: boolean;
  }>;
}

interface TableSchemaResponse {
  definition: TableDefinition;
}

interface TableDataResponse {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
}

const initialConnectionStatus: ConnectionStatus = {
  connected: false,
  configured: false,
  message: "Connection is not configured.",
  checkedAt: "",
};

function ToolbarButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:bg-white/10 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    status,
    hasResolved,
    isRefreshing: isRefreshingConnection,
    refresh: refreshConnection,
  } = useConnection(initialConnectionStatus);
  const [tables, setTables] = useState<TableListItem[]>([]);
  const [selectedTableName, setSelectedTableName] = useState("");
  const [selectedDefinition, setSelectedDefinition] = useState<TableDefinition | null>(null);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("create");
  const [builderInitialDefinition, setBuilderInitialDefinition] = useState<TableDefinition | null>(null);
  const [deleteTableName, setDeleteTableName] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingTable, setIsDeletingTable] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const deferredSelectedTableName = useDeferredValue(selectedTableName);

  const loadTables = useCallback(async () => {
    setIsLoadingTables(true);

    try {
      const response = await fetch("/api/tables", {
        cache: "no-store",
      });
      const payload = (await response.json()) as TablesResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load the table list.");
      }

      const mappedTables = payload.tables.map<TableListItem>((table) => ({
        name: table.name,
        rowCount: table.rowCountEstimate ?? 0,
        metaLabel: `${table.columnCount} cols${table.hasPrimaryKey ? " · pk" : ""}`,
        description: "Live database schema",
      }));

      setTables(mappedTables);
      setSelectedTableName((current) => {
        if (current && mappedTables.some((table) => table.name === current)) {
          return current;
        }
        return mappedTables[0]?.name ?? "";
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the table list.");
      setTables([]);
      setSelectedTableName("");
    } finally {
      setIsLoadingTables(false);
    }
  }, []);

  const loadTableDetails = useCallback(
    async (tableName: string, nextOffset: number) => {
      if (!tableName) {
        setSelectedDefinition(null);
        setTableData(null);
        return;
      }

      setIsLoadingDetails(true);
      setSelectedRows(new Set());

      try {
        const [schemaResponse, dataResponse] = await Promise.all([
          fetch(`/api/tables/${tableName}`, { cache: "no-store" }),
          fetch(`/api/tables/${tableName}/data?limit=100&offset=${nextOffset}`, {
            cache: "no-store",
          }),
        ]);
        const schemaPayload = (await schemaResponse.json()) as TableSchemaResponse & {
          error?: string;
        };
        const dataPayload = (await dataResponse.json()) as TableDataResponse & {
          error?: string;
        };

        if (!schemaResponse.ok) {
          throw new Error(schemaPayload.error ?? "Unable to load the table schema.");
        }

        if (!dataResponse.ok) {
          throw new Error(dataPayload.error ?? "Unable to load table rows.");
        }

        setSelectedDefinition(schemaPayload.definition);
        setTableData(dataPayload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load table details.");
        setSelectedDefinition(null);
        setTableData(null);
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasResolved) {
      return;
    }

    if (!status.connected) {
      router.replace("/settings");
      return;
    }

    void loadTables();
  }, [hasResolved, loadTables, router, status.connected]);

  useEffect(() => {
    if (!status.connected || !deferredSelectedTableName) {
      return;
    }

    void loadTableDetails(deferredSelectedTableName, offset);
  }, [deferredSelectedTableName, loadTableDetails, offset, status.connected]);

  const dataColumns = useMemo(
    () =>
      (tableData?.columns ?? []).map((column) => ({
        key: column as keyof Record<string, unknown> & string,
        label: column,
      })),
    [tableData?.columns],
  );

  async function handleRefreshDashboard() {
    await Promise.all([loadTables(), refreshConnection()]);

    if (selectedTableName) {
      await loadTableDetails(selectedTableName, offset);
    }
  }

  function openCreateDialog() {
    setBuilderMode("create");
    setBuilderInitialDefinition(null);
    setIsBuilderOpen(true);
  }

  function openEditDialog() {
    if (!selectedDefinition) {
      return;
    }

    setBuilderMode("edit");
    setBuilderInitialDefinition(selectedDefinition);
    setIsBuilderOpen(true);
  }

  function handleBuilderSaved(tableName: string) {
    setOffset(0);
    setSelectedTableName(tableName);
    setSelectedRows(new Set());
    startTransition(() => {
      router.refresh();
    });
    void loadTables().then(() => loadTableDetails(tableName, 0));
  }

  async function handleDeleteTable() {
    if (!deleteTableName) {
      return;
    }

    setIsDeletingTable(true);

    try {
      const response = await fetch(`/api/tables/${deleteTableName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmName: deleteConfirmation,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete the table.");
      }

      toast.success(`${deleteTableName} was deleted.`);
      setDeleteTableName(null);
      setDeleteConfirmation("");
      setOffset(0);
      setSelectedRows(new Set());
      await loadTables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the table.");
    } finally {
      setIsDeletingTable(false);
    }
  }

  function toggleRowSelection(index: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAllRows() {
    if (!tableData) return;
    if (selectedRows.size === tableData.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: tableData.rows.length }, (_, i) => i)));
    }
  }

  const isLoading = isLoadingTables || isLoadingDetails || isRefreshingConnection;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-900/40 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-zinc-200">
            {selectedDefinition?.tableName ?? "No table selected"}
          </h1>
          {selectedDefinition && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-500">
                {selectedDefinition.columns.length} columns
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-500">
                {tableData?.totalCount.toLocaleString() ?? 0} rows
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            Insert Row
          </ToolbarButton>

          {selectedDefinition && (
            <>
              <div className="mx-1 h-5 w-px bg-zinc-800" />
              <ToolbarButton onClick={openEditDialog}>
                <Pencil className="h-3.5 w-3.5" />
                Edit Schema
              </ToolbarButton>
              <ToolbarButton onClick={() => { setDeleteTableName(selectedDefinition.tableName); setDeleteConfirmation(""); }}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </ToolbarButton>
            </>
          )}

          <div className="mx-1 h-5 w-px bg-zinc-800" />

          <ToolbarButton onClick={() => void handleRefreshDashboard()} disabled={isLoading}>
            <LoaderCircle className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[220px] shrink-0 border-r border-zinc-800/60">
          <TableList
            tables={tables}
            selectedTableName={selectedTableName}
            onSelectTable={(tableName) => {
              setOffset(0);
              setSelectedTableName(tableName);
            }}
            onCreateTable={openCreateDialog}
            onDeleteTable={(tableName) => {
              setDeleteTableName(tableName);
              setDeleteConfirmation("");
            }}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedDefinition ? (
            <DataTable
              dataColumns={dataColumns}
              dataRows={tableData?.rows ?? []}
              selectedRows={selectedRows}
              onToggleRow={toggleRowSelection}
              onToggleAllRows={toggleAllRows}
              offset={tableData?.offset ?? 0}
              totalCount={tableData?.totalCount ?? 0}
              limit={tableData?.limit ?? 100}
              isLoadingDetails={isLoadingDetails}
              onPrevPage={() =>
                setOffset((current) => Math.max(current - (tableData?.limit ?? 100), 0))
              }
              onNextPage={() =>
                setOffset((current) => current + (tableData?.limit ?? 100))
              }
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-zinc-900/40">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <Database className="h-6 w-6 text-zinc-500" />
                </div>
                <h2 className="text-sm font-medium text-zinc-400">
                  Select a table to view data
                </h2>
                <p className="mt-2 text-xs text-zinc-600">
                  Choose a table from the sidebar or create a new one
                </p>
                <Button
                  type="button"
                  onClick={openCreateDialog}
                  className="mt-4 flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Table
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SchemaBuilderDialog
        open={isBuilderOpen}
        mode={builderMode}
        initialDefinition={builderInitialDefinition}
        originalTableName={builderMode === "edit" ? selectedTableName : null}
        onOpenChange={setIsBuilderOpen}
        onSaved={handleBuilderSaved}
      />

      <AlertDialog
        open={Boolean(deleteTableName)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTableName(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 shadow-xl shadow-black/20">
          <AlertDialogHeader className="gap-3">
            <AlertDialogTitle className="flex items-center gap-2.5 text-sm font-semibold text-zinc-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                <Trash2 className="h-4 w-4" />
              </span>
              Delete Table
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-zinc-500">
              This will permanently delete <span className="font-medium text-zinc-300">{deleteTableName}</span> and all its data. Type the table name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={deleteTableName ?? "Table name"}
            className="h-9 rounded-lg border-zinc-800 bg-white/5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
          />

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 rounded-lg border border-zinc-800 bg-white/5 px-4 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmation !== deleteTableName || isDeletingTable}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteTable();
              }}
              className="h-9 rounded-lg bg-white px-4 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200 active:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeletingTable ? "Deleting..." : "Delete Table"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
