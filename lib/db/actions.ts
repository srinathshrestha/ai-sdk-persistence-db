"use server";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { MyUIMessage } from "../message-type";

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
  message: MyUIMessage;
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

export const deleteMessage = async (messageId: string) => {
  return await db.transaction(async (tx) => {
    const message = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (message.length > 0) {
      const targetMessage = message[0];

      const removed = await tx
        .delete(messages)
        .where(
          and(
            eq(messages.chatId, targetMessage.chatId),
            gt(messages.createdAt, targetMessage.createdAt),
          ),
        )
        .returning();

      await tx.delete(messages).where(eq(messages.id, messageId));

      return removed;
    }
    return false;
  });
};
