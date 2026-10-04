import { unstable_cache } from "next/cache";
import { env } from "@/lib/env";
import { mandiRatesFallback, weatherInsightsFallback } from "@/lib/mock-data";
import type { MandiRate, WeatherInsight } from "@/lib/types";

type DataGovRecord = Record<string, string>;

async function fetchDataGovResource(resourceId: string, limit = 10) {
  if (!env.dataGovApiKey || !resourceId) {
    return null;
  }

  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", env.dataGovApiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`data.gov.in request failed: ${response.status}`);
  }

  return (await response.json()) as { records?: DataGovRecord[] };
}

export const getMandiRates = unstable_cache(
  async (): Promise<MandiRate[]> => {
    try {
      const data = await fetchDataGovResource(env.mandiResourceId, 40);
      const records = data?.records ?? [];

      if (!records.length) {
        return mandiRatesFallback;
      }

      return records.map((record) => ({
        commodity:
          record.commodity ??
          record.Commodity ??
          record.crop ??
          "Crop",
        market: record.market ?? record.Market ?? "Mandi",
        state: record.state ?? record.State ?? "India",
        modalPrice: Number(record.modal_price ?? record.modalPrice ?? 0),
        minPrice: Number(record.min_price ?? record.minPrice ?? 0),
        maxPrice: Number(record.max_price ?? record.maxPrice ?? 0),
        arrivalDate:
          record.arrival_date ??
          record.Arrival_Date ??
          new Date().toISOString().slice(0, 10),
      }));
    } catch {
      return mandiRatesFallback;
    }
  },
  ["mandi-rates"],
  { revalidate: 1800 },
);

export const getWeatherInsights = unstable_cache(
  async (): Promise<WeatherInsight[]> => {
    try {
      const data = await fetchDataGovResource(env.rainfallResourceId, 3);
      const records = data?.records ?? [];

      if (!records.length) {
        return weatherInsightsFallback;
      }

      return records.slice(0, 3).map((record, index) => ({
        title:
          index === 0 ? "Rainfall watch" : index === 1 ? "Reservoir cue" : "Monsoon signal",
        value:
          record.amount ??
          record.rainfall ??
          record.value ??
          "Updated",
        note:
          record.district ??
          record.state ??
          record.region ??
          "Latest public agri-weather data from data.gov.in",
      }));
    } catch {
      return weatherInsightsFallback;
    }
  },
  ["weather-insights"],
  { revalidate: 1800 },
);
