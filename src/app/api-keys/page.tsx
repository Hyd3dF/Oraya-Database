"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Eye, EyeOff, Trash2, Copy, Key } from "lucide-react";
import { toast } from "sonner";

import type { ApiKeyRecord } from "@/lib/api-keys-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

interface ApiKeyRowProps {
  apiKey: ApiKeyRecord;
  isNew?: boolean;
  onDeleted?: (id: string) => void;
}

function ApiKeyRow({ apiKey, isNew, onDeleted }: ApiKeyRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/keys?id=${apiKey.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      onDeleted?.(apiKey.id);
      toast.success("API key deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(apiKey.key);
    } catch {
      toast.error("Copy failed.");
    }
  }

  const maskedKey = apiKey.key.slice(0, 4) + "••••••••" + apiKey.key.slice(-4);

  return (
    <div
      className={`group flex items-center gap-4 py-4 transition-all duration-300 ${
        isNew ? "animate-fadeIn" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
          <Key className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{apiKey.name}</p>
          <p className="text-xs text-zinc-500">{formatDate(apiKey.created_at)}</p>
          {(apiKey.connection_host || apiKey.connection_database) && (
            <p className="mt-1 truncate text-[11px] text-zinc-600">
              {apiKey.connection_host ?? "host"} / {apiKey.connection_database ?? "database"}
            </p>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <code className="rounded-md bg-white/5 px-3 py-1.5 font-mono text-sm text-zinc-400 transition-colors">
          {showKey ? apiKey.key : maskedKey}
        </code>
        <button
          onClick={() => setShowKey(!showKey)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-white/10 hover:text-zinc-300"
        >
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => void handleCopy()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-white/10 hover:text-zinc-300"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => void handleDelete()}
          disabled={isDeleting}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
        >
          {isDeleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  async function loadApiKeys() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/keys", { cache: "no-store" });
      const payload = (await response.json()) as ApiKeyRecord[] & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to fetch API keys.");
      setApiKeys(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch API keys.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApiKeys();
  }, []);

  async function handleCreateKey() {
    const name = newKeyName.trim();
    if (!name) {
      toast.error("Please enter a key name.");
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as ApiKeyRecord & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to create API key.");
      setNewlyCreatedId(payload.id);
      setApiKeys((current) => [payload, ...current]);
      setNewKeyName("");
      toast.success("API key created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">API Keys</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Create and manage API keys for integrations.</p>
      </div>

      <div className="mb-8">
        <div className="mb-4 rounded-xl border border-sky-500/15 bg-sky-500/10 px-4 py-3 text-xs leading-5 text-sky-100/90">
          API keys are now bound to the PostgreSQL connection that is active when you create them. After creating a key, open any table in the dashboard to copy its live endpoint URL.
        </div>

        <div className="flex items-center gap-2.5">
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name"
            className="h-10 flex-1 max-w-sm rounded-lg border-zinc-800 bg-zinc-900/50 px-3.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:bg-zinc-900/80 focus:ring-1 focus:ring-zinc-700/50 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateKey();
            }}
          />
          <Button
            onClick={() => void handleCreateKey()}
            disabled={isCreating || !newKeyName.trim()}
            className="h-10 rounded-lg bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-all"
          >
            {isCreating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Create
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-xl shadow-black/20">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderCircle className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/50">
              <Key className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No API keys yet</p>
            <p className="mt-1 text-xs text-zinc-600">Create your first key to get started.</p>
          </div>
        ) : (
          <div className="px-5 py-1">
            {apiKeys.map((apiKey, index) => (
              <div
                key={apiKey.id}
                className={`${index !== apiKeys.length - 1 ? "border-b border-zinc-800/50" : ""} ${
                  apiKey.id === newlyCreatedId ? "animate-slideDown" : ""
                }`}
              >
                <ApiKeyRow
                  apiKey={apiKey}
                  isNew={apiKey.id === newlyCreatedId}
                  onDeleted={(id) => {
                    setApiKeys((current) => current.filter((item) => item.id !== id));
                    if (newlyCreatedId === id) setNewlyCreatedId(null);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
