import { tool, ToolSet } from "ai";
import z from "zod/v4";

export const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    // Add artificial delay of 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];

    const weather =
      weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    return { city, weather };
  },
});

export const getLocation = tool({
  description: "Get the user location.",
  inputSchema: z.object({}),
  outputSchema: z.object({ location: z.string() }),
});

export const tools = {
  getWeatherInformation,
  getLocation,
} satisfies ToolSet;
