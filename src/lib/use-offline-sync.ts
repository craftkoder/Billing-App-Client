"use client";

import { useCallback, useEffect, useState } from "react";
import { invoicesApi } from "./api";
import {
  listQueuedInvoices,
  removeQueuedInvoice,
  updateQueuedInvoice,
  type QueuedInvoice,
} from "./offline-queue";
import type { CreateInvoiceInput } from "./types";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const items = await listQueuedInvoices();
      setPendingCount(items.length);
      return items;
    } catch {
      return [] as QueuedInvoice[];
    }
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const items = await refreshCount();
      for (const item of items) {
        try {
          await invoicesApi.create(item.payload as CreateInvoiceInput);
          await removeQueuedInvoice(item.id);
        } catch (err) {
          // A validation/auth rejection would just fail again forever — record it and move on.
          // A network error means we're offline again; stop the flush loop entirely.
          if (!navigator.onLine) break;
          await updateQueuedInvoice({
            ...item,
            attempts: item.attempts + 1,
            lastError: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    const handleOnline = () => flush();
    window.addEventListener("online", handleOnline);
    // also try once on mount, in case items were queued in a previous session
    flush();
    return () => window.removeEventListener("online", handleOnline);
  }, [flush, refreshCount]);

  return { pendingCount, syncing, flush, refreshCount };
}
