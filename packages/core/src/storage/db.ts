import { Database } from "bun:sqlite";
import { logger } from "../utils/logger";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const dbPath = process.env.DB_PATH ?? "./data/ideator.db";
    // Ensure data directory exists
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dir) {
      try {
        require("fs").mkdirSync(dir, { recursive: true });
      } catch {}
    }
    db = new Database(dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    logger.info(`Database opened at ${dbPath}`);
  }
  return db;
}

export function initDb(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      complexity TEXT NOT NULL,
      target_clients TEXT NOT NULL,
      client_contacts TEXT NOT NULL,
      marketing_funnels TEXT NOT NULL,
      source_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  d.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      current_phase TEXT,
      query TEXT NOT NULL,
      sources TEXT NOT NULL,
      results TEXT NOT NULL DEFAULT '[]',
      phase_outputs TEXT NOT NULL DEFAULT '{}',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  d.exec(`
    CREATE TABLE IF NOT EXISTS source_cache (
      key TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);

  logger.info("Database initialized");
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
