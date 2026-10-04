import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { productStockUpdateSchema } from "@/lib/schemas";
import { ensureSeedData } from "@/lib/services/seed";
import { ProductModel } from "@/models/Product";

type FarmerProductRouteProps = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedProduct(productId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Please sign in first.", status: 401 as const };
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return { error: "Seller access only.", status: 403 as const };
  }

  const connection = await connectToDatabase();

  if (!connection) {
    return {
      error: "MongoDB is not configured. Add MONGODB_URI to enable product updates.",
      status: 500 as const,
    };
  }

  await ensureSeedData();

  const existingProduct = await ProductModel.findOne({ id: productId });

  if (!existingProduct) {
    return { error: "Product not found.", status: 404 as const };
  }

  if (session.user.role !== "admin" && existingProduct.farmerId !== session.user.farmerId) {
    return { error: "You can only manage your own products.", status: 403 as const };
  }

  return { session, product: existingProduct };
}

export async function PATCH(request: NextRequest, { params }: FarmerProductRouteProps) {
  const { id } = await params;
  const body = await request.json();
  const parsed = productStockUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid stock quantity.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const authorized = await getAuthorizedProduct(id);

  if ("error" in authorized) {
    const errorMessage =
      authorized.status === 500
        ? "MongoDB is not configured. Add MONGODB_URI to enable stock updates."
        : authorized.error;
    return NextResponse.json({ error: errorMessage }, { status: authorized.status });
  }

  const existingProduct = authorized.product;
  existingProduct.stock = parsed.data.stock;
  await existingProduct.save();

  return NextResponse.json({
    message: "Stock updated successfully.",
    product: {
      ...existingProduct.toObject(),
      harvestDate: existingProduct.harvestDate?.toISOString?.() ?? new Date().toISOString(),
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: FarmerProductRouteProps) {
  const { id } = await params;
  const authorized = await getAuthorizedProduct(id);

  if ("error" in authorized) {
    const errorMessage =
      authorized.status === 500
        ? "MongoDB is not configured. Add MONGODB_URI to enable product removal."
        : authorized.error;
    return NextResponse.json({ error: errorMessage }, { status: authorized.status });
  }

  await authorized.product.deleteOne();

  return NextResponse.json({ message: "Product removed successfully." });
}
