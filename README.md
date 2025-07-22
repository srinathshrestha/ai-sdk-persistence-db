# Persist Messages with AI SDK, Postgres, and Next.js

This example demonstrates how to persist chat messages using Vercel AI SDK with a Postgres database in a Next.js application. It uses:

- AI SDK for streaming chat responses
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

## Database Persistence Architecture

This application uses a prefix-based approach for persisting messages with PostgreSQL. Here's how it works:

### Schema Design

The database uses three main tables with a prefix-based column naming convention:

The schema can be found in [`lib/db/schema.ts`](lib/db/schema.ts).

#### Tables:

- **`chats`**: Stores chats with auto-generated IDs
- **`messages`**: Individual messages with role, timestamp, and chat reference
- **`parts`**: Message content parts using prefix-based columns

#### Prefix Convention:

Each message part type has dedicated columns with specific prefixes:

- `text_*`: Text content parts
- `reasoning_*`: Reasoning/thinking parts
- `file_*`: File attachments
- `source_url_*`: URL sources
- `source_document_*`: Document sources
- `tool_[toolName]_*`: Tool calls (e.g., `tool_getWeatherInformation_*`)
- `data_[dataType]_*`: Custom data parts (e.g., `data_weather_*`)

This approach avoids complex polymorphic relationships while maintaining type safety and query performance.

### Data Integrity Constraints

The schema enforces data integrity through carefully designed constraints:

- **Complete Part Definitions**: Each message part type requires all relevant columns to be populated together. For example, source URL parts must have both `source_url_url` and `source_url_description` fields defined.
- **Tool Call Consistency**: Tool-related columns for the same tool must be provided as a complete set (input, output, state, etc.).

These constraints prevent partial or corrupted message parts from being stored, ensuring reliable message reconstruction during retrieval.

### Message Mapping

The system provides bidirectional conversion between UI messages and database storage ([`lib/utils/message-mapping.ts`](lib/utils/message-mapping.ts)):

#### UI → Database (DB):

- Message parts are flattened into database rows
- Each part gets an order index to maintain sequence
- Tool states and provider metadata are preserved

#### Database (DB) → UI:

- Database rows are reconstructed into typed message parts
- Tool states and custom data are properly restored
- Type safety is maintained throughout

### Available Actions

Server-side functions ([`lib/db/actions.ts`](lib/db/actions.ts)) handle all database operations:

- **`createChat()`**: Creates a new chat session
- **`upsertMessage()`**: Inserts/updates messages with atomic transactions
- **`loadChat(chatId)`**: Retrieves all messages for a chat
- **`getChats()`**: Lists all chat sessions
- **`deleteChat(chatId)`**: Removes a chat and all associated data
- **`deleteMessage(messageId)`**: Deletes a message and all subsequent messages
