import { Schema, model, models } from "mongoose";

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: String,
    rating: { type: Number, required: true, index: true },
    comment: String,
  },
  { timestamps: true },
);

export const ReviewModel = models.Review || model("Review", reviewSchema);
