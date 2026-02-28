import type { AIProviderConfig } from "../types";

export const PROVIDERS: Record<string, Omit<AIProviderConfig, "apiKey">> = {
  groq: {
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    maxRequestsPerMinute: 30,
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    maxRequestsPerMinute: 20,
  },
  nvidia: {
    name: "NVIDIA NIM",
    baseURL: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.1-70b-instruct",
    maxRequestsPerMinute: 20,
  },
};

export function getProviderConfig(
  providerName: string,
  apiKey: string,
  model?: string
): AIProviderConfig {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(
      `Unknown AI provider: ${providerName}. Available: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return {
    ...provider,
    apiKey,
    defaultModel: model ?? provider.defaultModel,
  };
}
