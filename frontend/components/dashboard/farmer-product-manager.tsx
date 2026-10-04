"use client";

import { useState } from "react";
import { ProductVisual } from "@/components/shared/product-visual";
import type { Product } from "@/lib/types";
import { uploadImageFile } from "@/lib/upload-client";
import { formatCurrency } from "@/utils/format";

type FarmerProductManagerProps = {
  initialProducts: Product[];
  farmerId: string;
  farmerName: string;
};

const defaultImage = "/images/photos/farm-landscape.jpg";

export function FarmerProductManager({
  initialProducts,
  farmerId,
  farmerName,
}: FarmerProductManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState("");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [stockLoadingId, setStockLoadingId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "vegetables",
    price: "0",
    originalPrice: "0",
    unit: "",
    state: "Punjab",
    stock: "0",
    organic: false,
    deliveryTime: "2-4 days",
    description: "",
    tags: "",
    images: defaultImage,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/farmer/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice),
        unit: form.unit,
        state: form.state,
        stock: Number(form.stock),
        organic: form.organic,
        deliveryTime: form.deliveryTime,
        description: form.description,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        images: form.images
          .split(",")
          .map((image) => image.trim())
          .filter(Boolean),
        farmerId,
        farmerName,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      message?: string;
      product?: Product;
    };

    if (!response.ok || !data.product) {
      setLoading(false);
      setMessage(data.error ?? "Unable to add product right now.");
      return;
    }

    setProducts((current) => [data.product!, ...current]);
    setForm({
      name: "",
      category: "vegetables",
      price: "0",
      originalPrice: "0",
      unit: "",
      state: "Punjab",
      stock: "0",
      organic: false,
      deliveryTime: "2-4 days",
      description: "",
      tags: "",
      images: defaultImage,
    });
    setLoading(false);
    setShowForm(false);
    setMessage(data.message ?? "Product created successfully.");
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setUploadingImages(true);
    setMessage("");

    try {
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadImageFile(file, "products")),
      );

      setForm((current) => {
        const existingImages = current.images
          .split(",")
          .map((image) => image.trim())
          .filter(Boolean)
          .filter((image) => image !== defaultImage);

        return {
          ...current,
          images: [...existingImages, ...uploadedUrls].join(", "),
        };
      });
      setMessage("Image uploaded successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  }

  async function handleStockUpdate(productId: string) {
    const nextStock = Number(stockDraft[productId] ?? "0");
    setMessage("");
    setStockLoadingId(productId);

    const response = await fetch(`/api/farmer/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: nextStock }),
    });

    const data = (await response.json()) as {
      error?: string;
      message?: string;
      product?: Product;
    };

    setStockLoadingId(null);

    if (!response.ok || !data.product) {
      setMessage(data.error ?? "Unable to update stock right now.");
      return;
    }

    setProducts((current) =>
      current.map((product) => (product.id === productId ? data.product! : product)),
    );
    setEditingStockId(null);
    setStockDraft((current) => ({
      ...current,
      [productId]: String(data.product?.stock ?? nextStock),
    }));
    setMessage(data.message ?? "Stock updated successfully.");
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    const confirmed = window.confirm(
      `Remove "${productName}" from your dashboard and marketplace catalog?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setDeletingProductId(productId);

    const response = await fetch(`/api/farmer/products/${productId}`, {
      method: "DELETE",
    });

    const data = (await response.json()) as {
      error?: string;
      message?: string;
    };

    setDeletingProductId(null);

    if (!response.ok) {
      setMessage(data.error ?? "Unable to remove product right now.");
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== productId));

    if (editingStockId === productId) {
      setEditingStockId(null);
    }

    setStockDraft((current) => {
      const nextDraft = { ...current };
      delete nextDraft[productId];
      return nextDraft;
    });
    setMessage(data.message ?? "Product removed successfully.");
  }

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-extrabold">Your products</p>
          <p className="mt-2 text-sm text-ink-500">
            Add products directly to the marketplace and manage your visible catalog.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="primary-button">
          {showForm ? "Close form" : "Add new product"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-5 lg:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="input-shell"
            placeholder="Product name"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="input-shell"
          >
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="grains">Grains & Pantry</option>
            <option value="dairy">Dairy</option>
            <option value="seeds">Seeds</option>
            <option value="fertilisers">Fertilisers</option>
            <option value="crop-care">Crop Care</option>
          </select>
          <input
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            className="input-shell"
            placeholder="Selling price"
            type="number"
            min="1"
            required
          />
          <input
            value={form.originalPrice}
            onChange={(event) => setForm((current) => ({ ...current, originalPrice: event.target.value }))}
            className="input-shell"
            placeholder="Original price"
            type="number"
            min="1"
            required
          />
          <input
            value={form.unit}
            onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            className="input-shell"
            placeholder="Unit, for example 5 kg bag"
            required
          />
          <input
            value={form.state}
            onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
            className="input-shell"
            placeholder="State"
            required
          />
          <input
            value={form.stock}
            onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
            className="input-shell"
            placeholder="Stock"
            type="number"
            min="0"
            required
          />
          <input
            value={form.deliveryTime}
            onChange={(event) => setForm((current) => ({ ...current, deliveryTime: event.target.value }))}
            className="input-shell"
            placeholder="Delivery time"
          />
          <input
            value={form.tags}
            onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
            className="input-shell lg:col-span-2"
            placeholder="Tags separated by commas"
          />
          <input
            value={form.images}
            onChange={(event) => setForm((current) => ({ ...current, images: event.target.value }))}
            className="input-shell lg:col-span-2"
            placeholder="Online image URLs separated by commas"
            required
          />
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-600">Upload product images</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={(event) => void handleImageUpload(event)}
              className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700"
            />
            <p className="mt-2 text-xs text-ink-500">
              Uploaded images are saved to the database and added to the product image list.
            </p>
          </div>
          {form.images ? (
            <div className="lg:col-span-2">
              <ProductVisual
                title={form.name || "Product preview"}
                subtitle={form.unit || "Uploaded image preview"}
                palette={form.images.split(",").map((image) => image.trim()).filter(Boolean)[0] ?? defaultImage}
                className="h-40"
              />
            </div>
          ) : null}
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="input-shell min-h-32 lg:col-span-2"
            placeholder="Describe the product"
            required
          />
          <label className="flex items-center gap-3 text-sm font-medium text-ink-600 lg:col-span-2">
            <input
              checked={form.organic}
              onChange={(event) => setForm((current) => ({ ...current, organic: event.target.checked }))}
              type="checkbox"
            />
            Organic product
          </label>
          {message ? <p className="text-sm text-brand-700 lg:col-span-2">{message}</p> : null}
          <button type="submit" disabled={loading || uploadingImages} className="primary-button lg:col-span-2 disabled:opacity-60">
            {uploadingImages ? "Uploading image..." : loading ? "Saving product..." : "Save product"}
          </button>
        </form>
      ) : null}

      {message && !showForm ? <p className="mt-4 text-sm text-brand-700">{message}</p> : null}

      <div className="mt-6 space-y-4">
        {products.map((product) => (
          <div key={product.id} className="grid gap-4 rounded-2xl border border-brand-100 p-4 sm:grid-cols-[200px_1fr_auto]">
            <ProductVisual
              title={product.name}
              subtitle={product.unit}
              palette={product.images[0]}
              className="h-32"
            />
            <div>
              <p className="text-lg font-bold">{product.name}</p>
              <p className="mt-2 text-sm text-ink-500">
                Stock: {product.stock} | Delivery: {product.deliveryTime}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-xl bg-brand-50 px-3 py-1 text-xs font-semibold text-ink-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-extrabold">{formatCurrency(product.price)}</p>
              {editingStockId === product.id ? (
                <div className="mt-4 space-y-3">
                  <input
                    value={stockDraft[product.id] ?? String(product.stock)}
                    onChange={(event) =>
                      setStockDraft((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
                    }
                    className="input-shell w-full sm:w-28"
                    type="number"
                    min="0"
                  />
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => void handleStockUpdate(product.id)}
                      disabled={stockLoadingId === product.id}
                      className="primary-button px-4 py-2 text-xs disabled:opacity-60"
                    >
                      {stockLoadingId === product.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStockId(null);
                        setStockDraft((current) => ({
                          ...current,
                          [product.id]: String(product.stock),
                        }));
                      }}
                      className="secondary-button px-4 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStockId(product.id);
                      setStockDraft((current) => ({
                        ...current,
                        [product.id]: String(product.stock),
                      }));
                    }}
                    className="secondary-button"
                  >
                    Update stock
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteProduct(product.id, product.name)}
                    disabled={deletingProductId === product.id}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingProductId === product.id ? "Removing..." : "Remove product"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
