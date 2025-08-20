const mins = parseInt(process.env.OBS_RETENTION_MIN || '60', 10)
const MS = 60 * 1000
const RETENTION_MS = mins * MS

function ring() {
  let arr = []
  return {
    push: (item) => { arr.push(item); return item },
    all: () => arr,
    prune: () => {
      const cutoff = Date.now() - RETENTION_MS
      arr = arr.filter(x => x.ts >= cutoff)
    }
  }
}

export const Requests = ring()     // {id, ts, method, path, status, dur_ms, traceId}
export const Spans = ring()        // raw spans (OTLP translated)
export const Sql = ring()          // {ts, traceId, spanId, sql, params, dur_ms, rows, db}

// simple correlator for request → spans → sql
export function attachToRequestEvent(evt) {
  // evt = {id, traceId}
  /* future: build indexes if needed */
}

export function snapshot() {
  return {
    requests: Requests.all(),
    sql: Sql.all(),
  }
}

export function gcLoop() {
  setInterval(() => {
    Requests.prune(); Spans.prune(); Sql.prune()
  }, 10 * 1000)
}