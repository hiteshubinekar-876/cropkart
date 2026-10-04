export type Role = "buyer" | "farmer" | "admin";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
};

export type FarmerProfile = {
  id: string;
  userId?: string;
  name: string;
  farmName: string;
  state: string;
  district: string;
  shopName?: string;
  shopLocation?: string;
  phone?: string;
  rating: number;
  verified: boolean;
  yearsActive: number;
  speciality: string[];
  responseTime: string;
};

export type SellerProfile = {
  farmerId: string;
  userId: string;
  shopName: string;
  shopLocation: string;
  phone: string;
};

export type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  farmerId: string;
  farmerName: string;
  category: string;
  state: string;
  description: string;
  tags: string[];
  unit: string;
  stock: number;
  organic: boolean;
  price: number;
  originalPrice: number;
  deliveryTime: string;
  rating: number;
  reviewCount: number;
  images: string[];
  color: string;
  harvestDate: string;
  featured?: boolean;
  trending?: boolean;
};

export type UserAddress = {
  id: string;
  label: string;
  recipient: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  primary?: boolean;
};

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  password: string;
  avatar: string;
  farmerId?: string;
  wishlist: string[];
  addresses: UserAddress[];
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type OrderStatus =
  | "Processing"
  | "Packed"
  | "In Transit"
  | "Delivered"
  | "Cancelled";

export type Order = {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  paymentMode: "COD" | "UPI" | "Razorpay" | "Stripe" | "Wallet";
  status: OrderStatus;
  placedAt: string;
  estimatedDelivery: string;
  address: UserAddress;
};

export type WalletTransactionType = "deposit" | "withdraw" | "debit" | "credit";

export type WalletTransaction = {
  type: WalletTransactionType;
  amount: number;
  description: string;
  orderId?: string;
  createdAt: string;
};

export type Wallet = {
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
};

export type MandiRate = {
  commodity: string;
  market: string;
  state: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  arrivalDate: string;
};

export type WeatherInsight = {
  title: string;
  value: string;
  note: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "neutral" | "warning";
};

export type AuctionStatus = "active" | "ended";

export type Auction = {
  id: string;
  sellerUserId: string;
  sellerFarmerId?: string;
  sellerName: string;
  productName: string;
  image?: string;
  description: string;
  quantity: string;
  basePrice: number;
  bidIncrement: number;
  currentHighestBid: number | null;
  highestBidderId?: string;
  highestBidderName?: string;
  winnerUserId?: string;
  winnerName?: string;
  endTime: string;
  status: AuctionStatus;
  bidCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AuctionBid = {
  id: string;
  auctionId: string;
  bidderUserId: string;
  bidderName: string;
  amount: number;
  createdAt: string;
};

export type ChatRole = "user" | "assistant";

export type ChatPageContext = {
  pathname?: string;
  pageTitle?: string;
  focusProduct?: string;
  visibleProducts?: string[];
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: "database" | "openai" | "faq" | "system" | "langflow" | "local_fallback";
};
