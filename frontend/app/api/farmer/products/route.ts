import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getFarmerProducts } from "@/lib/services/catalog";
import { farmerProductSchema } from "@/lib/schemas";
import { ensureSeedData } from "@/lib/services/seed";
import { ProductModel } from "@/models/Product";
import { slugify } from "@/utils/format";

const DEFAULT_FARMER_ID = "farmer-1";
const DEFAULT_FARMER_NAME = "Rakesh Kumar";

function getValidationMessage(fieldErrors: Record<string, string[] | undefined>) {
  const firstEntry = Object.entries(fieldErrors).find(([, messages]) => messages?.length);

  if (!firstEntry) {
    return "Product payload is invalid";
  }

  return firstEntry[1]?.[0] ?? "Product payload is invalid";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const farmerId =
    request.nextUrl.searchParams.get("farmerId") ??
    session?.user?.farmerId ??
    DEFAULT_FARMER_ID;
  const products = await getFarmerProducts(farmerId);
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Seller access only." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = farmerProductSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();

    return NextResponse.json(
      {
        error: getValidationMessage(flattened.fieldErrors),
        issues: flattened,
      },
      { status: 400 },
    );
  }

  const connection = await connectToDatabase();

  if (!connection) {
    return NextResponse.json(
      { error: "MongoDB is not configured. Add MONGODB_URI to enable product creation." },
      { status: 500 },
    );
  }

  await ensureSeedData();

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let suffix = 1;

  while (await ProductModel.exists({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const product = await ProductModel.create({
    id: `prod-${Date.now().toString(36)}`,
    slug,
    name: parsed.data.name,
    farmerId: session.user.farmerId ?? parsed.data.farmerId ?? DEFAULT_FARMER_ID,
    farmerName: session.user.name ?? parsed.data.farmerName ?? DEFAULT_FARMER_NAME,
    category: parsed.data.category,
    state: parsed.data.state,
    description: parsed.data.description,
    tags: parsed.data.tags ?? ["New arrival"],
    unit: parsed.data.unit,
    stock: parsed.data.stock,
    organic: parsed.data.organic,
    price: parsed.data.price,
    originalPrice: parsed.data.originalPrice > 0 ? parsed.data.originalPrice : parsed.data.price,
    deliveryTime: parsed.data.deliveryTime ?? "2-4 days",
    rating: 0,
    reviewCount: 0,
    images:
      parsed.data.images ?? ["/images/photos/farm-landscape.jpg"],
    color: parsed.data.organic ? "from-green-100 to-emerald-50" : "from-lime-100 to-white",
    harvestDate: new Date(),
    featured: false,
    trending: true,
  });

  return NextResponse.json(
    {
      message: "Product added to GreenCart successfully.",
      product: {
        ...product.toObject(),
        harvestDate: product.harvestDate?.toISOString?.() ?? new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
