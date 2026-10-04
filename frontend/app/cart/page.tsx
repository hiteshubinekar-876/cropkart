import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartView } from "@/components/cart/cart-view";

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="max-w-3xl">
          <span className="tag-pill">Cart</span>
          <h1 className="mt-4 text-4xl font-extrabold">Review your basket</h1>
          <p className="mt-3 text-base text-ink-600">
            Adjust quantities, apply coupons, and move to checkout when ready.
          </p>
        </div>
        <div className="mt-8">
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}
