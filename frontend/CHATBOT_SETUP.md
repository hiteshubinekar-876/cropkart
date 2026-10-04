# Chatbot Setup

This document explains how to run the chatbot feature in Krishi Bazaar.

## Stack used

- Frontend: Next.js / React
- Backend: Next.js Route Handlers + Express
- Database: MongoDB + Mongoose
- AI: OpenAI API via official Node SDK

## Files to know

Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.

## Environment variables

Add these to `.env`:

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
MONGODB_URI=your-mongodb-uri
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

`.env.example` already includes the OpenAI entries.

## Install

```bash
npm install
```

The project now uses:
- `openai`

## Run the app

Frontend + Next backend:

```bash
npm run dev
```

Optional Express backend:

```bash
npm run api:dev
```

## Chat endpoints

Next.js:
- `GET /api/chat?sessionId=...`
- `POST /api/chat`

Express:
- `GET /chat?sessionId=...`
- `POST /chat`

## Example POST body

```json
{
  "sessionId": "chat-demo-123",
  "message": "Price of tomatoes?"
}
```

## Example response

```json
{
  "sessionId": "chat-demo-123",
  "intent": "price_lookup",
  "assistantMessage": {
    "role": "assistant",
    "content": "Desi Tomatoes costs ?40 for 1 kg."
  }
}
```

## Behavior summary

- Product list questions -> database product list
- Product price questions -> product lookup in database
- Order questions -> user-specific order lookup
- Account questions -> signed-in user lookup
- Shipping/payment/support questions -> FAQ fallback
- General questions -> OpenAI fallback

## Notes

- If MongoDB is unavailable, the chatbot can still answer many product/order questions from fallback mock data.
- If `OPENAI_API_KEY` is missing, the chatbot still works for database and FAQ-style answers.
