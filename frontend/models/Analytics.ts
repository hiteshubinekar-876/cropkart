import { Schema, model, models } from "mongoose";

const analyticsSchema = new Schema(
  {
    date: { type: Date, index: true },
    orders: Number,
    gmv: Number,
    activeUsers: Number,
    activeFarmers: Number,
    categoryBreakdown: [
      {
        category: String,
        value: Number,
      },
    ],
  },
  { timestamps: true },
);

export const AnalyticsModel = models.Analytics || model("Analytics", analyticsSchema);
