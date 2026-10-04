# Krishi Bazaar Project TL;DR

This file is a fast architecture guide for the whole project.

Note:
- The visible brand name in the UI is now `Krishi Bazaar`.
- Some internal file names, repo names, and env defaults still use `greencart`.

## 1. What This Project Is

Krishi Bazaar is a full-stack farmer marketplace built with:
- Frontend: `Next.js 14 App Router + React + Tailwind CSS`
- Backend: `Next.js API Route Handlers` and an optional `Express` server
- Database: `MongoDB + Mongoose`
- Auth: `NextAuth credentials login`
- Client state: `Zustand`
- Validation: `Zod`

Main user roles:
- `buyer`: browses products, carts, orders, auctions, bids
- `farmer`: adds products, creates auctions
- `admin`: operational access and moderation-oriented pages

## 2. High-Level Architecture

```text
Browser UI
  -> Next.js App Router pages in /app
  -> React components in /components
  -> Zustand stores in /hooks

Frontend requests
  -> /app/api/* route handlers
  -> service layer in /lib/services/*
  -> Mongoose models in /models/*
  -> MongoDB

Optional standalone backend
  -> /api/server.ts (Express)
  -> reuses shared service layer
```

## 3. Main Folder Guide

### `app/`
Contains all pages and Next route handlers.

Important page routes:
- `/` Home
- `/login`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/orders`
- `/account`
- `/farmer/dashboard`
- `/admin`
- `/auctions`
- `/auctions/[id]`
- `/sell-on-greencart`
- `/bulk-order-enquiry`
- `/contact-us`

Important API routes:
- `/api/products`
- `/api/products/[id]`
- `/api/search`
- `/api/orders`
- `/api/users/register`
- `/api/farmer/products`
- `/api/enquiries`
- `/api/auctions`
- `/api/auctions/[id]`
- `/api/auctions/[id]/bids`
- `/api/market`
- `/api/weather`
- `/api/auth/[...nextauth]`

### `components/`
Reusable UI pieces.

Useful groups:
- `layout/`: navbar, footer
- `home/`: hero, mandi panel
- `products/`: cards, add-to-cart, wishlist
- `dashboard/`: farmer/admin dashboard widgets
- `auctions/`: auction card, bid form
- `forms/`: enquiry form
- `shared/`: logo, section heading, search bar, visuals

### `lib/`
Shared logic.

Important files:
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
- `lib/services/catalog.ts`: product/user/catalog access
- `lib/services/dashboard.ts`: homepage/admin/farmer dashboard data
- `lib/services/orders.ts`: order creation
- `lib/services/auctions.ts`: auction logic and bid rules
- `lib/services/seed.ts`: initial Mongo seed logic

### `models/`
Mongoose schemas for MongoDB collections.

### `hooks/`
Client-side state hooks.

Examples:
- `use-cart-store.ts`
- `use-wishlist-store.ts`
- `use-order-store.ts`
- `use-i18n.ts`

### `api/server.ts`
Optional Express server exposing shared backend features outside Next route handlers.

## 4. Frontend Structure

## Layout and common UI

Local machine-specific path omitted.
  - global metadata
  - fonts
  - wraps app in providers

Local machine-specific path omitted.
  - `SessionProvider` for auth
  - `LanguageProvider` for i18n toggle

Local machine-specific path omitted.
  - top navigation
  - auth-aware buttons
  - search bar
  - auctions link

Local machine-specific path omitted.
  - footer link groups

## Styling

Local machine-specific path omitted.
  - global theme, background, button styles, shared utility classes

Local machine-specific path omitted.
  - custom colors, shadows, border radii

## 5. Backend Structure

There are two backend entry styles:

### A. Next.js route handlers
Used by the actual web app.

Examples:
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.

### B. Express server
Optional external API server.

Local machine-specific path omitted.

This server reuses the same service logic, especially:
- product listing
- search
- market/weather data
- orders
- auctions

## 6. Service Layer

This is the most important backend abstraction.

### `catalog.ts`
Handles:
- categories
- products
- product detail
- related products
- users by email
- farmers
- search suggestions

### `dashboard.ts`
Builds:
- homepage metrics
- mandi/weather cards
- farmer dashboard summaries
- admin dashboard summaries

### `orders.ts`
Handles order creation logic.

### `auctions.ts`
Handles:
- create auction
- active auction listing
- single auction lookup
- bid history
- place bid
- auto-finalize ended auctions
- concurrency-safe bidding logic

### `seed.ts`
Seeds Mongo with sample categories, farmers, products, and users if collections are empty.

## 7. Auth Flow

Auth is handled by NextAuth credentials.

Key file:
Local machine-specific path omitted.

Behavior:
- user logs in with email + password
- user is looked up through `getUserByEmail`
- password is checked with `bcryptjs`
- JWT stores:
  - `id`
  - `role`
  - `farmerId`

Session user shape:
- `id`
- `name`
- `email`
- `role`
- `farmerId`

Used for:
- farmer-only auction/product creation
- buyer-only auction bidding
- account-aware UI

## 8. Database Overview

Database: `MongoDB`
ODM: `Mongoose`
Local machine-specific path omitted.

Current database name:
- `greencart`

## 9. Database Schema Summary

Below is the practical schema view you will care about most.

### `User`
Local machine-specific path omitted.

Fields:
- `id`
- `name`
- `email`
- `mobile`
- `password`
- `role` = buyer | farmer | admin
- `avatar`
- `farmerId`
- `wishlist[]`
- `addresses[]`

Used by pages:
- login
- account
- auth-protected APIs
- auctions

### `Farmer`
Local machine-specific path omitted.

Fields:
- `id`
- `userId`
- `farmName`
- `state`
- `district`
- `rating`
- `verified`
- `yearsActive`
- `speciality[]`
- `responseTime`

Used by pages:
- home
- product detail
- farmer dashboard

### `Category`
Local machine-specific path omitted.

Fields:
- `id`
- `name`
- `slug`
- `description`
- `accent`

Used by pages:
- home category section
- products listing filters

### `Product`
Local machine-specific path omitted.

Fields:
- `id`
- `name`
- `slug`
- `farmerId`
- `farmerName`
- `category`
- `state`
- `description`
- `tags[]`
- `unit`
- `stock`
- `organic`
- `price`
- `originalPrice`
- `deliveryTime`
- `rating`
- `reviewCount`
- `images[]`
- `color`
- `harvestDate`
- `featured`
- `trending`

Used by pages:
- home
- products
- product detail
- cart
- checkout
- farmer dashboard
- admin

### `Order`
Local machine-specific path omitted.

Typical purpose:
- placed items
- totals
- user reference
- address
- payment mode
- status

Used by pages:
- checkout
- orders
- admin

### `Review`
Local machine-specific path omitted.

Used by:
- product detail page

### `Cart`
Local machine-specific path omitted.

Note:
- client cart currently relies heavily on Zustand
- model exists for future persistence/server storage

### `Wishlist`
Local machine-specific path omitted.

Note:
- wishlist behavior is mostly client-driven right now
- model exists for database persistence

### `Address`
Local machine-specific path omitted.

Used through:
- user addresses
- checkout/order delivery

### `Analytics`
Local machine-specific path omitted.

Used for:
- future reporting/admin analytics expansion

### `Inquiry`
Local machine-specific path omitted.

Fields:
- `type` = sell | bulk | contact
- `name`
- `email`
- `phone`
- `company`
- `subject`
- `requirement`

Used by pages:
- sell-on-greencart
- bulk-order-enquiry
- contact-us

### `Auction`
Local machine-specific path omitted.

Fields:
- `id`
- `sellerUserId`
- `sellerFarmerId`
- `sellerName`
- `productName`
- `description`
- `quantity`
- `basePrice`
- `bidIncrement`
- `currentHighestBid`
- `highestBidderId`
- `highestBidderName`
- `winnerUserId`
- `winnerName`
- `endTime`
- `status` = active | ended
- `bidCount`

Used by pages:
- auctions list
- auction detail
- farmer dashboard

### `Bid`
Local machine-specific path omitted.

Fields:
- `id`
- `auctionId`
- `bidderUserId`
- `bidderName`
- `amount`
- `createdAt`

Relationship:
- many bids belong to one auction

Used by pages:
- auction detail bid history

## 10. Page-by-Page Data Map

This section helps you understand which page talks to which backend/data.

### `/`
Local machine-specific path omitted.

Uses:
- categories
- featured products
- trending products
- farmers
- mandi rates
- weather insights

Data sources:
- `getCategories()`
- `getFeaturedProducts()`
- `getTrendingProducts()`
- `getFarmers()`
- `getHomePageData()`

Database/models involved:
- `Category`
- `Product`
- `Farmer`
- external mandi/weather APIs

### `/login`
Local machine-specific path omitted.

Uses:
- NextAuth sign-in
- registration API

Database/models:
- `User`
- `Farmer` when registering a farmer account

### `/products`
Local machine-specific path omitted.

Uses:
- product list
- categories
- states filter

Database/models:
- `Product`
- `Category`

### `/products/[slug]`
Local machine-specific path omitted.

Uses:
- product by slug
- related products
- farmer details
- reviews

Database/models:
- `Product`
- `Farmer`
- `Review`

### `/cart`
Local machine-specific path omitted.

Uses:
- client cart store
- product lookups

Database/models:
- `Product`
- optional future `Cart`

### `/checkout`
Local machine-specific path omitted.

Uses:
- cart items
- checkout form
- order creation API

Database/models:
- `Order`
- `Product`
- `User.addresses`

### `/orders`
Local machine-specific path omitted.

Uses:
- user order history

Database/models:
- `Order`

### `/account`
Local machine-specific path omitted.

Uses:
- session user
- addresses
- wishlist
- quick links

Database/models:
- `User`
- `Product`
- optional `Wishlist`

### `/farmer/dashboard`
Local machine-specific path omitted.

Uses:
- farmer products
- seller auctions
- dashboard metrics

Database/models:
- `Product`
- `Auction`
- `Farmer`

### `/admin`
Local machine-specific path omitted.

Uses:
- admin metrics
- product overview
- farmer summaries

Database/models:
- `Product`
- `Farmer`
- `Analytics`
- `Order` indirectly for metrics

### `/auctions`
Local machine-specific path omitted.

Uses:
- all active auctions

Database/models:
- `Auction`

### `/auctions/[id]`
Local machine-specific path omitted.

Uses:
- auction detail
- bid form
- bid history

Database/models:
- `Auction`
- `Bid`

### `/sell-on-greencart`
Local machine-specific path omitted.

Uses:
- enquiry form for seller onboarding

Database/models:
- `Inquiry`

### `/bulk-order-enquiry`
Local machine-specific path omitted.

Uses:
- bulk requirement form

Database/models:
- `Inquiry`

### `/contact-us`
Local machine-specific path omitted.

Uses:
- contact form

Database/models:
- `Inquiry`

## 11. API Map

### Catalog APIs
- `GET /api/products`
- `GET /api/products/[id]`
- `GET /api/search`

### Auth/User APIs
- `POST /api/users/register`
- `POST /api/auth/[...nextauth]`

### Commerce APIs
- `GET /api/orders`
- `POST /api/orders`

### Farmer APIs
- `GET /api/farmer/products`
- `POST /api/farmer/products`

### Auction APIs
- `GET /api/auctions`
- `POST /api/auctions`
- `GET /api/auctions/[id]`
- `GET /api/auctions/[id]/bids`
- `POST /api/auctions/[id]/bids`

### Utility APIs
- `GET /api/market`
- `GET /api/weather`
- `POST /api/enquiries`

## 12. Auction Rules Summary

Local machine-specific path omitted.

Rules:
- only `farmer` or `admin` can create auctions
- only `buyer` or `admin` can bid
- seller cannot bid on own auction
- first bid must be at least `basePrice`
- next bids must be at least `currentHighestBid + bidIncrement`
- bids after `endTime` are rejected
- winner is set when auction is finalized

Concurrency handling:
- uses Mongo session transactions
- optimistic check on `updatedAt`
- retries concurrent bid conflicts

## 13. Data Source Behavior

The app supports two modes:

### With Mongo configured
- reads/writes go through Mongoose models
- seed data populates empty collections

### Without Mongo configured
- many screens fall back to `lib/mock-data.ts`
- some write operations return config errors because they require Mongo

## 14. Environment Variables

Important env variables:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `MONGODB_URI`
- `DATA_GOV_API_KEY`
- `DATA_GOV_MANDI_RESOURCE_ID`
- `DATA_GOV_RAINFALL_RESOURCE_ID`
- `DATA_GOV_SCHEMES_RESOURCE_ID`
- `EXPRESS_PORT`

Files:
Local machine-specific path omitted.
Local machine-specific path omitted.

## 15. If You Want To Understand This Project Fast

Read these files in this order:

Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.

## 16. Short Mental Model

Think of the project like this:

- `app/` = screens + HTTP endpoints
- `components/` = reusable UI pieces
- `lib/services/` = business logic
- `models/` = Mongo schema definitions
- `lib/mock-data.ts` = fallback/sample dataset
- `lib/auth.ts` = login/session rules
- `api/server.ts` = optional Express wrapper around shared logic

If you want, I can also make:
- a `SYSTEM_FLOW.md` with request lifecycle diagrams
- a `DATABASE_RELATIONS.md` focused only on Mongo collections and relationships
- a `PAGE_FLOW.md` that shows exactly how each page loads and mutates data
