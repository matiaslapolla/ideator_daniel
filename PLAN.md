# Ideator - Internal Idea Generation & Validation Tool

## Context

A client company wants to rapidly iterate on B2B/B2C app ideas. They need an internal tool that scrapes free data sources (Reddit, HN, blogs), runs multi-phase AI analysis, and outputs structured idea reports with: name, description, complexity, target clients, specific companies to contact, and marketing funnels. Accessed via both a terminal UI (like opencode/claude-code) and a web UI, deployed on a VPS.

## Tech Stack

- **Runtime**: Bun (fastest JS runtime, built-in SQLite)
- **Language**: TypeScript
- **UI Framework**: SolidJS (both web and TUI)
- **API**: Hono (lightweight, type-safe RPC with SolidJS web client)
- **AI**: OpenRouter / Groq / NVIDIA NIM (all OpenAI-compatible) via single `openai` npm package
- **TUI**: Ink (start with `ink` + React, swap to `solid-ink` if needed)
- **Database**: `bun:sqlite` (zero dependency, built into Bun)
- **Scraping**: Cheerio (static HTML), `rss-parser`, `google-trends-api`
- **Validation**: Zod (schema validation for LLM JSON output)
- **Deployment**: Docker + docker-compose on VPS

## Monorepo Structure

```
ideator_daniel/
├── package.json                  # Bun workspace root
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
│
├── packages/
│   ├── core/                     # @ideator/core — business logic, types, AI pipeline
│   │   └── src/
│   │       ├── types/            # Idea, ComplexityScore, ClientContact, MarketingFunnel, SourceResult
│   │       ├── pipeline/         # PipelineOrchestrator + 5 phases
│   │       │   ├── orchestrator.ts
│   │       │   └── phases/       # discovery.ts, research.ts, analysis.ts, validation.ts, output.ts
│   │       ├── sources/          # Data source plugins + registry
│   │       │   ├── registry.ts, base.ts
│   │       │   ├── reddit.ts     # old.reddit.com/.json endpoints (free)
│   │       │   ├── hackernews.ts # Firebase API + Algolia search (free)
│   │       │   ├── google-trends.ts
│   │       │   ├── rss.ts        # Configurable feed list
│   │       │   └── web-scraper.ts # Cheerio-based
│   │       ├── ai/
│   │       │   ├── client.ts     # Unified AI client (OpenRouter/Groq/NIM) via openai SDK
│   │       │   ├── providers.ts  # Provider configs: base URLs, default models, rate limits
│   │       │   └── structured.ts # JSON schema enforcement + Zod validation for LLM output
│   │       ├── storage/
│   │       │   ├── db.ts         # bun:sqlite setup + migrations
│   │       │   └── repository.ts # CRUD for ideas, pipeline runs, source cache
│   │       └── utils/            # rate-limiter.ts, retry.ts, logger.ts
│   │
│   ├── api/                      # @ideator/api — Hono HTTP + WebSocket server
│   │   └── src/
│   │       ├── index.ts          # App composition, exports AppType for RPC
│   │       ├── routes/           # ideas.ts, pipeline.ts, sources.ts, health.ts
│   │       └── ws.ts             # WebSocket for live pipeline streaming
│   │
│   ├── web/                      # @ideator/web — SolidJS SPA
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── api/client.ts     # Hono RPC client (type-safe, zero codegen)
│   │       ├── pages/            # Dashboard, Generate, IdeaDetail, History, Settings
│   │       └── components/       # IdeaCard, PipelineStatus, FunnelDiagram, ComplexityBadge
│   │
│   └── tui/                      # @ideator/tui — Terminal UI
│       └── src/
│           ├── index.tsx          # Entry point
│           ├── App.tsx
│           ├── views/            # Dashboard, Generate, IdeaDetail, PipelineView
│           └── components/       # IdeaTable, ProgressBar, StatusLine, KeyBindings
```

## Core Data Types

```typescript
interface Idea {
  id: string;
  name: string;
  description: string;
  complexity: { overall: number; technical: number; market: number; capital: number; explanation: string };
  targetClients: { segment: string; size: string; industry: string; painPoints: string[] }[];
  clientContacts: { companyName: string; contactName?: string; website: string; reasoning: string }[];
  marketingFunnels: { name: string; stages: FunnelStage[]; estimatedCost: string; timeToFirstLead: string }[];
  sourceData: SourceReference[];
  createdAt: Date;
}
```

## AI Pipeline — 5 Phases

| # | Phase | What it does | LLM? |
|---|-------|-------------|------|
| 1 | **Discovery** | Fetch data from all enabled sources concurrently (`Promise.allSettled`) | No |
| 2 | **Research** | LLM summarizes trends, pain points, opportunity signals from raw data | Yes |
| 3 | **Analysis** | LLM generates 3-5 candidate ideas with complexity scoring (1-10) | Yes |
| 4 | **Validation** | LLM identifies target client segments + specific real companies to contact | Yes |
| 5 | **Output** | LLM designs $0-cost marketing funnels per idea, formats final report | Yes |

Each LLM phase requests JSON output + validates with Zod schemas. Prompts stored as template files in `pipeline/prompts/`.

The `PipelineOrchestrator` emits events at each phase transition, enabling real-time streaming to both UIs via WebSocket.

## AI Providers

All three providers are **OpenAI-compatible** — single `openai` npm package, swap via base URL:

| Provider | Base URL | Free Tier | Best For |
|----------|----------|-----------|----------|
| **Groq** | `https://api.groq.com/openai/v1` | 14,400 req/day, no CC | Fast inference (llama-3.3-70b) |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 50 req/day free; cheap paid | Model variety (400+ models) |
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | Free credits for devs | High-quality (Llama, Mistral) |

```typescript
// Unified client — just swap baseURL + apiKey
import OpenAI from "openai";
const ai = new OpenAI({
  apiKey: config.provider.apiKey,
  baseURL: config.provider.baseURL, // groq, openrouter, or nvidia
});
```

Provider is configurable in settings. Default: **Groq** (most generous free tier, fastest).

## Free Data Sources ($0)

| Source | Method | Rate Limit |
|--------|--------|------------|
| Reddit | `old.reddit.com/r/{sub}/search.json` | 1 req/2s, User-Agent required |
| Hacker News | Firebase API + Algolia search | No limit |
| Google Trends | `google-trends-api` npm package | Moderate |
| RSS/Blogs | `rss-parser` with configurable feed list | N/A |
| Web scraper | Cheerio for static HTML | Self-managed |

## API Layer (Hono)

- `POST /api/pipeline/run` — Start idea generation (returns `runId`)
- `GET /api/pipeline/status/:runId` — Poll pipeline status
- `WS /ws/pipeline/:runId` — Stream live phase updates + LLM tokens
- `GET /api/ideas` — List generated ideas (paginated)
- `GET /api/ideas/:id` — Full idea detail
- `DELETE /api/ideas/:id` — Remove idea
- `GET /api/sources` — List sources and their status
- `GET /api/health` — System health (AI provider connection, source status)

Hono RPC (`AppType` export) gives the web client full type safety with zero codegen.

## Deployment (VPS)

`docker-compose.yml` with single service (no local LLM needed since AI is cloud-based):
1. **ideator** — Bun server (API + static web UI), port 3001

API serves built SolidJS web app via `serveStatic`. Single-port access. TUI connects to same API endpoint remotely or runs embedded.

SQLite DB persisted via Docker volume. Minimal VPS requirements (no GPU, no heavy RAM — AI runs on Groq/OpenRouter/NIM cloud).

## Implementation Order

### Phase 1: Foundation
1. Init monorepo (root package.json, tsconfig, .gitignore)
2. `@ideator/core`: types, unified AI client (openai SDK), bun:sqlite storage
3. Build Hacker News source (simplest, free, no auth)
4. Build Discovery phase end-to-end
5. Verify: run from script, see raw data output

### Phase 2: Full Pipeline
6. Build remaining sources (Reddit, Google Trends, RSS, web scraper)
7. Build Research, Analysis, Validation, Output phases with prompts
8. Build SourceRegistry + PipelineOrchestrator with event callbacks
9. Verify: run full pipeline from script, get `Idea[]` as JSON

### Phase 3: API Server
10. Set up Hono with all routes + WebSocket streaming
11. Request validation with Zod middleware
12. Verify: curl all endpoints, test WebSocket with wscat

### Phase 4: Web UI
13. SolidJS + Vite setup with Hono RPC client
14. Dashboard, Generate, IdeaDetail, History, Settings pages
15. WebSocket integration for live pipeline streaming
16. Verify: full flow in browser

### Phase 5: Terminal UI
17. Set up TUI with Ink/solid-ink
18. Dashboard, Generate, Pipeline, IdeaDetail views
19. Keybindings (n=new, Enter=view, q=quit, Tab=switch panes)
20. Verify: full flow in terminal

### Phase 6: Deploy
21. Dockerfile + docker-compose
22. Source caching, rate limiting, error handling edge cases
23. Export functionality (JSON, Markdown)

## Verification

- **Unit**: Each data source can be tested in isolation with `bun test`
- **Pipeline**: Run `bun run packages/core/src/pipeline/orchestrator.ts` with test input
- **API**: `curl http://localhost:3001/api/health` + full endpoint smoke tests
- **Web**: Open `http://localhost:3001` → Generate → verify idea output renders
- **TUI**: Run `bun run packages/tui/src/index.tsx` → press `n` → generate → verify output
- **Docker**: `docker-compose up` → verify service starts and connects to AI provider
