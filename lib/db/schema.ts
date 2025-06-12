import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { MyUIMessage } from "../message-type";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
);

export const chats = pgTable("chats", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => nanoid()),
});

export const roleEnum = pgEnum("role", ["user", "assistant", "system"]);

export const messages = pgTable("messages", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  chatId: varchar()
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  // TODO: update type to UIMessagePart in AI SDK v5
  parts: jsonb().$type<MyUIMessage["parts"]>().notNull(),
  role: roleEnum().notNull(),
});
