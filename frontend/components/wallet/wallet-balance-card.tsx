import type { Wallet } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

type WalletBalanceCardProps = {
  title: string;
  wallet: Wallet;
};

export function WalletBalanceCard({ title, wallet }: WalletBalanceCardProps) {
  return (
    <div className="surface-card p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-400">{title}</p>
      <p className="mt-3 text-4xl font-extrabold text-emerald-950">{formatCurrency(wallet.balance)}</p>
      <p className="mt-2 text-sm text-ink-500">Available wallet balance</p>
    </div>
  );
}
