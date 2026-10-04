import { getServerSession } from "next-auth";
import { FarmerAuctionManager } from "@/components/dashboard/farmer-auction-manager";
import { FarmerProductManager } from "@/components/dashboard/farmer-product-manager";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SellerDashboardNav } from "@/components/seller/seller-dashboard-nav";
import { authOptions } from "@/lib/auth";
import { getSellerAuctions } from "@/lib/services/auctions";
import { getFarmerProducts } from "@/lib/services/catalog";
import { getFarmerDashboardData } from "@/lib/services/dashboard";

export default async function FarmerDashboardPage() {
  const session = await getServerSession(authOptions);
  const farmerId = session?.user?.farmerId ?? "farmer-1";
  const sellerUserId = session?.user?.id ?? "user-2";
  const sellerName = session?.user?.name ?? "Rakesh Kumar";

  const [dashboardData, farmerProducts, sellerAuctions] = await Promise.all([
    getFarmerDashboardData(),
    getFarmerProducts(farmerId),
    getSellerAuctions(sellerUserId),
  ]);

  return (
    <>
      <Navbar />
      <main className="shell space-y-6 py-10">
        <SellerDashboardNav />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="tag-pill">Farmer dashboard</span>
            <h1 className="mt-4 text-4xl font-extrabold">Manage products, stock, orders, and pricing</h1>
            <p className="mt-3 max-w-3xl text-base text-ink-600">
              Seller workspace for catalog operations, Mongo-backed product creation, order flow and pricing guidance.
            </p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
            New products added here are saved to your CropKart catalog.
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {dashboardData.metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_1fr_0.9fr]">
          <FarmerProductManager
            initialProducts={farmerProducts}
            farmerId={farmerId}
            farmerName={sellerName}
          />
          <FarmerAuctionManager initialAuctions={sellerAuctions} />

          <div className="space-y-8">
            <section className="surface-card p-6">
              <p className="text-2xl font-extrabold">Pricing suggestions</p>
              <div className="mt-6 space-y-4">
                {dashboardData.pricingSuggestions.map((suggestion) => (
                  <div key={suggestion.productName} className="rounded-2xl bg-brand-50/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{suggestion.productName}</p>
                      <span className="text-sm font-bold text-brand-700">
                        {suggestion.currentPrice}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-600">{suggestion.mandiSignal}</p>
                    <p className="mt-2 text-sm text-ink-500">{suggestion.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card p-6">
              <p className="text-2xl font-extrabold">Order pipeline</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {dashboardData.orderPipeline.map((stage) => (
                  <div key={stage.stage} className="rounded-2xl bg-brand-50/60 p-5">
                    <p className="text-sm text-ink-500">{stage.stage}</p>
                    <p className="mt-2 text-3xl font-extrabold">{stage.count}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
