import cors from "cors";
import express from "express";
import { createAuctionSchema, placeBidSchema } from "@/lib/schemas";
import { getMandiRates, getWeatherInsights } from "@/lib/datagov";
import { orders } from "@/lib/mock-data";
import {
  AuctionError,
  createAuction,
  getActiveAuctions,
  getAuctionById,
  getBidHistory,
  placeBid,
} from "@/lib/services/auctions";
import { getChatHistory, processChatMessage } from "@/lib/services/chatbot";
import { getProducts, searchSuggestions } from "@/lib/services/catalog";
import { createOrder } from "@/lib/services/orders";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "greencart-express-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/products", async (request, response) => {
  const products = await getProducts({
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    category: typeof request.query.category === "string" ? request.query.category : undefined,
    state: typeof request.query.state === "string" ? request.query.state : undefined,
    organic: typeof request.query.organic === "string" ? request.query.organic : undefined,
    rating: typeof request.query.rating === "string" ? request.query.rating : undefined,
    sort: typeof request.query.sort === "string" ? request.query.sort : undefined,
  });

  response.json({ products });
});

app.get("/search", async (request, response) => {
  const q = typeof request.query.q === "string" ? request.query.q : "";
  const results = await searchSuggestions(q);
  response.json({ results });
});

app.get("/market", async (_request, response) => {
  const rates = await getMandiRates();
  response.json({ rates });
});

app.get("/weather", async (_request, response) => {
  const insights = await getWeatherInsights();
  response.json({ insights });
});

app.get("/orders", (_request, response) => {
  response.json({ orders });
});

app.post("/orders", (request, response) => {
  const order = createOrder(request.body);
  response.status(201).json({ order });
});

app.get("/chat", async (request, response) => {
  const sessionId =
    typeof request.query.sessionId === "string" ? request.query.sessionId : "";
  const messages = sessionId ? await getChatHistory(sessionId) : [];
  response.json({ messages });
});

app.post("/chat", async (request, response) => {
  const sessionId =
    typeof request.body.sessionId === "string" ? request.body.sessionId : "";
  const message =
    typeof request.body.message === "string" ? request.body.message : "";

  if (!sessionId || !message.trim()) {
    response.status(400).json({ error: "sessionId and message are required." });
    return;
  }

  const result = await processChatMessage({
    sessionId,
    message,
    user: request.body.userId
      ? {
          id: String(request.body.userId),
          name: typeof request.body.userName === "string" ? request.body.userName : "Website User",
          email: typeof request.body.userEmail === "string" ? request.body.userEmail : null,
          role: request.body.role === "farmer" || request.body.role === "admin" ? request.body.role : "buyer",
        }
      : undefined,
  });

  response.status(201).json(result);
});

app.get("/auctions", async (_request, response) => {
  const auctions = await getActiveAuctions();
  response.json({ auctions });
});

app.get("/auctions/:id", async (request, response) => {
  const auction = await getAuctionById(request.params.id);

  if (!auction) {
    response.status(404).json({ error: "Auction not found." });
    return;
  }

  response.json({ auction });
});

app.get("/auctions/:id/bids", async (request, response) => {
  try {
    const bids = await getBidHistory(request.params.id);
    response.json({ bids });
  } catch (error) {
    if (error instanceof AuctionError) {
      response.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }

    response.status(500).json({ error: "Unable to load bid history." });
  }
});

app.post("/auctions", async (request, response) => {
  const parsed = createAuctionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid auction payload.", issues: parsed.error.flatten() });
    return;
  }

  try {
    const auction = await createAuction({
      sellerUserId: String(request.body.sellerUserId ?? ""),
      sellerFarmerId: typeof request.body.sellerFarmerId === "string" ? request.body.sellerFarmerId : undefined,
      sellerName: String(request.body.sellerName ?? "Farmer"),
      productName: parsed.data.productName,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      basePrice: parsed.data.basePrice,
      bidIncrement: parsed.data.bidIncrement,
      auctionEndTime: parsed.data.auctionEndTime,
    });

    response.status(201).json({ auction });
  } catch (error) {
    if (error instanceof AuctionError) {
      response.status(error.statusCode).json({ error: error.message, code: error.code, details: error.details });
      return;
    }

    response.status(500).json({ error: "Unable to create auction." });
  }
});

app.post("/auctions/:id/bids", async (request, response) => {
  const parsed = placeBidSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid bid payload.", issues: parsed.error.flatten() });
    return;
  }

  try {
    const auction = await placeBid({
      auctionId: request.params.id,
      bidderUserId: String(request.body.bidderUserId ?? ""),
      bidderName: String(request.body.bidderName ?? "Buyer"),
      amount: parsed.data.amount,
      role: request.body.role === "admin" ? "admin" : "buyer",
    });

    response.status(201).json({ auction });
  } catch (error) {
    if (error instanceof AuctionError) {
      response.status(error.statusCode).json({ error: error.message, code: error.code, details: error.details });
      return;
    }

    response.status(500).json({ error: "Unable to place bid." });
  }
});

const port = Number(process.env.EXPRESS_PORT ?? 4000);

app.listen(port, () => {
  console.log(`GreenCart Express API listening on http://localhost:${port}`);
});
