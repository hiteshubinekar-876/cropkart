"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sellerLinks = [
  { href: "/farmer/dashboard", label: "Dashboard" },
  { href: "/seller/wallet", label: "Wallet" },
  { href: "/seller/settings", label: "Settings" },
];

export function SellerDashboardNav() {
  const pathname = usePathname();

  return (
    <div className="surface-card p-3">
      <div className="flex flex-wrap gap-2">
        {sellerLinks.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
