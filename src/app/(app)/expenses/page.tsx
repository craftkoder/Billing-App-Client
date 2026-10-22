"use client";

import { useCallback, useEffect, useState } from "react";
import { expensesApi } from "@/lib/api";
import type { Expense } from "@/lib/types";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ totalAmount: number; totalCount: number; byCategory: { category: string; amount: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([expensesApi.list({ limit: 50 }), expensesApi.summary()])
      .then(([list, sum]) => {
        setItems(list.items);
        setSummary(sum);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-lg font-semibold">Expenses</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="panel p-4">
            <div className="text-xs font-medium text-ink-muted mb-1">Total</div>
            <div className="figures text-xl font-semibold">{money(summary.totalAmount)}</div>
            <div className="text-xs text-ink-faint mt-1">{summary.totalCount} entries</div>
          </div>
          <div className="panel p-4">
            <div className="text-xs font-medium text-ink-muted mb-1">Top category</div>
            <div className="text-sm font-semibold">
              {summary.byCategory[0]?.category ?? "—"}
            </div>
            <div className="figures text-xs text-ink-faint mt-1">
              {summary.byCategory[0] ? money(summary.byCategory[0].amount) : ""}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateExpenseForm
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
          <div className="px-4 py-6 text-center text-sm text-ink-faint">No expenses recorded yet</div>
        ) : (
          items.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{e.category}</div>
                <div className="text-xs text-ink-muted">
                  {e.description || "—"} · {new Date(e.expenseDate).toLocaleDateString("en-IN")}
                </div>
              </div>
              <div className="figures font-medium">{money(e.amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateExpenseForm({ onCreated }: { onCreated: () => void }) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await expensesApi.create({
        category,
        amount,
        description: description || undefined,
        expenseDate: new Date(date).toISOString(),
      });
      onCreated();
    } catch {
      setError("Couldn't save the expense. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className="field" placeholder="Category (e.g. Rent)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input
          type="number"
          className="field figures"
          placeholder="Amount"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" className="field figures" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="field" placeholder="Note (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary" disabled={!category.trim() || amount <= 0 || busy} onClick={submit}>
        {busy ? "Saving…" : "Save expense"}
      </button>
    </div>
  );
}
