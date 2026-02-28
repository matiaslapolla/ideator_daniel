import { Hono } from "hono";

export function healthRoutes() {
  const app = new Hono();

  app.get("/", (c) => {
    const provider = process.env.AI_PROVIDER ?? "groq";
    const keyMap: Record<string, string> = {
      groq: "GROQ_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      nvidia: "NVIDIA_API_KEY",
    };
    const hasKey = !!(process.env[keyMap[provider] ?? ""]);

    return c.json({
      status: "ok",
      provider,
      hasApiKey: hasKey,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
