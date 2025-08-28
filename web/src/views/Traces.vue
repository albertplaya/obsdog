<template>
  <div class="traces-dashboard">
    <!-- Main Content -->
    <main class="main-content">
      <div class="content-header">
        <div class="header-left">
          <h1 class="page-title">Outbound Traces & Spans</h1>
          <div class="trace-stats">
            <span class="stat-item">
              <span class="stat-label">Total Traces:</span>
              <span class="stat-value">{{ uniqueTraces.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Total Spans:</span>
              <span class="stat-value">{{ outboundSpans.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Avg Span Duration:</span>
              <span class="stat-value">{{ averageSpanDuration }}ms</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Last Updated:</span>
              <span class="stat-value">{{ lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never' }}</span>
            </span>
          </div>
        </div>
        <div class="header-right">
          <Button 
            variant="outline" 
            size="sm" 
            @click="refreshTraces"
            :disabled="isLoading"
            class="refresh-btn"
          >
            <svg v-if="!isLoading" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </Button>
        </div>
      </div>

      <!-- Traces List -->
      <div class="traces-container">
        <div class="traces-header">
          <h2 class="traces-title">Parent Spans (Outbound Requests)</h2>
          <div class="search-box">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search traces..." 
              class="search-input"
            />
          </div>
        </div>

        <div class="traces-list">
          <div 
            v-for="trace in paginatedTraces" 
            :key="trace.trace_id" 
            class="trace-item"
            :class="{ 'selected': selectedTrace?.trace_id === trace.trace_id }"
            @click="selectTrace(trace)"
          >
            <div class="trace-header">
              <div class="trace-info">
                <span class="trace-id">{{ trace.trace_id }}</span>
                <span class="trace-name">{{ trace.name }}</span>
              </div>
              <div class="trace-meta">
                <span class="trace-duration">{{ formatDuration(trace.duration_ns) }}</span>
                <span class="trace-time">{{ formatTime(trace.start_time_ns) }}</span>
              </div>
            </div>
            <div class="trace-details">
              <div class="trace-attributes">
                <span v-if="getHttpMethod(trace)" class="attribute method">
                  {{ getHttpMethod(trace) }}
                </span>
                <span v-if="getHttpPath(trace)" class="attribute path">
                  {{ getHttpPath(trace) }}
                </span>
                <span v-if="getHttpStatus(trace)" class="attribute status" :class="getStatusClass(getHttpStatus(trace))">
                  {{ getHttpStatus(trace) }}
                </span>
              </div>
              <div class="trace-children">
                <span class="children-count">{{ getChildSpansCount(trace.trace_id) }} child spans</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredTraces.length) }} of {{ filteredTraces.length }} traces
          </div>
          <div class="pagination-controls">
            <Button 
              variant="outline" 
              size="sm" 
              :disabled="currentPage === 1"
              @click="currentPage = currentPage - 1"
            >
              Previous
            </Button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <Button 
              variant="outline" 
              size="sm" 
              :disabled="currentPage === totalPages"
              @click="currentPage = currentPage + 1"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>

    <!-- Trace Detail Side Panel -->
    <div 
      v-if="selectedTrace" 
      class="trace-detail-panel"
      :class="{ 'panel-open': showDetailPanel }"
    >
      <div class="panel-header">
        <h3 class="panel-title">Trace Details</h3>
        <button 
          @click="closeTraceDetail" 
          class="close-button"
          aria-label="Close panel"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="panel-content">
        <!-- Parent Span Details -->
        <div class="detail-section">
          <h4 class="section-title">Parent Span</h4>
          <div class="parent-span-info">
            <div class="span-header">
              <span class="span-name">{{ selectedTrace.name }}</span>
              <span class="span-duration">{{ formatDuration(selectedTrace.duration_ns) }}</span>
            </div>
            <div class="span-details">
              <div class="detail-item">
                <span class="detail-label">Span ID:</span>
                <span class="detail-value span-id">{{ selectedTrace.span_id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Trace ID:</span>
                <span class="detail-value trace-id">{{ selectedTrace.trace_id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Start Time:</span>
                <span class="detail-value">{{ formatTime(selectedTrace.start_time_ns) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">End Time:</span>
                <span class="detail-value">{{ formatTime(selectedTrace.end_time_ns) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Span Kind:</span>
                <span class="detail-value">{{ getSpanKindLabel(selectedTrace.kind) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- HTTP Information -->
        <div v-if="getHttpMethod(selectedTrace)" class="detail-section">
          <h4 class="section-title">HTTP Request</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Method:</span>
              <span class="detail-value">
                <span class="method-badge">{{ getHttpMethod(selectedTrace) }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Path:</span>
              <span class="detail-value">{{ getHttpPath(selectedTrace) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status Code:</span>
              <span class="detail-value">
                <span class="status-badge" :class="getStatusClass(getHttpStatus(selectedTrace))">
                  {{ getHttpStatus(selectedTrace) }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">URL:</span>
              <span class="detail-value">{{ getHttpUrl(selectedTrace) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host:</span>
              <span class="detail-value">{{ getHttpHost(selectedTrace) || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Child Spans -->
        <div class="detail-section">
          <h4 class="section-title">Child Spans ({{ getChildSpansCount(selectedTrace.trace_id) }})</h4>
          <div class="child-spans-list">
            <div 
              v-for="childSpan in getChildSpans(selectedTrace.trace_id)" 
              :key="childSpan.span_id"
              class="child-span-item"
              :class="getSpanLevelClass(childSpan)"
            >
              <div class="child-span-header">
                <div class="child-span-info">
                  <span class="child-span-name">{{ childSpan.name }}</span>
                  <span class="child-span-id">{{ childSpan.span_id }}</span>
                </div>
                <div class="child-span-meta">
                  <span class="child-span-duration">{{ formatDuration(childSpan.duration_ns) }}</span>
                  <span class="child-span-kind">{{ getSpanKindLabel(childSpan.kind) }}</span>
                </div>
              </div>
              <div class="child-span-details">
                <div class="child-span-attributes">
                  <span v-if="getHttpMethod(childSpan)" class="attribute method">
                    {{ getHttpMethod(childSpan) }}
                  </span>
                  <span v-if="getHttpPath(childSpan)" class="attribute path">
                    {{ getHttpPath(childSpan) }}
                  </span>
                  <span v-if="getHttpStatus(childSpan)" class="attribute status" :class="getStatusClass(getHttpStatus(childSpan))">
                    {{ getHttpStatus(childSpan) }}
                  </span>
                  <span v-if="getDatabaseOperation(childSpan)" class="attribute database">
                    {{ getDatabaseOperation(childSpan) }}
                  </span>
                </div>
                <div class="child-span-time">
                  <span class="time-label">Start:</span>
                  <span class="time-value">{{ formatTime(childSpan.start_time_ns) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Raw Attributes -->
        <div class="detail-section">
          <h4 class="section-title">Raw Attributes</h4>
          <div class="raw-json-section">
            <pre class="raw-json">{{ formatRawAttributes(selectedTrace) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div 
      v-if="showDetailPanel" 
      class="backdrop"
      @click="closeTraceDetail"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { getSnapshot, connectEvents } from '@/api'

interface Span {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string
  kind: number
  start_time_ns: number
  end_time_ns: number
  duration_ns: number
  attributes_json: string
}

interface ServerSnapshot {
  spans: Span[]
  requests: Span[]
}

// Reactive state
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// Trace detail panel state
const selectedTrace = ref<Span | null>(null)
const showDetailPanel = ref(false)

// Server data
const spans = ref<Span[]>([])
const isLoading = ref(false)
const lastRefresh = ref<Date | null>(null)

// Computed properties
const outboundSpans = computed(() => {
  return spans.value.filter(span => span.kind === 1) // Outbound requests
})

const uniqueTraces = computed(() => {
  const traceMap = new Map<string, Span>()
  outboundSpans.value.forEach(span => {
    if (!traceMap.has(span.trace_id)) {
      traceMap.set(span.trace_id, span)
    }
  })
  return Array.from(traceMap.values())
})

const filteredTraces = computed(() => {
  if (!searchQuery.value) return uniqueTraces.value
  
  const query = searchQuery.value.toLowerCase()
  return uniqueTraces.value.filter(trace => {
    return trace.name.toLowerCase().includes(query) ||
           trace.trace_id.toLowerCase().includes(query) ||
           trace.span_id.toLowerCase().includes(query)
  })
})

const totalPages = computed(() => Math.ceil(filteredTraces.value.length / pageSize.value))

const paginatedTraces = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTraces.value.slice(start, end)
})

const averageSpanDuration = computed(() => {
  if (outboundSpans.value.length === 0) return 0
  const totalDuration = outboundSpans.value.reduce((sum, span) => sum + span.duration_ns, 0)
  return Math.round(totalDuration / outboundSpans.value.length / 1000000)
})

// Methods
function getHttpMethod(span: Span): string | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.method'] || null
}

function getHttpPath(span: Span): string | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.target'] || attributes['http.route'] || null
}

function getHttpStatus(span: Span): number | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.status_code'] || null
}

function getHttpUrl(span: Span): string | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.url'] || null
}

function getHttpHost(span: Span): string | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.host'] || null
}

function getDatabaseOperation(span: Span): string | null {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['db.operation'] || attributes['db.system'] || null
}

function getSpanKindLabel(kind: number): string {
  switch (kind) {
    case 1: return 'Client (Outbound)'
    case 2: return 'Server (Inbound)'
    case 3: return 'Producer'
    case 4: return 'Consumer'
    case 5: return 'Internal'
    default: return `Unknown (${kind})`
  }
}

function getStatusClass(status: number | null): string {
  if (!status) return 'status-info'
  if (status >= 200 && status < 300) return 'status-success'
  if (status >= 400 && status < 500) return 'status-client-error'
  if (status >= 500) return 'status-server-error'
  return 'status-info'
}

function getSpanLevelClass(span: Span): string {
  const status = getHttpStatus(span)
  if (status && status >= 500) return 'span-error'
  if (status && status >= 400) return 'span-warning'
  return 'span-normal'
}

function getChildSpansCount(traceId: string): number {
  return spans.value.filter(span => 
    span.trace_id === traceId && span.parent_span_id !== null
  ).length
}

function getChildSpans(traceId: string): Span[] {
  return spans.value.filter(span => 
    span.trace_id === traceId && span.parent_span_id !== null
  ).sort((a, b) => a.start_time_ns - b.start_time_ns)
}

function formatTime(timestampNs: number): string {
  const timestamp = Math.round(timestampNs / 1000000)
  return new Date(timestamp).toLocaleString()
}

function formatDuration(durationNs: number): string {
  const durationMs = Math.round(durationNs / 1000000)
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(2)}s`
}

function parseAttributes(attributesJson: string): Record<string, any> {
  try {
    return JSON.parse(attributesJson)
  } catch (e) {
    console.warn('Failed to parse span attributes:', e)
    return {}
  }
}

function formatRawAttributes(span: Span): string {
  try {
    const attributes = JSON.parse(span.attributes_json)
    return JSON.stringify(attributes, null, 2)
  } catch (e) {
    return span.attributes_json
  }
}

function selectTrace(trace: Span) {
  selectedTrace.value = trace
  showDetailPanel.value = true
}

function closeTraceDetail() {
  showDetailPanel.value = false
  selectedTrace.value = null
}

async function refreshTraces() {
  await fetchData()
}

async function fetchData() {
  try {
    isLoading.value = true
    const snapshot: ServerSnapshot = await getSnapshot()
    spans.value = snapshot.spans || snapshot.requests || []
    lastRefresh.value = new Date()
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await fetchData()
  
  const cleanup = connectEvents((type, data) => {
    if (type === 'request') {
      const span = data as Span
      if (span.kind === 1) { // Only outbound requests
        spans.value.push(span)
      }
    }
  })
  
  onUnmounted(() => cleanup())
})
</script>

<style scoped>
.traces-dashboard {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.trace-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
}

.refresh-btn {
  min-width: 120px;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.traces-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.traces-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
}

.traces-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.search-box {
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.traces-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
}

.trace-item {
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trace-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.trace-item.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.trace-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.trace-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trace-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #3b82f6;
  background-color: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.trace-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.trace-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.trace-duration {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
  background-color: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
}

.trace-time {
  font-size: 12px;
  color: #6b7280;
}

.trace-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trace-attributes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attribute {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.attribute.method {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.attribute.path {
  background-color: #f3f4f6;
  color: #374151;
}

.attribute.status {
  background-color: #d1fae5;
  color: #059669;
}

.attribute.status.status-client-error {
  background-color: #fef3c7;
  color: #d97706;
}

.attribute.status.status-server-error {
  background-color: #fee2e2;
  color: #dc2626;
}

.attribute.database {
  background-color: #fce7f3;
  color: #be185d;
}

.trace-children {
  display: flex;
  align-items: center;
}

.children-count {
  font-size: 12px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background-color: white;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

/* Trace Detail Panel Styles */
.trace-detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 600px;
  height: 100vh;
  background-color: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  overflow-y: auto;
}

.trace-detail-panel.panel-open {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 10;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.panel-content {
  padding: 24px;
}

.detail-section {
  margin-bottom: 32px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.parent-span-info {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.span-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.span-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.span-duration {
  font-size: 16px;
  font-weight: 600;
  color: #059669;
  background-color: #d1fae5;
  padding: 6px 12px;
  border-radius: 6px;
}

.span-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 14px;
  color: #1e293b;
  word-break: break-all;
}

.span-id, .trace-id {
  font-family: 'Monaco', 'Menlo', monospace;
  background-color: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.span-id {
  color: #7c3aed;
}

.trace-id {
  color: #3b82f6;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.method-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #dbeafe;
  color: #1d4ed8;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-success {
  background-color: #d1fae5;
  color: #059669;
}

.status-client-error {
  background-color: #fef3c7;
  color: #d97706;
}

.status-server-error {
  background-color: #fee2e2;
  color: #dc2626;
}

.status-info {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.child-spans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-span-item {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s ease;
}

.child-span-item.span-error {
  border-color: #fecaca;
  background-color: #fef2f2;
}

.child-span-item.span-warning {
  border-color: #fed7aa;
  background-color: #fffbeb;
}

.child-span-item.span-normal {
  border-color: #e2e8f0;
  background-color: #f8fafc;
}

.child-span-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.child-span-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.child-span-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.child-span-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2px 4px;
  border-radius: 3px;
}

.child-span-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.child-span-duration {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background-color: #d1fae5;
  padding: 2px 6px;
  border-radius: 4px;
}

.child-span-kind {
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.child-span-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.child-span-attributes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.child-span-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.time-label {
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.time-value {
  font-size: 11px;
  color: #374151;
  font-family: 'Monaco', 'Menlo', monospace;
}

.raw-json-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.raw-json {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

/* Responsive design */
@media (max-width: 1024px) {
  .trace-detail-panel {
    width: 500px;
  }
}

@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .trace-stats {
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .traces-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .search-box {
    width: 100%;
  }
  
  .trace-detail-panel {
    width: 100%;
  }
}
</style>

