# Ideator

An internal B2B/B2C idea generation and validation tool. Scrapes free data sources (Reddit, Hacker News, Google Trends, RSS feeds), runs a 5-phase AI pipeline, and outputs structured idea reports with complexity scores, target client segments, specific companies to contact, and $0-cost marketing funnels.

Accessible via a **web UI** (SolidJS) and a **terminal UI** (Ink), deployable on any VPS with Docker.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Development](#development)
- [API Reference](#api-reference)
- [AI Pipeline](#ai-pipeline)
- [Data Sources](#data-sources)
- [Deployment](#deployment)
- [Recommendations](#recommendations)

---

## Architecture

Bun monorepo with four packages:

```
ideator/
├── packages/
│   ├── core/     # @ideator/core — types, AI client, pipeline, sources, storage
│   ├── api/      # @ideator/api  — Hono HTTP server + WebSocket
│   ├── web/      # @ideator/web  — SolidJS SPA (served by the API in production)
│   └── tui/      # @ideator/tui  — Ink terminal UI
```

**Stack:** Bun · TypeScript · SolidJS · Hono · bun:sqlite · Zod · Cheerio · openai SDK (compatible with Groq / OpenRouter / NVIDIA NIM)

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0 (`curl -fsSL https://bun.sh/install | bash`)
- An API key from **at least one** AI provider (all have free tiers):
  - [Groq](https://console.groq.com) — 14,400 req/day, no credit card required (**recommended**)
  - [OpenRouter](https://openrouter.ai) — 50 req/day free, then pay-per-token
  - [NVIDIA NIM](https://build.nvidia.com) — free developer credits
- Docker + Docker Compose (for production deployment only)

---

## Configuration

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | No | `groq` | AI provider: `groq`, `openrouter`, or `nvidia` |
| `GROQ_API_KEY` | If using Groq | — | Get at console.groq.com |
| `OPENROUTER_API_KEY` | If using OpenRouter | — | Get at openrouter.ai |
| `NVIDIA_API_KEY` | If using NVIDIA NIM | — | Get at build.nvidia.com |
| `PORT` | No | `3001` | HTTP server port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `DB_PATH` | No | `./data/ideator.db` | SQLite database path |

### Provider defaults

| Provider | Default model | Rate limit |
|---|---|---|
| `groq` | `llama-3.3-70b-versatile` | 30 req/min |
| `openrouter` | `meta-llama/llama-3.3-70b-instruct` | 20 req/min |
| `nvidia` | `meta/llama-3.1-70b-instruct` | 20 req/min |

---

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env — set GROQ_API_KEY (or another provider)

# 3. Start the API server
bun run dev:api
# → http://localhost:3001

# 4a. Open the web UI (in a second terminal)
bun run dev:web
# → http://localhost:3000

# 4b. Or use the terminal UI
bun run dev:tui
```

### Run the pipeline directly (no server)

```bash
bun run pipeline "B2B SaaS tools for remote teams"
# Prints a JSON array of generated ideas to stdout
```

---

## Development

### Available scripts (root)

```bash
bun run dev:api    # API server with hot reload (port 3001)
bun run dev:web    # Vite dev server for web UI (port 3000, proxied to API)
bun run dev:tui    # Terminal UI
bun run build:web  # Build web UI to packages/web/dist/
bun test           # Run all tests
bun run pipeline "your query here"  # Run pipeline directly
```

### Package-level development

```bash
# Core — test a single source in isolation
bun packages/core/src/sources/hackernews.ts

# API — start with verbose logging
bun --watch packages/api/src/index.ts

# Web — standard Vite workflow
cd packages/web && bun run dev
```

### Workspace structure

Each package has its own `package.json`. The root `package.json` defines Bun workspaces. Import across packages using their workspace names:

```typescript
import { PipelineOrchestrator } from "@ideator/core";
```

---

## API Reference

Base URL: `http://localhost:3001/api`

### Pipeline

| Method | Path | Description |
|---|---|---|
| `POST` | `/pipeline/run` | Start idea generation |
| `GET` | `/pipeline/status/:runId` | Poll pipeline status |
| `WS` | `/ws/pipeline/:runId` | Stream live phase updates |

**POST `/pipeline/run`**
```json
{
  "query": "B2B SaaS tools for small e-commerce businesses",
  "sources": ["hackernews", "reddit", "google-trends"],
  "limit": 30
}
```

Response:
```json
{ "runId": "550e8400-e29b-41d4-a716-446655440000" }
```

**GET `/pipeline/status/:runId`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "currentPhase": null,
  "results": [ /* Idea[] */ ]
}
```

**WebSocket `/ws/pipeline/:runId`**

Emits `PipelineEvent` objects as each phase progresses:
```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "phase": "analysis",
  "status": "running",
  "message": "Generating candidate ideas...",
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### Ideas

| Method | Path | Description |
|---|---|---|
| `GET` | `/ideas` | List all ideas (paginated) |
| `GET` | `/ideas/:id` | Full idea detail |
| `DELETE` | `/ideas/:id` | Delete an idea |

**GET `/ideas`**
```
/ideas?page=1&limit=20
```

### Sources & Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/sources` | List registered sources and status |
| `GET` | `/health` | System health (AI provider connectivity) |

### Idea schema

```typescript
interface Idea {
  id: string;
  name: string;
  description: string;
  complexity: {
    overall: number;      // 1–10
    technical: number;    // 1–10
    market: number;       // 1–10
    capital: number;      // 1–10
    explanation: string;
  };
  targetClients: {
    segment: string;
    size: string;
    industry: string;
    painPoints: string[];
  }[];
  clientContacts: {
    companyName: string;
    contactName?: string;
    website: string;
    reasoning: string;    // why this company is a good fit
  }[];
  marketingFunnels: {
    name: string;
    estimatedCost: string;
    timeToFirstLead: string;
    stages: {
      name: string;
      description: string;
      channels: string[];
      metrics: string[];
    }[];
  }[];
  sourceData: {
    sourceType: string;
    title: string;
    url?: string;
    snippet: string;
    fetchedAt: string;
  }[];
  createdAt: string;
}
```

---

## AI Pipeline

The pipeline runs 5 sequential phases. Phase 1 has no LLM calls; phases 2–5 each make one structured LLM call with Zod schema validation.

```
Query → [1. Discovery] → [2. Research] → [3. Analysis] → [4. Validation] → [5. Output] → Ideas[]
```

| # | Phase | What happens | LLM |
|---|---|---|---|
| 1 | **Discovery** | Fetch raw data from all enabled sources concurrently (`Promise.allSettled`) | No |
| 2 | **Research** | Summarize trends, pain points, and opportunity signals from raw source data | Yes |
| 3 | **Analysis** | Generate 3–5 candidate ideas with complexity scores (1–10 across 4 axes) | Yes |
| 4 | **Validation** | Identify target client segments + specific real companies to cold-contact | Yes |
| 5 | **Output** | Design $0-cost marketing funnels per idea, format final structured report | Yes |

Each LLM call uses `structuredGenerate()` which enforces JSON output and validates against a Zod schema. Malformed responses are retried automatically.

The `PipelineOrchestrator` emits events at every phase transition, enabling real-time WebSocket streaming to both UIs.

---

## Data Sources

All sources are free with no API keys required.

| Source | Method | Notes |
|---|---|---|
| **Hacker News** | Firebase API + Algolia search | No rate limit |
| **Reddit** | `old.reddit.com/.json` endpoints | 1 req/2s, User-Agent required |
| **Google Trends** | `google-trends-api` npm package | Moderate limits |
| **RSS/Blogs** | `rss-parser` with configurable feed list | Depends on feed |
| **Web Scraper** | Cheerio static HTML scraping | Self-managed |

Sources can be enabled/disabled per pipeline run by passing the `sources` array in the request body. Omitting `sources` uses all registered sources.

---

## Deployment

### Docker (recommended for VPS)

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env with your API key

# 2. Build and start
docker-compose up -d

# 3. Verify
curl http://localhost:3001/api/health
```

The container:
- Builds the SolidJS web UI at image build time
- Serves the built SPA as static files from the same Bun server (single port)
- Persists the SQLite database in a named Docker volume (`ideator-data`)
- Restarts automatically unless manually stopped

### VPS requirements

- Any Linux VPS (1 vCPU, 512MB RAM is sufficient — AI runs on cloud provider)
- Docker + Docker Compose installed
- Port 3001 open (or reverse-proxy via nginx/caddy)

### Reverse proxy (nginx example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

The `Upgrade` and `Connection` headers are required for WebSocket streaming to work through the proxy.

---

## Recommendations

### AI provider

**Use Groq for development.** It has the most generous free tier (14,400 req/day), no credit card requirement, and the fastest inference. Switch to OpenRouter for production if you need access to more models or higher throughput.

### Query design

More specific queries produce better results. Compare:

```
# Too broad — unfocused research, generic ideas
"apps for small businesses"

# Good — targeted research, actionable ideas
"B2B workflow automation tools for construction project managers"

# Also good — problem-focused
"tools to reduce churn for SaaS companies under $1M ARR"
```

### Source selection

- For tech trends: enable `hackernews` + `reddit` (r/entrepreneur, r/startups)
- For broader market signals: add `google-trends` + `rss`
- Disable `web-scraper` for faster runs (it's slowest and least reliable)

### Pipeline tuning

Set `limit` to control how much raw data is fed into the pipeline:
- `limit: 15` — faster, lower token cost, less diverse ideas
- `limit: 50` — slower, higher cost, more thorough research

Default is `30`, which is a good balance.

### Running the TUI on a remote server

The TUI reads `IDEATOR_API_URL` to connect to a remote API:

```bash
IDEATOR_API_URL=https://your-vps.com bun run dev:tui
```

Without this variable it defaults to `http://localhost:3001`.
