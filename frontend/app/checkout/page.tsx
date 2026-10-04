import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="max-w-3xl">
          <span className="tag-pill">Checkout</span>
          <h1 className="mt-4 text-4xl font-extrabold">Fast, flexible checkout</h1>
          <p className="mt-3 text-base text-ink-600">
            COD, UPI, and payment-gateway-ready modes are already scaffolded into the order flow.
          </p>
        </div>
        <div className="mt-8">
          <CheckoutForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
