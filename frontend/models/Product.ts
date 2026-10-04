import { Schema, model, models } from "mongoose";

const productSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    category: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    description: { type: String, required: true },
    tags: { type: [String], default: [] },
    unit: { type: String, required: true },
    stock: { type: Number, default: 0, index: true },
    organic: { type: Boolean, default: false, index: true },
    price: { type: Number, required: true, index: true },
    originalPrice: { type: Number, required: true },
    deliveryTime: { type: String, required: true },
    rating: { type: Number, default: 0, index: true },
    reviewCount: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    color: { type: String, default: "from-green-100 to-emerald-50" },
    harvestDate: Date,
    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, price: 1, rating: -1 });

export const ProductModel = models.Product || model("Product", productSchema);
