import { UIMessage } from "ai";
import z from "zod";

export const metadataSchema = z.object({});

type MyMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  weather: z.object({ temperature: z.number(), location: z.string() }),
});

export type MyDataPart = z.infer<typeof dataPartSchema>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart>;
