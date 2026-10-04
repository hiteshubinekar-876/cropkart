import { NextRequest, NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/services/catalog";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchSuggestions(query);

  return NextResponse.json({ results });
}
