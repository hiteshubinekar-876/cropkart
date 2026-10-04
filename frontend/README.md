# krishi bazaar

krishi bazaar is a full-stack farmer marketplace built with Next.js 14 App Router, Tailwind CSS, MongoDB-ready models, NextAuth credentials auth, and a small Express API entry point for standalone backend use.

It is designed for:

- Farmers who want to sell directly to customers, retailers, and wholesalers
- Buyers who need clean product discovery, cart, checkout, orders, and account flows
- Admin teams who need seller verification, operational metrics, and catalog oversight

## Highlights

- White, modern ecommerce UI inspired by Flipkart, Amazon, and Meesho
- Responsive home, catalog, product, cart, checkout, orders, account, farmer, and admin pages
- NextAuth credentials login with role-aware session fields
- MongoDB model layer for `users`, `farmers`, `products`, `categories`, `carts`, `orders`, `reviews`, `addresses`, `wishlist`, and `analytics`
- `data.gov.in` integration helpers with cache + fallback dataset support
- Debounced live search suggestions
- Zustand-powered cart, wishlist, and client-side recent order persistence
- SEO basics with metadata, `sitemap.xml`, and `robots.txt`
- Vercel-friendly Next.js routes plus optional Express backend at `api/server.ts`

## Tech Stack

- Frontend: Next.js 14, React 18, Tailwind CSS
- Backend: Next.js Route Handlers, Express.js
- Database: MongoDB + Mongoose
- Auth: NextAuth credentials with JWT sessions
- State: Zustand
- Validation: Zod

## Demo Credentials

- Buyer: `buyer@greencart.in` / `password123`
- Farmer: `farmer@greencart.in` / `password123`
- Admin: `admin@greencart.in` / `password123`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in at least:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `MONGODB_URI`
- `DATA_GOV_API_KEY`
- `DATA_GOV_MANDI_RESOURCE_ID`

4. Start the Next.js app:

```bash
npm run dev
```

5. Optional: start the standalone Express API:

```bash
npm run api:dev
```

The frontend runs on `http://localhost:3000`. The Express API runs on `http://localhost:4000` unless `EXPRESS_PORT` is set.

## Production Notes

- The UI works with fallback mock data when MongoDB or `data.gov.in` credentials are not configured.
- Route handlers and service functions are organized so you can replace the fallback arrays with real Mongoose queries incrementally.
- The registration route demonstrates password hashing, but the sample project does not persist new users until MongoDB write logic is added.

## Useful Scripts

```bash
npm run dev
npm run api:dev
npm run lint
npm run typecheck
npm run build
```

## Folder Structure

```bash
app/
components/
lib/
models/
hooks/
context/
utils/
api/
public/
styles/
```

## Key Routes

- `/` Home page
- `/login` Login and signup
- `/products` Product listing
- `/products/[slug]` Product detail
- `/cart` Cart
- `/checkout` Checkout
- `/orders` Order history
- `/account` Account center
- `/farmer/dashboard` Farmer dashboard
- `/admin` Admin panel

## API Endpoints

- `GET /api/products`
- `GET /api/products/[id]`
- `GET /api/search?q=...`
- `GET /api/market`
- `GET /api/weather`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/[id]`
- `GET /api/orders/[id]/invoice`
- `POST /api/users/register`
- `GET /api/farmer/products`
- `POST /api/farmer/products`
- `GET /api/admin/overview`

## MongoDB Collections

- `users`
- `farmers`
- `products`
- `categories`
- `carts`
- `orders`
- `reviews`
- `addresses`
- `wishlist`
- `analytics`

## Deployment Guide

### Vercel

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Set environment variables from `.env.example`.
4. Deploy.

### MongoDB Atlas

1. Create a cluster.
2. Create a database user and allow the Vercel IP range or trusted IPs.
3. Copy the connection string into `MONGODB_URI`.

### data.gov.in

1. Create an API key.
2. Choose the resource IDs you want for mandi, rainfall, or schemes widgets.
3. Add those resource IDs to your Vercel and local env files.

## Suggested Next Improvements

- Replace fallback mock arrays with real MongoDB reads and writes
- Add Razorpay or Stripe server-side payment confirmation
- Persist cart and wishlist server-side per user
- Add OTP and social login providers
- Add image uploads via Cloudinary or S3
- Add multilingual content dictionaries beyond the shared nav layer
- Add real shipment tracking and notification delivery
