"use client";

import { create } from "zustand";

type CartToast = {
  id: number;
  title: string;
  detail?: string;
  visible: boolean;
};

type CartToastStore = {
  toast: CartToast | null;
  showToast: (title: string, detail?: string) => void;
  hideToast: () => void;
};

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

export const useCartToastStore = create<CartToastStore>((set) => ({
  toast: null,
  showToast: (title, detail) => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
    }

    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
    }

    const id = Date.now();

    set({
      toast: {
        id,
        title,
        detail,
        visible: true,
      },
    });

    dismissTimer = setTimeout(() => {
      set((state) => ({
        toast: state.toast
          ? {
              ...state.toast,
              visible: false,
            }
          : null,
      }));
    }, 2200);

    cleanupTimer = setTimeout(() => {
      set({ toast: null });
    }, 2500);
  },
  hideToast: () =>
    set((state) => ({
      toast: state.toast
        ? {
            ...state.toast,
            visible: false,
          }
        : null,
    })),
}));
