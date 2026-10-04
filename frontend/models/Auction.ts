import { Schema, model, models } from "mongoose";

const auctionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    sellerUserId: { type: String, required: true, index: true },
    sellerFarmerId: { type: String, index: true },
    sellerName: { type: String, required: true },
    productName: { type: String, required: true, index: true },
    image: String,
    description: { type: String, required: true },
    quantity: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 1 },
    bidIncrement: { type: Number, required: true, min: 1 },
    currentHighestBid: { type: Number, default: null },
    highestBidderId: String,
    highestBidderName: String,
    winnerUserId: String,
    winnerName: String,
    endTime: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },
    bidCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

auctionSchema.index({ status: 1, endTime: 1 });

export const AuctionModel = models.Auction || model("Auction", auctionSchema);
