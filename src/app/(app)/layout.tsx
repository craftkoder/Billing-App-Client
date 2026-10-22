"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, hasMinRole } from "@/lib/auth-context";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useOfflineSync } from "@/lib/use-offline-sync";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  minRole: Role;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", minRole: "VIEWER" },
  { href: "/billing", label: "Billing", minRole: "CASHIER" },
  { href: "/invoices", label: "Invoices", minRole: "VIEWER" },
  { href: "/products", label: "Products", minRole: "VIEWER" },
  { href: "/customers", label: "Customers", minRole: "VIEWER" },
  { href: "/expenses", label: "Expenses", minRole: "MANAGER" },
  { href: "/analytics", label: "Analytics", minRole: "MANAGER" },
  { href: "/team", label: "Team", minRole: "MANAGER" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnlineStatus();
  const { pendingCount, syncing } = useOfflineSync();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!session.tenantId) {
      router.replace("/onboarding");
    }
  }, [loading, session, router]);

  if (loading || !session || !session.tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => hasMinRole(session.role, item.minRole));

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-56 md:flex-col border-r border-line bg-surface">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-line">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <div className="font-semibold text-sm truncate">{session.businessName ?? "BizConnect"}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <button onClick={logout} className="btn btn-ghost w-full text-sm">
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-line bg-surface">
          <div className="md:hidden font-semibold text-sm">{session.businessName ?? "BizConnect"}</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            {!online && (
              <span className="badge badge-marigold">Offline — changes will sync</span>
            )}
            {online && pendingCount > 0 && (
              <span className="badge badge-marigold">
                {syncing ? "Syncing…" : `${pendingCount} bill${pendingCount > 1 ? "s" : ""} to sync`}
              </span>
            )}
            <span className="badge badge-muted">{session.role ?? "—"}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line flex justify-around py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
          {visibleNav.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  active ? "text-primary" : "text-ink-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
