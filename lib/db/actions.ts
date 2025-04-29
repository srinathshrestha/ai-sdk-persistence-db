"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { UIMessage } from "ai";

export const createChat = async () => {
  const [result] = await db.insert(chats).values({}).returning();
  return result.id;
};

export const upsertMessage = async ({
  chatId,
  message,
  id,
}: {
  id: string;
  chatId: string;
  message: UIMessage;
}) => {
  const [result] = await db
    .insert(messages)
    .values({
      chatId,
      parts: message.parts ?? [],
      role: message.role,
      id,
    })
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        parts: message.parts ?? [],
        chatId,
      },
    })
    .returning();
  return result;
};

export const loadChat = async (chatId: string) => {
  const messagesResult = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);
  return messagesResult;
};

export const getChats = async () => {
  const c = await db.select().from(chats);
  return c;
};

export const deleteChat = async (chatId: string) => {
  await db.delete(chats).where(eq(chats.id, chatId));
};
