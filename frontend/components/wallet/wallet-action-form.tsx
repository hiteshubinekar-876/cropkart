"use client";

import { useState } from "react";

type WalletActionFormProps = {
  action: "deposit" | "withdraw";
  onSubmit: (amount: number) => Promise<void>;
};

export function WalletActionForm({ action, onSubmit }: WalletActionFormProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await onSubmit(Number(amount));
      setAmount("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6">
      <p className="text-lg font-extrabold capitalize">{action} money</p>
      <p className="mt-2 text-sm text-ink-500">
        Enter an amount and submit.
      </p>
      <input
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        className="input-shell mt-5 w-full"
        placeholder="Enter amount"
        type="number"
        min="1"
        step="1"
        required
      />
      <button type="submit" disabled={loading} className="primary-button mt-4 w-full disabled:opacity-60">
        {loading ? "Processing..." : action === "deposit" ? "Deposit" : "Withdraw"}
      </button>
    </form>
  );
}
