import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { MyUIMessage } from "../message-type";
import { generateId, ToolInvocationUIPart } from "ai";
import { sql } from "drizzle-orm";

export const chats = pgTable("chats", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => generateId()),
});

export const messages = pgTable("messages", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => generateId()),
  chatId: varchar()
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  role: varchar().$type<MyUIMessage["role"]>().notNull(),
});

export const parts = pgTable(
  "parts",
  {
    id: varchar()
      .primaryKey()
      .$defaultFn(() => generateId()),
    messageId: varchar()
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar().$type<MyUIMessage["parts"][0]["type"]>().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    order: integer().notNull().default(0),

    // Text fields
    text_text: text(),

    // Reasoning fields
    reasoning_text: text(),

    // File fields
    file_mediaType: varchar(),
    file_filename: varchar(), // optional
    file_url: varchar(),

    // Source url fields
    source_url_sourceId: varchar(),
    source_url_url: varchar(),
    source_url_title: varchar(), // optional

    // Source document fields
    source_document_sourceId: varchar(),
    source_document_mediaType: varchar(),
    source_document_title: varchar(),
    source_document_filename: varchar(), // optional

    // Complex data stored as JSONB only when needed
    toolInvocation: jsonb().$type<ToolInvocationUIPart>(),

    // Data parts
    // e.g.
    // data_weather_id: varchar(),
    // data_weather_data: jsonb(),

    providerMetadata: jsonb().$type<Record<string, any>>(),
  },
  (t) => [
    check(
      "text_text_required_if_type_is_text",
      // This SQL expression enforces: if type = 'text' then text_text IS NOT NULL
      sql`CASE WHEN ${t.type} = 'text' THEN ${t.text_text} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "reasoning_text_required_if_type_is_reasoning",
      sql`CASE WHEN ${t.type} = 'reasoning' THEN ${t.reasoning_text} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "file_fields_required_if_type_is_file",
      sql`CASE WHEN ${t.type} = 'file' THEN ${t.file_mediaType} IS NOT NULL AND ${t.file_url} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "source_url_fields_required_if_type_is_source_url",
      sql`CASE WHEN ${t.type} = 'source_url' THEN ${t.source_url_sourceId} IS NOT NULL AND ${t.source_url_url} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "source_document_fields_required_if_type_is_source_document",
      sql`CASE WHEN ${t.type} = 'source_document' THEN ${t.source_document_sourceId} IS NOT NULL AND ${t.source_document_mediaType} IS NOT NULL AND ${t.source_document_title} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "tool_invocation_required_if_type_is_tool_invocation",
      sql`CASE WHEN ${t.type} = 'tool_invocation' THEN ${t.toolInvocation} IS NOT NULL ELSE TRUE END`,
    ),
  ],
);

export type MyDBMessagePart = typeof parts.$inferInsert;
