"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type WishlistStore = {
  ids: string[];
  toggleWishlist: (productId: string) => void;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      ids: [],
      toggleWishlist: (productId) =>
        set((state) => ({
          ids: state.ids.includes(productId)
            ? state.ids.filter((id) => id !== productId)
            : [...state.ids, productId],
        })),
    }),
    {
      name: "greencart-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
