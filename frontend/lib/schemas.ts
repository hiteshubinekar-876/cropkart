import { z } from "zod";

const imagePathSchema = z.string().trim().refine((value) => /^(https?:\/\/|\/)/.test(value), {
  message: "Image path must be a valid URL or uploaded file path.",
});

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  mobile: z.string().trim().regex(/^\d{10,13}$/, "Mobile number must be 10 to 13 digits."),
  role: z.enum(["buyer", "farmer"]).default("buyer"),
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10,13}$/, "Phone number must be 10 to 13 digits."),
  addressLine: z.string().min(6),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  paymentMode: z.enum(["COD", "UPI", "Razorpay", "Stripe", "Wallet"]),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      }),
    )
    .min(1),
  couponCode: z.string().optional(),
});

export const sellerProfileSchema = z.object({
  shopName: z.string().min(2).max(80),
  shopLocation: z.string().min(2).max(120),
  phone: z.string().regex(/^\d{10,13}$/, "Phone number must be 10 to 13 digits."),
});

export const walletAmountSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
});

export const farmerProductSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters."),
  category: z.string().trim().min(2, "Please choose a product category."),
  price: z.coerce.number().positive("Selling price must be greater than zero."),
  originalPrice: z.coerce.number().min(0, "Original price cannot be negative."),
  unit: z.string().trim().min(1, "Unit is required."),
  state: z.string().trim().min(2, "State is required."),
  stock: z.coerce.number().min(0, "Stock cannot be negative."),
  organic: z.boolean(),
  farmerId: z.string().optional(),
  farmerName: z.string().trim().min(2).optional(),
  deliveryTime: z.string().trim().min(2).optional(),
  images: z.array(imagePathSchema).min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(6).optional(),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long."),
});

export const productStockUpdateSchema = z.object({
  stock: z.coerce.number().min(0),
});

export const enquirySchema = z.object({
  type: z.enum(["sell", "bulk", "contact"]),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(13).optional().or(z.literal("")),
  company: z.string().optional(),
  subject: z.string().min(2).optional(),
  requirement: z.string().min(10),
});

export const createAuctionSchema = z.object({
  productName: z.string().min(2),
  image: imagePathSchema.optional(),
  description: z.string().min(20),
  quantity: z.string().min(1),
  basePrice: z.coerce.number().positive(),
  bidIncrement: z.coerce.number().positive(),
  auctionEndTime: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Auction end time must be a valid date and time.",
    }),
});

export const placeBidSchema = z.object({
  amount: z.number().positive(),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().min(3),
  message: z.string().min(1).max(1000),
  pageContext: z
    .object({
      pathname: z.string().max(200).optional(),
      pageTitle: z.string().max(200).optional(),
      focusProduct: z.string().max(160).optional(),
      visibleProducts: z.array(z.string().max(160)).max(12).optional(),
    })
    .optional(),
});
