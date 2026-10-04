import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Truck, ShieldCheck, Store } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { ProductCard } from "@/components/products/product-card";
import { WishlistButton } from "@/components/products/wishlist-button";
import { RatingStars } from "@/components/shared/rating-stars";
import { ProductVisual } from "@/components/shared/product-visual";
import {
  getFarmerById,
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
} from "@/lib/services/catalog";
import { formatCurrency, formatDate } from "@/utils/format";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [reviews, relatedProducts, farmer] = await Promise.all([
    getProductReviews(product.id),
    getRelatedProducts(product),
    getFarmerById(product.farmerId),
  ]);
  const categoryLabel = product.category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-4" data-product-name={product.name} data-product-focus="true">
            <ProductVisual
              title={product.name}
              subtitle={product.description}
              palette={product.images[0]}
              className="h-[420px]"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {product.images.map((image, index) => (
                <ProductVisual
                  key={`${product.id}-${index}`}
                  title={`View ${index + 1}`}
                  subtitle={product.unit}
                  palette={image}
                  className="h-36"
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="tag-pill">{categoryLabel}</span>
                {product.organic ? <span className="tag-pill bg-brand-50">Organic</span> : null}
                <RatingStars rating={product.rating} />
              </div>
              <h1 className="mt-5 text-4xl font-extrabold">{product.name}</h1>
              <p className="mt-4 text-base leading-7 text-ink-600">{product.description}</p>
              <div className="mt-6 flex items-end gap-4">
                <p className="text-4xl font-extrabold">{formatCurrency(product.price)}</p>
                <p className="pb-1 text-sm text-ink-400 line-through">
                  {formatCurrency(product.originalPrice)}
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">Unit</p>
                  <p className="mt-2 font-bold">{product.unit}</p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">Harvested</p>
                  <p className="mt-2 font-bold">{formatDate(product.harvestDate)}</p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">Delivery</p>
                  <p className="mt-2 font-bold">{product.deliveryTime}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <AddToCartButton productId={product.id} className="rounded-2xl" />
                <AddToCartButton productId={product.id} buyNow className="rounded-2xl" />
                <WishlistButton productId={product.id} />
              </div>
            </div>

            <div className="surface-card p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <Truck className="h-4 w-4 text-brand-600" />
                  <p className="mt-3 font-bold">Fast dispatch</p>
                  <p className="mt-2 text-sm text-ink-500">{product.deliveryTime}</p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  <p className="mt-3 font-bold">Quality checks</p>
                  <p className="mt-2 text-sm text-ink-500">Seller verified and admin reviewed.</p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <Store className="h-4 w-4 text-brand-600" />
                  <p className="mt-3 font-bold">Seller details</p>
                  <p className="mt-2 text-sm text-ink-500">
                    {farmer?.farmName ?? product.farmerName} | {product.state}
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card p-6">
              <p className="text-xl font-extrabold">Seller information</p>
              <p className="mt-4 text-sm leading-6 text-ink-600">
                {farmer?.farmName ?? product.farmerName} is a verified seller with a
                {` ${farmer?.rating.toFixed(1) ?? product.rating.toFixed(1)} `}
                rating, based in {farmer?.district ?? product.state}. Typical response
                time is {farmer?.responseTime ?? "within the same day"}.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">Reviews</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="surface-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{review.userName}</p>
                  <RatingStars rating={review.rating} />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-600">{review.comment}</p>
                <p className="mt-3 text-xs text-ink-400">{formatDate(review.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">Related products</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
