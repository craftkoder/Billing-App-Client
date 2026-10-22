"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { productsApi } from "@/lib/api";
import { hasMinRole, useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/types";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ProductsPage() {
  const { session } = useAuth();
  const canManage = hasMinRole(session?.role ?? null, "MANAGER");
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    productsApi
      .list({ search: search || undefined, lowStock: lowStockOnly || undefined, limit: 50 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [search, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-lg font-semibold">Products</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? "Cancel" : "+ Add product"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          className="field"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-ink-muted whitespace-nowrap">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {showCreate && (
        <CreateProductForm
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">GST</th>
              <th className="px-3 py-2 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-faint">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-faint">No products found</td></tr>
            ) : (
              items.map((p) => {
                const low = p.trackInventory && p.stockQuantity <= p.minStockAlert;
                return (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2.5">{p.name}</td>
                    <td className="px-3 py-2.5 figures">{money(p.sellingPrice)}</td>
                    <td className="px-3 py-2.5 figures text-ink-muted">{p.gstRate}%</td>
                    <td className="px-3 py-2.5">
                      {p.trackInventory ? (
                        <span className={`figures ${low ? "text-marigold font-medium" : ""}`}>
                          {p.stockQuantity}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState(0);
  const [gstRate, setGstRate] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await productsApi.create({ name, sellingPrice, gstRate, stockQuantity });
      onCreated();
    } catch {
      setError("Couldn't create the product. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4 mb-4 space-y-3">
      <input className="field" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          className="field figures"
          placeholder="Selling price"
          value={sellingPrice || ""}
          onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
        />
        <select className="field" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
          {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}% GST</option>)}
        </select>
        <input
          type="number"
          className="field figures"
          placeholder="Opening stock"
          value={stockQuantity || ""}
          onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary" disabled={!name.trim() || sellingPrice <= 0 || busy} onClick={submit}>
        {busy ? "Saving…" : "Save product"}
      </button>
    </div>
  );
}
