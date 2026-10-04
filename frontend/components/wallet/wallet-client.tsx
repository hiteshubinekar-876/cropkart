"use client";

import { useState } from "react";
import type { Wallet } from "@/lib/types";
import { WalletActionForm } from "@/components/wallet/wallet-action-form";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";
import { WalletTransactionTable } from "@/components/wallet/wallet-transaction-table";

type WalletClientProps = {
  initialWallet: Wallet;
  title: string;
  description: string;
};

export function WalletClient({ initialWallet, title, description }: WalletClientProps) {
  const [wallet, setWallet] = useState(initialWallet);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(endpoint: "/api/wallet/deposit" | "/api/wallet/withdraw", amount: number) {
    setMessage("");
    setError("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const data = (await response.json()) as {
      error?: string;
      message?: string;
      wallet?: Wallet;
    };

    if (!response.ok || !data.wallet) {
      setError(data.error ?? "Could not update wallet.");
      return;
    }

    setWallet(data.wallet);
    setMessage(data.message ?? "Wallet updated.");
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <span className="tag-pill">Wallet</span>
        <h1 className="mt-4 text-4xl font-extrabold">{title}</h1>
        <p className="mt-3 text-base text-ink-600">{description}</p>
      </div>

      <WalletBalanceCard title="Current balance" wallet={wallet} />

      <div className="grid gap-6 md:grid-cols-2">
        <WalletActionForm action="deposit" onSubmit={(amount) => runAction("/api/wallet/deposit", amount)} />
        <WalletActionForm action="withdraw" onSubmit={(amount) => runAction("/api/wallet/withdraw", amount)} />
      </div>

      {message ? <p className="text-sm text-brand-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <WalletTransactionTable transactions={wallet.transactions} />
    </div>
  );
}
