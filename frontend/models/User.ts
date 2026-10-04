import { Schema, model, models } from "mongoose";

const addressSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    recipient: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    primary: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["buyer", "farmer", "admin"],
      default: "buyer",
      index: true,
    },
    avatar: String,
    farmerId: String,
    wishlist: { type: [String], default: [] },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

export const UserModel = models.User || model("User", userSchema);
