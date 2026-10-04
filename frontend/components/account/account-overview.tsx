"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { products, users } from "@/lib/mock-data";
import { useWishlistStore } from "@/hooks/use-wishlist-store";
import { ProductVisual } from "@/components/shared/product-visual";

export function AccountOverview() {
  const { data: session, status } = useSession();
  const { ids } = useWishlistStore();
  const user = session?.user?.email
    ? (users.find((candidate) => candidate.email === session.user.email) ?? {
        id: session.user.id,
        name: session.user.name ?? "GreenCart User",
        email: session.user.email,
        mobile: "",
        role: session.user.role,
        password: "",
        avatar: session.user.name?.slice(0, 2).toUpperCase() ?? "GU",
        farmerId: session.user.farmerId,
        wishlist: [],
        addresses: [],
      })
    : null;

  if (status === "loading") {
    return (
      <div className="surface-card p-6">
        <p className="text-sm text-ink-500">Loading account...</p>
      </div>
    );
  }

  if (!session?.user || !user) {
    return (
      <div className="surface-card p-6">
        <p className="text-lg font-extrabold">Please sign in</p>
        <p className="mt-2 text-sm text-ink-500">
          Your account details are available after login.
        </p>
        <Link href="/login" className="primary-button mt-5 rounded-2xl">
          Go to login
        </Link>
      </div>
    );
  }

  const wishlistProducts = products.filter((product) =>
    [...user.wishlist, ...ids].includes(product.id),
  );
  const role = session.user.role;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <div className="surface-card p-6">
          <p className="text-2xl font-extrabold">{session.user.name ?? user.name}</p>
          <p className="mt-2 text-sm text-ink-500">
            {session.user.email ?? user.email} | {session.user.role}
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-brand-50/60 p-4">
              <p className="text-sm font-bold text-ink-700">Saved addresses</p>
              {user.addresses.length ? (
                user.addresses.map((address) => (
                  <p key={address.id} className="mt-2 text-sm text-ink-500">
                    {address.line1}, {address.city}, {address.state} {address.pincode}
                  </p>
                ))
              ) : (
                <p className="mt-2 text-sm text-ink-500">Add your first delivery address after checkout.</p>
              )}
            </div>
            <div className="rounded-2xl bg-brand-50/60 p-4">
              <p className="text-sm font-bold text-ink-700">Notifications</p>
              <p className="mt-2 text-sm text-ink-500">
                Price drop alert enabled for turmeric fingers and mango box.
              </p>
            </div>
          </div>
        </div>
        <div className="surface-card p-6">
          <p className="text-xl font-extrabold">Quick links</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/account/wallet" className="secondary-button rounded-2xl">
              My wallet
            </Link>
            <Link href="/auctions" className="secondary-button rounded-2xl">
              Live auctions
            </Link>
            <Link href="/chat" className="secondary-button rounded-2xl">
              Chat assistant
            </Link>
            <Link href="/orders" className="secondary-button rounded-2xl">
              My orders
            </Link>
            <Link href="/cart" className="secondary-button rounded-2xl">
              Cart
            </Link>
            {role === "farmer" || role === "admin" ? (
              <Link href="/farmer/dashboard" className="secondary-button rounded-2xl">
                Seller dashboard
              </Link>
            ) : null}
            {role === "farmer" || role === "admin" ? (
              <Link href="/seller/wallet" className="secondary-button rounded-2xl">
                Seller wallet
              </Link>
            ) : null}
            {role === "admin" ? (
              <Link href="/admin" className="secondary-button rounded-2xl">
                Admin panel
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-extrabold">Wishlist</p>
            <p className="mt-1 text-sm text-ink-500">
              Saved products and price-drop watchlist.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {wishlistProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="rounded-2xl border border-brand-100 p-4 hover:border-brand-300">
              <ProductVisual
                title={product.name}
                subtitle={product.unit}
                palette={product.images[0]}
                className="h-40"
              />
              <p className="mt-4 font-bold">{product.name}</p>
              <p className="mt-1 text-sm text-ink-500">{product.farmerName}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
