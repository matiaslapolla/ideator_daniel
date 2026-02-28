const API_BASE = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error((error as { error?: string }).error ?? resp.statusText);
  }
  return resp.json() as Promise<T>;
}

// Ideas
export interface IdeaSummary {
  id: string;
  name: string;
  description: string;
  complexity: { overall: number };
  createdAt: string;
}

export interface IdeaDetail {
  id: string;
  name: string;
  description: string;
  complexity: { overall: number; technical: number; market: number; capital: number; explanation: string };
  targetClients: Array<{ segment: string; size: string; industry: string; painPoints: string[] }>;
  clientContacts: Array<{ companyName: string; contactName?: string; website: string; reasoning: string }>;
  marketingFunnels: Array<{
    name: string;
    stages: Array<{ name: string; description: string; channels: string[]; metrics: string[] }>;
    estimatedCost: string;
    timeToFirstLead: string;
  }>;
  sourceData: Array<{ sourceType: string; title: string; url?: string; snippet: string }>;
  createdAt: string;
}

export const api = {
  // Ideas
  listIdeas: (limit = 50, offset = 0) =>
    apiFetch<{ ideas: IdeaSummary[]; total: number }>(`/ideas?limit=${limit}&offset=${offset}`),

  getIdea: (id: string) =>
    apiFetch<IdeaDetail>(`/ideas/${id}`),

  deleteIdea: (id: string) =>
    apiFetch<{ success: boolean }>(`/ideas/${id}`, { method: "DELETE" }),

  // Pipeline
  runPipeline: (query: string, sources?: string[]) =>
    apiFetch<{ message: string; query: string }>("/pipeline/run", {
      method: "POST",
      body: JSON.stringify({ query, sources }),
    }),

  listRuns: (limit = 20) =>
    apiFetch<{ runs: Array<{ id: string; status: string; query: string; currentPhase: string; createdAt: string }> }>(
      `/pipeline/runs?limit=${limit}`
    ),

  // Sources
  listSources: () =>
    apiFetch<{ sources: Array<{ name: string; type: string }> }>("/sources"),

  // Health
  health: () =>
    apiFetch<{ status: string; provider: string; hasApiKey: boolean }>("/health"),
};

// WebSocket for live pipeline updates
export function createPipelineSocket(
  onEvent: (event: { runId: string; phase: string; status: string; message: string; data?: unknown }) => void
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/pipeline`);

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {}
  };

  return ws;
}
