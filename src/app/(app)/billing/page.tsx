"use client";

import { useEffect, useMemo, useState } from "react";
import { productsApi, customersApi, invoicesApi } from "@/lib/api";
import { enqueueInvoice, isNetworkError } from "@/lib/offline-queue";
import { ApiError } from "@/lib/types";
import type { Product, Customer, CreateInvoiceInput, PaymentMode } from "@/lib/types";

interface CartLine {
  key: string;
  productId?: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  gstRate: number;
}

const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER"];

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function lineTotal(line: CartLine) {
  const base = line.quantity * line.unitPrice - line.discountAmount;
  const gst = (base * line.gstRate) / 100;
  return { base, gst, total: base + gst };
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCustomItem, setShowCustomItem] = useState(false);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [payLater, setPayLater] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "offline" | "error"; text: string } | null>(null);

  // Debounced product search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      productsApi
        .list({ search, limit: 8 })
        .then((r) => setResults(r.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Debounced customer search
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(() => {
      customersApi
        .list({ search: customerQuery, limit: 6 })
        .then((r) => setCustomerResults(r.items))
        .catch(() => setCustomerResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  function addProductToCart(p: Product) {
    setCart((c) => {
      const existing = c.find((l) => l.productId === p.id);
      if (existing) {
        return c.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...c,
        {
          key: crypto.randomUUID(),
          productId: p.id,
          productName: p.name,
          hsnCode: p.hsnCode ?? undefined,
          quantity: 1,
          unit: p.unit,
          unitPrice: p.sellingPrice,
          discountAmount: 0,
          gstRate: p.gstRate,
        },
      ];
    });
    setSearch("");
    setResults([]);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setCart((c) => c.filter((l) => l.key !== key));
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    for (const line of cart) {
      const t = lineTotal(line);
      subtotal += t.base;
      gst += t.gst;
    }
    const grand = Math.max(0, subtotal + gst - invoiceDiscount);
    return { subtotal, gst, grand };
  }, [cart, invoiceDiscount]);

  async function handleCharge() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setNotice(null);

    const payload: CreateInvoiceInput = {
      customerId: customer?.id,
      items: cart.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        hsnCode: l.hsnCode,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount,
        gstRate: l.gstRate,
      })),
      invoiceDiscountAmount: invoiceDiscount,
      payments: payLater ? [] : [{ mode: paymentMode, amount: totals.grand }],
    };

    try {
      const invoice = await invoicesApi.create(payload);
      setNotice({ kind: "success", text: `Bill ${invoice.invoiceNumber} created — ${money(invoice.totalAmount)}` });
      resetCart();
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueInvoice(payload);
        setNotice({ kind: "offline", text: "You're offline — this bill is saved and will sync automatically." });
        resetCart();
      } else {
        const message = err instanceof ApiError ? err.message : "Couldn't create the bill. Try again.";
        setNotice({ kind: "error", text: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetCart() {
    setCart([]);
    setCustomer(null);
    setCustomerQuery("");
    setInvoiceDiscount(0);
    setPayLater(false);
  }

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 max-w-6xl">
      {/* Left: search + catalog */}
      <div>
        <h1 className="text-lg font-semibold mb-4">New bill</h1>

        <div className="relative mb-3">
          <input
            className="field"
            placeholder="Search products by name, SKU, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(results.length > 0 || searching) && (
            <div className="absolute z-10 mt-1 w-full panel max-h-72 overflow-y-auto">
              {searching && <div className="p-3 text-sm text-ink-muted">Searching…</div>}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProductToCart(p)}
                  className="w-full text-left px-3 py-2 hover:bg-paper flex items-center justify-between text-sm border-b border-line last:border-b-0"
                >
                  <span>
                    {p.name}
                    {p.trackInventory && (
                      <span className="ml-2 text-xs text-ink-faint figures">stock {p.stockQuantity}</span>
                    )}
                  </span>
                  <span className="figures font-medium">{money(p.sellingPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-ghost text-sm mb-4" onClick={() => setShowCustomItem((s) => !s)}>
          {showCustomItem ? "Cancel" : "+ Add item not in catalog"}
        </button>

        {showCustomItem && (
          <CustomItemForm
            onAdd={(line) => {
              setCart((c) => [...c, line]);
              setShowCustomItem(false);
            }}
          />
        )}

        <div className="mt-6">
          <div className="label mb-2">Customer</div>
          {customer ? (
            <div className="panel p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{customer.name || "Unnamed customer"}</div>
                <div className="text-xs text-ink-muted figures">{customer.phone}</div>
              </div>
              <button className="btn btn-ghost text-xs" onClick={() => setCustomer(null)}>Change</button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="field"
                placeholder="Search by phone or name (leave blank for walk-in)"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {customerResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full panel max-h-56 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setCustomerQuery("");
                        setCustomerResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-paper text-sm border-b border-line last:border-b-0"
                    >
                      <div>{c.name || "Unnamed"}</div>
                      <div className="text-xs text-ink-muted figures">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: receipt-tape cart */}
      <div className="panel p-0 overflow-hidden flex flex-col h-fit lg:sticky lg:top-6">
        <div className="px-4 py-3 border-b border-dashed border-line-strong">
          <div className="text-xs font-semibold text-ink-muted">Current bill</div>
        </div>

        <div className="flex-1 max-h-[50vh] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-faint">No items yet</div>
          ) : (
            cart.map((line, i) => {
              const t = lineTotal(line);
              return (
                <div
                  key={line.key}
                  className={`px-4 py-2.5 text-sm ${i < cart.length - 1 ? "border-b border-dashed border-line" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{line.productName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          className="figures w-14 border border-line rounded px-1.5 py-0.5 text-xs"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                        />
                        <span className="text-xs text-ink-faint">{line.unit} ×</span>
                        <span className="figures text-xs text-ink-muted">{money(line.unitPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="figures font-medium">{money(t.total)}</div>
                      <button onClick={() => removeLine(line.key)} className="text-xs text-danger mt-1">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-dashed border-line-strong space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span className="figures">{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>GST</span>
            <span className="figures">{money(totals.gst)}</span>
          </div>
          <div className="flex justify-between items-center text-ink-muted">
            <span>Discount</span>
            <input
              type="number"
              min={0}
              step="any"
              className="figures w-20 border border-line rounded px-1.5 py-0.5 text-xs text-right"
              value={invoiceDiscount}
              onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span className="figures">{money(totals.grand)}</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-line space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={payLater} onChange={(e) => setPayLater(e.target.checked)} />
            Customer will pay later (credit)
          </label>

          {!payLater && (
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMode(m)}
                  className={`text-[11px] font-medium rounded-md py-1.5 border ${
                    paymentMode === m ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {notice && (
            <p
              className={`text-xs rounded-md px-2 py-1.5 ${
                notice.kind === "error"
                  ? "bg-danger-soft text-danger"
                  : notice.kind === "offline"
                    ? "bg-marigold-soft text-[#9a6114]"
                    : "bg-success-soft text-success"
              }`}
            >
              {notice.text}
            </p>
          )}

          <button
            onClick={handleCharge}
            disabled={cart.length === 0 || submitting}
            className="btn btn-primary w-full"
          >
            {submitting ? "Saving…" : `Charge ${money(totals.grand)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomItemForm({ onAdd }: { onAdd: (line: CartLine) => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [gstRate, setGstRate] = useState(0);

  return (
    <div className="panel p-3 mb-4 space-y-2">
      <input className="field" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          className="field figures"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 0)}
        />
        <input
          type="number"
          className="field figures"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
        />
        <select className="field" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
          {GST_RATES.map((r) => (
            <option key={r} value={r}>{r}% GST</option>
          ))}
        </select>
      </div>
      <button
        className="btn btn-primary w-full text-sm"
        disabled={!name.trim() || qty <= 0 || price <= 0}
        onClick={() =>
          onAdd({
            key: crypto.randomUUID(),
            productName: name.trim(),
            quantity: qty,
            unit: "pcs",
            unitPrice: price,
            discountAmount: 0,
            gstRate,
          })
        }
      >
        Add to bill
      </button>
    </div>
  );
}
