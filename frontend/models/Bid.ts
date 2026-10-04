import { Schema, model, models } from "mongoose";

const bidSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    auctionId: { type: String, required: true, index: true },
    bidderUserId: { type: String, required: true, index: true },
    bidderName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

bidSchema.index({ auctionId: 1, createdAt: -1 });

export const BidModel = models.Bid || model("Bid", bidSchema);
