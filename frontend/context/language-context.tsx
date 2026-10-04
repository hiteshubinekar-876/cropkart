"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";

type Language = "en";

type Dictionary = {
  navHome: string;
  navProducts: string;
  navAuctions: string;
  navOrders: string;
  navAccount: string;
  searchPlaceholder: string;
  cart: string;
  login: string;
  heroTitle: string;
  heroSubtitle: string;
  shopNow: string;
  exploreDeals: string;
};

const dictionary: Dictionary = {
  navHome: "Home",
  navProducts: "Products",
  navAuctions: "Auctions",
  navOrders: "Orders",
  navAccount: "Account",
  searchPlaceholder: "Search fruits, vegetables, seeds, organic staples...",
  cart: "Cart",
  login: "Login",
  heroTitle: "Fresh from farms. Better for every basket.",
  heroSubtitle:
    "Shop directly from verified farmers, compare mandi-aligned prices, and track seasonal crop intelligence in one modern marketplace.",
  shopNow: "Shop now",
  exploreDeals: "Explore deals",
};

type LanguageContextValue = {
  language: Language;
  dictionary: Dictionary;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    window.localStorage.removeItem("greencart-language");
  }, []);

  const value = useMemo(
    () => ({
      language: "en" as const,
      dictionary,
      toggleLanguage: () => {},
    }),
    [],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
