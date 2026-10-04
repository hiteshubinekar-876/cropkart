import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BidForm } from "@/components/auctions/bid-form";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ProductVisual } from "@/components/shared/product-visual";
import { AuctionError, getAuctionById, getBidHistory } from "@/lib/services/auctions";
import { formatCurrency, formatDateTime } from "@/utils/format";

type AuctionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: AuctionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const auction = await getAuctionById(id);

  if (!auction) {
    return { title: "Auction not found" };
  }

  return {
    title: `${auction.productName} auction`,
    description: auction.description,
  };
}

export default async function AuctionDetailPage({
  params,
}: AuctionDetailPageProps) {
  const { id } = await params;
  const auction = await getAuctionById(id);

  if (!auction) {
    notFound();
  }

  let bids = [] as Awaited<ReturnType<typeof getBidHistory>>;

  try {
    bids = await getBidHistory(auction.id);
  } catch (error) {
    if (!(error instanceof AuctionError)) {
      throw error;
    }
  }

  const minimumBid =
    typeof auction.currentHighestBid === "number"
      ? auction.currentHighestBid + auction.bidIncrement
      : auction.basePrice;

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="surface-card p-6 sm:p-8">
            {auction.image ? (
              <ProductVisual
                title={auction.productName}
                subtitle={auction.quantity}
                palette={auction.image}
                className="mb-6 h-72"
              />
            ) : null}
            <span className="tag-pill">Auction detail</span>
            <h1 className="mt-5 text-4xl font-extrabold text-emerald-950">{auction.productName}</h1>
            <p className="mt-4 text-base leading-7 text-ink-600">{auction.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Quantity</p>
                <p className="mt-2 text-lg font-bold">{auction.quantity}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ends at</p>
                <p className="mt-2 text-lg font-bold">{formatDateTime(auction.endTime)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Base price</p>
                <p className="mt-2 text-lg font-bold">{formatCurrency(auction.basePrice)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Bid increment</p>
                <p className="mt-2 text-lg font-bold">{formatCurrency(auction.bidIncrement)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Highest bid</p>
                <p className="mt-2 text-lg font-bold">
                  {typeof auction.currentHighestBid === "number"
                    ? formatCurrency(auction.currentHighestBid)
                    : "No bids yet"}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Minimum next bid</p>
                <p className="mt-2 text-lg font-bold">{formatCurrency(minimumBid)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-brand-100 p-4">
              <p className="text-sm font-semibold text-ink-600">Seller</p>
              <p className="mt-1 font-bold text-emerald-950">{auction.sellerName}</p>
              <p className="mt-3 text-sm text-ink-600">
                Status: <span className="font-semibold">{auction.status}</span>
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Highest bidder: <span className="font-semibold">{auction.highestBidderName ?? "None yet"}</span>
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Winner: <span className="font-semibold">{auction.winnerName ?? "Determined when auction ends"}</span>
              </p>
            </div>
          </section>

          <div className="space-y-6">
            <BidForm auction={auction} />

            <section className="surface-card p-6">
              <p className="text-2xl font-extrabold text-emerald-950">Bid history</p>
              <div className="mt-5 space-y-3">
                {bids.length ? (
                  bids.map((bid) => (
                    <div key={bid.id} className="rounded-2xl border border-brand-100 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">{bid.bidderName}</p>
                          <p className="mt-1 text-sm text-ink-500">{formatDateTime(bid.createdAt)}</p>
                        </div>
                        <p className="text-lg font-extrabold text-emerald-950">
                          {formatCurrency(bid.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-sm text-ink-600">
                    No bids yet. The first valid bid must be at least the base price.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
