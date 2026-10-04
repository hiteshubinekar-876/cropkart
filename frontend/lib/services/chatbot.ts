import OpenAI from "openai";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { orders, products, users } from "@/lib/mock-data";
import { ensureSeedData } from "@/lib/services/seed";
import type { ChatMessage, ChatPageContext, Order, Product, Role } from "@/lib/types";
import { ChatMessageModel } from "@/models/ChatMessage";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { UserModel } from "@/models/User";
import { formatCurrency } from "@/utils/format";

type ChatContext = {
  sessionId: string;
  message: string;
  pageContext?: ChatPageContext;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
  };
};

type Intent =
  | "list_products"
  | "price_lookup"
  | "order_status"
  | "user_profile"
  | "faq"
  | "general";

type IntentResult = {
  intent: Intent;
  productName?: string;
  orderId?: string;
  faqKey?: "shipping" | "payment" | "returns" | "contact";
};

type ProductRecord = Product & {
  harvestDate?: string | Date;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const faqEntries = [
  {
    key: "shipping" as const,
    match: /(shipping|delivery|dispatch|arrive|how long)/i,
    answer:
      "Most orders on CropKart are delivered within 1 to 4 days depending on the product and seller location.",
  },
  {
    key: "payment" as const,
    match: /(payment|upi|cod|cash on delivery|razorpay|stripe)/i,
    answer:
      "CropKart supports COD, UPI, Razorpay, and Stripe depending on the checkout flow.",
  },
  {
    key: "returns" as const,
    match: /(return|refund|replace|damaged)/i,
    answer:
      "For damaged or incorrect deliveries, buyers should contact support quickly so the CropKart team can help with refund or replacement handling.",
  },
  {
    key: "contact" as const,
    match: /(contact|support|help|phone|email)/i,
    answer:
      "You can use the Contact Us page on CropKart for support, onboarding, and partnership enquiries.",
  },
];

const openaiClient = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey })
  : null;

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

function normalizeChatMessage(record: {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  source?: "database" | "openai" | "faq" | "system";
  createdAt?: string | Date;
}): ChatMessage {
  return {
    id: record.id,
    sessionId: record.sessionId,
    role: record.role,
    content: record.content,
    source: record.source,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : new Date(record.createdAt ?? Date.now()).toISOString(),
  };
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function findFaqAnswer(query: string) {
  return faqEntries.find((entry) => entry.match.test(query));
}

function extractOrderId(query: string) {
  const match = query.match(/ORD-\d+/i);
  return match?.[0]?.toUpperCase();
}

function extractProductCandidate(query: string) {
  return query
    .replace(/price of|cost of|what is the price of|tell me the price of/gi, "")
    .replace(/products do you have|what products do you have|show products/gi, "")
    .replace(/[?.,!]/g, "")
    .trim();
}

function formatProductLine(product: Product) {
  return `${product.name} - ${formatCurrency(product.price)} (${product.unit})`;
}

function isGenericProductReference(value: string) {
  return /^(this|that|it|these|those|product|item|current product)?$/i.test(value.trim());
}

function getContextProductNames(context?: ChatPageContext) {
  return Array.from(new Set((context?.visibleProducts ?? []).filter(Boolean)));
}

function getResponseText(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "output_text" in response &&
    typeof (response as { output_text?: unknown }).output_text === "string"
  ) {
    return (response as { output_text: string }).output_text;
  }

  const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> })
    ?.output;

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => item.content ?? [])
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

async function getAllProducts() {
  if (!hasDatabase()) {
    return products;
  }

  await connectToDatabase();
  await ensureSeedData();
  const records = (await ProductModel.find().lean()) as ProductRecord[];
  return records.map((record) => ({
    ...record,
    category: record.category === "organic" ? "grains" : record.category,
    harvestDate:
      typeof record.harvestDate === "string"
        ? record.harvestDate
        : new Date(record.harvestDate ?? Date.now()).toISOString(),
  })) as Product[];
}

async function getAllUsers() {
  if (!hasDatabase()) {
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })) as UserRecord[];
  }

  await connectToDatabase();
  await ensureSeedData();
  return (await UserModel.find({}, { id: 1, name: 1, email: 1, role: 1, _id: 0 }).lean()) as UserRecord[];
}

async function getOrdersForUser(userId?: string) {
  if (!userId) {
    return [] as Order[];
  }

  if (!hasDatabase()) {
    return orders.filter((order) => order.userId === userId);
  }

  await connectToDatabase();
  const records = await OrderModel.find({ userId }).sort({ placedAt: -1 }).lean();

  return records.map((record) => ({
    id: String(record.id ?? record._id),
    userId: String(record.userId),
    items: ((record.items ?? []) as Array<{
      productId?: unknown;
      quantity?: unknown;
      price?: unknown;
    }>).map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity ?? 0),
      price: Number(item.price ?? 0),
    })),
    subtotal: Number(record.subtotal ?? 0),
    deliveryCharge: Number(record.deliveryCharge ?? 0),
    discount: Number(record.discount ?? 0),
    total: Number(record.total ?? 0),
    paymentMode: (record.paymentMode ?? "COD") as Order["paymentMode"],
    status: (record.status ?? "Processing") as Order["status"],
    placedAt: new Date(record.placedAt ?? Date.now()).toISOString(),
    estimatedDelivery: new Date(record.estimatedDelivery ?? Date.now()).toISOString(),
    address: {
      id: `addr-${String(record._id)}`,
      label: record.address?.label ?? "Delivery",
      recipient: record.address?.recipient ?? "Customer",
      line1: record.address?.line1 ?? "",
      city: record.address?.city ?? "",
      state: record.address?.state ?? "",
      pincode: record.address?.pincode ?? "",
      phone: record.address?.phone ?? "",
      primary: true,
    },
  })) as Order[];
}

async function saveChatMessage(input: {
  sessionId: string;
  userId?: string;
  role: "user" | "assistant";
  content: string;
  source?: "database" | "openai" | "faq" | "system";
}) {
  if (!hasDatabase()) {
    return normalizeChatMessage({
      id: makeId("chat"),
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      source: input.source,
      createdAt: new Date().toISOString(),
    });
  }

  await connectToDatabase();
  const doc = await ChatMessageModel.create({
    id: makeId("chat"),
    sessionId: input.sessionId,
    userId: input.userId,
    role: input.role,
    content: input.content,
    source: input.source ?? "system",
  });

  return normalizeChatMessage(doc.toObject());
}

export async function getChatHistory(sessionId: string) {
  if (!hasDatabase()) {
    return [] as ChatMessage[];
  }

  await connectToDatabase();
  const records = await ChatMessageModel.find({ sessionId }).sort({ createdAt: 1 }).lean();
  return records.map((record) =>
    normalizeChatMessage({
      id: record.id,
      sessionId: record.sessionId,
      role: record.role,
      content: record.content,
      source: record.source,
      createdAt: record.createdAt,
    }),
  );
}

export async function clearChatHistory(sessionId: string) {
  if (!hasDatabase()) {
    return { deletedCount: 0 };
  }

  await connectToDatabase();
  const result = await ChatMessageModel.deleteMany({ sessionId });
  return { deletedCount: result.deletedCount ?? 0 };
}

async function detectIntent(query: string): Promise<IntentResult> {
  const faqMatch = findFaqAnswer(query);

  if (/what products|show products|available products|what do you have/i.test(query)) {
    return { intent: "list_products" };
  }

  if (/price|cost|rate/i.test(query)) {
    return { intent: "price_lookup", productName: extractProductCandidate(query) };
  }

  if (/order|delivery status|track/i.test(query)) {
    return { intent: "order_status", orderId: extractOrderId(query) };
  }

  if (/my account|my profile|my email|who am i/i.test(query)) {
    return { intent: "user_profile" };
  }

  if (faqMatch) {
    return { intent: "faq", faqKey: faqMatch.key };
  }

  if (!openaiClient) {
    return { intent: "general" };
  }

  try {
    const response = await openaiClient.responses.create({
      model: env.openaiModel,
      temperature: 0,
      input: `Classify this user query for a farm marketplace chatbot.
Return JSON only with keys: intent, productName, orderId, faqKey.
Allowed intents: list_products, price_lookup, order_status, user_profile, faq, general.
User query: ${query}`,
    });

    const text = getResponseText(response);
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return { intent: "general" };
    }

    const parsed = JSON.parse(match[0]) as Partial<IntentResult>;
    if (!parsed.intent) {
      return { intent: "general" };
    }

    return {
      intent: parsed.intent,
      productName: parsed.productName,
      orderId: parsed.orderId,
      faqKey: parsed.faqKey,
    } as IntentResult;
  } catch {
    return { intent: "general" };
  }
}

async function answerFromDatabase(intent: IntentResult, context: ChatContext) {
  const allProducts = await getAllProducts();

  if (intent.intent === "list_products") {
    const visibleProductNames = getContextProductNames(context.pageContext);
    const contextualProducts = visibleProductNames.length
      ? allProducts.filter((product) =>
          visibleProductNames.some((name) => name.toLowerCase() === product.name.toLowerCase()),
        )
      : [];
    const topProducts = (contextualProducts.length ? contextualProducts : allProducts).slice(0, 8);

    return {
      source: "database" as const,
      content: topProducts.length
        ? `${contextualProducts.length ? "Here are the products visible on this page right now:" : "Here are some products available on CropKart:"}\n${topProducts
            .map((product) => `- ${formatProductLine(product)}`)
            .join("\n")}`
        : "I could not find any products in the database right now.",
    };
  }

  if (intent.intent === "price_lookup") {
    const rawCandidate = intent.productName ?? extractProductCandidate(context.message);
    const fallbackCandidate =
      context.pageContext?.focusProduct ?? getContextProductNames(context.pageContext)[0] ?? "";
    const resolvedCandidate =
      rawCandidate && !isGenericProductReference(rawCandidate) ? rawCandidate : fallbackCandidate;
    const candidate = resolvedCandidate.toLowerCase();

    if (!candidate) {
      return {
        source: "database" as const,
        content: "Tell me which product you want and I can check its price for you.",
      };
    }

    const matched = allProducts.find(
      (product) =>
        product.name.toLowerCase().includes(candidate) ||
        candidate.includes(product.name.toLowerCase()),
    );

    if (matched) {
      return {
        source: "database" as const,
        content: `${matched.name} costs ${formatCurrency(matched.price)} for ${matched.unit}.`,
      };
    }

    return {
      source: "database" as const,
      content: `I could not find a product matching "${resolvedCandidate || "that item"}" in the database.`,
    };
  }

  if (intent.intent === "order_status") {
    if (!context.user?.id) {
      return {
        source: "system" as const,
        content: "Please log in to check your order details or delivery status.",
      };
    }

    const userOrders = await getOrdersForUser(context.user.id);

    if (!userOrders.length) {
      return {
        source: "database" as const,
        content: "I could not find any orders for your account yet.",
      };
    }

    const targetOrder = intent.orderId
      ? userOrders.find((order) => order.id.toUpperCase() === intent.orderId?.toUpperCase())
      : userOrders[0];

    if (!targetOrder) {
      return {
        source: "database" as const,
        content: `I could not find order ${intent.orderId} for your account.`,
      };
    }

    return {
      source: "database" as const,
      content: `Order ${targetOrder.id} is currently "${targetOrder.status}". Total amount is ${formatCurrency(targetOrder.total)}, and estimated delivery is ${new Date(targetOrder.estimatedDelivery).toLocaleString("en-IN")}.`,
    };
  }

  if (intent.intent === "user_profile") {
    if (!context.user?.id) {
      return {
        source: "system" as const,
        content: "Please log in if you want me to answer account-related questions.",
      };
    }

    const allUsers = await getAllUsers();
    const matchedUser = allUsers.find((user) => user.id === context.user?.id);

    if (!matchedUser) {
      return {
        source: "database" as const,
        content: "I could not find your user profile in the database.",
      };
    }

    return {
      source: "database" as const,
      content: `You are signed in as ${matchedUser.name} (${matchedUser.email}) with the role "${matchedUser.role}".`,
    };
  }

  return null;
}

async function answerGeneralQuestion(query: string, productsContext: Product[], context: ChatContext) {
  const faqMatch = findFaqAnswer(query);

  if (faqMatch) {
    return {
      source: "faq" as const,
      content: faqMatch.answer,
    };
  }

  if (!openaiClient) {
    return {
      source: "system" as const,
      content:
        "I can answer product, price, account, and order questions from the website database. For broader questions, add OPENAI_API_KEY to enable AI answers.",
    };
  }

  const productSummary = productsContext
    .slice(0, 12)
    .map((product) => `${product.name} | ${formatCurrency(product.price)} | ${product.unit} | ${product.category}`)
    .join("\n");
  const pageContextSummary = context.pageContext
    ? [
        context.pageContext.pathname ? `Path: ${context.pageContext.pathname}` : "",
        context.pageContext.pageTitle ? `Page title: ${context.pageContext.pageTitle}` : "",
        context.pageContext.focusProduct ? `Focused product: ${context.pageContext.focusProduct}` : "",
        getContextProductNames(context.pageContext).length
          ? `Visible products: ${getContextProductNames(context.pageContext).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No page context provided.";

  const response = await openaiClient.responses.create({
    model: env.openaiModel,
    temperature: 0.4,
    instructions:
      "You are CropKart's website assistant. Answer clearly and briefly. Use the marketplace and current-page context provided. Do not invent prices, inventory, or order details.",
    input: `Marketplace context:
CropKart sells farm produce, grains, dairy, seeds, fertilisers, crop care, and agri inputs.
Known products:
${productSummary}

Current page context:
${pageContextSummary}

User question:
${query}`,
  });

  return {
    source: "openai" as const,
    content:
      getResponseText(response) ||
      "I could not generate a good answer right now. Please try asking in a different way.",
  };
}

export async function processChatMessage(context: ChatContext) {
  const trimmed = context.message.trim();
  const userMessage = await saveChatMessage({
    sessionId: context.sessionId,
    userId: context.user?.id,
    role: "user",
    content: trimmed,
    source: "system",
  });

  const intent = await detectIntent(trimmed);
  const directAnswer = await answerFromDatabase(intent, context);
  const allProducts = directAnswer ? [] : await getAllProducts();
  const answer =
    directAnswer ??
    (await answerGeneralQuestion(trimmed, allProducts, context));

  const assistantMessage = await saveChatMessage({
    sessionId: context.sessionId,
    userId: context.user?.id,
    role: "assistant",
    content: answer.content,
    source: answer.source,
  });

  return {
    sessionId: context.sessionId,
    intent: intent.intent,
    userMessage,
    assistantMessage,
  };
}
