"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/hooks/use-cart-store";
import { useCartToastStore } from "@/hooks/use-cart-toast-store";
import { products } from "@/lib/mock-data";
import { cn } from "@/utils/cn";

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  buyNow?: boolean;
  className?: string;
};

export function AddToCartButton({
  productId,
  quantity = 1,
  buyNow = false,
  className,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { showToast } = useCartToastStore();
  const [added, setAdded] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productName = products.find((product) => product.id === productId)?.name;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        addItem(productId, quantity);

        if (!buyNow) {
          setAdded(true);
          showToast("Added to cart", productName ?? "Your selected item is now in the cart.");

          if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
          }

          resetTimerRef.current = setTimeout(() => {
            setAdded(false);
          }, 1400);
        }

        if (buyNow) {
          router.push("/checkout");
        }
      }}
      className={cn(
        buyNow ? "primary-button" : "secondary-button",
        "gap-2 rounded-2xl transform-gpu transition-all duration-300",
        !buyNow &&
          added &&
          "scale-[1.02] border-emerald-600 bg-emerald-600 text-white shadow-[0_14px_30px_rgba(22,163,74,0.25)] hover:bg-emerald-600 hover:text-white",
        className,
      )}
      aria-label={buyNow ? "Buy now" : added ? "Added to cart" : "Add to cart"}
    >
      {added && !buyNow ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <ShoppingBag className="h-4 w-4" />
      )}
      {buyNow ? "Buy now" : added ? "Added" : "Add to cart"}
    </button>
  );
}
