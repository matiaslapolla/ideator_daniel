import OpenAI from "openai";
import type { AIProviderConfig } from "../types";
import { getProviderConfig, PROVIDERS } from "./providers";

let instance: OpenAI | null = null;
let currentConfig: AIProviderConfig | null = null;

export function getAIClient(config?: AIProviderConfig): OpenAI {
  if (config) {
    currentConfig = config;
    instance = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  if (!instance) {
    // Auto-detect from environment
    const providerName = process.env.AI_PROVIDER ?? "groq";
    const keyMap: Record<string, string> = {
      groq: "GROQ_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      nvidia: "NVIDIA_API_KEY",
    };
    const apiKey = process.env[keyMap[providerName] ?? ""] ?? "";
    if (!apiKey) {
      throw new Error(
        `No API key found for provider "${providerName}". Set ${keyMap[providerName]} in your environment.`
      );
    }
    currentConfig = getProviderConfig(providerName, apiKey);
    instance = new OpenAI({
      apiKey: currentConfig.apiKey,
      baseURL: currentConfig.baseURL,
    });
  }

  return instance;
}

export function getDefaultModel(): string {
  return currentConfig?.defaultModel ?? PROVIDERS.groq.defaultModel;
}

export function resetAIClient(): void {
  instance = null;
  currentConfig = null;
}
