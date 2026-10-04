"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/utils/cn";

type Suggestion = {
  id: string;
  slug: string;
  label: string;
  category: string;
  farmerName: string;
};

type SearchBarProps = {
  className?: string;
};

export function SearchBar({ className }: SearchBarProps) {
  const { dictionary } = useI18n();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const debounced = useDebouncedValue(value, 250);

  useEffect(() => {
    async function load() {
      if (!debounced.trim()) {
        setResults([]);
        return;
      }

      const response = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      const data = (await response.json()) as { results: Suggestion[] };
      setResults(data.results);
    }

    void load();
  }, [debounced]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={dictionary.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
      </div>

      {results.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 rounded-2xl border border-brand-100 bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Sparkles className="h-3.5 w-3.5" />
            Live suggestions
          </div>
          <div className="space-y-1">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/products/${result.slug}`}
                className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-brand-50"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-800">{result.label}</p>
                  <p className="text-xs text-ink-500">
                    {result.category} by {result.farmerName}
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand-600">View</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
