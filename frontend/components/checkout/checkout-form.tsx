"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { products } from "@/lib/mock-data";
import { useCartStore } from "@/hooks/use-cart-store";
import { useOrderStore } from "@/hooks/use-order-store";
import { PINCODE_SERVICEABLE_PREFIXES } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

const paymentOptions = [
  {
    value: "COD",
    label: "Cash on Delivery",
    description: "Pay when your order reaches your doorstep.",
  },
  {
    value: "Wallet",
    label: "Wallet",
    description: "Use your GreenCart wallet balance for instant confirmation.",
  },
] as const;

export function CheckoutForm() {
  const router = useRouter();
  const { items, couponCode, clearCart } = useCartStore();
  const { prependOrder } = useOrderStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    customerName: "Priya Sharma",
    email: "buyer@greencart.in",
    phone: "9876543210",
    addressLine: "42, Green Residency, Sector 62",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    paymentMode: "COD",
  });

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
    const delivery = subtotal > 799 ? 0 : 40;
    const discount = couponCode === "FRESH100" ? 100 : couponCode === "FARMDIRECT" ? 150 : 0;

    return {
      subtotal,
      delivery,
      discount,
      total: Math.max(subtotal + delivery - discount, 0),
    };
  }, [couponCode, items]);

  const serviceable = PINCODE_SERVICEABLE_PREFIXES.some((prefix) =>
    form.pincode.startsWith(prefix),
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/order/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        items,
        couponCode,
      }),
    });

    const data = (await response.json()) as { order?: unknown; error?: string };

    if (!response.ok || !data.order) {
      setLoading(false);
      setMessage(data.error ?? "Could not place order");
      return;
    }

    prependOrder(data.order as never);
    clearCart();
    router.push("/orders?placed=1");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="surface-card p-6">
          <p className="text-xl font-extrabold">Delivery address</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              className="input-shell"
              placeholder="Full name"
            />
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="input-shell"
              placeholder="Phone"
            />
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="input-shell sm:col-span-2"
              placeholder="Email"
            />
            <input
              value={form.addressLine}
              onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))}
              className="input-shell sm:col-span-2"
              placeholder="Address line"
            />
            <input
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              className="input-shell"
              placeholder="City"
            />
            <input
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              className="input-shell"
              placeholder="State"
            />
            <input
              value={form.pincode}
              onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value }))}
              className="input-shell"
              placeholder="Pincode"
            />
          </div>
          <p className={`mt-4 text-sm ${serviceable ? "text-brand-700" : "text-orange-700"}`}>
            {serviceable
              ? "Pincode is serviceable for farm-to-home delivery."
              : "Serviceability depends on logistics partner availability for this pincode."}
          </p>
        </div>

        <div className="surface-card p-6">
          <p className="text-xl font-extrabold">Choose payment method</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {paymentOptions.map((payment) => (
              <label
                key={payment.value}
                className={`cursor-pointer rounded-3xl border p-4 ${
                  form.paymentMode === payment.value
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value={payment.value}
                  checked={form.paymentMode === payment.value}
                  onChange={() =>
                    setForm((current) => ({ ...current, paymentMode: payment.value }))
                  }
                  className="sr-only"
                />
                <p className="font-semibold">{payment.label}</p>
                <p className="mt-1 text-sm text-ink-500">{payment.description}</p>
              </label>
            ))}
          </div>
          {form.paymentMode === "Wallet" ? (
            <p className="mt-4 text-sm text-ink-500">
              Need more money first? Open your{" "}
              <Link href="/account/wallet" className="font-semibold text-brand-700">
                wallet
              </Link>{" "}
              to deposit funds.
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              Keep cash ready at delivery time. Our partner may call before arrival.
            </p>
          )}
        </div>
      </div>

      <aside className="surface-card h-fit p-6">
        <p className="text-xl font-extrabold">Order summary</p>
        <div className="mt-6 space-y-3 text-sm text-ink-600">
          {items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            return (
              <div key={item.productId} className="flex justify-between gap-4">
                <span>
                  {product?.name} x {item.quantity}
                </span>
                <span>{formatCurrency((product?.price ?? 0) * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 space-y-3 border-t border-dashed border-slate-200 pt-6 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{summary.delivery === 0 ? "Free" : formatCurrency(summary.delivery)}</span>
          </div>
          <div className="flex justify-between text-brand-700">
            <span>Discount</span>
            <span>-{formatCurrency(summary.discount)}</span>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-base font-semibold">Total payable</span>
          <span className="text-2xl font-extrabold">{formatCurrency(summary.total)}</span>
        </div>
        {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}
        <button type="submit" disabled={loading || !items.length} className="primary-button mt-6 w-full rounded-2xl disabled:opacity-60">
          {loading ? "Placing order..." : "Place order"}
        </button>
      </aside>
    </form>
  );
}
