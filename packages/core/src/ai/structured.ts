import type { ZodSchema } from "zod";
import { getAIClient, getDefaultModel } from "./client";

/**
 * Call LLM with a prompt and validate the JSON response against a Zod schema.
 * Retries up to `maxRetries` times on parse/validation failure.
 */
export async function structuredGenerate<T>(opts: {
  system: string;
  prompt: string;
  schema: ZodSchema<T>;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}): Promise<T> {
  const {
    system,
    prompt,
    schema,
    model,
    temperature = 0.7,
    maxRetries = 2,
  } = opts;
  const client = getAIClient();
  const modelId = model ?? getDefaultModel();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: system },
      {
        role: "user",
        content:
          attempt === 0
            ? prompt
            : `${prompt}\n\nPrevious attempt failed JSON validation: ${lastError?.message}. Please fix and return valid JSON.`,
      },
    ];

    const response = await client.chat.completions.create({
      model: modelId,
      messages,
      temperature,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      lastError = new Error("Empty response from LLM");
      continue;
    }

    try {
      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed);
      return validated;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    `Failed to get valid structured output after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
