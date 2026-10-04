import type { WalletTransaction } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

type WalletTransactionTableProps = {
  transactions: WalletTransaction[];
};

export function WalletTransactionTable({ transactions }: WalletTransactionTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-brand-100 px-6 py-4">
        <p className="text-xl font-extrabold">Transaction history</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-brand-50/60 text-ink-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Type</th>
              <th className="px-6 py-3 font-semibold">Amount</th>
              <th className="px-6 py-3 font-semibold">Description</th>
              <th className="px-6 py-3 font-semibold">Order</th>
              <th className="px-6 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? (
              transactions.map((transaction, index) => (
                <tr key={`${transaction.createdAt}-${index}`} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold capitalize">{transaction.type}</td>
                  <td className="px-6 py-4">{formatCurrency(transaction.amount)}</td>
                  <td className="px-6 py-4 text-ink-500">{transaction.description}</td>
                  <td className="px-6 py-4 text-ink-500">{transaction.orderId ?? "-"}</td>
                  <td className="px-6 py-4 text-ink-500">{formatDateTime(transaction.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-ink-500">
                  No wallet transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
