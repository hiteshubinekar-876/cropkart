import type { Order, OrderStatus, Product } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const trackingFlow: OrderStatus[] = ["Processing", "Packed", "In Transit", "Delivered"];

export function canCancelOrder(status: OrderStatus) {
  return !["Delivered", "Cancelled"].includes(status);
}

export function getTrackingSteps(status: OrderStatus) {
  if (status === "Cancelled") {
    return trackingFlow.map((step) => ({
      label: step,
      state: step === "Processing" ? "complete" : "pending",
    }));
  }

  const activeIndex = trackingFlow.indexOf(status);

  return trackingFlow.map((step, index) => ({
    label: step,
    state:
      index < activeIndex ? "complete" : index === activeIndex ? "current" : "pending",
  }));
}

export function buildInvoiceText(order: Order, productCatalog: Product[]) {
  const lines = order.items
    .map((item) => {
      const product = productCatalog.find((candidate) => candidate.id === item.productId);
      return `${product?.name ?? item.productId} x ${item.quantity} = ${formatCurrency(item.price * item.quantity)}`;
    })
    .join("\n");

  return [
    `Invoice: ${order.id}`,
    `Status: ${order.status}`,
    `Placed on: ${formatDateTime(order.placedAt)}`,
    `Estimated delivery: ${formatDateTime(order.estimatedDelivery)}`,
    `Customer: ${order.address.recipient}`,
    `Delivery address: ${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`,
    `Phone: ${order.address.phone}`,
    `Payment: ${order.paymentMode}`,
    "",
    lines,
    "",
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Delivery: ${formatCurrency(order.deliveryCharge)}`,
    `Discount: ${formatCurrency(order.discount)}`,
    `Total: ${formatCurrency(order.total)}`,
  ].join("\n");
}
