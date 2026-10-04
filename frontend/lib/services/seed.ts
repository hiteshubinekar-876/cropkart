import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { categories, farmers, orders, products, users } from "@/lib/mock-data";
import { CategoryModel } from "@/models/Category";
import { FarmerModel } from "@/models/Farmer";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { UserModel } from "@/models/User";
import { WalletModel } from "@/models/Wallet";

let seedPromise: Promise<void> | null = null;

function getInitialWalletBalance(role: "buyer" | "farmer" | "admin") {
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

async function seedMongoData() {
  await connectToDatabase();

  const hashedUsers = await Promise.all(
    users.map(async (user) => ({
      ...user,
      password: await hash(user.password, 10),
    })),
  );

  await CategoryModel.bulkWrite(
    categories.map((category) => ({
      updateOne: {
        filter: { id: category.id },
        update: { $setOnInsert: category },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await FarmerModel.bulkWrite(
    farmers.map((farmer) => ({
      updateOne: {
        filter: { id: farmer.id },
        update: {
          $setOnInsert: {
            ...farmer,
            shopName: farmer.shopName ?? farmer.farmName,
            shopLocation: farmer.shopLocation ?? [farmer.district, farmer.state].filter(Boolean).join(" "),
            phone: farmer.phone ?? "",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  for (const farmer of farmers) {
    await FarmerModel.updateOne(
      { id: farmer.id, userId: { $exists: false } },
      { $set: { userId: farmer.userId } },
    );
    await FarmerModel.updateOne(
      { id: farmer.id, shopName: { $exists: false } },
      { $set: { shopName: farmer.shopName ?? farmer.farmName } },
    );
    await FarmerModel.updateOne(
      { id: farmer.id, shopLocation: { $exists: false } },
      { $set: { shopLocation: farmer.shopLocation ?? [farmer.district, farmer.state].filter(Boolean).join(" ") } },
    );
    await FarmerModel.updateOne(
      { id: farmer.id, phone: { $exists: false } },
      { $set: { phone: farmer.phone ?? "" } },
    );
  }

  await ProductModel.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { id: product.id },
        update: {
          $setOnInsert: {
            ...product,
            harvestDate: new Date(product.harvestDate),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await UserModel.bulkWrite(
    hashedUsers.map((user) => ({
      updateOne: {
        filter: { id: user.id },
        update: { $setOnInsert: user },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await OrderModel.bulkWrite(
    orders.map((order) => ({
      updateOne: {
        filter: { id: order.id },
        update: {
          $setOnInsert: {
            ...order,
            placedAt: new Date(order.placedAt),
            estimatedDelivery: new Date(order.estimatedDelivery),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await WalletModel.bulkWrite(
    users.map((user) => ({
      updateOne: {
        filter: { userId: user.id },
        update: {
          $setOnInsert: {
            userId: user.id,
            balance: getInitialWalletBalance(user.role),
            transactions: [],
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = seedMongoData().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }

  await seedPromise;
}
