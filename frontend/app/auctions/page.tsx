import { Gavel } from "lucide-react";
import { AuctionCard } from "@/components/auctions/auction-card";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SectionHeading } from "@/components/shared/section-heading";
import { getActiveAuctions } from "@/lib/services/auctions";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await getActiveAuctions();

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Auctions"
            title="Live farm auctions for buyers"
            description="Browse all active auctions, place bids above the current highest bid plus the minimum increment, and track the winner automatically when an auction closes."
          />
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
            
          </div>
        </div>

        {auctions.length ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="surface-card mt-8 flex flex-col items-center gap-4 p-10 text-center">
            <Gavel className="h-8 w-8 text-brand-700" />
            <p className="text-2xl font-extrabold text-emerald-950">No active auctions right now</p>
            <p className="max-w-2xl text-sm leading-6 text-ink-600">
              Farmers can create auctions from the seller dashboard. Once a listing goes live, buyers will see it here.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
