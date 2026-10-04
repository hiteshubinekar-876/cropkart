"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, UserCircle2, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import { SearchBar } from "@/components/shared/search-bar";
import { useCartStore } from "@/hooks/use-cart-store";
import { useI18n } from "@/hooks/use-i18n";

const navItems = [
  { href: "/", key: "navHome" as const },
  { href: "/products", key: "navProducts" as const },
  { href: "/auctions", key: "navAuctions" as const },
  { href: "/orders", key: "navOrders" as const },
  { href: "/account", key: "navAccount" as const },
];

const utilityLinks = [
  { href: "/sell-on-greencart", label: "Sell on CropKart" },
  { href: "/bulk-order-enquiry", label: "Bulk Order Enquiry" },
  { href: "/contact-us", label: "Contact Us" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { items } = useCartStore();
  const { dictionary } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-xl">
      <div className="hidden bg-brand-700 text-white md:block">
        <div className="shell flex flex-col gap-3 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
          <p className="font-medium text-white/90">
            Fresh produce, agri inputs, and direct farmer supply in one simple CropKart marketplace.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {utilityLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-white/90 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="shell py-3 md:py-4">
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href="/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-ink-700"
              >
                <ShoppingCart className="h-4 w-4" />
                {items.length ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {items.length}
                  </span>
                ) : null}
              </Link>

              {session?.user ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-100 px-3 py-2 text-sm font-semibold text-ink-700"
                >
                  <UserCircle2 className="h-4 w-4" />
                </button>
              ) : (
                <Link href="/login" className="primary-button h-10 px-4 py-2 text-sm whitespace-nowrap">
                  {dictionary.login}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 text-ink-700"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <SearchBar className="xl:min-w-0" />

          <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold ${
                    isActive(item.href)
                      ? "bg-brand-100/80 text-brand-800 shadow-sm"
                      : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {isActive(item.href) ? (
                    <span className="pointer-events-none absolute right-1 top-1 h-4 w-10 rounded-full bg-white/80 blur-sm" />
                  ) : null}
                  <span className="relative">{dictionary[item.key]}</span>
                </Link>
              ))}
            </nav>

            <Link
              href="/cart"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-white text-ink-700"
            >
              <ShoppingCart className="h-4 w-4" />
              {items.length ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {items.length}
                </span>
              ) : null}
            </Link>

            {session?.user ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2 text-sm font-semibold text-ink-700"
              >
                <UserCircle2 className="h-4 w-4" />
                {session.user.name?.split(" ")[0]}
              </button>
            ) : (
              <Link href="/login" className="primary-button whitespace-nowrap">
                {dictionary.login}
              </Link>
            )}
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="mt-3 grid gap-2 rounded-2xl border border-brand-100 bg-white p-3 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  isActive(item.href)
                    ? "bg-brand-100/80 text-brand-800"
                    : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {dictionary[item.key]}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
