import { Schema, model, models } from "mongoose";

const inquirySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["sell", "bulk", "contact"],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: String,
    company: String,
    subject: String,
    requirement: { type: String, required: true },
  },
  { timestamps: true },
);

export const InquiryModel = models.Inquiry || model("Inquiry", inquirySchema);
