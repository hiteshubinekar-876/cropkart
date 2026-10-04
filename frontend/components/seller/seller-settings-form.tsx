"use client";

import { useState } from "react";
import type { SellerProfile } from "@/lib/types";

type SellerSettingsFormProps = {
  initialProfile: SellerProfile;
};

export function SellerSettingsForm({ initialProfile }: SellerSettingsFormProps) {
  const [form, setForm] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/seller/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: form.shopName,
        shopLocation: form.shopLocation,
        phone: form.phone,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      message?: string;
      profile?: SellerProfile;
    };

    setLoading(false);

    if (!response.ok || !data.profile) {
      setError(data.error ?? "Could not update seller settings.");
      return;
    }

    setForm(data.profile);
    setMessage(data.message ?? "Seller settings updated successfully.");
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card max-w-2xl p-6">
      <div>
        <p className="text-2xl font-extrabold">Account settings</p>
        <p className="mt-2 text-sm text-ink-500">
          Update your shop details here.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">Shop name</label>
          <input
            value={form.shopName}
            onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))}
            className="input-shell w-full"
            placeholder="Shop name"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">Shop location</label>
          <input
            value={form.shopLocation}
            onChange={(event) => setForm((current) => ({ ...current, shopLocation: event.target.value }))}
            className="input-shell w-full"
            placeholder="Shop location"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">Phone number</label>
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="input-shell w-full"
            placeholder="Phone number"
            inputMode="numeric"
            required
          />
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-brand-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button type="submit" disabled={loading} className="primary-button mt-6 disabled:opacity-60">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
