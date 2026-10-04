import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import type { Auction, AuctionBid, Role } from "@/lib/types";
import { AuctionModel } from "@/models/Auction";
import { BidModel } from "@/models/Bid";

type AuctionDoc = Auction & {
  endTime: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type BidDoc = Omit<AuctionBid, "createdAt"> & {
  createdAt?: string | Date;
};

export class AuctionError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 400,
    code = "AUCTION_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

function normalizeAuction(auction: AuctionDoc): Auction {
  return {
    ...auction,
    currentHighestBid:
      typeof auction.currentHighestBid === "number" ? auction.currentHighestBid : null,
    endTime:
      typeof auction.endTime === "string"
        ? auction.endTime
        : new Date(auction.endTime).toISOString(),
    createdAt:
      typeof auction.createdAt === "string"
        ? auction.createdAt
        : auction.createdAt
          ? new Date(auction.createdAt).toISOString()
          : undefined,
    updatedAt:
      typeof auction.updatedAt === "string"
        ? auction.updatedAt
        : auction.updatedAt
          ? new Date(auction.updatedAt).toISOString()
          : undefined,
  };
}

function normalizeBid(bid: BidDoc): AuctionBid {
  return {
    ...bid,
    createdAt:
      typeof bid.createdAt === "string"
        ? bid.createdAt
        : new Date(bid.createdAt ?? Date.now()).toISOString(),
  };
}

function requireDatabase() {
  if (!hasDatabase()) {
    throw new AuctionError(
      "MongoDB is not configured. Add MONGODB_URI to enable auctions.",
      500,
      "DATABASE_NOT_CONFIGURED",
    );
  }
}

function getMinimumNextBid(auction: Pick<Auction, "basePrice" | "bidIncrement" | "currentHighestBid">) {
  if (typeof auction.currentHighestBid === "number") {
    return auction.currentHighestBid + auction.bidIncrement;
  }

  return auction.basePrice;
}

export async function finalizeExpiredAuctions() {
  if (!hasDatabase()) {
    return;
  }

  await connectToDatabase();

  const expired = (await AuctionModel.find({
    status: "active",
    endTime: { $lte: new Date() },
  }).lean()) as AuctionDoc[];

  if (!expired.length) {
    return;
  }

  await Promise.all(
    expired.map((auction) =>
      AuctionModel.updateOne(
        { id: auction.id, status: "active" },
        {
          $set: {
            status: "ended",
            winnerUserId: auction.highestBidderId,
            winnerName: auction.highestBidderName,
          },
        },
      ),
    ),
  );
}

async function getAuctionDocumentById(id: string) {
  if (!hasDatabase()) {
    return null;
  }

  await connectToDatabase();
  await finalizeExpiredAuctions();
  return (await AuctionModel.findOne({ id }).lean()) as AuctionDoc | null;
}

export async function createAuction(input: {
  sellerUserId: string;
  sellerFarmerId?: string;
  sellerName: string;
  productName: string;
  image?: string;
  description: string;
  quantity: string;
  basePrice: number;
  bidIncrement: number;
  auctionEndTime: string;
}) {
  requireDatabase();
  await connectToDatabase();

  const endTime = new Date(input.auctionEndTime);

  if (Number.isNaN(endTime.getTime())) {
    throw new AuctionError("Auction end time is invalid.", 400, "INVALID_END_TIME");
  }

  if (endTime <= new Date()) {
    throw new AuctionError(
      "Auction end time must be in the future.",
      400,
      "INVALID_END_TIME",
    );
  }

  const auction = await AuctionModel.create({
    id: `auc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    sellerUserId: input.sellerUserId,
    sellerFarmerId: input.sellerFarmerId,
    sellerName: input.sellerName,
    productName: input.productName,
    image: input.image,
    description: input.description,
    quantity: input.quantity,
    basePrice: input.basePrice,
    bidIncrement: input.bidIncrement,
    currentHighestBid: null,
    endTime,
    status: "active",
    bidCount: 0,
  });

  return normalizeAuction(auction.toObject() as AuctionDoc);
}

export async function getActiveAuctions() {
  if (!hasDatabase()) {
    return [] as Auction[];
  }

  await connectToDatabase();
  await finalizeExpiredAuctions();

  const auctions = (await AuctionModel.find({
    status: "active",
    endTime: { $gt: new Date() },
  })
    .sort({ endTime: 1, createdAt: -1 })
    .lean()) as AuctionDoc[];

  return auctions.map(normalizeAuction);
}

export async function getSellerAuctions(sellerUserId: string) {
  if (!hasDatabase()) {
    return [] as Auction[];
  }

  await connectToDatabase();
  await finalizeExpiredAuctions();

  const auctions = (await AuctionModel.find({ sellerUserId })
    .sort({ createdAt: -1 })
    .lean()) as AuctionDoc[];

  return auctions.map(normalizeAuction);
}

export async function getAuctionById(id: string) {
  const auction = await getAuctionDocumentById(id);
  return auction ? normalizeAuction(auction) : undefined;
}

export async function getBidHistory(auctionId: string) {
  if (!hasDatabase()) {
    return [] as AuctionBid[];
  }

  await connectToDatabase();

  const bids = (await BidModel.find({ auctionId }).sort({ createdAt: -1 }).lean()) as BidDoc[];
  return bids.map(normalizeBid);
}

export async function placeBid(input: {
  auctionId: string;
  bidderUserId: string;
  bidderName: string;
  amount: number;
  role: Role;
}) {
  requireDatabase();
  await connectToDatabase();

  if (!["buyer", "admin"].includes(input.role)) {
    throw new AuctionError(
      "Only buyer accounts can place bids.",
      403,
      "ROLE_NOT_ALLOWED",
    );
  }

  await finalizeExpiredAuctions();

  const session = await mongoose.startSession();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        let updatedAuction: Auction | null = null;

        await session.withTransaction(async () => {
          const auction = await AuctionModel.findOne({ id: input.auctionId }).session(session);

          if (!auction) {
            throw new AuctionError("Auction not found.", 404, "AUCTION_NOT_FOUND");
          }

          if (auction.status !== "active" || auction.endTime <= new Date()) {
            throw new AuctionError("This auction has already ended.", 409, "AUCTION_ENDED");
          }

          if (auction.sellerUserId === input.bidderUserId) {
            throw new AuctionError(
              "Sellers cannot bid on their own auction.",
              403,
              "SELF_BID_NOT_ALLOWED",
            );
          }

          const currentHighestBid =
            typeof auction.currentHighestBid === "number" ? auction.currentHighestBid : null;
          const minimumBid = getMinimumNextBid({
            basePrice: auction.basePrice,
            bidIncrement: auction.bidIncrement,
            currentHighestBid,
          });

          if (input.amount < minimumBid) {
            throw new AuctionError(
              `Bid must be at least ${minimumBid}.`,
              409,
              "LOW_BID",
              { minimumBid },
            );
          }

          const updated = await AuctionModel.findOneAndUpdate(
            {
              id: input.auctionId,
              status: "active",
              endTime: { $gt: new Date() },
              updatedAt: auction.updatedAt,
            },
            {
              $set: {
                currentHighestBid: input.amount,
                highestBidderId: input.bidderUserId,
                highestBidderName: input.bidderName,
              },
              $inc: { bidCount: 1 },
            },
            { new: true, session },
          );

          if (!updated) {
            throw new AuctionError(
              "Another bidder updated this auction first. Please try again.",
              409,
              "CONCURRENT_BID_CONFLICT",
            );
          }

          await BidModel.create(
            [
              {
                id: `bid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                auctionId: input.auctionId,
                bidderUserId: input.bidderUserId,
                bidderName: input.bidderName,
                amount: input.amount,
              },
            ],
            { session },
          );

          updatedAuction = normalizeAuction(updated.toObject() as AuctionDoc);
        });

        if (!updatedAuction) {
          throw new AuctionError(
            "Unable to store bid at this time.",
            500,
            "BID_NOT_SAVED",
          );
        }

        return updatedAuction;
      } catch (error) {
        if (
          error instanceof AuctionError &&
          error.code === "CONCURRENT_BID_CONFLICT" &&
          attempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AuctionError(
      "Could not place bid because the auction was updated by another bidder. Please retry.",
      409,
      "CONCURRENT_BID_CONFLICT",
    );
  } finally {
    await session.endSession();
  }
}
