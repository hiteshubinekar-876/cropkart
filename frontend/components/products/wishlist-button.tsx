"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/hooks/use-wishlist-store";
import { cn } from "@/utils/cn";

type WishlistButtonProps = {
  productId: string;
  className?: string;
};

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { ids, toggleWishlist } = useWishlistStore();
  const active = ids.includes(productId);

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-white",
        active && "border-rose-200 bg-rose-50 text-rose-600",
        className,
      )}
      aria-label="Toggle wishlist"
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}
