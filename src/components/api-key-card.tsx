"use client";

import { useState } from "react";
import { Copy, LoaderCircle, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ApiKeyRecord } from "@/lib/api-keys-db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface ApiKeyCardProps {
  apiKey: ApiKeyRecord;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (nextKey: ApiKeyRecord) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskApiKey(key: string): string {
  if (key.length < 8) {
    return "****";
  }

  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function formatDateRelative(dateString: string): string {
  const now = Date.now();
  const timestamp = new Date(dateString).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffInHours = Math.floor((now - timestamp) / (1000 * 60 * 60));

  if (diffInHours < 1) return "In the last hour";
  if (diffInHours < 24) return `In the last ${diffInHours} hours`;
  if (diffInHours < 24 * 7) return `In the last ${Math.floor(diffInHours / 24)} days`;

  return `${Math.max(Math.floor(diffInHours / (24 * 30)), 1)} month(s) ago`;
}

export function ApiKeyCard({
  apiKey,
  onDeleted,
  onStatusChanged,
}: ApiKeyCardProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isActive, setIsActive] = useState(apiKey.is_active);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleCopyToClipboard() {
    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(apiKey.key);
      toast.success("API key copied to clipboard.");
    } catch {
      toast.error("Copy failed.");
    } finally {
      setIsCopying(false);
    }
  }

  async function handleToggleActive() {
    setIsToggling(true);

    try {
      const response = await fetch("/api/keys", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: apiKey.id,
          is_active: !isActive,
        }),
      });
      const payload = (await response.json()) as ApiKeyRecord & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Status could not be changed.");
      }

      setIsActive(payload.is_active);
      onStatusChanged?.(payload);
      toast.success(
        payload.is_active
          ? "API key reactivated."
          : "API key deactivated.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status could not be changed.");
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/keys?id=${apiKey.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      onDeleted?.(apiKey.id);
      toast.success("API key deleted permanently.");
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="rounded-[20px] border border-slate-200/80 bg-white/90 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.22)]">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-foreground">
              {apiKey.name}
            </h3>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={
                isActive
                  ? "rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800"
                  : "rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
              }
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-[14px] border border-slate-200/80 bg-[#f7f8fa] px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">
              {maskApiKey(apiKey.key)}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-slate-200 bg-white px-2.5"
              onClick={() => void handleCopyToClipboard()}
              disabled={isCopying}
            >
              {isCopying ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Copy API key</span>
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[12px] border border-slate-200/70 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Key ID
              </p>
              <code className="mt-1 block truncate text-[11px] font-medium text-slate-700">
                {apiKey.id.slice(0, 8)}
              </code>
            </div>
            <div className="rounded-[12px] border border-slate-200/70 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-[11px] text-slate-700">{formatDate(apiKey.created_at)}</p>
            </div>
            <div className="rounded-[12px] border border-slate-200/70 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Age
              </p>
              <p className="mt-1 text-[11px] text-slate-700">
                {formatDateRelative(apiKey.created_at) || "Recently issued"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[11px]"
            onClick={() => void handleToggleActive()}
            disabled={isToggling}
          >
            {isToggling ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {isActive ? "Disable" : "Enable"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 rounded-lg px-3 text-[11px]"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[24px] border border-white/80 bg-white/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete API key
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6">
              <strong>{apiKey.name}</strong> will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
