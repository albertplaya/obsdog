// Accept OTLP/HTTP JSON (set OTEL_EXPORTER_OTLP_PROTOCOL=http/json)
// Shapes: https://opentelemetry.io/docs/specs/otlp/#otlphttp
import { Spans } from './storage.ts';

export async function handleOtlpJson(body: any) {
  const resourceSpans = body.resourceSpans || [];
  
  for (const rs of resourceSpans) {
    for (const ils of (rs.scopeSpans || rs.instrumentationLibrarySpans || [])) {
      for (const span of (ils.spans || [])) {
        try {
          // Normalize and store the span
          const normalized = {
            spanId: span.spanId,
            traceId: span.traceId,
            parentSpanId: span.parentSpanId,
            name: span.name,
            kind: span.kind,
            startTime: Number(span.startTimeUnixNano || 0),
            endTime: Number(span.endTimeUnixNano || 0),
            attributes: extractAttributes(span.attributes || []),
            events: span.events || [],
            links: span.links || [],
            status: span.status || { code: 0 }
          };
          
          await Spans.push(normalized);
          console.log('Stored span:', normalized.name, 'for trace:', normalized.traceId);
          
        } catch (error) {
          console.error('Failed to store span:', error);
        }
      }
    }
  }
}

// Helper function to extract attributes from OTLP format
function extractAttributes(attributes: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const attr of attributes) {
    const key = attr.key;
    const value = attr.value;
    
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.intValue !== undefined) {
      result[key] = value.intValue;
    } else if (value.doubleValue !== undefined) {
      result[key] = value.doubleValue;
    } else if (value.boolValue !== undefined) {
      result[key] = value.boolValue;
    } else if (value.arrayValue !== undefined) {
      result[key] = value.arrayValue.values?.map((v: any) => 
        v.stringValue || v.intValue || v.doubleValue || v.boolValue
      ) || [];
    }
  }
  
  return result;
}