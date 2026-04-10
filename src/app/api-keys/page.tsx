"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { KeyRound, LoaderCircle, Plus } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="API Keys"
        title="Manage your local key vault"
        description="Keys are stored in a local SQLite database, independent of your PostgreSQL connection. Generate, copy, toggle, or revoke access keys here."
      />

      <Card className="surface-panel border-white/80">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              {activeKeyCount} active keys
            </Badge>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Generate new API key
            </CardTitle>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <Input
              value={newKeyName}
              onChange={(event) => setNewKeyName(event.target.value)}
              placeholder="Key label"
              className="sm:min-w-[240px]"
            />
            <Button type="button" onClick={() => void handleCreateKey()} disabled={isCreating}>
              {isCreating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Key
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-[28px] bg-white/70" />
          <Skeleton className="h-40 rounded-[28px] bg-white/70" />
        </div>
      ) : apiKeys.length === 0 ? (
        <Card className="glass-panel border-white/80">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/[0.04]">
              <Image
                src="/oroya.png"
                alt="Oroya Logo"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                No keys generated yet
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Generate your first access key to enable external API integration.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
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
      )}
    </div>
  );
}
