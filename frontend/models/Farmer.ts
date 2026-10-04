import { Schema, model, models } from "mongoose";

const farmerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    farmName: { type: String, required: true },
    shopName: String,
    shopLocation: String,
    phone: String,
    state: { type: String, required: true, index: true },
    district: { type: String, required: true },
    rating: { type: Number, default: 0, index: true },
    verified: { type: Boolean, default: false, index: true },
    yearsActive: { type: Number, default: 0 },
    speciality: { type: [String], default: [] },
    responseTime: { type: String, default: "within the same day" },
  },
  { timestamps: true },
);

export const FarmerModel = models.Farmer || model("Farmer", farmerSchema);
