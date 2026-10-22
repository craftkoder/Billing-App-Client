/**
 * Offline queue for invoice creation.
 *
 * A billing counter can't stop working because of a dropped connection.
 * When POST /invoices fails due to a network error (not a validation or
 * auth error — those are real rejections), the payload is stashed in
 * IndexedDB and retried automatically the next time the app comes online
 * or regains focus.
 */

const DB_NAME = "bizconnect-offline";
const DB_VERSION = 1;
const STORE = "pending-invoices";

export interface QueuedInvoice {
  id: string; // client-generated, used as idempotency key
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueInvoice(payload: unknown): Promise<QueuedInvoice> {
  const db = await openDb();
  const entry: QueuedInvoice = {
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return entry;
}

export async function listQueuedInvoices(): Promise<QueuedInvoice[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedInvoice[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedInvoice(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateQueuedInvoice(entry: QueuedInvoice): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Distinguishes "the network is down" from "the server rejected this". */
export function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError || // fetch throws TypeError on network failure
    (err instanceof Error && err.message === "Failed to fetch")
  );
}
