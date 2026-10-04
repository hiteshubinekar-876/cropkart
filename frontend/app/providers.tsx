"use client";

import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";
import { ChatAssistantWidget } from "@/components/chat/chat-assistant-widget";
import { CartToast } from "@/components/shared/cart-toast";
import { LanguageProvider } from "@/context/language-context";

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <CartToast />
        <ChatAssistantWidget />
      </LanguageProvider>
    </SessionProvider>
  );
}
