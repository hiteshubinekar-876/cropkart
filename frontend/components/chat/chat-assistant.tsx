"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatPageContext } from "@/lib/types";

type ChatApiResponse = {
  success: boolean;
  response: string;
  source?: "langflow" | "local_fallback";
  detail?: unknown;
};

const cropkartApiUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001"
).replace(/\/+$/, "");

type ChatAssistantProps = {
  onClose?: () => void;
  variant?: "page" | "widget";
};

function getOrCreateSessionId() {
  const created = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const stored = window.localStorage.getItem("krishi-chat-session-id");
    if (stored) {
      return stored;
    }

    window.localStorage.setItem("krishi-chat-session-id", created);
  } catch {
    // Keep the assistant usable when browser storage is unavailable.
  }

  return created;
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFallbackPageTitle(pathname: string) {
  if (pathname === "/") {
    return "Home";
  }

  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function collectPageContext(pathname: string): ChatPageContext {
  const visibleProducts = Array.from(
    new Set(
      Array.from(document.querySelectorAll<HTMLElement>("[data-product-name]"))
        .map((node) => node.dataset.productName?.trim())
        .filter(Boolean) as string[],
    ),
  ).slice(0, 10);

  const focusProduct =
    document.querySelector<HTMLElement>("[data-product-focus='true']")?.dataset.productName ??
    visibleProducts[0];

  return {
    pathname,
    pageTitle: document.title.split("|")[0]?.trim() || getFallbackPageTitle(pathname),
    focusProduct,
    visibleProducts,
  };
}

export function ChatAssistant({ onClose, variant = "page" }: ChatAssistantProps) {
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [pageContext, setPageContext] = useState<ChatPageContext | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);

    function loadHistory() {
      try {
        const saved = window.localStorage.getItem(`krishi-chat-history:${id}`);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        setMessages(Array.isArray(parsed) ? (parsed as ChatMessage[]) : []);
      } catch {
        setError("Unable to load chat history right now.");
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, []);

  useEffect(() => {
    if (!sessionId || loadingHistory) {
      return;
    }

    try {
      window.localStorage.setItem(
        `krishi-chat-history:${sessionId}`,
        JSON.stringify(messages),
      );
    } catch {
      // Chat still works if browser storage is unavailable or full.
    }
  }, [loadingHistory, messages, sessionId]);

  useEffect(() => {
    setPageContext(collectPageContext(pathname));
  }, [pathname]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const suggestions = useMemo(() => {
    if (pathname.startsWith("/products/") && pageContext?.focusProduct) {
      return [
        `Tell me about ${pageContext.focusProduct}`,
        `What is the price of ${pageContext.focusProduct}?`,
        "Show similar products",
        "How fast can this be delivered?",
      ];
    }

    if (pathname.startsWith("/products")) {
      return [
        "Show products on this page",
        "Which of these products are best sellers?",
        "Price of tomatoes?",
        "What payment methods are available?",
      ];
    }

    if (pathname.startsWith("/orders")) {
      return [
        "What is my latest order status?",
        "How can I cancel an order?",
        "How do I download an invoice?",
        "What payment methods are available?",
      ];
    }

    return [
      "What products do you have?",
      "Price of tomatoes?",
      "What is my latest order status?",
      "What payment methods are available?",
    ];
  }, [pageContext?.focusProduct, pathname]);

  async function sendChat(customMessage?: string) {
    const outgoing = (customMessage ?? message).trim();

    if (!outgoing || !sessionId) {
      return;
    }

    setError("");
    setTyping(true);

    const optimisticMessage: ChatMessage = {
      id: `tmp-${Date.now()}`,
      sessionId,
      role: "user",
      content: outgoing,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessage("");

    try {
      const currentContext = collectPageContext(pathname);
      setPageContext(currentContext);

      const response = await fetch(`${cropkartApiUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoing,
          language: "en",
          pageContext: currentContext,
        }),
      });

      const data = (await response.json()) as ChatApiResponse;
      setTyping(false);

      if (!response.ok || !data.success || !data.response) {
        const detail = typeof data.detail === "string" ? data.detail : "";
        setError(detail || "Unable to send message right now.");
        setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
        return;
      }

      const repliedAt = new Date().toISOString();
      const userMessage: ChatMessage = {
        ...optimisticMessage,
        id: `user-${Date.now()}`,
        createdAt: repliedAt,
      };
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId,
        role: "assistant",
        content: data.response,
        source: data.source === "langflow" ? "langflow" : "local_fallback",
        createdAt: repliedAt,
      };

      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticMessage.id),
        userMessage,
        assistantMessage,
      ]);
    } catch {
      setTyping(false);
      setError("Unable to send message right now.");
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
    }
  }

  async function clearAllChats() {
    if (!sessionId) {
      return;
    }

    setClearing(true);
    setError("");

    try {
      window.localStorage.removeItem(`krishi-chat-history:${sessionId}`);
      setMessages([]);
      setMessage("");
    } catch {
      setError("Unable to delete chat history right now.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="surface-card overflow-hidden shadow-xl">
      <div className="border-b border-brand-100 bg-brand-50/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold text-emerald-950">CropKart Assistant</p>
            <p className="mt-1 text-sm text-ink-600">
              Ask about products, prices, orders, or general website questions.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Viewing {pageContext?.pageTitle ?? getFallbackPageTitle(pathname)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void clearAllChats()}
              disabled={clearing || loadingHistory}
              className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? "Deleting..." : "Delete all chats"}
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[#f6fbf6] px-4 py-5 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void sendChat(suggestion)}
              className="rounded-full border border-brand-100 bg-white px-3 py-2 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div
          className={`overflow-y-auto rounded-2xl border border-brand-100 bg-white p-4 ${
            variant === "widget" ? "h-[380px]" : "h-[460px]"
          }`}
        >
          {loadingHistory ? (
            <div className="text-sm text-ink-500">Loading chat history...</div>
          ) : messages.length ? (
            <div className="space-y-4">
              {messages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      chatMessage.role === "user"
                        ? "bg-brand-600 text-white"
                        : "border border-brand-100 bg-brand-50/60 text-ink-800"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm leading-6">{chatMessage.content}</p>
                    {chatMessage.role === "assistant" && chatMessage.source ? (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        {chatMessage.source === "langflow" ? "CropSathi · LangFlow" : "Local fallback · LangFlow unavailable"}
                      </p>
                    ) : null}
                    <p
                      className={`mt-2 text-[11px] ${
                        chatMessage.role === "user" ? "text-white/80" : "text-ink-400"
                      }`}
                    >
                      {formatTime(chatMessage.createdAt)}
                    </p>
                  </div>
                </div>
              ))}

              {typing ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-ink-600">
                    CropKart Assistant is typing...
                  </div>
                </div>
              ) : null}
              <div ref={scrollRef} />
            </div>
          ) : (
            <div className="text-sm text-ink-500">
              No messages yet. Start with a question about products, prices, orders, or support.
            </div>
          )}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendChat();
          }}
          className="flex gap-3"
        >
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="input-shell flex-1"
            placeholder="Type your message..."
          />
          <button type="submit" disabled={!message.trim() || typing} className="primary-button disabled:opacity-60">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
