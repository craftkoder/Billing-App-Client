"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/types";

type Step = "phone" | "otp";

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await verifyOtp(phone, otp);
      router.push(session.tenantId ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
            B
          </div>
          <div>
            <div className="font-semibold leading-tight">BizConnect</div>
            <div className="text-xs text-ink-muted leading-tight">Billing &amp; POS</div>
          </div>
        </div>

        <div className="panel p-6">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp}>
              <h1 className="text-base font-semibold mb-1">Log in</h1>
              <p className="text-sm text-ink-muted mb-5">
                Enter your mobile number to get a one-time code.
              </p>
              <label className="label" htmlFor="phone">
                Mobile number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoFocus
                required
                placeholder="98765 43210"
                className="field figures"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary w-full mt-5">
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <h1 className="text-base font-semibold mb-1">Enter the code</h1>
              <p className="text-sm text-ink-muted mb-5">
                We sent a 6-digit code to <span className="figures">{phone}</span>.
              </p>
              <label className="label" htmlFor="otp">
                6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                required
                placeholder="123456"
                className="field figures tracking-widest text-center text-lg"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy || otp.length !== 6} className="btn btn-primary w-full mt-5">
                {busy ? "Verifying…" : "Verify & log in"}
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full mt-2"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
