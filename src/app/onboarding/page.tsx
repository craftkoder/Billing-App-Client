"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { businessApi, CreateBusinessInput } from "@/lib/api";
import { ApiError, BusinessCategory } from "@/lib/types";

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "grocery", label: "Grocery" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "salon", label: "Salon" },
  { value: "mobile_repair", label: "Mobile repair" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "agency", label: "Agency" },
  { value: "freelancer", label: "Freelancer" },
  { value: "distributor", label: "Distributor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "clinic", label: "Clinic" },
  { value: "auto_parts", label: "Auto parts" },
  { value: "stationery", label: "Stationery" },
  { value: "home_services", label: "Home services" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [form, setForm] = useState<CreateBusinessInput>({
    businessName: "",
    category: "retail",
    phone: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CreateBusinessInput>(key: K, value: CreateBusinessInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await businessApi.create(form);
      await refreshSession();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the business. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-semibold mb-1">Set up your business</h1>
        <p className="text-sm text-ink-muted mb-6">
          This becomes the billing identity on every invoice you issue.
        </p>

        <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
          <div>
            <label className="label" htmlFor="businessName">Business name</label>
            <input
              id="businessName"
              required
              className="field"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Sharma Electronics"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select
                id="category"
                className="field"
                value={form.category}
                onChange={(e) => set("category", e.target.value as BusinessCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="phone">Business phone</label>
              <input
                id="phone"
                required
                className="field figures"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input
                id="city"
                required
                className="field"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Jaipur"
              />
            </div>
            <div>
              <label className="label" htmlFor="gstin">GSTIN (optional)</label>
              <input
                id="gstin"
                className="field figures"
                value={form.gstin ?? ""}
                onChange={(e) => set("gstin", e.target.value)}
                placeholder="27AAPFU0939F1ZV"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">Address (optional)</label>
            <textarea
              id="address"
              className="field"
              rows={2}
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? "Creating…" : "Create business & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
