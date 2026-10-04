import { addDays } from "date-fns";
import {
  adminMetrics,
  farmerSalesMetrics,
  mandiRatesFallback,
  products,
} from "@/lib/mock-data";
import { getMandiRates, getWeatherInsights } from "@/lib/datagov";
import { formatCurrency } from "@/utils/format";

export async function getHomePageData() {
  const [mandiRates, weatherInsights] = await Promise.all([
    getMandiRates(),
    getWeatherInsights(),
  ]);

  return {
    mandiRates,
    weatherInsights,
    stats: [
      { label: "Verified farmers", value: "1,200+" },
      { label: "Cities served", value: "85" },
      { label: "Fresh orders delivered", value: "2.1L" },
      { label: "Avg. savings vs retail", value: "18%" },
    ],
  };
}

export async function getFarmerDashboardData() {
  const mandiRates = await getMandiRates();

  return {
    metrics: farmerSalesMetrics,
    pricingSuggestions: products.slice(0, 3).map((product, index) => ({
      productName: product.name,
      currentPrice: formatCurrency(product.price),
      mandiSignal: `${mandiRates[index]?.commodity ?? "Crop"} market up ${4 + index}%`,
      recommendation:
        index === 0
          ? "Maintain premium pricing for the next 3 days."
          : index === 1
            ? "Increase by 3-5% to match supply compression."
            : "Bundle with related SKUs to lift basket size.",
    })),
    orderPipeline: [
      { stage: "New", count: 12 },
      { stage: "Packed", count: 8 },
      { stage: "Dispatched", count: 6 },
      { stage: "Delivered", count: 74 },
    ],
  };
}

export async function getAdminDashboardData() {
  return {
    metrics: adminMetrics,
    platformHighlights: [
      "Demand for organic staples rose 22% week-on-week.",
      "Maharashtra and Karnataka are driving 48% of marketplace GMV.",
      "Average ticket size is highest among retailer accounts this month.",
    ],
    reviewsQueue: [
      { seller: "Sahyadri Growers", status: "Pending GST validation" },
      { seller: "Rural Dairy Cluster", status: "Awaiting bank proof" },
      { seller: "Kolar Fresh Mart", status: "Address verification in progress" },
    ],
  };
}

export function getCropInsights() {
  return [
    {
      title: "Harvest planning",
      value: "3 day window",
      note: "Favour early morning dispatches for leafy crops to preserve shelf life.",
    },
    {
      title: "Price movement",
      value: "+8%",
      note: "Onion modal prices are firming up across western mandis.",
    },
    {
      title: "Scheme spotlight",
      value: "FPO support",
      note: "Promote cold-chain and grading support for farmer groups entering B2B.",
    },
    {
      title: "Dispatch rhythm",
      value: addDays(new Date(), 2).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      note: "Plan next replenishment before the weekend demand spike.",
    },
  ];
}

export function getMarketPulseTable() {
  return mandiRatesFallback;
}
