import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { categories, farmers, orders, products, reviewsByProduct, users } from "@/lib/mock-data";
import type { Category, DemoUser, FarmerProfile, Order, Product } from "@/lib/types";
import { CategoryModel } from "@/models/Category";
import { FarmerModel } from "@/models/Farmer";
import { ProductModel } from "@/models/Product";
import { UserModel } from "@/models/User";
import { getOrdersByUserId } from "@/lib/services/orders";
import { ensureSeedData } from "@/lib/services/seed";

export type ProductFilters = {
  search?: string;
  category?: string;
  state?: string;
  organic?: string;
  rating?: string;
  sort?: string;
};

function hasDatabase() {
  return Boolean(env.mongodbUri);
}

type ProductRecord = Product & {
  harvestDate: string | Date;
};

const legacyProductImages: Record<string, string> = {
  "/images/banners/field-morning.svg": "/images/photos/farm-landscape.jpg",
  "/images/banners/farm-house.svg": "/images/photos/seedlings.jpg",
  "/images/banners/vegetable-mandi.svg": "/images/photos/vegetable-market.jpg",
  "/images/products/mango-crate.svg": "/images/photos/mangoes.jpg",
  "/images/products/leafy-greens.svg": "/images/products/palak.webp",
  "/images/products/dairy-duo.svg": "/images/photos/dairy-milk.jpg",
  "/images/products/grain-sack.svg": "/images/photos/rice-grains.jpg",
  "/images/products/seed-packet.svg": "/images/photos/seedlings.jpg",
  "/images/products/onion-basket.svg": "/images/photos/onions.jpg",
  "/images/products/spice-bowls.svg": "/images/photos/spices.jpg",
  "/images/products/banana-cart.svg": "/images/photos/bananas.jpg",
  "/images/products/tomato-crate.svg": "/images/photos/tomatoes.jpg",
};

type FarmerRecord = FarmerProfile;
type CategoryRecord = Category;
type UserRecord = DemoUser;

function normalizeProduct(product: ProductRecord): Product {
  return {
    ...product,
    images: product.images.map((image) => legacyProductImages[image] ?? image),
    category: product.category === "organic" ? "grains" : product.category,
    harvestDate:
      typeof product.harvestDate === "string"
        ? product.harvestDate
        : new Date(product.harvestDate).toISOString(),
  };
}

function normalizeFarmer(farmer: FarmerRecord): FarmerProfile {
  return {
    ...farmer,
  };
}

function normalizeCategory(category: CategoryRecord): Category {
  return {
    ...category,
    id: category.id === "organic" ? "grains" : category.id,
    name: category.id === "grains" ? "Grains & Pantry" : category.name,
    slug: category.slug === "organic" ? "grains" : category.slug,
    description:
      category.slug === "grains"
        ? "Atta, chawal, dal, masalas and pantry staples from local growers."
        : category.description,
  };
}

function normalizeUser(user: UserRecord): DemoUser {
  return {
    ...user,
  };
}

function sortProducts(list: Product[], sort?: string) {
  const sorted = [...list];

  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "popularity":
      sorted.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      sorted.sort((a, b) => Number(Boolean(b.trending)) - Number(Boolean(a.trending)));
      break;
  }

  return sorted;
}

async function getMongoProducts(filters: ProductFilters = {}) {
  await connectToDatabase();
  await ensureSeedData();

  const query: Record<string, unknown> = {};

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { farmerName: { $regex: filters.search, $options: "i" } },
      { tags: { $elemMatch: { $regex: filters.search, $options: "i" } } },
    ];
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.state) {
    query.state = filters.state;
  }

  if (filters.organic) {
    query.organic = filters.organic === "true";
  }

  if (filters.rating) {
    query.rating = { $gte: Number(filters.rating) };
  }

  const mongoProducts = (await ProductModel.find(query).lean()) as ProductRecord[];
  return sortProducts(mongoProducts.map(normalizeProduct), filters.sort);
}

async function getMongoCategories() {
  await connectToDatabase();
  await ensureSeedData();
  const mongoCategories = (await CategoryModel.find().sort({ name: 1 }).lean()) as CategoryRecord[];
  return mongoCategories
    .filter((category) => category.slug !== "organic")
    .map(normalizeCategory);
}

async function getMongoFarmers() {
  await connectToDatabase();
  await ensureSeedData();
  const mongoFarmers = (await FarmerModel.find().lean()) as FarmerRecord[];
  return mongoFarmers.map(normalizeFarmer);
}

export async function getCategories() {
  if (!hasDatabase()) {
    return categories;
  }

  return getMongoCategories();
}

export async function getFarmers() {
  if (!hasDatabase()) {
    return farmers;
  }

  return getMongoFarmers();
}

export async function getProducts(filters: ProductFilters = {}) {
  if (!hasDatabase()) {
    let filtered = [...products];

    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          product.farmerName.toLowerCase().includes(query),
      );
    }

    if (filters.category) {
      filtered = filtered.filter((product) => product.category === filters.category);
    }

    if (filters.state) {
      filtered = filtered.filter((product) => product.state === filters.state);
    }

    if (filters.organic) {
      const organic = filters.organic === "true";
      filtered = filtered.filter((product) => product.organic === organic);
    }

    if (filters.rating) {
      filtered = filtered.filter((product) => product.rating >= Number(filters.rating));
    }

    return sortProducts(filtered, filters.sort);
  }

  return getMongoProducts(filters);
}

export async function getFeaturedProducts() {
  return (await getProducts()).filter((product) => product.featured);
}

export async function getTrendingProducts() {
  return (await getProducts()).filter((product) => product.trending);
}

export async function getProductBySlug(slug: string) {
  if (!hasDatabase()) {
    return products.find((product) => product.slug === slug);
  }

  await connectToDatabase();
  await ensureSeedData();

  const mongoProduct = (await ProductModel.findOne({ slug }).lean()) as ProductRecord | null;
  return mongoProduct ? normalizeProduct(mongoProduct) : undefined;
}

export async function getProductById(id: string) {
  if (!hasDatabase()) {
    return products.find((product) => product.id === id);
  }

  await connectToDatabase();
  await ensureSeedData();

  const mongoProduct = (await ProductModel.findOne({ id }).lean()) as ProductRecord | null;
  return mongoProduct ? normalizeProduct(mongoProduct) : undefined;
}

export async function getRelatedProducts(product: Product) {
  const catalog = await getProducts();

  return catalog
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category === product.category || candidate.state === product.state),
    )
    .slice(0, 4);
}

export async function getProductReviews(productId: string) {
  return reviewsByProduct[productId] ?? [];
}

export async function searchSuggestions(query: string) {
  if (!query.trim()) {
    return [];
  }

  const lowered = query.toLowerCase();
  return (await getProducts({ search: query }))
    .filter(
      (product) =>
        product.name.toLowerCase().includes(lowered) ||
        product.category.toLowerCase().includes(lowered) ||
        product.tags.some((tag) => tag.toLowerCase().includes(lowered)),
    )
    .slice(0, 6)
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      label: product.name,
      category: product.category,
      farmerName: product.farmerName,
    }));
}

export async function getStates() {
  return Array.from(new Set((await getProducts()).map((product) => product.state))).sort();
}

export async function getUserByEmail(email: string): Promise<DemoUser | undefined> {
  if (!hasDatabase()) {
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  await connectToDatabase();
  await ensureSeedData();

  const mongoUser = (await UserModel.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  }).lean()) as UserRecord | null;

  return mongoUser ? normalizeUser(mongoUser) : undefined;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  return getOrdersByUserId(userId);
}

export async function getFarmerById(farmerId: string): Promise<FarmerProfile | undefined> {
  if (!hasDatabase()) {
    return farmers.find((farmer) => farmer.id === farmerId);
  }

  await connectToDatabase();
  await ensureSeedData();

  const mongoFarmer = (await FarmerModel.findOne({ id: farmerId }).lean()) as FarmerRecord | null;
  return mongoFarmer ? normalizeFarmer(mongoFarmer) : undefined;
}

export async function getFarmerProducts(farmerId: string): Promise<Product[]> {
  if (!hasDatabase()) {
    return products.filter((product) => product.farmerId === farmerId);
  }

  await connectToDatabase();
  await ensureSeedData();

  const mongoProducts = (await ProductModel.find({ farmerId }).sort({ createdAt: -1 }).lean()) as ProductRecord[];
  return mongoProducts.map(normalizeProduct);
}
