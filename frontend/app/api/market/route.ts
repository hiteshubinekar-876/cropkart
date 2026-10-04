import { NextResponse } from "next/server";
import { getMandiRates } from "@/lib/datagov";

export async function GET() {
  const rates = await getMandiRates();
  return NextResponse.json({ rates });
}
