import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  PackagePlus,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ProductCard } from "@/components/products/product-card";
import { ProductVisual } from "@/components/shared/product-visual";
import { SectionHeading } from "@/components/shared/section-heading";
import {
  getCategories,
  getFarmers,
  getFeaturedProducts,
  getTrendingProducts,
} from "@/lib/services/catalog";
import { MandiRatesPanel } from "@/components/home/mandi-rates-panel";
import { getCropInsights, getHomePageData } from "@/lib/services/dashboard";

const categoryVisuals: Record<string, string> = {
  fruits: "/images/photos/mangoes.jpg",
  vegetables: "/images/photos/vegetable-market.jpg",
  grains: "/images/photos/rice-grains.jpg",
  dairy: "/images/photos/dairy-milk.jpg",
  seeds: "/images/photos/seedlings.jpg",
  fertilisers: "/images/photos/farm-landscape.jpg",
  "crop-care": "/images/photos/farm-landscape.jpg",
};

const benefitCards = [
  {
    title: "Daily groceries",
    copy: "Fruits, vegetables, grains, dairy and kitchen staples in a simpler layout.",
    icon: Sprout,
  },
  {
    title: "Agri inputs too",
    copy: "Browse seeds, fertilisers and crop care products from the same catalog.",
    icon: PackagePlus,
  },
  {
    title: "Farmer-first supply",
    copy: "New user registration and add-product flows are ready for Mongo-backed use.",
    icon: ShieldCheck,
  },
];

export default async function HomePage() {
  const [featuredProducts, trendingProducts, categoryList, homeData, farmers] = await Promise.all([
    getFeaturedProducts(),
    getTrendingProducts(),
    getCategories(),
    getHomePageData(),
    getFarmers(),
  ]);

  const cropInsights = getCropInsights();

  return (
    <>
      <Navbar />
      <main className="pb-8">
        <section className="pt-6">
          <HeroSlideshow />
        </section>

        <section className="shell -mt-12 relative z-10">
          <div className="surface-card p-6 sm:p-8">
            <span className="tag-pill">CropKart marketplace</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-emerald-950 sm:text-5xl">
              Fresh produce and agri supplies with a cleaner, wider storefront.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink-600">
              
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="primary-button">
                Explore products
              </Link>
              <Link href="/sell-on-greencart" className="secondary-button">
                Sell on CropKart
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {benefitCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.title} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                    <Icon className="h-5 w-5 text-brand-700" />
                    <p className="mt-3 text-lg font-bold text-emerald-950">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-600">{card.copy}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {homeData.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-brand-100 bg-white p-4">
                  <p className="text-2xl font-extrabold text-emerald-950">{stat.value}</p>
                  <p className="mt-1 text-sm text-ink-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="shell mt-16">
          <SectionHeading
            eyebrow="Shop by category"
            title="From daily fresh produce to crop care essentials"
            description="The catalog now includes fruits, vegetables, grains, dairy, seeds, fertilisers and crop care products."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categoryList.map((category) => (
              <Link key={category.id} href={`/products?category=${category.slug}`} className="block">
                <ProductVisual
                  title={category.name}
                  subtitle={category.description}
                  palette={categoryVisuals[category.slug] ?? category.accent}
                  className="h-60"
                  showText
                />
              </Link>
            ))}
          </div>
        </section>

        <section className="shell mt-16">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <SectionHeading
                eyebrow="Trending now"
                title="Popular picks for homes, retailers and growers"
                description="Fast-moving produce and agri essentials customers are buying right now."
              />
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {trendingProducts.slice(0, 6).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="surface-card p-6">
                <SectionHeading
                  eyebrow="Bulk and seller links"
                  title="Built for faster B2B and farmer onboarding"
                  description="Use the new top links to open seller, bulk enquiry and contact pages."
                />
                <div className="mt-6 grid gap-3">
                  <Link href="/sell-on-greencart" className="secondary-button justify-between">
                    Sell on GreenCart
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/bulk-order-enquiry" className="secondary-button justify-between">
                    Bulk Order Enquiry
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact-us" className="secondary-button justify-between">
                    Contact Us
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="surface-card p-6">
                <div className="flex items-center gap-3">
                  <CloudSun className="h-5 w-5 text-brand-700" />
                  <p className="text-xl font-extrabold text-emerald-950">Weather and crop notes</p>
                </div>
                <div className="mt-5 grid gap-4">
                  {homeData.weatherInsights.map((insight) => (
                    <div key={insight.title} className="rounded-2xl bg-brand-50/60 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <p className="font-bold">{insight.title}</p>
                        <p className="text-2xl font-extrabold text-brand-700">{insight.value}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-600">{insight.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="shell mt-16">
          <SectionHeading
            eyebrow="Featured catalog"
            title="More products for homes, retailers and repeat buyers"
            description="The marketplace now blends grocery-style shopping with farm input discovery."
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="shell mt-16">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
            <MandiRatesPanel rates={homeData.mandiRates} />

            <div className="surface-card p-6">
              <p className="text-xl font-extrabold text-emerald-950">Quick crop info</p>
              <div className="mt-5 grid gap-3">
                {cropInsights.map((insight) => (
                  <div key={insight.title} className="rounded-2xl bg-brand-50/60 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-400">
                      {insight.title}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold">{insight.value}</p>
                    <p className="mt-1 text-sm text-ink-600">{insight.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card p-6">
              <p className="text-xl font-extrabold text-emerald-950">Farmer partners</p>
              <div className="mt-5 space-y-3">
                {farmers.slice(0, 3).map((farmer) => (
                  <div key={farmer.id} className="rounded-2xl border border-brand-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{farmer.farmName}</p>
                        <p className="text-sm text-ink-500">
                          {farmer.name} · {farmer.district} {farmer.state}
                        </p>
                      </div>
                      <span className="tag-pill">{farmer.rating.toFixed(1)} rating</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {farmer.speciality.map((item) => (
                        <span key={item} className="rounded-xl bg-brand-50 px-3 py-1 text-xs font-medium text-ink-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="shell mt-16">
          <div className="surface-card flex flex-col items-start justify-between gap-6 bg-brand-50 p-8 lg:flex-row lg:items-center">
            <div>
              <p className="font-serif text-3xl font-bold text-emerald-950">
                Need bulk supply or want to onboard your farm?
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">
                Use the new enquiry pages or jump into the farmer dashboard to add products directly into the catalog.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/bulk-order-enquiry" className="primary-button">
                Bulk Order Enquiry
              </Link>
              <Link href="/farmer/dashboard" className="secondary-button">
                Open Farmer Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
