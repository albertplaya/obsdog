import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Create the Node SDK with enhanced configuration
console.log('Starting tracing')
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://devobs-backend:3001/v1/otlp/http/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
