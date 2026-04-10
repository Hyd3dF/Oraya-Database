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
import { Database, PencilLine, RefreshCcw, Table2 } from "lucide-react";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Explorer & Schema Builder"
        title="Manage live tables with a calmer, clearer workflow"
        description="The left rail keeps the schema list airy and easy to scan. The detail panel brings structure, preview data, and editing actions into one consistent surface."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleRefreshDashboard()}
          disabled={isLoadingTables || isLoadingDetails || isRefreshingConnection}
          className="rounded-full border-white/80 bg-white/80 px-5"
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

        {status.connected ? (
          <Badge className="rounded-full bg-emerald-500/12 px-4 py-2 text-emerald-700 hover:bg-emerald-500/12">
            {status.host} / {status.database}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {isLoadingTables ? (
          <Card className="surface-panel border-white/80">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-14 rounded-[24px] bg-white/75" />
              <Skeleton className="h-24 rounded-[24px] bg-white/70" />
              <Skeleton className="h-24 rounded-[24px] bg-white/65" />
              <Skeleton className="h-24 rounded-[24px] bg-white/60" />
            </CardContent>
          </Card>
        ) : (
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
        )}

        <div className="space-y-6">
          {selectedDefinition ? (
            <Card className="glass-panel border-white/80">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-[28px] font-semibold tracking-[-0.02em]">
                        {selectedDefinition.tableName}
                      </CardTitle>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {selectedDefinition.columns.length} columns · {tableData?.totalCount ?? 0} rows
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openEditDialog}
                    className="rounded-full border-white/80 bg-white/80 px-5"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit Schema
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-full px-5"
                    onClick={() => {
                      setDeleteTableName(selectedDefinition.tableName);
                      setDeleteConfirmation("");
                    }}
                  >
                    Delete Table
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6">
                <DataTable
                  title="Column Schema"
                  description="Field types, constraints, and defaults are presented as a clean structural summary."
                  columns={[
                    { key: "name", label: "Column" },
                    { key: "type", label: "Type" },
                    { key: "constraints", label: "Constraints" },
                    { key: "defaultValue", label: "Default" },
                  ]}
                  rows={schemaPreviewRows}
                  emptyState="No column details are available for this table yet."
                />

                <DataTable
                  title="Row Preview"
                  description={`Showing the first ${tableData?.limit ?? 25} rows in a more readable, lightly formatted view.`}
                  columns={dataColumns}
                  rows={tableData?.rows ?? []}
                  emptyState="There are no rows to preview for the selected table."
                />

                {tableData ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-white/76 px-5 py-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {tableData.offset + 1}-
                      {Math.min(tableData.offset + tableData.rows.length, tableData.totalCount)} of{" "}
                      {tableData.totalCount} rows
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-white/80 bg-white/80 px-4"
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
                        className="rounded-full border-white/80 bg-white/80 px-4"
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
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border-white/80">
              <CardContent className="flex min-h-[460px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10 text-primary">
                  <Table2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.02em] text-foreground">
                    No table selected
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                    Choose a table from the left rail or create a new one to begin shaping the schema.
                  </p>
                </div>
                <Button type="button" onClick={openCreateDialog} className="rounded-full px-5">
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
