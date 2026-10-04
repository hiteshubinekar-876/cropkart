import { Schema, model, models } from "mongoose";

const orderSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    subtotal: Number,
    deliveryCharge: Number,
    discount: Number,
    total: { type: Number, index: true },
    paymentMode: {
      type: String,
      enum: ["COD", "UPI", "Razorpay", "Stripe", "Wallet"],
      default: "Wallet",
    },
    status: {
      type: String,
      enum: ["Processing", "Packed", "In Transit", "Delivered", "Cancelled"],
      default: "Processing",
      index: true,
    },
    placedAt: { type: Date, index: true },
    estimatedDelivery: Date,
    address: {
      id: String,
      label: String,
      recipient: String,
      line1: String,
      city: String,
      state: String,
      pincode: String,
      phone: String,
      primary: Boolean,
    },
  },
  { timestamps: true },
);

export const OrderModel = models.Order || model("Order", orderSchema);
