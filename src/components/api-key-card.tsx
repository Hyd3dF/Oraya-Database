"use client";

import { useState } from "react";
import { Clipboard, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ApiKeyRecord } from "@/lib/api-keys-db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
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
    <Card className="border border-white/80 bg-white/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{apiKey.name}</CardTitle>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={
              isActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-600"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Key value</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-gray-100 px-3 py-2 text-sm font-mono">
              {maskApiKey(apiKey.key)}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0"
              onClick={() => void handleCopyToClipboard()}
              disabled={isCopying}
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">ID</p>
            <code className="block truncate rounded bg-gray-50 px-2 py-1 text-xs font-mono">
              {apiKey.id.slice(0, 8)}...
            </code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">Created</p>
            <p className="text-xs text-gray-600">
              {formatDate(apiKey.created_at)}
              {formatDateRelative(apiKey.created_at)
                ? ` • ${formatDateRelative(apiKey.created_at)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => void handleToggleActive()}
            disabled={isToggling}
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 gap-1 text-xs"
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
