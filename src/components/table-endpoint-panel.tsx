"use client";

import { useMemo } from "react";
import { ArrowDownToLine, ArrowUpToLine, Copy, Link2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { TableDefinition } from "@/lib/sql-generator";

interface TableEndpointPanelProps {
  tableName: string;
  columns: TableDefinition["columns"];
}

function sampleValueForColumn(column: TableDefinition["columns"][number]) {
  switch (column.type) {
    case "integer":
    case "bigint":
    case "serial":
    case "bigserial":
      return 123;
    case "float":
      return 19.99;
    case "boolean":
      return true;
    case "jsonb":
      return { sample: true };
    case "bytea":
      return "base64-encoded-data";
    case "date":
      return "2026-04-12";
    case "time":
      return "14:30:00";
    case "timestamp":
      return "2026-04-12T14:30:00Z";
    case "uuid":
      return "550e8400-e29b-41d4-a716-446655440000";
    default:
      return `${column.name}_value`;
  }
}

function buildSamplePayload(columns: TableDefinition["columns"]) {
  const candidateColumns = columns.filter(
    (column) => !column.isPrimaryKey && column.type !== "serial" && column.type !== "bigserial",
  );
  const selectedColumns = (candidateColumns.length > 0 ? candidateColumns : columns).slice(0, 4);

  return Object.fromEntries(
    selectedColumns.map((column) => [column.name, sampleValueForColumn(column)]),
  );
}

export function TableEndpointPanel({ tableName, columns }: TableEndpointPanelProps) {
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;

  const endpointUrl = baseUrl
    ? `${baseUrl}/api/v1/${encodeURIComponent(tableName)}`
    : `/api/v1/${encodeURIComponent(tableName)}`;
  const samplePayload = useMemo(() => buildSamplePayload(columns), [columns]);
  const samplePayloadJson = useMemo(() => JSON.stringify(samplePayload, null, 2), [samplePayload]);
  const getExample = `curl -X GET "${endpointUrl}?limit=100&offset=0" -H "x-api-key: ora_your_key_here"`;
  const postExample = `curl -X POST "${endpointUrl}" -H "Content-Type: application/json" -H "x-api-key: ora_your_key_here" -d '${JSON.stringify(samplePayload)}'`;

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Copy failed.");
    }
  }

  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900/50 px-4 py-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-zinc-800/70 bg-white/[0.03] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <Link2 className="h-3.5 w-3.5" />
                Live Endpoint
              </div>
              <h3 className="mt-2 text-sm font-semibold text-zinc-100">/{tableName}</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                This route is generated from the current deployment base URL and targets only the selected table.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              onClick={() => void copyText(endpointUrl, "Endpoint URL copied.")}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
            <div className="border-b border-zinc-800/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Endpoint URL
            </div>
            <code className="block overflow-x-auto px-3 py-3 text-xs text-zinc-200">{endpointUrl}</code>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Methods</p>
              <p className="mt-1 text-xs text-zinc-200">GET, POST</p>
            </div>
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Auth</p>
              <p className="mt-1 text-xs text-zinc-200"><code>x-api-key</code> or Bearer</p>
            </div>
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Binding</p>
              <p className="mt-1 text-xs text-zinc-200">Bound to the DB used when the key was created</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-zinc-800/70 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Read Example
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => void copyText(getExample, "GET example copied.")}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <code className="mt-3 block overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-[11px] leading-5 text-zinc-300">
              {getExample}
            </code>
          </div>

          <div className="rounded-2xl border border-zinc-800/70 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <ArrowUpToLine className="h-3.5 w-3.5" />
                Write Example
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => void copyText(postExample, "POST example copied.")}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <code className="block overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-[11px] leading-5 text-zinc-300">
                {postExample}
              </code>
              <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-[11px] leading-5 text-zinc-300">
                {samplePayloadJson}
              </pre>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs leading-5 text-emerald-100/90">
            <div className="flex items-center gap-2 font-medium text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              API key required on every request
            </div>
            <p className="mt-1 text-emerald-100/80">
              Keys are checked server-side, and each key uses the database connection snapshot that existed when it was issued.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
