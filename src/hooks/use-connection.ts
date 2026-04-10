"use client";

import { useCallback, useEffect, useState } from "react";

import type { ConnectionStatus } from "@/lib/shared";

const CONNECTION_STATUS_EVENT = "connection-status-changed";
const CONNECTION_STATUS_POLL_INTERVAL = 15_000;

async function fetchConnectionStatus() {
  const response = await fetch("/api/connect", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch connection status.");
  }

  return (await response.json()) as ConnectionStatus;
}

export function dispatchConnectionStatusChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONNECTION_STATUS_EVENT));
  }
}

export function useConnection(initialStatus: ConnectionStatus) {
  const [status, setStatus] = useState(initialStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasResolved, setHasResolved] = useState(Boolean(initialStatus.checkedAt));

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const nextStatus = await fetchConnectionStatus();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setHasResolved(true);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handleStatusChanged = () => {
      void refresh();
    };

    window.addEventListener(CONNECTION_STATUS_EVENT, handleStatusChanged);
    const intervalId = window.setInterval(() => {
      void refresh();
    }, CONNECTION_STATUS_POLL_INTERVAL);

    return () => {
      window.removeEventListener(CONNECTION_STATUS_EVENT, handleStatusChanged);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    status,
    isRefreshing,
    hasResolved,
    refresh,
  };
}
