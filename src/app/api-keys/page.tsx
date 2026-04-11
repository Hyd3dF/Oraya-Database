"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import type { ApiKeyRecord } from "@/lib/api-keys-db";
import { ApiKeyCard } from "@/components/api-key-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState("New API Key");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  async function loadApiKeys() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/keys", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiKeyRecord[] & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to fetch API keys.");
      }

      setApiKeys(payload);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch API keys.",
      );
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
      toast.error("Please enter a name for the new key.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as ApiKeyRecord & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create API key.");
      }

      setApiKeys((current) => [payload, ...current]);
      setNewKeyName("New API Key");
      toast.success("New API key generated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const activeKeyCount = apiKeys.filter((item) => item.is_active).length;
  const inactiveKeyCount = apiKeys.length - activeKeyCount;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-[28px] border border-white/75 bg-white/72 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PageHeader
            eyebrow="API Keys"
            title="Manage the local key vault like a polished desktop pane"
            description="Issue, copy, disable, and revoke local access keys from a tighter workspace that keeps counts, controls, and lifecycle details aligned."
          />

          <div className="grid grid-cols-2 gap-3 xl:min-w-[320px]">
            <div className="rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Active
              </p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-foreground">
                {activeKeyCount}
              </p>
            </div>
            <div className="rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Inactive
              </p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-foreground">
                {inactiveKeyCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-white/80 bg-white/82">
          <CardHeader className="shrink-0 gap-3 border-b border-slate-200/70 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-[16px] font-semibold tracking-[-0.02em]">
                  Key Vault
                </CardTitle>
                <p className="text-[12px] leading-5 text-muted-foreground">
                  Local SQLite-backed credentials ordered by creation time.
                </p>
              </div>
              <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/10">
                {apiKeys.length} total
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-24 rounded-[20px] bg-white/70" />
                <Skeleton className="h-24 rounded-[20px] bg-white/70" />
                <Skeleton className="h-24 rounded-[20px] bg-white/70" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/[0.04]">
                  <Image
                    src="/oroya.png"
                    alt="Oroya Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">
                    No keys generated yet
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Create your first key to enable local integrations and API access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="space-y-2.5">
                  {apiKeys.map((apiKey) => (
                    <ApiKeyCard
                      key={apiKey.id}
                      apiKey={apiKey}
                      onDeleted={(id) =>
                        setApiKeys((current) => current.filter((item) => item.id !== id))
                      }
                      onStatusChanged={(nextKey) =>
                        setApiKeys((current) =>
                          current.map((item) => (item.id === nextKey.id ? nextKey : item)),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:auto-rows-min">
          <Card className="rounded-[24px] border-white/80 bg-white/84">
            <CardHeader className="gap-3 border-b border-slate-200/70 px-4 py-4">
              <Badge className="w-fit rounded-md bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/10">
                Instant issue
              </Badge>
              <CardTitle className="text-[16px] font-semibold tracking-[-0.02em]">
                Create new API key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <Input
                value={newKeyName}
                onChange={(event) => setNewKeyName(event.target.value)}
                placeholder="Key label"
                className="h-10 rounded-xl px-3 text-sm"
              />
              <Button
                type="button"
                onClick={() => void handleCreateKey()}
                disabled={isCreating}
                className="h-10 w-full rounded-xl text-[12px]"
              >
                {isCreating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Key
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/80 bg-white/84">
            <CardHeader className="gap-3 border-b border-slate-200/70 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <CardTitle className="text-[16px] font-semibold tracking-[-0.02em]">
                  Vault Notes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-[12px] leading-5 text-muted-foreground">
              <div className="rounded-[14px] border border-slate-200/70 bg-[#f8f9fb] px-3 py-2.5">
                Keys live independently from the PostgreSQL connection and stay available for local integrations.
              </div>
              <div className="rounded-[14px] border border-slate-200/70 bg-[#f8f9fb] px-3 py-2.5">
                Copy the secret once, then disable unused keys immediately to keep the vault tidy.
              </div>
              <div className="rounded-[14px] border border-slate-200/70 bg-[#f8f9fb] px-3 py-2.5">
                Deletions are permanent, so treat this pane like a compact credential ledger.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
