import { NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/services/dashboard";
import { farmers, orders, products, users } from "@/lib/mock-data";

export async function GET() {
  const dashboardData = await getAdminDashboardData();

  return NextResponse.json({
    metrics: dashboardData.metrics,
    platformHighlights: dashboardData.platformHighlights,
    reviewsQueue: dashboardData.reviewsQueue,
    totals: {
      users: users.length,
      farmers: farmers.length,
      products: products.length,
      orders: orders.length,
    },
  });
}
