import { tools } from "@/ai/tools";
import { InferUITools, UIMessage, UIMessagePart } from "ai";
import z from "zod";

export const metadataSchema = z.object({});

type MyMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  weather: z.object({ temperature: z.number(), location: z.string() }),
});

export type MyDataPart = z.infer<typeof dataPartSchema>;

export type MyToolSet = InferUITools<typeof tools>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart, MyToolSet>;

export type MyUIMessagePart = UIMessagePart<MyDataPart, MyToolSet>;
// const test: MyUIMessagePart = {
//   type: "tool-getLocation"
// }
