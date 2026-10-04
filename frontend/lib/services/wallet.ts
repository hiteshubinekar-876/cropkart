import mongoose from "mongoose";
import { addDays } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { farmers, orders, products, users } from "@/lib/mock-data";
import { OrderModel } from "@/models/Order";
import { FarmerModel } from "@/models/Farmer";
import { ProductModel } from "@/models/Product";
import { UserModel } from "@/models/User";
import { WalletModel } from "@/models/Wallet";
import { calculateOrderSummary } from "@/lib/services/orders";
import { ensureSeedData } from "@/lib/services/seed";
import type { Order, Product, Role, Wallet, WalletTransaction } from "@/lib/types";

type WalletOrderPayload = {
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
};

type ProductRecord = Product & {
  harvestDate?: string | Date;
};

let memoryWallets: Wallet[] | null = null;

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

function getInitialWalletBalance(role: Role) {
  switch (role) {
    case "buyer":
      return 15000;
    case "farmer":
      return 3000;
    case "admin":
      return 50000;
    default:
      return 0;
  }
}

function buildTransaction(input: Omit<WalletTransaction, "createdAt"> & { createdAt?: string }) {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  } satisfies WalletTransaction;
}

function normalizeWallet(record: {
  userId: string;
  balance?: number;
  transactions?: Array<{
    type: "deposit" | "withdraw" | "debit" | "credit";
    amount: number;
    description: string;
    orderId?: string;
    createdAt?: string | Date;
  }>;
}): Wallet {
  return {
    userId: record.userId,
    balance: Number(record.balance ?? 0),
    transactions: (record.transactions ?? []).map((transaction) => ({
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      orderId: transaction.orderId,
      createdAt:
        typeof transaction.createdAt === "string"
          ? transaction.createdAt
          : new Date(transaction.createdAt ?? Date.now()).toISOString(),
    })),
  };
}

function getMemoryWalletStore() {
  if (!memoryWallets) {
    memoryWallets = users.map((user) => ({
      userId: user.id,
      balance: getInitialWalletBalance(user.role),
      transactions: [],
    }));
  }

  return memoryWallets;
}

function getMemoryWalletByUserId(userId: string) {
  const walletStore = getMemoryWalletStore();
  let wallet = walletStore.find((candidate) => candidate.userId === userId);

  if (!wallet) {
    const user = users.find((candidate) => candidate.id === userId);
    wallet = {
      userId,
      balance: getInitialWalletBalance(user?.role ?? "buyer"),
      transactions: [],
    };
    walletStore.push(wallet);
  }

  return wallet;
}

async function getUserRole(userId: string, session?: mongoose.ClientSession) {
  if (!hasDatabase()) {
    return users.find((candidate) => candidate.id === userId)?.role ?? "buyer";
  }

  const user = await UserModel.findOne({ id: userId }, { role: 1, _id: 0 }, { session }).lean();
  return (user?.role as Role | undefined) ?? "buyer";
}

async function ensureMongoWallet(userId: string, session?: mongoose.ClientSession) {
  const role = await getUserRole(userId, session);

  await WalletModel.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        balance: getInitialWalletBalance(role),
        transactions: [],
      },
    },
    { upsert: true, session },
  );

  return WalletModel.findOne({ userId }, null, { session });
}

async function getProductsForOrder(
  items: Array<{ productId: string; quantity: number }>,
  session?: mongoose.ClientSession,
) {
  const productIds = items.map((item) => item.productId);

  if (!hasDatabase()) {
    const selected = products.filter((product) => productIds.includes(product.id));
    return selected;
  }

  const records = (await ProductModel.find(
    { id: { $in: productIds } },
    null,
    { session },
  ).lean()) as ProductRecord[];

  return records.map((record) => ({
    ...record,
    harvestDate:
      typeof record.harvestDate === "string"
        ? record.harvestDate
        : new Date(record.harvestDate ?? Date.now()).toISOString(),
  })) as Product[];
}

async function getFarmerUserIdMap(
  farmerIds: string[],
  session?: mongoose.ClientSession,
) {
  if (!hasDatabase()) {
    return new Map(
      farmers
        .filter((farmer) => farmerIds.includes(farmer.id) && farmer.userId)
        .map((farmer) => [farmer.id, farmer.userId as string]),
    );
  }

  const records = await FarmerModel.find(
    { id: { $in: farmerIds } },
    { id: 1, userId: 1, _id: 0 },
    { session },
  ).lean();

  return new Map(
    records
      .filter((farmer) => typeof farmer.userId === "string" && typeof farmer.id === "string")
      .map((farmer) => [String(farmer.id), String(farmer.userId)]),
  );
}

function buildOrderObject(
  payload: WalletOrderPayload,
  mappedItems: Order["items"],
  totalSummary: ReturnType<typeof calculateOrderSummary>,
) {
  return {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    userId: payload.userId,
    items: mappedItems,
    ...totalSummary,
    paymentMode: "Wallet" as const,
    status: "Processing" as const,
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
  } satisfies Order;
}

function mapOrderItemsWithSellers(
  items: Array<{ productId: string; quantity: number }>,
  catalog: Product[],
  farmerUserIdMap: Map<string, string>,
) {
  const productMap = new Map(catalog.map((product) => [product.id, product]));
  const sellerCredits = new Map<string, number>();

  const mappedItems = items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error("One or more products are no longer available.");
    }

    const sellerUserId = farmerUserIdMap.get(product.farmerId);

    if (!sellerUserId) {
      throw new Error(`Seller wallet is not configured for ${product.farmerName}.`);
    }

    const lineAmount = product.price * item.quantity;
    sellerCredits.set(sellerUserId, (sellerCredits.get(sellerUserId) ?? 0) + lineAmount);

    return {
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
    };
  });

  return { mappedItems, sellerCredits };
}

export async function getWalletByUserId(userId: string) {
  if (!hasDatabase()) {
    return normalizeWallet(getMemoryWalletByUserId(userId));
  }

  await connectToDatabase();
  await ensureSeedData();
  const wallet = await ensureMongoWallet(userId);

  if (!wallet) {
    throw new Error("Wallet could not be created.");
  }

  return normalizeWallet(wallet.toObject());
}

export async function depositToWallet(userId: string, amount: number) {
  if (!hasDatabase()) {
    const wallet = getMemoryWalletByUserId(userId);
    wallet.balance += amount;
    wallet.transactions.unshift(
      buildTransaction({
        type: "deposit",
        amount,
        description: "Wallet deposit added.",
      }),
    );

    return normalizeWallet(wallet);
  }

  await connectToDatabase();
  await ensureSeedData();
  const wallet = await ensureMongoWallet(userId);

  if (!wallet) {
    throw new Error("Wallet could not be created.");
  }

  wallet.balance += amount;
  wallet.transactions.unshift(
    buildTransaction({
      type: "deposit",
      amount,
      description: "Wallet deposit added.",
    }),
  );
  await wallet.save();

  return normalizeWallet(wallet.toObject());
}

export async function withdrawFromWallet(userId: string, amount: number) {
  if (!hasDatabase()) {
    const wallet = getMemoryWalletByUserId(userId);

    if (wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    wallet.balance -= amount;
    wallet.transactions.unshift(
      buildTransaction({
        type: "withdraw",
        amount,
        description: "Wallet withdrawal processed.",
      }),
    );

    return normalizeWallet(wallet);
  }

  await connectToDatabase();
  await ensureSeedData();
  const wallet = await ensureMongoWallet(userId);

  if (!wallet) {
    throw new Error("Wallet could not be created.");
  }

  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance -= amount;
  wallet.transactions.unshift(
    buildTransaction({
      type: "withdraw",
      amount,
      description: "Wallet withdrawal processed.",
    }),
  );
  await wallet.save();

  return normalizeWallet(wallet.toObject());
}

export async function placeWalletOrder(payload: WalletOrderPayload) {
  const summary = calculateOrderSummary(payload.items, payload.couponCode);

  if (!hasDatabase()) {
    const buyerWallet = getMemoryWalletByUserId(payload.userId);
    const orderProducts = await getProductsForOrder(payload.items);
    const farmerUserIdMap = await getFarmerUserIdMap(orderProducts.map((product) => product.farmerId));
    const { mappedItems, sellerCredits } = mapOrderItemsWithSellers(payload.items, orderProducts, farmerUserIdMap);

    if (buyerWallet.balance < summary.total) {
      throw new Error("Insufficient wallet balance");
    }

    const order = buildOrderObject(payload, mappedItems, summary);
    buyerWallet.balance -= summary.total;
    buyerWallet.transactions.unshift(
      buildTransaction({
        type: "debit",
        amount: summary.total,
        description: `Order payment for ${order.id}.`,
        orderId: order.id,
      }),
    );

    sellerCredits.forEach((amount, sellerUserId) => {
      const sellerWallet = getMemoryWalletByUserId(sellerUserId);
      sellerWallet.balance += amount;
      sellerWallet.transactions.unshift(
        buildTransaction({
          type: "credit",
          amount,
          description: `Sale credited for ${order.id}.`,
          orderId: order.id,
        }),
      );
    });

    orders.unshift(order);
    return order;
  }

  await connectToDatabase();
  await ensureSeedData();
  const dbSession = await mongoose.startSession();

  try {
    let createdOrder: Order | null = null;

    await dbSession.withTransaction(async () => {
      const orderProducts = await getProductsForOrder(payload.items, dbSession);
      const farmerUserIdMap = await getFarmerUserIdMap(
        orderProducts.map((product) => product.farmerId),
        dbSession,
      );
      const { mappedItems, sellerCredits } = mapOrderItemsWithSellers(
        payload.items,
        orderProducts,
        farmerUserIdMap,
      );

      const buyerWallet = await ensureMongoWallet(payload.userId, dbSession);

      if (!buyerWallet) {
        throw new Error("Buyer wallet could not be created.");
      }

      if (buyerWallet.balance < summary.total) {
        throw new Error("Insufficient wallet balance");
      }

      const order = buildOrderObject(payload, mappedItems, summary);

      buyerWallet.balance -= summary.total;
      buyerWallet.transactions.unshift(
        buildTransaction({
          type: "debit",
          amount: summary.total,
          description: `Order payment for ${order.id}.`,
          orderId: order.id,
        }),
      );
      await buyerWallet.save({ session: dbSession });

      for (const [sellerUserId, amount] of sellerCredits.entries()) {
        const sellerWallet = await ensureMongoWallet(sellerUserId, dbSession);

        if (!sellerWallet) {
          throw new Error("Seller wallet could not be created.");
        }

        sellerWallet.balance += amount;
        sellerWallet.transactions.unshift(
          buildTransaction({
            type: "credit",
            amount,
            description: `Sale credited for ${order.id}.`,
            orderId: order.id,
          }),
        );
        await sellerWallet.save({ session: dbSession });
      }

      const [orderDoc] = await OrderModel.create(
        [
          {
            ...order,
            placedAt: new Date(order.placedAt),
            estimatedDelivery: new Date(order.estimatedDelivery),
          },
        ],
        { session: dbSession },
      );

      createdOrder = {
        ...order,
        placedAt: new Date(orderDoc.placedAt ?? order.placedAt).toISOString(),
        estimatedDelivery: new Date(
          orderDoc.estimatedDelivery ?? order.estimatedDelivery,
        ).toISOString(),
      };
    });

    if (!createdOrder) {
      throw new Error("Order could not be created.");
    }

    return createdOrder;
  } finally {
    await dbSession.endSession();
  }
}
