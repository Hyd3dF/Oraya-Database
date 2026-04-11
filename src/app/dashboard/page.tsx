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
import Image from "next/image";
import { PencilLine, RefreshCcw, Table2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
        metaLabel: `${table.columnCount} columns${table.hasPrimaryKey ? " · primary key" : ""}`,
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

      try {
        const [schemaResponse, dataResponse] = await Promise.all([
          fetch(`/api/tables/${tableName}`, { cache: "no-store" }),
          fetch(`/api/tables/${tableName}/data?limit=25&offset=${nextOffset}`, {
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

  const schemaPreviewRows = useMemo(
    () =>
      selectedDefinition?.columns.map((column) => ({
        name: column.name,
        type:
          column.length && (column.type === "varchar" || column.type === "char")
            ? `${column.type}(${column.length})`
            : column.type,
        constraints: [
          column.isPrimaryKey ? "Primary key" : null,
          column.isUnique ? "Unique" : null,
          column.isNotNull ? "Required" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        defaultValue: column.defaultValue || "",
      })) ?? [],
    [selectedDefinition],
  );

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
      await loadTables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the table.");
    } finally {
      setIsDeletingTable(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-[28px] border border-white/75 bg-white/72 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Explorer & Schema Builder"
              title="Run the database like a native desktop workspace"
              description="Tables stay docked on the left, schema context stays visible, and the active data grid behaves like a dense spreadsheet instead of a long web page."
            />

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/10">
                {tables.length} tables
              </Badge>
              {selectedDefinition ? (
                <Badge
                  variant="secondary"
                  className="rounded-md px-2.5 py-1 text-[10px]"
                >
                  {selectedDefinition.tableName}
                </Badge>
              ) : null}
              {status.connected ? (
                <Badge className="rounded-md bg-emerald-500/12 px-2.5 py-1 text-[10px] text-emerald-700 hover:bg-emerald-500/12">
                  {status.host} / {status.database}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefreshDashboard()}
              disabled={isLoadingTables || isLoadingDetails || isRefreshingConnection}
              className="h-9 rounded-xl border-white/80 bg-white/88 px-4 text-[12px]"
            >
              <RefreshCcw
                className={[
                  "h-4 w-4",
                  isLoadingTables || isLoadingDetails || isRefreshingConnection
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        {isLoadingTables ? (
          <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border-white/80 bg-white/84">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-10 rounded-[16px] bg-white/75" />
              <Skeleton className="h-20 rounded-[18px] bg-white/70" />
              <Skeleton className="h-20 rounded-[18px] bg-white/65" />
              <Skeleton className="h-20 rounded-[18px] bg-white/60" />
            </CardContent>
          </Card>
        ) : (
          <TableList
            className="min-h-0"
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
        )}

        <div className="min-h-0">
          {selectedDefinition ? (
            <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-white/80 bg-white/82">
              <CardHeader className="shrink-0 gap-4 border-b border-slate-200/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18%] bg-white shadow-sm ring-1 ring-black/[0.04]">
                    <Image
                      src="/oroya.png"
                      alt="Oroya Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <CardTitle className="truncate text-[20px] font-semibold tracking-[-0.03em]">
                      {selectedDefinition.tableName}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/10">
                        {selectedDefinition.columns.length} columns
                      </Badge>
                      <Badge variant="secondary" className="rounded-md px-2.5 py-1 text-[10px]">
                        {tableData?.totalCount ?? 0} rows
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openEditDialog}
                    className="h-9 rounded-xl border-white/80 bg-white/88 px-4 text-[12px]"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit Schema
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-9 rounded-xl px-4 text-[12px]"
                    onClick={() => {
                      setDeleteTableName(selectedDefinition.tableName);
                      setDeleteConfirmation("");
                    }}
                  >
                    Delete Table
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <DataTable
                  title="Column Schema"
                  description="Field types, defaults, and constraints in a compact structural view."
                  columns={[
                    { key: "name", label: "Column" },
                    { key: "type", label: "Type" },
                    { key: "constraints", label: "Constraints" },
                    { key: "defaultValue", label: "Default" },
                  ]}
                  rows={schemaPreviewRows}
                  emptyState="No column details are available for this table yet."
                  viewportClassName="max-h-[220px]"
                />

                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  {tableData ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-[#f8f9fb] px-4 py-3">
                      <p className="text-[12px] text-muted-foreground">
                        Showing {tableData.offset + 1}-
                        {Math.min(tableData.offset + tableData.rows.length, tableData.totalCount)} of{" "}
                        {tableData.totalCount} rows
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-white/80 bg-white/90 px-3 text-[11px]"
                          disabled={tableData.offset === 0 || isLoadingDetails}
                          onClick={() =>
                            setOffset((current) => Math.max(current - tableData.limit, 0))
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-white/80 bg-white/90 px-3 text-[11px]"
                          disabled={
                            tableData.offset + tableData.limit >= tableData.totalCount ||
                            isLoadingDetails
                          }
                          onClick={() => setOffset((current) => current + tableData.limit)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <DataTable
                    title="Row Preview"
                    description={`Spreadsheet-style preview of the first ${tableData?.limit ?? 25} live records.`}
                    columns={dataColumns}
                    rows={tableData?.rows ?? []}
                    emptyState="There are no rows to preview for the selected table."
                    className="min-h-0 flex-1"
                    contentClassName="min-h-0 flex-1"
                    viewportClassName="min-h-0 flex-1"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-white/80 bg-white/78">
              <CardContent className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                  <Table2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-foreground">
                    No table selected
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Choose a table from the left rail or create a new one to open its schema and data grid.
                  </p>
                </div>
                <Button type="button" onClick={openCreateDialog} className="rounded-xl px-4 text-[12px]">
                  Create Your First Table
                </Button>
              </CardContent>
            </Card>
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
        <AlertDialogContent className="rounded-[32px] border-white/80 bg-white/95 shadow-panel backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently delete table
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This action cannot be undone. Type <strong>{deleteTableName}</strong> exactly to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={deleteTableName ?? "Table name"}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTable}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmation !== deleteTableName || isDeletingTable}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteTable();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingTable ? "Deleting..." : "Delete Table"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
