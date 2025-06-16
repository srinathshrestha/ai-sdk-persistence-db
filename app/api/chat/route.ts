import { upsertMessage, loadChat } from "@/lib/db/actions";
import { MyUIMessage } from "@/lib/message-type";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  createUIMessageStream,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // get the last message from the client:
  const { message, chatId }: { message: MyUIMessage; chatId: string } =
    await req.json();

  // create or update last message in database
  await upsertMessage({ chatId, id: message.id, message });

  // load the previous messages from the server:
  const previousMessages = await loadChat(chatId);
  const messages: MyUIMessage[] = [...previousMessages, message];
  console.log("messages", messages);

  // immediately start streaming (solves RAG issues with status, etc.)
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      Math.random() > 0.5 &&
        (() => {
          writer.write({ type: "reasoning", text: "This is some reasoning" });
          writer.write({ type: "reasoning-part-finish" });
        })();
      Math.random() > 0.5 &&
        (() => {
          writer.write({
            type: "source-url",
            sourceId: "https://example.com",
            url: "https://example.com",
          });
        })();
      Math.random() > 0.5 &&
        (() => {
          writer.write({
            type: "source-document",
            sourceId: "https://example.com",
            mediaType: "file",
            title: "Title",
          });
        })();

      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: convertToModelMessages(messages),
        stopWhen: stepCountIs(5),
        tools: {
          // server-side tool with execute function:
          getWeatherInformation: tool({
            description: "show the weather in a given city to the user",
            parameters: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              // Add artificial delay of 2 seconds
              await new Promise((resolve) => setTimeout(resolve, 2000));

              const weatherOptions = [
                "sunny",
                "cloudy",
                "rainy",
                "snowy",
                "windy",
              ];

              const weather =
                weatherOptions[
                  Math.floor(Math.random() * weatherOptions.length)
                ];
              return { city, weather };
            },
          }),
          // client-side tool that is automatically executed on the client:
          getLocation: tool({
            description:
              "Get the user location. Always ask for confirmation before using this tool.",
            parameters: z.object({}),
          }),
        },
      });

      result.consumeStream();
      writer.merge(result.toUIMessageStream({ newMessageId: generateId() }));
    },
    onError: (error) => {
      // Error messages are masked by default for security reasons.
      // If you want to expose the error message to the client, you can do so here:
      return error instanceof Error ? error.message : String(error);
    },
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      try {
        await upsertMessage({
          id: responseMessage.id,
          chatId,
          message: responseMessage,
        });
      } catch (error) {
        console.error(error);
      }
    },
  });
  return createUIMessageStreamResponse({ stream });
}
