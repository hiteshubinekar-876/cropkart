import Link from "next/link";
import { Clock3, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { WishlistButton } from "@/components/products/wishlist-button";
import { ProductVisual } from "@/components/shared/product-visual";
import { RatingStars } from "@/components/shared/rating-stars";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const discount = Math.max(
    Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100),
    0,
  );

  return (
    <article className="surface-card overflow-hidden p-4" data-product-name={product.name}>
      <div className="relative">
        <Link href={`/products/${product.slug}`}>
          <ProductVisual
            title={product.name}
            subtitle={product.unit}
            palette={product.images[0] ?? product.color}
            className="h-52"
          />
        </Link>
        <WishlistButton productId={product.id} className="absolute right-4 top-4" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/products/${product.slug}`} className="font-bold leading-6 text-ink-900">
              {product.name}
            </Link>
            <RatingStars rating={product.rating} />
          </div>
          <p className="text-sm text-ink-500">
            from {product.farmerName}, {product.state}
          </p>
          <div className="flex flex-wrap gap-2">
              {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-xl bg-brand-50 px-3 py-1 text-xs font-semibold text-ink-500">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-ink-900">{formatCurrency(product.price)}</p>
            <p className="text-xs text-ink-400 line-through">
              {formatCurrency(product.originalPrice)}
            </p>
          </div>
          <p className="rounded-xl bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            {discount}% off
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-50/60 p-3 text-xs text-ink-500">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5" />
            {product.deliveryTime}
          </div>
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" />
            {product.reviewCount}+ reviews
          </div>
        </div>

        <AddToCartButton productId={product.id} className="w-full" />
      </div>
    </article>
  );
}
