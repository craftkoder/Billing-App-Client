export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary-soft flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F5D52" strokeWidth="2">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z" opacity="0.3" />
            <path d="M5 13l2 2a7.07 7.07 0 0110 0l2-2a10.02 10.02 0 00-14 0z" />
            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">No connection</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This page isn&apos;t available offline yet. Billing still works — invoices you
          create now will save locally and sync automatically once you&apos;re back online.
        </p>
      </div>
    </main>
  );
}
