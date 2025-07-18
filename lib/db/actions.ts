"use server";

import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages, MyDBUIMessagePart, parts } from "@/lib/db/schema";
import { MyUIMessage } from "../message-type";
import {
  mapUIMessagePartsToDBParts,
  mapDBPartToUIMessagePart,
} from "@/lib/utils/message-mapping";

export const createChat = async () => {
  const [{ id }] = await db.insert(chats).values({}).returning();
  return id;
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
  const mappedDBUIParts = mapUIMessagePartsToDBParts(message.parts, id);

  await db.transaction(async (tx) => {
    await tx
      .insert(messages)
      .values({
        chatId,
        role: message.role,
        id,
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          chatId,
        },
      });

    await tx.delete(parts).where(eq(parts.messageId, id));
    if (mappedDBUIParts.length > 0) {
      await tx.insert(parts).values(mappedDBUIParts);
    }
  });
};

export const loadChat = async (chatId: string): Promise<MyUIMessage[]> => {
  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  const messageParts = await db
    .select()
    .from(parts)
    .where(
      inArray(
        parts.messageId,
        db
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.chatId, chatId)),
      ),
    )
    .orderBy(parts.messageId, parts.order);

  const partsMap = new Map<string, typeof messageParts>();
  for (const part of messageParts) {
    if (!partsMap.has(part.messageId)) {
      partsMap.set(part.messageId, []);
    }
    partsMap.get(part.messageId)!.push(part);
  }

  return chatMessages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: (partsMap.get(message.id) || []).map((part) =>
      mapDBPartToUIMessagePart(part as MyDBUIMessagePart & { order: number }),
    ),
  }));
};

export const getChats = async () => {
  return await db.select().from(chats);
};

export const deleteChat = async (chatId: string) => {
  await db.delete(chats).where(eq(chats.id, chatId));
};

export const deleteMessage = async (messageId: string) => {
  await db.transaction(async (tx) => {
    const [targetMessage] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!targetMessage) return;

    // Delete all messages after this one in the chat
    await tx
      .delete(messages)
      .where(
        and(
          eq(messages.chatId, targetMessage.chatId),
          gt(messages.createdAt, targetMessage.createdAt),
        ),
      );

    // Delete the target message
    await tx.delete(messages).where(eq(messages.id, messageId));
  });
};
