import { Message } from "ai";
import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
);

export const chats = pgTable("chats", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => nanoid()),
});

export const messages = pgTable("messages", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  chatId: varchar()
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  message: jsonb().$type<Message>().notNull(),
});
