import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MetricCard } from "@/components/dashboard/metric-card";
import { adminMetrics, farmers, orders, products, users } from "@/lib/mock-data";
import { getAdminDashboardData } from "@/lib/services/dashboard";

export default async function AdminPage() {
  const dashboardData = await getAdminDashboardData();

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div>
          <span className="tag-pill">Admin panel</span>
          <h1 className="mt-4 text-4xl font-extrabold">Marketplace control center</h1>
          <p className="mt-3 max-w-3xl text-base text-ink-600">
            Moderate users and farmers, verify sellers, oversee product quality, and monitor marketplace health.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-8">
            <div className="surface-card p-6">
              <p className="text-2xl font-extrabold">Operational summaries</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-ink-500">Users</p>
                  <p className="mt-2 text-3xl font-extrabold">{users.length}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-ink-500">Farmers</p>
                  <p className="mt-2 text-3xl font-extrabold">{farmers.length}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-ink-500">Orders</p>
                  <p className="mt-2 text-3xl font-extrabold">{orders.length}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {dashboardData.platformHighlights.map((highlight) => (
                  <div key={highlight} className="rounded-3xl bg-brand-50 p-4 text-sm font-semibold text-brand-700">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card p-6">
              <p className="text-2xl font-extrabold">Products under management</p>
              <div className="mt-6 space-y-3">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex flex-col gap-2 rounded-3xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">{product.name}</p>
                      <p className="mt-1 text-sm text-ink-500">
                        {product.farmerName} | {product.category} | {product.state}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-ink-600">
                      {product.stock} in stock
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="surface-card p-6">
              <p className="text-2xl font-extrabold">Seller verification queue</p>
              <div className="mt-6 space-y-3">
                {dashboardData.reviewsQueue.map((queue) => (
                  <div key={queue.seller} className="rounded-3xl bg-slate-50 p-5">
                    <p className="font-bold">{queue.seller}</p>
                    <p className="mt-2 text-sm text-ink-500">{queue.status}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card p-6">
              <p className="text-2xl font-extrabold">Farmer oversight</p>
              <div className="mt-6 space-y-3">
                {farmers.map((farmer) => (
                  <div key={farmer.id} className="rounded-3xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold">{farmer.farmName}</p>
                        <p className="mt-1 text-sm text-ink-500">{farmer.name}</p>
                      </div>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                        {farmer.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
