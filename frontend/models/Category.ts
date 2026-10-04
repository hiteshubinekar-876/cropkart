import { Schema, model, models } from "mongoose";

const categorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    accent: String,
  },
  { timestamps: true },
);

export const CategoryModel = models.Category || model("Category", categorySchema);
