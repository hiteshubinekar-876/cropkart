# Server

The chatbot backend is implemented inside the existing Node.js stack.

## Next.js backend

Local machine-specific path omitted.
Local machine-specific path omitted.

## Express backend

Local machine-specific path omitted.
- Endpoints:
  - `GET /chat`
  - `POST /chat`

## Responsibilities

- Validate incoming chat payload
- Load or store chat history
- Interpret user intent
- Query MongoDB or fallback mock data
- Use OpenAI for intent help and general answers
- Return clean text responses
