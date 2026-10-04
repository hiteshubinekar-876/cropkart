import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductVisual } from "@/components/shared/product-visual";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="shell py-16">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <ProductVisual
            title="This page harvest failed."
            subtitle="The route may have moved, or the product link is no longer available."
            palette="from-slate-100 via-white to-brand-50"
            className="h-72"
          />
          <Link href="/" className="primary-button">
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
