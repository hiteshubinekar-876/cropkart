"use client";

import { useLanguage } from "@/context/language-context";

export function useI18n() {
  return useLanguage();
}
