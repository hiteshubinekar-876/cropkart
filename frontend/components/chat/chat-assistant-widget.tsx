"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChatAssistant } from "@/components/chat/chat-assistant";

export function ChatAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/chat") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="pointer-events-auto mb-4 w-[calc(100vw-2rem)] max-w-[26rem]">
          <ChatAssistant variant="widget" onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto ml-auto inline-flex items-center gap-3 rounded-full rounded-br-none   bg-brand-600 px-2 py-2 text-sm font-semibold text-white shadow-[0_24px_55px_rgba(47,161,67,0.28)] hover:bg-brand-700"
      >
        <span>
          <Image
            src="/logo.png"
            alt="CropKart Logo"
            width={50}
            height={50}
            className="rounded-3xl"
          />
        </span>
      </button>
    </div>
  );
}
