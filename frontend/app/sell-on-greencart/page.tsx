import { CheckCircle2, Store, Tractor } from "lucide-react";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

const sellerBenefits = [
  "Create your farmer profile and list products quickly.",
  "Sell fruits, vegetables, grains, dairy and agri inputs.",
  "Use the CropKart dashboard to add products into the live catalog.",
];

export default function SellOnGreenCartPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card bg-brand-50/70 p-8">
            <span className="tag-pill">Sell on CropKart</span>
            <h1 className="mt-5 text-4xl font-extrabold text-emerald-950">Grow your farm business with a cleaner online storefront.</h1>
            <p className="mt-4 text-base leading-7 text-ink-600">
              Join CropKart to sell produce, staples and agri inputs directly to retail and bulk buyers.
            </p>

            <div className="mt-8 space-y-4">
              {sellerBenefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-700" />
                  <p className="text-sm leading-6 text-ink-600">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand-100 bg-white p-4">
                <Store className="h-5 w-5 text-brand-700" />
                <p className="mt-3 font-bold">Seller onboarding</p>
                <p className="mt-2 text-sm text-ink-500">Share your crop mix, dispatch area and packaging needs.</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4">
                <Tractor className="h-5 w-5 text-brand-700" />
                <p className="mt-3 font-bold">Farmer-friendly flow</p>
                <p className="mt-2 text-sm text-ink-500">Register first, then use the dashboard to add products anytime.</p>
              </div>
            </div>
          </div>

          <EnquiryForm
            type="sell"
            subjectLabel="What do you want to sell?"
            subjectPlaceholder="Example: fresh vegetables, mangoes, vermicompost"
            requirementLabel="Tell us about your farm or inventory"
            requirementPlaceholder="Mention your crops, monthly volume, location, packaging style and buyer preferences."
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
