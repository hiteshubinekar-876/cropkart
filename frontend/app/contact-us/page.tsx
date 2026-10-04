import { Mail, MapPin, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

const contactCards = [
  {
    title: "Email",
    copy: "devdeotatik@gmail.com",
    icon: Mail,
  },
  {
    title: "Phone",
    copy: "+91 78409 81635",
    icon: Phone,
  },
  {
    title: "Operations",
    copy: "Pune, Maharashtra",
    icon: MapPin,
  },
];

export default function ContactUsPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card bg-brand-50/70 p-8">
            <span className="tag-pill">Contact Us</span>
            <h1 className="mt-5 text-4xl font-extrabold text-emerald-950">Reach the CropKart team for support, partnerships and onboarding.</h1>
            <p className="mt-4 text-base leading-7 text-ink-600">
              Use this page for general questions about orders, seller activation, supply partnerships or product support.
            </p>

            <div className="mt-8 grid gap-4">
              {contactCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.title} className="rounded-2xl border border-brand-100 bg-white p-4">
                    <Icon className="h-5 w-5 text-brand-700" />
                    <p className="mt-3 font-bold">{card.title}</p>
                    <p className="mt-2 text-sm text-ink-500">{card.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <EnquiryForm
            type="contact"
            subjectLabel="Subject"
            subjectPlaceholder="Example: support, account help, partnership"
            requirementLabel="How can we help?"
            requirementPlaceholder="Tell us what you need help with and include any order, catalog or onboarding details."
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
