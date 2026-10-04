import { Building2, PackageCheck, Truck } from "lucide-react";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

const bulkFeatures = [
  {
    title: "Retail and wholesale sourcing",
    copy: "Support for kirana stores, institutions, restaurants and agri procurement teams.",
    icon: Building2,
  },
  {
    title: "Mixed baskets and input supply",
    copy: "Combine grocery staples with seeds, pesticides and fertilisers in one enquiry.",
    icon: PackageCheck,
  },
  {
    title: "Dispatch planning",
    copy: "Share delivery city, schedule and quantity so we can coordinate with sellers faster.",
    icon: Truck,
  },
];

export default function BulkOrderEnquiryPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card bg-brand-50/70 p-8">
            <span className="tag-pill">Bulk Order Enquiry</span>
            <h1 className="mt-5 text-4xl font-extrabold text-emerald-950">Send large-volume product or agri input requirements.</h1>
            <p className="mt-4 text-base leading-7 text-ink-600">
              CropKart can support bulk fresh produce buying as well as crop input sourcing for farms and businesses.
            </p>

            <div className="mt-8 grid gap-4">
              {bulkFeatures.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.title} className="rounded-2xl border border-brand-100 bg-white p-4">
                    <Icon className="h-5 w-5 text-brand-700" />
                    <p className="mt-3 font-bold">{feature.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">{feature.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <EnquiryForm
            type="bulk"
            subjectLabel="What do you need?"
            subjectPlaceholder="Example: 300 kg onion, 100 bags NPK, 50 kg paneer"
            requirementLabel="Share your quantity, city and delivery timeline"
            requirementPlaceholder="Mention product names, quantities, destination city, repeat frequency and any packaging needs."
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
