"use client";

import { useCallback, useEffect, useState } from "react";
import { customersApi } from "@/lib/api";
import type { Customer } from "@/lib/types";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    customersApi
      .list({ search: search || undefined, limit: 50 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-lg font-semibold">Customers</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      <input
        className="field mb-4"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showCreate && (
        <CreateCustomerForm
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <div className="panel divide-y divide-line">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">No customers found</div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{c.name || "Unnamed customer"}</div>
                <div className="text-xs text-ink-muted figures">{c.phone}</div>
              </div>
              {(c.outstandingBalance ?? 0) > 0 && (
                <span className="badge badge-marigold figures">{money(c.outstandingBalance!)} due</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await customersApi.create({ phone, name: name || undefined });
      onCreated();
    } catch {
      setError("Couldn't add the customer. Check the phone number and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className="field figures" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary" disabled={!phone.trim() || busy} onClick={submit}>
        {busy ? "Saving…" : "Save customer"}
      </button>
    </div>
  );
}
