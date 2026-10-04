import { Schema, model, models } from "mongoose";

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
      },
    ],
    couponCode: String,
  },
  { timestamps: true },
);

export const CartModel = models.Cart || model("Cart", cartSchema);
