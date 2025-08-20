// tracing.js
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://devobs-backend:3001/v1/otlp/http/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
