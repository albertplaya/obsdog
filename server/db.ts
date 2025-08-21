import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'devobs.db');

// Ensure data directory exists
import fs from 'node:fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database;

// Initialize database connection
export async function initDatabase() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable WAL mode and other optimizations
    await db.exec('PRAGMA journal_mode = WAL');
    await db.exec('PRAGMA synchronous = NORMAL');
    await db.exec('PRAGMA foreign_keys = ON');

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS spans (
        span_id            TEXT PRIMARY KEY,
        trace_id           TEXT NOT NULL,
        parent_span_id     TEXT,
        name               TEXT,
        kind               INTEGER,
        start_time_ns      INTEGER,       -- fits in signed 64-bit
        end_time_ns        INTEGER,
        duration_ns        GENERATED ALWAYS AS (end_time_ns - start_time_ns) VIRTUAL,
        attributes_json    TEXT           -- JSON blob (json1)
      )
    `);

    // Indexes for spans table
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);
      CREATE INDEX IF NOT EXISTS idx_spans_start ON spans(start_time_ns);
      
      -- "Virtual" indexes for common filters (status code, method, route)
      CREATE INDEX IF NOT EXISTS idx_spans_http_status ON spans(
        json_extract(attributes_json, '$."http.status_code"')
      );
      CREATE INDEX IF NOT EXISTS idx_spans_http_method ON spans(
        json_extract(attributes_json, '$."http.method"')
      );
      CREATE INDEX IF NOT EXISTS idx_spans_http_target ON spans(
        json_extract(attributes_json, '$."http.target"')
      );
    `);

    console.log('Database initialized successfully with new schema');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Get database instance
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Cleanup function
export async function closeDatabase() {
  if (db) {
    await db.close();
  }
}
