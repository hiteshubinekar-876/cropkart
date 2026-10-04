import Link from "next/link";
import { Clock3, Gavel, Trophy, User2 } from "lucide-react";
import { ProductVisual } from "@/components/shared/product-visual";
import type { Auction } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

type AuctionCardProps = {
  auction: Auction;
};

export function AuctionCard({ auction }: AuctionCardProps) {
  const minimumBid =
    typeof auction.currentHighestBid === "number"
      ? auction.currentHighestBid + auction.bidIncrement
      : auction.basePrice;

  return (
    <article className="surface-card p-5">
      {auction.image ? (
        <ProductVisual
          title={auction.productName}
          subtitle={auction.quantity}
          palette={auction.image}
          className="mb-5 h-52"
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-emerald-950">{auction.productName}</p>
          <p className="mt-2 text-sm text-ink-500">{auction.description}</p>
        </div>
        <span
          className={`rounded-xl px-3 py-1 text-xs font-bold ${
            auction.status === "active"
              ? "bg-brand-50 text-brand-700"
              : "bg-slate-100 text-ink-600"
          }`}
        >
          {auction.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Quantity</p>
          <p className="mt-2 text-lg font-bold">{auction.quantity}</p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Base price</p>
          <p className="mt-2 text-lg font-bold">{formatCurrency(auction.basePrice)}</p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Current highest bid</p>
          <p className="mt-2 text-lg font-bold">
            {typeof auction.currentHighestBid === "number"
              ? formatCurrency(auction.currentHighestBid)
              : "No bids yet"}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Next minimum bid</p>
          <p className="mt-2 text-lg font-bold">{formatCurrency(minimumBid)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-ink-600 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand-700" />
          Ends {formatDateTime(auction.endTime)}
        </div>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-brand-700" />
          {auction.bidCount} bids placed
        </div>
        <div className="flex items-center gap-2">
          <User2 className="h-4 w-4 text-brand-700" />
          Seller: {auction.sellerName}
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-brand-700" />
          {auction.highestBidderName ?? auction.winnerName ?? "Awaiting first bidder"}
        </div>
      </div>

      <div className="mt-5">
        <Link href={`/auctions/${auction.id}`} className="primary-button">
          View auction details
        </Link>
      </div>
    </article>
  );
}
