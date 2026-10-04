import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { registerSchema } from "@/lib/schemas";
import { ensureSeedData } from "@/lib/services/seed";
import { FarmerModel } from "@/models/Farmer";
import { UserModel } from "@/models/User";
import { WalletModel } from "@/models/Wallet";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the registration fields." },
      { status: 400 },
    );
  }

  const connection = await connectToDatabase();

  if (!connection) {
    return NextResponse.json(
      { error: "MongoDB is not configured. Add MONGODB_URI to enable registration." },
      { status: 500 },
    );
  }

  await ensureSeedData();

  const existingUser = await UserModel.findOne({
    $or: [
      { email: { $regex: `^${parsed.data.email}$`, $options: "i" } },
      { mobile: parsed.data.mobile },
    ],
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email or mobile already exists." },
      { status: 409 },
    );
  }

  const hashedPassword = await hash(parsed.data.password, 10);
  const idSuffix = Date.now().toString(36);
  const userId = `user-${idSuffix}`;
  const farmerId = parsed.data.role === "farmer" ? `farmer-${idSuffix}` : undefined;

  if (farmerId) {
    await FarmerModel.create({
      id: farmerId,
      userId,
      farmName: `${parsed.data.name.split(" ")[0]}'s Green Farm`,
      shopName: `${parsed.data.name.split(" ")[0]}'s Green Farm`,
      shopLocation: "Not shared yet",
      phone: parsed.data.mobile,
      state: "Not shared yet",
      district: "Not shared yet",
      rating: 0,
      verified: false,
      yearsActive: 0,
      speciality: ["New seller"],
      responseTime: "within the same day",
    });
  }

  await UserModel.create({
    id: userId,
    name: parsed.data.name,
    email: parsed.data.email,
    mobile: parsed.data.mobile,
    password: hashedPassword,
    role: parsed.data.role,
    avatar: parsed.data.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    farmerId,
    wishlist: [],
    addresses: [],
  });

  await WalletModel.create({
    userId,
    balance: parsed.data.role === "buyer" ? 15000 : 3000,
    transactions: [],
  });

  return NextResponse.json(
    {
      message: `${parsed.data.role === "farmer" ? "Farmer" : "Buyer"} account created successfully.`,
      user: {
        ...parsed.data,
        id: userId,
        farmerId,
      },
    },
    { status: 201 },
  );
}
