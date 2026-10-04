"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Order } from "@/lib/types";
import { products } from "@/lib/mock-data";
import { useOrderStore } from "@/hooks/use-order-store";
import { buildInvoiceText, canCancelOrder, getTrackingSteps } from "@/lib/order-utils";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";

type OrdersClientProps = {
  seededOrders: Order[];
};

const statusStyles: Record<Order["status"], string> = {
  Processing: "bg-amber-50 text-amber-700",
  Packed: "bg-sky-50 text-sky-700",
  "In Transit": "bg-brand-50 text-brand-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

const trackingNotes: Record<Order["status"], string> = {
  Processing: "Your order has been placed and the seller is preparing it for packing.",
  Packed: "Your order is packed and queued for pickup.",
  "In Transit": "Your order is on the way and moving through the delivery network.",
  Delivered: "Your order has been delivered successfully.",
  Cancelled: "This order has been cancelled. If a payment was captured, refund handling will follow the payment mode.",
};

export function OrdersClient({ seededOrders }: OrdersClientProps) {
  const searchParams = useSearchParams();
  const { recentOrders, orderOverrides, updateOrder } = useOrderStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const seededOrderIds = useMemo(() => new Set(seededOrders.map((order) => order.id)), [seededOrders]);

  const allOrders = useMemo(() => {
    const seen = new Set<string>();
    return [...recentOrders, ...seededOrders]
      .map((order) => ({
        ...order,
        ...(orderOverrides[order.id] ?? {}),
      }))
      .filter((order) => {
        if (seen.has(order.id)) {
          return false;
        }

        seen.add(order.id);
        return true;
      });
  }, [orderOverrides, recentOrders, seededOrders]);

  function setOrderMessage(orderId: string, message: string) {
    setMessages((current) => ({
      ...current,
      [orderId]: message,
    }));
  }

  function downloadInvoice(order: Order) {
    const invoice = buildInvoiceText(order, products);
    const blob = new Blob([invoice], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.id}-invoice.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setOrderMessage(order.id, "Invoice downloaded.");
  }

  async function cancelOrder(order: Order) {
    if (!canCancelOrder(order.status)) {
      setOrderMessage(order.id, `This order is already ${order.status.toLowerCase()}.`);
      return;
    }

    setBusyOrderId(order.id);
    setOrderMessage(order.id, "");

    try {
      if (seededOrderIds.has(order.id)) {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });

        const data = (await response.json()) as { error?: string; order?: Order };

        if (!response.ok || !data.order) {
          setOrderMessage(order.id, data.error ?? "Unable to cancel this order right now.");
          setBusyOrderId(null);
          return;
        }
      }

      updateOrder(order.id, { status: "Cancelled" });
      setExpandedOrderId(order.id);
      setOrderMessage(order.id, "Order cancelled successfully.");
    } catch {
      setOrderMessage(order.id, "Unable to cancel this order right now.");
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="space-y-5">
      {searchParams.get("placed") === "1" ? (
        <div className="rounded-3xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm font-semibold text-brand-700">
          Order placed successfully. Your latest order has been added to the top of this list.
        </div>
      ) : null}

      {allOrders.map((order) => {
        const trackingSteps = getTrackingSteps(order.status);
        const canCancel = canCancelOrder(order.status);
        const isExpanded = expandedOrderId === order.id;

        return (
          <div key={order.id} className="surface-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-extrabold">{order.id}</p>
                <p className="mt-1 text-sm text-ink-500">
                  Placed on {formatDate(order.placedAt)} | Estimated delivery {formatDate(order.estimatedDelivery)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[order.status]}`}>
                  {order.status}
                </p>
                <p className="mt-2 text-xl font-extrabold">{formatCurrency(order.total)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-ink-600">
              {order.items.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                return (
                  <div key={item.productId} className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <span>
                      {product?.name ?? item.productId} x {item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                className="secondary-button rounded-2xl"
              >
                {isExpanded ? "Hide tracking" : "Track order"}
              </button>
              <button
                type="button"
                onClick={() => void cancelOrder(order)}
                disabled={!canCancel || busyOrderId === order.id}
                className="secondary-button rounded-2xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyOrderId === order.id ? "Cancelling..." : "Cancel order"}
              </button>
              <button
                type="button"
                onClick={() => downloadInvoice(order)}
                className="primary-button rounded-2xl"
              >
                Download invoice
              </button>
            </div>

            {messages[order.id] ? (
              <p className="mt-4 text-sm text-ink-500">{messages[order.id]}</p>
            ) : null}

            {isExpanded ? (
              <div className="mt-5 rounded-3xl border border-brand-100 bg-brand-50/40 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-extrabold text-emerald-950">Tracking details</p>
                  <p className="text-sm text-ink-500">Updated status: {order.status}</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-ink-600">{trackingNotes[order.status]}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {trackingSteps.map((step) => (
                    <div
                      key={`${order.id}-${step.label}`}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        step.state === "complete"
                          ? "border-brand-200 bg-white text-brand-700"
                          : step.state === "current"
                            ? "border-brand-300 bg-brand-100/70 text-emerald-950"
                            : "border-slate-200 bg-white text-ink-400"
                      }`}
                    >
                      <p className="font-semibold">{step.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em]">
                        {step.state === "complete"
                          ? "Done"
                          : step.state === "current"
                            ? "Current"
                            : "Pending"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-ink-600">
                    Delivery to {order.address.recipient}, {order.address.city} {order.address.state}
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-ink-600">
                    Estimated delivery window: {formatDateTime(order.estimatedDelivery)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
