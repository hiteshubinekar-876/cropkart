import { getServerSession } from "next-auth";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { OrdersClient } from "@/components/orders/orders-client";
import { authOptions } from "@/lib/auth";
import { getOrdersByUserId } from "@/lib/services/orders";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const seededOrders = await getOrdersByUserId(session?.user?.id ?? "user-1");

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="max-w-3xl">
          <span className="tag-pill">Orders</span>
          <h1 className="mt-4 text-4xl font-extrabold">Track your order history</h1>
          <p className="mt-3 text-base text-ink-600">
            Includes tracking cues, cancellation controls, and invoice download endpoints.
          </p>
        </div>
        <div className="mt-8">
          <OrdersClient seededOrders={seededOrders} />
        </div>
      </main>
      <Footer />
    </>
  );
}
