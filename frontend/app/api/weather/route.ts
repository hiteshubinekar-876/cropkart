import { NextResponse } from "next/server";
import { getWeatherInsights } from "@/lib/datagov";

export async function GET() {
  const insights = await getWeatherInsights();
  return NextResponse.json({ insights });
}
