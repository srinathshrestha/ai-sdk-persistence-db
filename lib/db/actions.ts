"use server";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages, MyDBUIMessagePart, parts } from "@/lib/db/schema";
import { MyUIMessage, MyUIMessagePart } from "../message-type";

export const createChat = async () => {
  try {
    const [result] = await db.insert(chats).values({}).returning();
    return result.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
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
  try {
    await db
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
      })
      .returning();

    // TODO: figure out why this is necessary and any way we can simplify
    const result2 = await db
      .delete(parts)
      .where(eq(parts.messageId, message.id));
    console.log(result2);

    const mappedDBUIParts: MyDBUIMessagePart[] = message.parts.map((p, i) => {
      switch (p.type) {
        case "text":
          return {
            messageId: id,
            order: i,
            type: p.type,
            text_text: p.text,
          };
        case "reasoning":
          return {
            messageId: id,
            order: i,
            type: p.type,
            reasoning_text: p.text,
            providerMetadata: p.providerMetadata,
          };
        case "file":
          return {
            messageId: id,
            order: i,
            type: p.type,
            file_mediaType: p.mediaType,
            file_filename: p.filename,
            file_url: p.url,
          };
        case "source-document":
          return {
            messageId: id,
            order: i,
            type: p.type,
            source_document_sourceId: p.sourceId,
            source_document_mediaType: p.mediaType,
            source_document_title: p.title,
            source_document_filename: p.filename,
            providerMetadata: p.providerMetadata,
          };
        case "source-url":
          return {
            messageId: id,
            order: i,
            type: p.type,
            source_url_sourceId: p.sourceId,
            source_url_url: p.url,
            source_url_title: p.title,
            providerMetadata: p.providerMetadata,
          };
        case "step-start":
          return {
            messageId: id,
            order: i,
            type: p.type,
          };
        case "tool-getWeatherInformation":
          return {
            messageId: id,
            order: i,
            type: p.type,
            tool_getWeatherInformation_toolCallId: p.toolCallId,
            tool_getWeatherInformation_state: p.state,
            tool_getWeatherInformation_input:
              p.state === "input-available" ? p.input : undefined,
            tool_getWeatherInformation_output:
              p.state === "output-available" ? p.output : undefined,
          };
        case "tool-getLocation":
          return {
            messageId: id,
            order: i,
            type: p.type,
            tool_getLocation_toolCallId: p.toolCallId,
            tool_getLocation_state: p.state,
            tool_getLocation_input:
              p.state === "input-available" ? p.input : undefined,
            tool_getLocation_output:
              p.state === "output-available" ? p.output : undefined,
          };
        default:
          throw new Error(`Unsupported part type: ${p.type}`);
      }
    });

    await db.insert(parts).values(mappedDBUIParts);
    return {};
  } catch (error) {
    console.error("Error upserting message:", error);
    throw error;
  }
};

export const loadChat = async (chatId: string): Promise<MyUIMessage[]> => {
  try {
    const messagesWithParts = await db
      .select()
      .from(messages)
      .leftJoin(parts, eq(parts.messageId, messages.id))
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt, parts.order);

    const messagesMap = new Map<string, MyUIMessage>();

    for (const row of messagesWithParts) {
      const message = row.messages;
      const part = row.parts;

      if (!messagesMap.has(message.id)) {
        messagesMap.set(message.id, {
          id: message.id,
          role: message.role,
          parts: [],
        });
      }

      const uiMessage = messagesMap.get(message.id)!;

      if (part) {
        let partData: MyUIMessagePart;

        switch (part.type) {
          // can force values like text_text! b/c we have dynamic not_null constraints set on type
          case "text":
            partData = {
              type: part.type,
              text: part.text_text!,
            };
            break;
          case "reasoning":
            partData = {
              type: part.type,
              text: part.reasoning_text!,
              providerMetadata: part.providerMetadata ?? undefined,
            };
            break;
          case "file":
            partData = {
              type: part.type,
              mediaType: part.file_mediaType!,
              filename: part.file_filename!,
              url: part.file_url!,
            };
            break;
          case "source-document":
            partData = {
              type: part.type,
              sourceId: part.source_document_sourceId!,
              mediaType: part.source_document_mediaType!,
              title: part.source_document_title!,
              filename: part.source_document_filename!,
              providerMetadata: part.providerMetadata ?? undefined,
            };
            break;
          case "source-url":
            partData = {
              type: part.type,
              sourceId: part.source_url_sourceId!,
              url: part.source_url_url!,
              title: part.source_url_title!,
              providerMetadata: part.providerMetadata ?? undefined,
            };
            break;
          case "step-start":
            partData = {
              type: part.type,
            };
            break;
          case "tool-getWeatherInformation":
            if (!part.tool_getWeatherInformation_state) {
              throw new Error("getWeatherInformation_state is undefined");
            }
            switch (part.tool_getWeatherInformation_state) {
              case "input-streaming":
                partData = {
                  type: "tool-getWeatherInformation",
                  state: "input-streaming",
                  toolCallId: part.tool_getWeatherInformation_toolCallId!,
                  input: part.tool_getWeatherInformation_input!,
                };
                break;
              case "input-available":
                partData = {
                  type: "tool-getWeatherInformation",
                  state: "input-available",
                  toolCallId: part.tool_getWeatherInformation_toolCallId!,
                  input: part.tool_getWeatherInformation_input!,
                };
                break;
              case "output-available":
                partData = {
                  type: "tool-getWeatherInformation",
                  state: "output-available",
                  toolCallId: part.tool_getWeatherInformation_toolCallId!,
                  input: part.tool_getWeatherInformation_input!,
                  output: part.tool_getWeatherInformation_output!,
                };
                break;
              case "output-error":
                partData = {
                  type: "tool-getWeatherInformation",
                  state: "output-error",
                  toolCallId: part.tool_getWeatherInformation_toolCallId!,
                  input: part.tool_getWeatherInformation_input!,
                  errorText: part.tool_getWeatherInformation_errorText!,
                };
                break;
            }
            break;
          case "tool-getLocation":
            if (!part.tool_getLocation_state) {
              throw new Error("getWeatherInformation_state is undefined");
            }
            switch (part.tool_getLocation_state) {
              case "input-streaming":
                partData = {
                  type: "tool-getLocation",
                  state: "input-streaming",
                  toolCallId: part.tool_getLocation_toolCallId!,
                  input: part.tool_getLocation_input!,
                };
                break;
              case "input-available":
                partData = {
                  type: "tool-getLocation",
                  state: "input-available",
                  toolCallId: part.tool_getLocation_toolCallId!,
                  input: part.tool_getLocation_input!,
                };
                break;
              case "output-available":
                partData = {
                  type: "tool-getLocation",
                  state: "output-available",
                  toolCallId: part.tool_getLocation_toolCallId!,
                  input: part.tool_getLocation_input!,
                  output: part.tool_getLocation_output!,
                };
                break;
              case "output-error":
                partData = {
                  type: "tool-getLocation",
                  state: "output-error",
                  toolCallId: part.tool_getLocation_toolCallId!,
                  input: part.tool_getLocation_input!,
                  errorText: part.tool_getLocation_errorText!,
                };
                break;
            }
            break;
          default:
            throw new Error(`Unsupported part type: ${part.type}`);
        }

        uiMessage.parts.push(partData);
      }
    }

    const messagesResult = Array.from(messagesMap.values());

    return messagesResult;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const getChats = async () => {
  try {
    const c = await db.select().from(chats);
    return c;
  } catch (error) {
    console.error("Error fetching chats:", error);
    throw error;
  }
};

export const deleteChat = async (chatId: string) => {
  try {
    await db.delete(chats).where(eq(chats.id, chatId));
  } catch (error) {
    console.error("Error deleting chat:", error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
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
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};
