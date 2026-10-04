"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { COUPONS } from "@/lib/constants";
import { products } from "@/lib/mock-data";
import { useCartStore } from "@/hooks/use-cart-store";
import { ProductVisual } from "@/components/shared/product-visual";
import { formatCurrency } from "@/utils/format";

export function CartView() {
  const [couponInput, setCouponInput] = useState("");
  const { items, couponCode, applyCoupon, removeItem, updateQuantity } = useCartStore();

  const enrichedItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          product: products.find((product) => product.id === item.productId),
        }))
        .filter((item) => item.product),
    [items],
  );

  const subtotal = enrichedItems.reduce(
    (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
    0,
  );
  const deliveryCharge = subtotal > 799 ? 0 : 40;
  const discount = couponCode
    ? COUPONS[couponCode.toUpperCase() as keyof typeof COUPONS] ?? 0
    : 0;
  const total = Math.max(subtotal + deliveryCharge - discount, 0);

  if (!enrichedItems.length) {
    return (
      <div className="surface-card flex flex-col items-center gap-5 p-10 text-center">
        <ProductVisual title="Your cart is empty" subtitle="Add farm-fresh essentials to begin checkout." palette="from-brand-100 via-white to-ocean" className="h-52 w-full max-w-md" />
        <Link href="/products" className="primary-button">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-4">
        {enrichedItems.map((item) => (
          <div key={item.productId} className="surface-card flex flex-col gap-5 p-5 sm:flex-row">
            <ProductVisual
              title={item.product?.name ?? ""}
              subtitle={item.product?.unit}
              palette={item.product?.images[0] ?? "from-slate-100 to-white"}
              className="h-40 w-full sm:w-64"
            />
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div>
                <p className="text-lg font-bold">{item.product?.name}</p>
                <p className="mt-1 text-sm text-ink-500">
                  Sold by {item.product?.farmerName} | {item.product?.state}
                </p>
                <p className="mt-3 text-lg font-extrabold text-ink-900">
                  {formatCurrency(item.product?.price ?? 0)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="surface-card h-fit p-6">
        <p className="text-lg font-extrabold">Price details</p>
        <div className="mt-6 space-y-4 text-sm text-ink-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{deliveryCharge === 0 ? "Free" : formatCurrency(deliveryCharge)}</span>
          </div>
          <div className="flex justify-between text-brand-700">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-4">
          <label className="text-sm font-semibold text-ink-700">Coupon code</label>
          <input
            value={couponInput}
            onChange={(event) => setCouponInput(event.target.value)}
            placeholder="FRESH100"
            className="input-shell w-full"
          />
          <button
            type="button"
            onClick={() => applyCoupon(couponInput.toUpperCase())}
            className="secondary-button w-full rounded-2xl"
          >
            Apply coupon
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-dashed border-slate-200 pt-6">
          <span className="text-base font-semibold">Total</span>
          <span className="text-2xl font-extrabold">{formatCurrency(total)}</span>
        </div>

        <Link href="/checkout" className="primary-button mt-6 w-full rounded-2xl">
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
