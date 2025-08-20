// Accept OTLP/HTTP JSON (set OTEL_EXPORTER_OTLP_PROTOCOL=http/json)
// Shapes: https://opentelemetry.io/docs/specs/otlp/#otlphttp
import { Spans } from './storage.ts'

export function handleOtlpJson(body) {
  console.log('handleOtlpJson', body)
  // body: ExportTraceServiceRequest JSON
  const now = Date.now()
  const resourceSpans = body.resourceSpans || []
  for (const rs of resourceSpans) {
    for (const ils of (rs.scopeSpans || rs.instrumentationLibrarySpans || [])) {
      for (const span of (ils.spans || [])) {
        // Normalize minimal fields
        const normalized = {
          ts: now,
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          kind: span.kind,
          startUnixNanos: Number(span.startTimeUnixNano || 0),
          endUnixNanos: Number(span.endTimeUnixNano || 0),
          attributes: span.attributes || []
        }
        Spans.push(normalized)
      }
    }
  }
}