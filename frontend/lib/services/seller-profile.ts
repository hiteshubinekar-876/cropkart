import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { farmers, users } from "@/lib/mock-data";
import { FarmerModel } from "@/models/Farmer";
import { UserModel } from "@/models/User";
import { ensureSeedData } from "@/lib/services/seed";
import type { SellerProfile } from "@/lib/types";

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

function buildFallbackLocation(location?: string, district?: string, state?: string) {
  if (location?.trim()) {
    return location.trim();
  }

  return [district, state].filter(Boolean).join(" ").trim();
}

export async function getSellerProfileByUserId(userId: string) {
  if (!hasDatabase()) {
    const user = users.find((candidate) => candidate.id === userId);
    const farmer = farmers.find((candidate) => candidate.userId === userId);

    if (!user || !farmer) {
      return null;
    }

    return {
      farmerId: farmer.id,
      userId,
      shopName: farmer.shopName ?? farmer.farmName,
      shopLocation: buildFallbackLocation(farmer.shopLocation, farmer.district, farmer.state),
      phone: farmer.phone ?? user.mobile,
    } satisfies SellerProfile;
  }

  await connectToDatabase();
  await ensureSeedData();

  const [user, farmer] = await Promise.all([
    UserModel.findOne({ id: userId }).lean(),
    FarmerModel.findOne({ userId }).lean(),
  ]);

  if (!user || !farmer) {
    return null;
  }

  return {
    farmerId: String(farmer.id),
    userId,
    shopName: String(farmer.shopName ?? farmer.farmName ?? ""),
    shopLocation: buildFallbackLocation(
      typeof farmer.shopLocation === "string" ? farmer.shopLocation : undefined,
      typeof farmer.district === "string" ? farmer.district : undefined,
      typeof farmer.state === "string" ? farmer.state : undefined,
    ),
    phone: String(farmer.phone ?? user.mobile ?? ""),
  } satisfies SellerProfile;
}

export async function updateSellerProfileByUserId(
  userId: string,
  input: Omit<SellerProfile, "farmerId" | "userId">,
) {
  if (!hasDatabase()) {
    const user = users.find((candidate) => candidate.id === userId);
    const farmer = farmers.find((candidate) => candidate.userId === userId);

    if (!user || !farmer) {
      return null;
    }

    user.mobile = input.phone;
    farmer.shopName = input.shopName;
    farmer.shopLocation = input.shopLocation;
    farmer.phone = input.phone;
    farmer.farmName = input.shopName;

    return {
      farmerId: farmer.id,
      userId,
      ...input,
    } satisfies SellerProfile;
  }

  await connectToDatabase();
  await ensureSeedData();

  const [user, farmer] = await Promise.all([
    UserModel.findOneAndUpdate({ id: userId }, { $set: { mobile: input.phone } }, { new: true }).lean(),
    FarmerModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          shopName: input.shopName,
          shopLocation: input.shopLocation,
          phone: input.phone,
          farmName: input.shopName,
        },
      },
      { new: true },
    ).lean(),
  ]);

  if (!user || !farmer) {
    return null;
  }

  return {
    farmerId: String(farmer.id),
    userId,
    shopName: String(farmer.shopName ?? input.shopName),
    shopLocation: String(farmer.shopLocation ?? input.shopLocation),
    phone: String(farmer.phone ?? input.phone),
  } satisfies SellerProfile;
}
