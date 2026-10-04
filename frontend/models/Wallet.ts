import { Schema, model, models } from "mongoose";

const walletTransactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "withdraw", "debit", "credit"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    orderId: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const walletSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    transactions: { type: [walletTransactionSchema], default: [] },
  },
  { timestamps: true },
);

export const WalletModel = models.Wallet || model("Wallet", walletSchema);
