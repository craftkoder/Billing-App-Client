"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { businessApi, adminApi } from "@/lib/api";
import { useAuth, hasMinRole } from "@/lib/auth-context";
import type { BusinessDashboard, AdminDashboard } from "@/lib/types";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-medium text-ink-muted mb-1">{label}</div>
      <div className="figures text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [biz, setBiz] = useState<BusinessDashboard | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const canSeeAdmin = hasMinRole(session?.role ?? null, "MANAGER");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      businessApi.dashboard().catch(() => null),
      canSeeAdmin ? adminApi.dashboard().catch(() => null) : Promise.resolve(null),
    ]).then(([b, a]) => {
      if (cancelled) return;
      setBiz(b);
      setAdmin(a);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canSeeAdmin]);

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <Link href="/billing" className="btn btn-primary">New bill</Link>
      </div>

      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="text-xs font-semibold text-ink-muted mb-2">This month</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* <StatCard label="Today's revenue" value={money(biz?.today.revenue ?? 0)} sub={`${biz?.today.invoiceCount ?? 0} invoices`} />
              <StatCard label="This week" value={money(biz?.week.revenue ?? 0)} sub={`${biz?.week.invoiceCount ?? 0} invoices`} />
              <StatCard label="This month" value={money(biz?.month.revenue ?? 0)} sub={`${biz?.month?s.invoiceCount ?? 0} invoices`} /> */}
              <StatCard label="Customers" value={String(biz?.totalCustomers ?? 0)} />
            </div>
          </section>

          {(biz?.lowStockCount ?? 0) > 0 && (
            <Link
              href="/products?lowStock=true"
              className="panel p-4 flex items-center justify-between border-l-4"
              style={{ borderLeftColor: "var(--color-marigold)" }}
            >
              <div>
                <div className="text-sm font-medium">Low stock alert</div>
                <div className="text-xs text-ink-muted">{biz?.lowStockCount} products are at or below their reorder point</div>
              </div>
              <span className="badge badge-marigold">{biz?.lowStockCount}</span>
            </Link>
          )}

          {admin && (
            <section>
              <div className="text-xs font-semibold text-ink-muted mb-2">Business overview</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="panel p-4">
                  <div className="text-xs font-medium text-ink-muted mb-2">Team</div>
                  <div className="text-2xl font-semibold figures">{admin.team.totalMembers}</div>
                  <div className="text-xs text-ink-faint mt-1">
                    {admin.team.pendingInvites > 0 ? `${admin.team.pendingInvites} pending invite(s)` : "members active"}
                  </div>
                </div>
                <div className="panel p-4">
                  <div className="text-xs font-medium text-ink-muted mb-2">Expenses this month</div>
                  <div className="text-2xl font-semibold figures">{money(admin.expensesThisMonth.total)}</div>
                  <div className="text-xs text-ink-faint mt-1">{admin.expensesThisMonth.count} entries</div>
                </div>
                <div className="panel p-4">
                  <div className="text-xs font-medium text-ink-muted mb-2">Plan</div>
                  <div className="text-sm font-semibold">{admin.subscription.plan?.name ?? "—"}</div>
                  <div className="text-xs text-ink-faint mt-1">{admin.subscription.subscriptionStatus}</div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
