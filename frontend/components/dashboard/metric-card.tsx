import { cn } from "@/utils/cn";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "neutral" | "warning";
};

export function MetricCard({
  label,
  value,
  change,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold">{value}</p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            tone === "positive" && "bg-brand-50 text-brand-700",
            tone === "neutral" && "bg-slate-100 text-ink-600",
            tone === "warning" && "bg-orange-50 text-orange-700",
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
