"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, businessApi } from "./api";
import { tokenStore } from "./http";
import type { Role } from "./types";

interface Session {
  userId: string;
  tenantId: string | null;
  role: Role | null;
  businessName: string | null;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<Session>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSession(): Promise<Session | null> {
  if (!tokenStore.accessToken) return null;
  try {
    const me = await authApi.me();
    const meData = me as unknown as { userId: string; tenantId: string | null; role: Role | null };
    let businessName: string | null = null;
    if (meData.tenantId) {
      try {
        const business = await businessApi.getMine();
        businessName = business.businessName;
      } catch {
        // tenant exists but business lookup failed — non-fatal, shell still renders
      }
    }
    return { userId: meData.userId, tenantId: meData.tenantId, role: meData.role, businessName };
  } catch {
    tokenStore.clear();
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await authApi.sendOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const result = await authApi.verifyOtp(phone, otp);
    tokenStore.set(result.tokens);
    const s = await loadSession();
    setSession(s);
    if (!s) throw new Error("Could not load session after login");
    return s;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the server call fails, clear the local session
    }
    tokenStore.clear();
    setSession(null);
    router.push("/login");
  }, [router]);

  const refreshSession = useCallback(async () => {
    const s = await loadSession();
    setSession(s);
    return s;
  }, []);

  const value = useMemo(
    () => ({ session, loading, sendOtp, verifyOtp, logout, refreshSession }),
    [session, loading, sendOtp, verifyOtp, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Role hierarchy helper — mirrors the backend's requireMinRole. */
const ROLE_RANK: Record<Role, number> = { VIEWER: 0, CASHIER: 1, MANAGER: 2, OWNER: 3 };

export function hasMinRole(role: Role | null, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
