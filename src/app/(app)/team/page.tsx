"use client";

import { useCallback, useEffect, useState } from "react";
import { businessApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TenantMember, Role } from "@/lib/types";

const INVITABLE_ROLES: Role[] = ["MANAGER", "CASHIER", "VIEWER"];

export default function TeamPage() {
  const { session } = useAuth();
  const isOwner = session?.role === "OWNER";

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    businessApi.listMembers().then(setMembers).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Team</h1>
        <button className="btn btn-primary" onClick={() => setShowInvite((s) => !s)}>
          {showInvite ? "Cancel" : "+ Invite member"}
        </button>
      </div>

      {showInvite && (
        <InviteForm
          onInvited={() => {
            setShowInvite(false);
            load();
          }}
        />
      )}

      <div className="panel divide-y divide-line">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">Loading…</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{m.user?.name || "Unnamed"}</div>
                <div className="text-xs text-ink-muted figures">{m.user?.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                {!m.acceptedAt && <span className="badge badge-marigold">Pending</span>}
                {isOwner && m.role !== "OWNER" ? (
                  <select
                    className="field !w-auto text-xs py-1"
                    value={m.role}
                    onChange={async (e) => {
                      await businessApi.updateMemberRole(m.userId, e.target.value as "MANAGER" | "CASHIER" | "VIEWER");
                      load();
                    }}
                  >
                    {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span className="badge badge-muted">{m.role}</span>
                )}
                {isOwner && m.role !== "OWNER" && (
                  <button
                    className="text-xs text-danger"
                    onClick={async () => {
                      if (confirm(`Remove ${m.user?.name || m.user?.phone} from the team?`)) {
                        await businessApi.removeMember(m.userId);
                        load();
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CASHIER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await businessApi.inviteMember({ phone, role: role as "MANAGER" | "CASHIER" | "VIEWER", name: name || undefined });
      onInvited();
    } catch {
      setError("Couldn't invite this member. Check the phone number and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4 mb-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <input className="field figures" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary" disabled={!phone.trim() || busy} onClick={submit}>
        {busy ? "Inviting…" : "Send invite"}
      </button>
    </div>
  );
}
