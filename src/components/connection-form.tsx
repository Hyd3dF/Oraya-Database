"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Plug2, RotateCcw, Unplug } from "lucide-react";
import { toast } from "sonner";

import type { ConnectionInput, ConnectionStatus } from "@/lib/shared";
import { dispatchConnectionStatusChanged, useConnection } from "@/hooks/use-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConnectionFormProps {
  initialStatus: ConnectionStatus;
  initialValues: Pick<ConnectionInput, "host" | "port" | "user" | "database">;
}

interface ConnectionFormState {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

function getStatusColor(status: ConnectionStatus) {
  if (status.connected) return "bg-emerald-500";
  if (status.configured) return "bg-amber-500";
  return "bg-zinc-500";
}

function getStatusText(status: ConnectionStatus) {
  if (status.connected) return "Connected";
  if (status.configured) return "Unreachable";
  return "Disconnected";
}

export function ConnectionForm({
  initialStatus,
  initialValues,
}: ConnectionFormProps) {
  const router = useRouter();
  const { status, isRefreshing, refresh } = useConnection(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ConnectionFormState>({
    host: initialValues.host,
    port: String(initialValues.port),
    user: initialValues.user,
    password: "",
    database: initialValues.database,
  });

  const hasStoredConnection =
    Boolean(initialValues.host) &&
    Boolean(initialValues.user) &&
    Boolean(initialValues.database);

  function updateField<K extends keyof ConnectionFormState>(
    key: K,
    value: ConnectionFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          user: form.user,
          password: form.password,
          database: form.database,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Connection could not be established.");
      }

      dispatchConnectionStatusChanged();
      setForm((current) => ({
        ...current,
        password: "",
      }));
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Connection failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/connect", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Connection could not be terminated.");
      }

      dispatchConnectionStatusChanged();
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Disconnect failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleConnect}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)} shadow-sm`} />
          <span className="text-sm font-medium text-zinc-300">{getStatusText(status)}</span>
          {status.connected && status.database && (
            <span className="text-xs text-zinc-500">{status.host} / {status.database}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
        >
          <RotateCcw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="db-host" className="text-xs text-zinc-400">Host</Label>
            <Input
              id="db-host"
              value={form.host}
              onChange={(event) => updateField("host", event.target.value)}
              placeholder="localhost"
              autoComplete="off"
              className="h-9 rounded-lg border-zinc-800 bg-zinc-900/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="db-port" className="text-xs text-zinc-400">Port</Label>
            <Input
              id="db-port"
              value={form.port}
              onChange={(event) => updateField("port", event.target.value)}
              inputMode="numeric"
              placeholder="5432"
              className="h-9 rounded-lg border-zinc-800 bg-zinc-900/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="db-user" className="text-xs text-zinc-400">User</Label>
            <Input
              id="db-user"
              value={form.user}
              onChange={(event) => updateField("user", event.target.value)}
              autoComplete="username"
              className="h-9 rounded-lg border-zinc-800 bg-zinc-900/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="db-password" className="text-xs text-zinc-400">Password</Label>
            <Input
              id="db-password"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="current-password"
              placeholder={hasStoredConnection ? "Saved" : "Password"}
              className="h-9 rounded-lg border-zinc-800 bg-zinc-900/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="db-database" className="text-xs text-zinc-400">Database</Label>
          <Input
            id="db-database"
            value={form.database}
            onChange={(event) => updateField("database", event.target.value)}
            autoComplete="off"
            className="h-9 rounded-lg border-zinc-800 bg-zinc-900/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !form.host || !form.user || !form.database}
          className="h-9 rounded-lg bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plug2 className="mr-1.5 h-4 w-4" />
          )}
          Connect
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleDisconnect()}
          disabled={isSubmitting || !status.configured}
          className="h-9 rounded-lg text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-300 disabled:opacity-50"
        >
          <Unplug className="mr-1.5 h-4 w-4" />
          Disconnect
        </Button>
        {status.connected && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {status.database}
          </div>
        )}
      </div>
    </form>
  );
}
