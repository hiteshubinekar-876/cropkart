"use client";

import { useState } from "react";
import { ProductVisual } from "@/components/shared/product-visual";
import type { Auction } from "@/lib/types";
import { uploadImageFile } from "@/lib/upload-client";
import { formatCurrency, formatDateTime } from "@/utils/format";

type FarmerAuctionManagerProps = {
  initialAuctions: Auction[];
};

function getDefaultEndTime() {
  const date = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function FarmerAuctionManager({
  initialAuctions,
}: FarmerAuctionManagerProps) {
  const [auctions, setAuctions] = useState(initialAuctions);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    productName: "",
    image: "",
    description: "",
    quantity: "",
    basePrice: "0",
    bidIncrement: "0",
    auctionEndTime: getDefaultEndTime(),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setFieldErrors({});

    const response = await fetch("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: form.productName,
        image: form.image || undefined,
        description: form.description,
        quantity: form.quantity,
        basePrice: Number(form.basePrice),
        bidIncrement: Number(form.bidIncrement),
        auctionEndTime: new Date(form.auctionEndTime).toISOString(),
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      auction?: Auction;
      issues?: {
        fieldErrors?: Record<string, string[]>;
      };
    };
    setLoading(false);

    if (!response.ok || !data.auction) {
      if (data.issues?.fieldErrors) {
        setFieldErrors(data.issues.fieldErrors);
      }
      setMessage(data.error ?? "Unable to create auction right now.");
      return;
    }

    setAuctions((current) => [data.auction!, ...current]);
    setForm({
      productName: "",
      image: "",
      description: "",
      quantity: "",
      basePrice: "0",
      bidIncrement: "0",
      auctionEndTime: getDefaultEndTime(),
    });
    setShowForm(false);
    setMessage("Auction created successfully.");
    setFieldErrors({});
  }

  async function handleAuctionImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);
    setMessage("");

    try {
      const imageUrl = await uploadImageFile(file, "auctions");
      setForm((current) => ({
        ...current,
        image: imageUrl,
      }));
      setMessage("Auction image uploaded successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-extrabold">Your auctions</p>
          <p className="mt-2 text-sm text-ink-500">
            Create timed bids for bulk lots and watch the highest offer update automatically.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="primary-button">
          {showForm ? "Close auction form" : "Create auction"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-5 lg:grid-cols-2">
          <input
            value={form.productName}
            onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
            className="input-shell"
            placeholder="Product name"
            required
          />
          {fieldErrors.productName ? <p className="text-sm text-red-600">{fieldErrors.productName[0]}</p> : null}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-600">Upload auction image</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => void handleAuctionImageUpload(event)}
              className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700"
            />
            <p className="mt-2 text-xs text-ink-500">
              This image is saved with the auction and shown to buyers.
            </p>
          </div>
          {form.image ? (
            <div className="lg:col-span-2">
              <ProductVisual
                title={form.productName || "Auction preview"}
                subtitle="Auction image preview"
                palette={form.image}
                className="h-40"
              />
            </div>
          ) : null}
          <input
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            className="input-shell"
            placeholder="Quantity, for example 500 kg"
            required
          />
          {fieldErrors.quantity ? <p className="text-sm text-red-600">{fieldErrors.quantity[0]}</p> : null}
          <input
            value={form.basePrice}
            onChange={(event) => setForm((current) => ({ ...current, basePrice: event.target.value }))}
            className="input-shell"
            placeholder="Base price"
            type="number"
            min="1"
            required
          />
          {fieldErrors.basePrice ? <p className="text-sm text-red-600">{fieldErrors.basePrice[0]}</p> : null}
          <input
            value={form.bidIncrement}
            onChange={(event) => setForm((current) => ({ ...current, bidIncrement: event.target.value }))}
            className="input-shell"
            placeholder="Bid increment"
            type="number"
            min="1"
            required
          />
          {fieldErrors.bidIncrement ? <p className="text-sm text-red-600">{fieldErrors.bidIncrement[0]}</p> : null}
          <input
            value={form.auctionEndTime}
            onChange={(event) => setForm((current) => ({ ...current, auctionEndTime: event.target.value }))}
            className="input-shell"
            type="datetime-local"
            required
          />
          {fieldErrors.auctionEndTime ? <p className="text-sm text-red-600">{fieldErrors.auctionEndTime[0]}</p> : null}
          <div className="hidden lg:block" />
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="input-shell min-h-32 lg:col-span-2"
            placeholder="Describe the lot quality, grade, packaging and pickup details"
            required
          />
          {fieldErrors.description ? <p className="text-sm text-red-600 lg:col-span-2">{fieldErrors.description[0]}</p> : null}
          {message ? <p className="text-sm text-brand-700 lg:col-span-2">{message}</p> : null}
          <button type="submit" disabled={loading || uploadingImage} className="primary-button lg:col-span-2 disabled:opacity-60">
            {uploadingImage ? "Uploading image..." : loading ? "Creating auction..." : "Save auction"}
          </button>
        </form>
      ) : null}

      {message && !showForm ? <p className="mt-4 text-sm text-brand-700">{message}</p> : null}

      <div className="mt-6 space-y-4">
        {auctions.length ? (
          auctions.map((auction) => (
            <div key={auction.id} className="rounded-2xl border border-brand-100 p-4">
              {auction.image ? (
                <ProductVisual
                  title={auction.productName}
                  subtitle={auction.quantity}
                  palette={auction.image}
                  className="mb-4 h-40"
                />
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-emerald-950">{auction.productName}</p>
                  <p className="mt-1 text-sm text-ink-500">{auction.quantity}</p>
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
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Base price</p>
                  <p className="mt-2 font-bold">{formatCurrency(auction.basePrice)}</p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Highest bid</p>
                  <p className="mt-2 font-bold">
                    {typeof auction.currentHighestBid === "number"
                      ? formatCurrency(auction.currentHighestBid)
                      : "No bids yet"}
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ends at</p>
                  <p className="mt-2 font-bold">{formatDateTime(auction.endTime)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-5 text-sm text-ink-600">
            No auctions yet. Create your first auction for bulk or price-discovery selling.
          </div>
        )}
      </div>
    </section>
  );
}
