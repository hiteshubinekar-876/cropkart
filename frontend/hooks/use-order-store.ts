"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Order } from "@/lib/types";

type OrderStore = {
  recentOrders: Order[];
  orderOverrides: Record<string, Partial<Order>>;
  prependOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      recentOrders: [],
      orderOverrides: {},
      prependOrder: (order) =>
        set((state) => ({
          recentOrders: [order, ...state.recentOrders].slice(0, 10),
        })),
      updateOrder: (id, patch) =>
        set((state) => ({
          recentOrders: state.recentOrders.map((order) =>
            order.id === id ? { ...order, ...patch } : order,
          ),
          orderOverrides: {
            ...state.orderOverrides,
            [id]: {
              ...(state.orderOverrides[id] ?? {}),
              ...patch,
            },
          },
        })),
    }),
    {
      name: "greencart-orders",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
