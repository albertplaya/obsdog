import { getDb } from './db.ts';

const mins = parseInt(process.env.OBS_RETENTION_MIN || '60', 10);
const MS = 60 * 1000;
const RETENTION_MS = mins * MS;

// Database operations for the new spans schema
export const Spans = {
  push: async (item: any) => {
    const db = getDb();
    const stmt = await db.prepare(`
      INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, start_time_ns, end_time_ns, attributes_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const attributes = JSON.stringify(item.attributes || {});
    
    await stmt.run(
      item.spanId || item.id,
      item.traceId,
      item.parentSpanId,
      item.name,
      item.kind,
      item.startTime,
      item.endTime,
      attributes
    );

    return item;
  },
  
  all: async () => {
    const db = getDb();
    const stmt = await db.prepare('SELECT * FROM spans ORDER BY start_time_ns DESC');
    return await stmt.all();
  },
  
  findByTraceId: async (traceId: string) => {
    const db = getDb();
    const stmt = await db.prepare('SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time_ns');
    return await stmt.all(traceId);
  },
  
  findByParentSpanId: async (parentSpanId: string) => {
    const db = getDb();
    const stmt = await db.prepare('SELECT * FROM spans WHERE parent_span_id = ? ORDER BY start_time_ns');
    return await stmt.all(parentSpanId);
  },
  
  prune: async () => {
    const db = getDb();
    const cutoff = Date.now() * 1000000; // Convert to nanoseconds
    const stmt = await db.prepare('DELETE FROM spans WHERE start_time_ns < ?');
    const result = await stmt.run(cutoff);
    console.log(`Pruned ${result.changes} old spans`);
  }
};

// Legacy support - keeping these for backward compatibility
export const Requests = {
  push: async (item: any) => {
    // Convert HTTP request to span format
    const spanData = {
      spanId: item.id || `req-${Date.now()}`,
      traceId: item.traceId || `trace-${Date.now()}`,
      name: `${item.method} ${item.path}`,
      kind: 1, // SERVER
      startTime: item.ts * 1000000, // Convert to nanoseconds
      endTime: (item.ts + (item.dur_ms || 0)) * 1000000,
      attributes: {
        'http.method': item.method,
        'http.target': item.path,
        'http.status_code': item.status,
        'http.duration_ms': item.dur_ms
      }
    };
    return await Spans.push(spanData);
  },
  
  all: async () => {
    // Get all HTTP spans
    const db = getDb();
    const stmt = await db.prepare(`
      SELECT * FROM spans 
      WHERE json_extract(attributes_json, '$."http.method"') IS NOT NULL
      ORDER BY start_time_ns DESC
    `);
    return await stmt.all();
  },
  
  prune: async () => {
    // Use spans prune
    await Spans.prune();
  }
};

export const Sql = {
  push: async (item: any) => {
    // Convert SQL query to span format
    const spanData = {
      spanId: item.spanId || `sql-${Date.now()}`,
      traceId: item.traceId || `trace-${Date.now()}`,
      name: 'SQL Query',
      kind: 3, // INTERNAL
      startTime: item.ts * 1000000, // Convert to nanoseconds
      endTime: (item.ts + (item.dur_ms || 0)) * 1000000,
      attributes: {
        'db.system': item.db || 'unknown',
        'db.statement': item.sql,
        'db.parameters': item.params,
        'db.duration_ms': item.dur_ms,
        'db.rows_affected': item.rows
      }
    };
    return await Spans.push(spanData);
  },
  
  all: async () => {
    // Get all SQL spans
    const db = getDb();
    const stmt = await db.prepare(`
      SELECT * FROM spans 
      WHERE json_extract(attributes_json, '$."db.statement"') IS NOT NULL
      ORDER BY start_time_ns DESC
    `);
    return await stmt.all();
  },
  
  prune: async () => {
    // Use spans prune
    await Spans.prune();
  }
};

export function attachToRequestEvent(evt: any) {
  // Future: build indexes if needed
  console.log('Attaching event:', evt);
}

export async function snapshot() {
  return {
    spans: await Spans.all(),
    requests: await Requests.all(),
    sql: await Sql.all(),
  };
}

export async function gcLoop() {
  setInterval(async () => {
    await Spans.prune();
  }, 10 * 1000);
}

// Initialize database when module is imported
import { initDatabase } from './db.ts';
initDatabase().catch(console.error);