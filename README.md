# Persist Messages with AI SDK, Postgres, and Next.js

This example demonstrates how to persist chat messages using Vercel AI SDK with a Postgres database in a Next.js application. It uses:

- Vercel AI SDK for streaming chat responses
- Postgres for message storage
- Drizzle ORM for database queries
- Next.js for the web application

The chat messages are stored in a Postgres database using the schema defined in `schema.ts`. Each chat has an auto-incrementing ID and contains multiple messages with timestamps.

## Setup

1. Create postgres database
```bash
createdb ai-sdk-demo
# or use PgAdmin or other postgres tools
```

2. Add environment variables to .env:
```bash
DATABASE_URL=postgres://username:password@localhost:5432/ai-sdk-demo
OPENAI_API_KEY=your_openai_api_key_here
```

3. Install dependencies:
```bash
pnpm install
```

4. Push database schema:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm run dev
```