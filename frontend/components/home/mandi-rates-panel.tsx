"use client";

import { useMemo, useState } from "react";
import { BadgeIndianRupee, MapPin } from "lucide-react";
import type { MandiRate } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

type MandiRatesPanelProps = {
  rates: MandiRate[];
};

export function MandiRatesPanel({ rates }: MandiRatesPanelProps) {
  const states = useMemo(
    () => Array.from(new Set(rates.map((rate) => rate.state))).sort(),
    [rates],
  );
  const [selectedState, setSelectedState] = useState(states[0] ?? "All States");

  const visibleRates = useMemo(() => {
    if (!rates.length) {
      return [];
    }

    return rates
      .filter((rate) => rate.state === selectedState)
      .slice(0, 4);
  }, [rates, selectedState]);

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BadgeIndianRupee className="h-5 w-5 text-brand-700" />
          <div>
            <p className="text-xl font-extrabold text-emerald-950">Government mandi prices</p>
            <p className="mt-1 text-sm text-ink-500">
              Select a state to view more relevant mandi pricing.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-ink-600">
          <MapPin className="h-4 w-4 text-brand-700" />
          <select
            value={selectedState}
            onChange={(event) => setSelectedState(event.target.value)}
            className="bg-transparent font-medium outline-none"
          >
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {visibleRates.length ? (
          visibleRates.map((rate) => (
            <div key={`${rate.commodity}-${rate.market}`} className="rounded-2xl border border-brand-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold">{rate.commodity}</p>
                  <p className="mt-1 text-sm text-ink-500">
                    {rate.market}, {rate.state}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">Arrival date: 2026-05-06</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold">{formatCurrency(rate.modalPrice / 100)}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Min {formatCurrency(rate.minPrice / 100)} | Max {formatCurrency(rate.maxPrice / 100)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-sm text-ink-600">
            No mandi rates are available for the selected state right now.
          </div>
        )}
      </div>
    </section>
  );
}
