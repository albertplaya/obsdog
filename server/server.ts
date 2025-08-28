import express from "express";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Requests, Sql, snapshot, gcLoop } from "./storage.ts";
import { handleOtlpJson } from "./otlp-json.ts";

const app = express();

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3001", 10);
const TARGET_URL = process.env.TARGET_URL || "http://localhost:8080";
const OTLP_PATH = process.env.OTLP_PATH || "/v1/otlp/http/traces";

// --- health ---
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- ingest: OTLP JSON traces ---
app.post(OTLP_PATH, async (req, res) => {
  try {
    console.log('handleOtlpJson');
    console.dir(req.body, { depth: null, colors: true });
    await handleOtlpJson(req.body); 
    res.sendStatus(204);
  } catch (e) {
    console.error('Error handling OTLP JSON:', e);
    res.status(400).send(String(e));
  }
});

// --- ingest: HTTP events (if you want to send custom events) ---
app.post("/ingest/http", (req, res) => {
  const { id, ts, method, path: p, status, dur_ms, traceId } = req.body || {};
  Requests.push({
    id,
    ts: ts || Date.now(),
    method,
    path: p,
    status,
    dur_ms,
    traceId,
  });
  res.sendStatus(204);
});

// --- ingest: SQL events ---
app.post("/ingest/sql", (req, res) => {
  const { traceId, spanId, sql, params, dur_ms, rows, db } = req.body || {};
  Sql.push({ ts: Date.now(), traceId, spanId, sql, params, dur_ms, rows, db });
  res.sendStatus(204);
});

// --- API: snapshots ---
app.get("/api/snapshot", async (_req, res) => res.json(await snapshot()));

// --- SSE: live stream (UI uses EventSource) ---
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (type, payload) =>
    res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);

  // naive broadcast by monkey-patching push (good enough for MVP)
  const origPushReq = Requests.push;
  const origPushSql = Sql.push;
  Requests.push = (x) => {
    const r = origPushReq(x);
    send("request", x);
    return r;
  };
  Sql.push = (x) => {
    const r = origPushSql(x);
    send("sql", x);
    return r;
  };

  req.on("close", () => {
    Requests.push = origPushReq;
    Sql.push = origPushSql;
  });
});

// --- start servers ---
app.listen(PORT, () => {
  console.log(`[devobs] UI+ingest on :${PORT}  (OTLP: ${OTLP_PATH})`);
});

// GC loop
//gcLoop();
