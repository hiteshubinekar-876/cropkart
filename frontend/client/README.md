# Client

This project already uses Next.js as the frontend, so the chatbot client lives in the existing app instead of a separate React app.

## Chat UI entry points

Local machine-specific path omitted.
Local machine-specific path omitted.

## Features implemented

- WhatsApp-like left/right message bubbles
- Timestamps on every message
- Typing indicator
- Input box + send button
- Suggested prompts
- Session-based chat history loading

## How it talks to backend

- `GET /api/chat?sessionId=...` -> load message history
- `POST /api/chat` -> send message and receive bot response
