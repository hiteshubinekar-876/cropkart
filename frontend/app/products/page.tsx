import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/products/product-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { getCategories, getProducts, getStates } from "@/lib/services/catalog";

type ProductsPageProps = {
  searchParams: {
    search?: string;
    category?: string;
    state?: string;
    rating?: string;
    sort?: string;
  };
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [productList, categoryList, states] = await Promise.all([
    getProducts(searchParams),
    getCategories(),
    getStates(),
  ]);

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <SectionHeading
          eyebrow="Marketplace"
          title="Browse fresh produce, seeds, pesticides and fertilisers"
          description="A wider and cleaner catalog with sharper cards, simpler filters and cleaner product imagery."
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="surface-card h-fit p-6">
            <p className="text-lg font-extrabold">Filters</p>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm font-bold text-ink-700">Category</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryList.map((category) => (
                    <a
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="rounded-xl border border-brand-100 px-3 py-2 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:bg-brand-50"
                    >
                      {category.name}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-ink-700">State</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {states.map((state) => (
                    <a
                      key={state}
                      href={`/products?state=${encodeURIComponent(state)}`}
                      className="rounded-xl border border-brand-100 px-3 py-2 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:bg-brand-50"
                    >
                      {state}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-ink-700">Sorting</p>
                <div className="mt-3 grid gap-2">
                  <a href="/products?sort=price-asc" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink-600">
                    Price: Low to High
                  </a>
                  <a href="/products?sort=price-desc" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink-600">
                    Price: High to Low
                  </a>
                  <a href="/products?sort=popularity" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink-600">
                    Popularity
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
                Tip: combine `category`, `state`, `rating`, and `sort` query params for shareable filter URLs.
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                Showing {productList.length} products
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="/products?rating=4.5" className="rounded-xl border border-brand-100 px-3 py-2 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:bg-brand-50">
                  4.5+ rating
                </a>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {productList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
