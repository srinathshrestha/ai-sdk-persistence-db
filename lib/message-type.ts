import { tools } from "@/ai/tools";
import { InferUITools, UIMessage, UIMessagePart } from "ai";
import z from "zod";

export const metadataSchema = z.object({});

type MyMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  weather: z.object({
    weather: z.string().optional(),
    location: z.string().optional(),
    temperature: z.number().optional(),
    loading: z.boolean().default(true),
  }),
});

export type MyDataPart = z.infer<typeof dataPartSchema>;

export type MyToolSet = InferUITools<ReturnType<typeof tools>>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart, MyToolSet>;

export type MyUIMessagePart = UIMessagePart<MyDataPart, MyToolSet>;
