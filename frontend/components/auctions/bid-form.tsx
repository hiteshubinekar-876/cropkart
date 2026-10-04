"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Auction } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

type BidFormProps = {
  auction: Auction;
};

export function BidForm({ auction }: BidFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [amount, setAmount] = useState(
    String(
      typeof auction.currentHighestBid === "number"
        ? auction.currentHighestBid + auction.bidIncrement
        : auction.basePrice,
    ),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const minimumBid =
    typeof auction.currentHighestBid === "number"
      ? auction.currentHighestBid + auction.bidIncrement
      : auction.basePrice;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/auctions/${auction.id}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });

    const data = (await response.json()) as {
      error?: string;
      auction?: Auction;
      details?: { minimumBid?: number };
    };

    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Unable to place bid right now.");
      if (data.details?.minimumBid) {
        setAmount(String(data.details.minimumBid));
      }
      return;
    }

    setMessage("Bid placed successfully.");
    router.refresh();
  }

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-ink-600">
        Please log in with a buyer account to place a bid.
      </div>
    );
  }

  if (!["buyer", "admin"].includes(session.user.role)) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-ink-600">
        Buyer accounts can bid on auctions. Farmer accounts can create auctions from the dashboard.
      </div>
    );
  }

  if (auction.status !== "active") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-ink-600">
        This auction has ended.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
      <p className="text-lg font-bold text-emerald-950">Place your bid</p>
      <p className="mt-2 text-sm text-ink-600">
        Minimum allowed bid: {formatCurrency(minimumBid)}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="number"
          min={minimumBid}
          step={auction.bidIncrement}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="input-shell w-full"
          placeholder="Enter your bid"
          required
        />
        <button type="submit" disabled={loading} className="primary-button whitespace-nowrap disabled:opacity-60">
          {loading ? "Placing..." : "Place bid"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-brand-700">{message}</p> : null}
    </form>
  );
}
