"use client";

import { CheckCircle2, X } from "lucide-react";
import { useCartToastStore } from "@/hooks/use-cart-toast-store";
import { cn } from "@/utils/cn";

export function CartToast() {
  const { toast, hideToast } = useCartToastStore();

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex justify-center sm:justify-end">
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-300",
          toast.visible
            ? "translate-y-0 opacity-100 sm:translate-x-0"
            : "translate-y-3 opacity-0 sm:translate-x-4 sm:translate-y-0",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">{toast.title}</p>
          {toast.detail ? (
            <p className="mt-1 text-sm text-ink-500">{toast.detail}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={hideToast}
          className="rounded-full p-1 text-ink-400 transition hover:bg-slate-100 hover:text-ink-700"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
