"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import type { SalesSeries } from "@/lib/types";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function BarRow({ label, value, max, formatValue }: { label: string; value: number; max: number; formatValue: (n: number) => string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <div className="w-24 shrink-0 truncate text-ink-muted text-xs">{label}</div>
      <div className="flex-1 h-5 bg-paper rounded overflow-hidden">
        <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 shrink-0 text-right figures text-xs font-medium">{formatValue(value)}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [sales, setSales] = useState<SalesSeries | null>(null);
  const [payments, setPayments] = useState<{ byMode: { mode: string; amount: number }[] } | null>(null);
  const [products, setProducts] = useState<{ topProducts: { productName: string; revenue: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.sales({ groupBy: "day" }),
      analyticsApi.payments(),
      analyticsApi.products({ limit: 6 }),
    ])
      .then(([s, p, pr]) => {
        setSales(s);
        setPayments(p);
        setProducts(pr);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 md:p-6 text-sm text-ink-muted">Loading…</div>;
  }

  const salesMax = Math.max(1, ...(sales?.series.map((s) => s.revenue) ?? [0]));
  const paymentMax = Math.max(1, ...(payments?.byMode.map((m) => m.amount) ?? [0]));
  const productMax = Math.max(1, ...(products?.topProducts.map((p) => p.revenue) ?? [0]));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold">Analytics</h1>

      <section className="panel p-4">
        <div className="text-xs font-semibold text-ink-muted mb-3">Revenue, last {sales?.series.length ?? 0} days</div>
        {sales && sales.series.length > 0 ? (
          sales.series.slice(-14).map((s) => (
            <BarRow key={s.period} label={s.period.slice(5)} value={s.revenue} max={salesMax} formatValue={money} />
          ))
        ) : (
          <p className="text-sm text-ink-faint">No sales data yet.</p>
        )}
      </section>

      <section className="panel p-4">
        <div className="text-xs font-semibold text-ink-muted mb-3">Payments by mode</div>
        {payments && payments.byMode.length > 0 ? (
          payments.byMode.map((m) => (
            <BarRow key={m.mode} label={m.mode} value={m.amount} max={paymentMax} formatValue={money} />
          ))
        ) : (
          <p className="text-sm text-ink-faint">No payments recorded yet.</p>
        )}
      </section>

      <section className="panel p-4">
        <div className="text-xs font-semibold text-ink-muted mb-3">Top products by revenue</div>
        {products && products.topProducts.length > 0 ? (
          products.topProducts.map((p) => (
            <BarRow key={p.productName} label={p.productName} value={p.revenue} max={productMax} formatValue={money} />
          ))
        ) : (
          <p className="text-sm text-ink-faint">No product sales yet.</p>
        )}
      </section>
    </div>
  );
}
