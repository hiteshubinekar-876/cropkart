import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/services/catalog";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const products = await getProducts({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    organic: searchParams.get("organic") ?? undefined,
    rating: searchParams.get("rating") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  return NextResponse.json({ products });
}
