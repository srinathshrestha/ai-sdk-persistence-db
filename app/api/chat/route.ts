import { createMessage, loadChat } from "@/lib/db/actions";
import { openai } from "@ai-sdk/openai";
import {
  appendResponseMessages,
  createIdGenerator,
  Message,
  streamText,
  tool,
} from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { message, chatId }: { message: Message; chatId: string } =
    await req.json();

  // add user message to db
  await createMessage({ chatId, message, id: message.id });

  // get all chat messages
  const messages = await loadChat(chatId);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    tools: {
      weather: tool({
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
    },
    messages: messages.concat(message),
    // id format for server-side messages:
    experimental_generateMessageId: createIdGenerator({
      prefix: "msgs",
      size: 16,
    }),
    async onFinish({ response }) {
      const newMessage = appendResponseMessages({
        messages,
        responseMessages: response.messages,
      }).slice(-1)[0];

      await createMessage({
        id: newMessage.id,
        chatId,
        message: newMessage,
      });
    },
  });

  return result.toDataStreamResponse();
}
