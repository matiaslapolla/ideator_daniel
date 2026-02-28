import { z } from "zod";

// ── Complexity ──────────────────────────────────────────────

export const ComplexitySchema = z.object({
  overall: z.number().min(1).max(10),
  technical: z.number().min(1).max(10),
  market: z.number().min(1).max(10),
  capital: z.number().min(1).max(10),
  explanation: z.string(),
});
export type Complexity = z.infer<typeof ComplexitySchema>;

// ── Target Client ───────────────────────────────────────────

export const TargetClientSchema = z.object({
  segment: z.string(),
  size: z.string(),
  industry: z.string(),
  painPoints: z.array(z.string()),
});
export type TargetClient = z.infer<typeof TargetClientSchema>;

// ── Client Contact ──────────────────────────────────────────

export const ClientContactSchema = z.object({
  companyName: z.string(),
  contactName: z.string().optional(),
  website: z.string(),
  reasoning: z.string(),
});
export type ClientContact = z.infer<typeof ClientContactSchema>;

// ── Marketing Funnel ────────────────────────────────────────

export const FunnelStageSchema = z.object({
  name: z.string(),
  description: z.string(),
  channels: z.array(z.string()),
  metrics: z.array(z.string()),
});
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

export const MarketingFunnelSchema = z.object({
  name: z.string(),
  stages: z.array(FunnelStageSchema),
  estimatedCost: z.string(),
  timeToFirstLead: z.string(),
});
export type MarketingFunnel = z.infer<typeof MarketingFunnelSchema>;

// ── Source Reference ────────────────────────────────────────

export const SourceReferenceSchema = z.object({
  sourceType: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  fetchedAt: z.string(),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

// ── Idea (main entity) ─────────────────────────────────────

export const IdeaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  complexity: ComplexitySchema,
  targetClients: z.array(TargetClientSchema),
  clientContacts: z.array(ClientContactSchema),
  marketingFunnels: z.array(MarketingFunnelSchema),
  sourceData: z.array(SourceReferenceSchema),
  createdAt: z.string(),
});
export type Idea = z.infer<typeof IdeaSchema>;

// ── Source Result (raw data from scrapers) ──────────────────

export const SourceResultSchema = z.object({
  sourceType: z.string(),
  title: z.string(),
  url: z.string().optional(),
  content: z.string(),
  score: z.number().optional(),
  timestamp: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type SourceResult = z.infer<typeof SourceResultSchema>;

// ── Pipeline ────────────────────────────────────────────────

export type PipelinePhase =
  | "discovery"
  | "research"
  | "analysis"
  | "validation"
  | "output";

export type PipelineStatus = "pending" | "running" | "completed" | "failed";

export interface PipelineRun {
  id: string;
  status: PipelineStatus;
  currentPhase: PipelinePhase | null;
  query: string;
  sources: string[];
  results: Idea[];
  phaseOutputs: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PipelineEvent {
  runId: string;
  phase: PipelinePhase;
  status: PipelineStatus;
  message: string;
  data?: unknown;
  timestamp: string;
}

// ── AI Provider Config ──────────────────────────────────────

export interface AIProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  maxRequestsPerMinute: number;
}
