import { getDb } from "./db";
import type { Idea, PipelineRun } from "../types";

export class IdeaRepository {
  // ── Ideas ───────────────────────────────────────────────

  createIdea(idea: Idea): void {
    const db = getDb();
    db.run(
      `INSERT INTO ideas (id, name, description, complexity, target_clients, client_contacts, marketing_funnels, source_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idea.id,
        idea.name,
        idea.description,
        JSON.stringify(idea.complexity),
        JSON.stringify(idea.targetClients),
        JSON.stringify(idea.clientContacts),
        JSON.stringify(idea.marketingFunnels),
        JSON.stringify(idea.sourceData),
        idea.createdAt,
      ]
    );
  }

  getIdea(id: string): Idea | null {
    const db = getDb();
    const row = db
      .query("SELECT * FROM ideas WHERE id = ?")
      .get(id) as Record<string, string> | null;
    if (!row) return null;
    return this.rowToIdea(row);
  }

  listIdeas(limit = 50, offset = 0): Idea[] {
    const db = getDb();
    const rows = db
      .query("SELECT * FROM ideas ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Record<string, string>[];
    return rows.map((r) => this.rowToIdea(r));
  }

  deleteIdea(id: string): boolean {
    const db = getDb();
    const result = db.run("DELETE FROM ideas WHERE id = ?", [id]);
    return result.changes > 0;
  }

  countIdeas(): number {
    const db = getDb();
    const row = db.query("SELECT COUNT(*) as count FROM ideas").get() as {
      count: number;
    };
    return row.count;
  }

  private rowToIdea(row: Record<string, string>): Idea {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      complexity: JSON.parse(row.complexity),
      targetClients: JSON.parse(row.target_clients),
      clientContacts: JSON.parse(row.client_contacts),
      marketingFunnels: JSON.parse(row.marketing_funnels),
      sourceData: JSON.parse(row.source_data),
      createdAt: row.created_at,
    };
  }

  // ── Pipeline Runs ─────────────────────────────────────────

  createPipelineRun(run: PipelineRun): void {
    const db = getDb();
    db.run(
      `INSERT INTO pipeline_runs (id, status, current_phase, query, sources, results, phase_outputs, error, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.status,
        run.currentPhase,
        run.query,
        JSON.stringify(run.sources),
        JSON.stringify(run.results),
        JSON.stringify(run.phaseOutputs),
        run.error ?? null,
        run.createdAt,
        run.completedAt ?? null,
      ]
    );
  }

  getPipelineRun(id: string): PipelineRun | null {
    const db = getDb();
    const row = db
      .query("SELECT * FROM pipeline_runs WHERE id = ?")
      .get(id) as Record<string, string> | null;
    if (!row) return null;
    return this.rowToRun(row);
  }

  updatePipelineRun(
    id: string,
    updates: Partial<
      Pick<
        PipelineRun,
        | "status"
        | "currentPhase"
        | "results"
        | "phaseOutputs"
        | "error"
        | "completedAt"
      >
    >
  ): void {
    const db = getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      sets.push("status = ?");
      values.push(updates.status);
    }
    if (updates.currentPhase !== undefined) {
      sets.push("current_phase = ?");
      values.push(updates.currentPhase);
    }
    if (updates.results !== undefined) {
      sets.push("results = ?");
      values.push(JSON.stringify(updates.results));
    }
    if (updates.phaseOutputs !== undefined) {
      sets.push("phase_outputs = ?");
      values.push(JSON.stringify(updates.phaseOutputs));
    }
    if (updates.error !== undefined) {
      sets.push("error = ?");
      values.push(updates.error);
    }
    if (updates.completedAt !== undefined) {
      sets.push("completed_at = ?");
      values.push(updates.completedAt);
    }

    if (sets.length === 0) return;
    values.push(id);
    db.run(
      `UPDATE pipeline_runs SET ${sets.join(", ")} WHERE id = ?`,
      values as string[]
    );
  }

  listPipelineRuns(limit = 20, offset = 0): PipelineRun[] {
    const db = getDb();
    const rows = db
      .query(
        "SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(limit, offset) as Record<string, string>[];
    return rows.map((r) => this.rowToRun(r));
  }

  private rowToRun(row: Record<string, string>): PipelineRun {
    return {
      id: row.id,
      status: row.status as PipelineRun["status"],
      currentPhase: (row.current_phase as PipelineRun["currentPhase"]) ?? null,
      query: row.query,
      sources: JSON.parse(row.sources),
      results: JSON.parse(row.results),
      phaseOutputs: JSON.parse(row.phase_outputs),
      error: row.error || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    };
  }

  // ── Source Cache ───────────────────────────────────────────

  getCachedSource(key: string): unknown | null {
    const db = getDb();
    const row = db
      .query(
        "SELECT data FROM source_cache WHERE key = ? AND expires_at > datetime('now')"
      )
      .get(key) as { data: string } | null;
    if (!row) return null;
    return JSON.parse(row.data);
  }

  setCachedSource(
    key: string,
    sourceType: string,
    data: unknown,
    ttlMinutes = 60
  ): void {
    const db = getDb();
    db.run(
      `INSERT OR REPLACE INTO source_cache (key, source_type, data, fetched_at, expires_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now', '+' || ? || ' minutes'))`,
      [key, sourceType, JSON.stringify(data), ttlMinutes]
    );
  }

  clearExpiredCache(): void {
    const db = getDb();
    db.run("DELETE FROM source_cache WHERE expires_at < datetime('now')");
  }
}
