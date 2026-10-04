import { NextResponse } from "next/server";
import { getProductById } from "@/lib/services/catalog";

type ProductByIdRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: ProductByIdRouteProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
