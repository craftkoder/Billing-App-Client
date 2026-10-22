"use client";

import { useCallback, useEffect, useState } from "react";
import { invoicesApi } from "@/lib/api";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const STATUSES: InvoiceStatus[] = ["PENDING", "PAID", "PARTIAL", "CANCELLED", "REFUNDED"];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  DRAFT: "badge-muted",
  PENDING: "badge-marigold",
  PAID: "badge-success",
  PARTIAL: "badge-marigold",
  CANCELLED: "badge-danger",
  REFUNDED: "badge-danger",
};

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    invoicesApi
      .list({ status: status || undefined, limit: 50 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="text-lg font-semibold mb-4">Invoices</h1>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setStatus("")}
          className={`text-xs font-medium rounded-full px-3 py-1.5 border whitespace-nowrap ${
            status === "" ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-muted"
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border whitespace-nowrap ${
              status === s ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="panel divide-y divide-line">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">No invoices found</div>
        ) : (
          items.map((inv) => (
            <a
              key={inv.id}
              href={invoicesApi.pdfUrl(inv.id)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 flex items-center justify-between text-sm hover:bg-paper"
            >
              <div>
                <div className="font-medium figures">{inv.invoiceNumber}</div>
                <div className="text-xs text-ink-muted">
                  {inv.customer?.name || "Walk-in"} · {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <div className="figures font-medium">{money(inv.totalAmount)}</div>
                <span className={`badge ${STATUS_BADGE[inv.status]} mt-1`}>{inv.status}</span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
