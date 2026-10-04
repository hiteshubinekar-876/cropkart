import { Schema, model, models } from "mongoose";

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    label: String,
    recipient: String,
    line1: String,
    city: String,
    state: String,
    pincode: { type: String, index: true },
    phone: String,
    primary: Boolean,
  },
  { timestamps: true },
);

export const AddressModel = models.Address || model("Address", addressSchema);
