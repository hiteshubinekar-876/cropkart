import { addDays } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { COUPONS } from "@/lib/constants";
import { orders, products, users } from "@/lib/mock-data";
import { OrderModel } from "@/models/Order";
import { buildInvoiceText } from "@/lib/order-utils";
import { ensureSeedData } from "@/lib/services/seed";
import type { Order } from "@/lib/types";

type CreateOrderPayload = {
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  paymentMode: "COD" | "UPI" | "Razorpay" | "Stripe" | "Wallet";
  items: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
  userId?: string;
};

type OrderRecord = Order & {
  placedAt?: string | Date;
  estimatedDelivery?: string | Date;
};

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

function normalizeOrder(record: OrderRecord): Order {
  return {
    ...record,
    placedAt:
      typeof record.placedAt === "string"
        ? record.placedAt
        : new Date(record.placedAt ?? Date.now()).toISOString(),
    estimatedDelivery:
      typeof record.estimatedDelivery === "string"
        ? record.estimatedDelivery
        : new Date(record.estimatedDelivery ?? Date.now()).toISOString(),
  };
}

export function calculateOrderSummary(
  items: Array<{ productId: string; quantity: number }>,
  couponCode?: string,
) {
  const subtotal = items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const deliveryCharge = subtotal > 799 ? 0 : 40;
  const discount = couponCode
    ? COUPONS[couponCode.toUpperCase() as keyof typeof COUPONS] ?? 0
    : 0;

  return {
    subtotal,
    deliveryCharge,
    discount,
    total: Math.max(subtotal + deliveryCharge - discount, 0),
  };
}

export async function createOrder(payload: CreateOrderPayload) {
  const summary = calculateOrderSummary(payload.items, payload.couponCode);

  const order: Order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    userId: payload.userId ?? users[0].id,
    items: payload.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product?.price ?? 0,
      };
    }),
    ...summary,
    paymentMode: payload.paymentMode,
    status: "Processing",
    placedAt: new Date().toISOString(),
    estimatedDelivery: addDays(new Date(), 3).toISOString(),
    address: {
      id: `addr-${Date.now()}`,
      label: "Delivery",
      recipient: payload.customerName,
      line1: payload.addressLine,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      phone: payload.phone,
      primary: true,
    },
  };

  if (!hasDatabase()) {
    orders.unshift(order);
    return order;
  }

  await connectToDatabase();
  await ensureSeedData();

  const created = await OrderModel.create({
    ...order,
    placedAt: new Date(order.placedAt),
    estimatedDelivery: new Date(order.estimatedDelivery),
  });

  return normalizeOrder(created.toObject() as OrderRecord);
}

export async function getOrderById(id: string) {
  if (!hasDatabase()) {
    return orders.find((order) => order.id === id);
  }

  await connectToDatabase();
  await ensureSeedData();
  const order = (await OrderModel.findOne({ id }).lean()) as OrderRecord | null;
  return order ? normalizeOrder(order) : undefined;
}

export async function getOrdersByUserId(userId: string) {
  if (!hasDatabase()) {
    return orders.filter((order) => order.userId === userId);
  }

  await connectToDatabase();
  await ensureSeedData();
  const records = (await OrderModel.find({ userId }).sort({ placedAt: -1 }).lean()) as OrderRecord[];
  return records.map(normalizeOrder);
}

export async function updateOrderStatus(id: string, status: Order["status"]) {
  if (!hasDatabase()) {
    const order = orders.find((candidate) => candidate.id === id);

    if (!order) {
      return null;
    }

    order.status = status;
    return order;
  }

  await connectToDatabase();
  await ensureSeedData();
  const order = (await OrderModel.findOneAndUpdate(
    { id },
    { $set: { status } },
    { new: true },
  ).lean()) as OrderRecord | null;

  return order ? normalizeOrder(order) : null;
}

export function buildInvoice(order: Order) {
  return buildInvoiceText(order, products);
}
