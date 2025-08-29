<template>
  <div class="traces-dashboard">
    <!-- Main Content -->
    <main class="main-content">
      <div class="content-header">
        <div class="header-left">
          <h1 class="page-title">Trace ID: {{ selectedTraceId || 'Select a trace' }}</h1>
          <div class="trace-stats">
            <div class="stat-group">
              <div class="stat-header">
                <span class="stat-label">Event Breakdown</span>
                <HelpCircle class="w-4 h-4 text-gray-400" />
              </div>
              <div class="stat-value">{{ totalTransactions }} Transactions | {{ totalErrors }} Errors</div>
              <div class="stat-subtitle">Across {{ uniqueProjects.length }} projects</div>
            </div>
            <div class="stat-group">
              <div class="stat-header">
                <span class="stat-label">Total Duration</span>
                <HelpCircle class="w-4 h-4 text-gray-400" />
              </div>
              <div class="stat-value">{{ formatDuration(totalDuration) }}</div>
              <div class="stat-subtitle">{{ lastTraceTime }}</div>
            </div>
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
          <h2 class="traces-title">Available Traces</h2>
          <div class="search-box">
            <Search class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search transactions..." 
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
            <div class="trace-content">
              <div class="trace-left">
                <span class="trace-id">{{ trace.trace_id }}</span>
                <span class="trace-name">{{ trace.name }}</span>
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
              <div class="trace-right">
                <span class="trace-duration">{{ formatDuration(trace.duration_ns) }}</span>
                <span class="trace-time">{{ formatTime(trace.start_time_ns) }}</span>
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

    <!-- Trace Waterfall Drawer -->
    <div 
      v-if="showWaterfallDrawer" 
      class="waterfall-drawer"
      :class="{ 'drawer-open': showWaterfallDrawer }"
    >
      <div class="drawer-header">
        <div class="drawer-title-section">
          <h3 class="drawer-title">Trace Waterfall</h3>
          <span class="drawer-subtitle">{{ selectedTrace?.name }}</span>
        </div>
        <div class="drawer-controls">
          <button 
            @click="closeWaterfallDrawer" 
            class="close-drawer-button"
            aria-label="Close waterfall drawer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="drawer-content">
        <!-- Trace Tree -->
        <div class="trace-tree-section">
          <div class="trace-tree-header">
            <div class="trace-tree-title">
              <div class="trace-icon">
                <span class="trace-icon-text">Tr</span>
              </div>
              <span class="trace-title-text">Trace - {{ selectedTrace?.trace_id }}</span>
            </div>
          </div>
          
          <div class="trace-tree-content">
            <div 
              v-for="item in traceTreeData" 
              :key="item.id" 
              class="trace-tree-item-wrapper"
            >
              <TraceTreeItem 
                :item="item" 
                :total-duration="totalDuration" 
                @select-span="selectSpanInWaterfall"
              />
            </div>
          </div>
        </div>

        <!-- Span Details in Drawer -->
        <div v-if="selectedWaterfallSpan" class="span-details-section">
          <h4 class="section-title">Span Details</h4>
          <div class="span-detail-content">
            <div class="detail-item">
              <span class="detail-label">Name:</span>
              <span class="detail-value">{{ selectedWaterfallSpan.name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">{{ formatDuration(selectedWaterfallSpan.duration_ns) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Start Time:</span>
              <span class="detail-value">{{ formatTime(selectedWaterfallSpan.start_time_ns) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Span ID:</span>
              <span class="detail-value span-id">{{ selectedWaterfallSpan.span_id }}</span>
            </div>
            <div v-if="getHttpMethod(selectedWaterfallSpan)" class="detail-item">
              <span class="detail-label">HTTP Method:</span>
              <span class="detail-value">
                <span class="method-badge">{{ getHttpMethod(selectedWaterfallSpan) }}</span>
              </span>
            </div>
            <div v-if="getHttpPath(selectedWaterfallSpan)" class="detail-item">
              <span class="detail-label">Path:</span>
              <span class="detail-value">{{ getHttpPath(selectedWaterfallSpan) }}</span>
            </div>
            <div v-if="getHttpStatus(selectedWaterfallSpan)" class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge" :class="getStatusClass(getHttpStatus(selectedWaterfallSpan))">
                  {{ getHttpStatus(selectedWaterfallSpan) }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div 
      v-if="showWaterfallDrawer" 
      class="backdrop"
      @click="closeAllPanels"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { getSnapshot, connectEvents } from '@/api'
import { Search, HelpCircle, ChevronRight, ChevronDown } from 'lucide-vue-next'
import TraceTreeItem from '@/components/TraceTreeItem.vue'
import TraceBar from '@/components/TraceBar.vue'

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

interface TraceItem {
  id: string
  type: "navigation" | "http.server" | "error"
  name: string
  duration: number
  startTime: number
  children?: TraceItem[]
  expanded?: boolean
}

// Reactive state
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// Trace detail panel state
const selectedTrace = ref<Span | null>(null)
const showDetailPanel = ref(false)

// Waterfall drawer state
const showWaterfallDrawer = ref(false)
const selectedWaterfallSpan = ref<Span | null>(null)
const currentZoom = ref(1)

// Server data
const spans = ref<Span[]>([])
const isLoading = ref(false)
const lastRefresh = ref<Date | null>(null)

// Sample trace data for demonstration
const sampleTraceData: TraceItem[] = [
  {
    id: "1",
    type: "navigation",
    name: "/organization/product_view",
    duration: 2000,
    startTime: 0,
    expanded: true,
    children: [
      {
        id: "2",
        type: "http.server",
        name: "/api/0/product_que",
        duration: 400,
        startTime: 50,
        expanded: true,
        children: [
          {
            id: "3",
            type: "http.server",
            name: "/api/product_ite",
            duration: 20,
            startTime: 60,
          },
          {
            id: "4",
            type: "http.server",
            name: "/api/product_ite",
            duration: 40,
            startTime: 90,
          },
        ],
      },
      {
        id: "5",
        type: "http.server",
        name: "/api/detail_blog_entr",
        duration: 8,
        startTime: 150,
      },
      {
        id: "6",
        type: "http.server",
        name: "/api/spril_entry_",
        duration: 600,
        startTime: 200,
      },
      {
        id: "7",
        type: "error",
        name: "/api/0/organization_",
        duration: 300,
        startTime: 850,
        expanded: true,
        children: [
          {
            id: "8",
            type: "http.server",
            name: "/api/request_pla",
            duration: 20,
            startTime: 870,
          },
          {
            id: "9",
            type: "http.server",
            name: "/api/request_pla",
            duration: 25,
            startTime: 900,
          },
          {
            id: "10",
            type: "navigation",
            name: "/api/request_pla",
            duration: 50,
            startTime: 930,
          },
          {
            id: "11",
            type: "navigation",
            name: "/api/request_pla",
            duration: 200,
            startTime: 990,
          },
          {
            id: "12",
            type: "error",
            name: "/api/request_pla",
            duration: 10,
            startTime: 1200,
          },
          {
            id: "13",
            type: "http.server",
            name: "/api/request_pla",
            duration: 20,
            startTime: 1220,
          },
          {
            id: "14",
            type: "navigation",
            name: "/api/request_pla",
            duration: 380,
            startTime: 1250,
          },
          {
            id: "15",
            type: "navigation",
            name: "/api/request_pla",
            duration: 200,
            startTime: 1650,
          },
          {
            id: "16",
            type: "navigation",
            name: "/api/request_pla",
            duration: 290,
            startTime: 1870,
          },
          {
            id: "17",
            type: "navigation",
            name: "/api/request_pla",
            duration: 40,
            startTime: 2180,
          },
          {
            id: "18",
            type: "http.server",
            name: "/api/request_pla",
            duration: 360,
            startTime: 2230,
          },
        ],
      },
    ],
  },
]

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

const selectedTraceId = computed(() => selectedTrace.value?.trace_id)

const totalDuration = computed(() => {
  if (!selectedTrace.value) return 2000 // Default for sample data
  return Math.round(selectedTrace.value.duration_ns / 1000000)
})

const totalTransactions = computed(() => {
  if (!selectedTrace.value) return 18 // Default for sample data
  return getChildSpansCount(selectedTrace.value.trace_id) + 1
})

const totalErrors = computed(() => {
  if (!selectedTrace.value) return 2 // Default for sample data
  return spans.value.filter(span => 
    span.trace_id === selectedTrace.value?.trace_id && 
    getHttpStatus(span) && parseInt(getHttpStatus(span)!) >= 400
  ).length
})

const uniqueProjects = computed(() => {
  // For now, return a default value since we don't have project data
  return ['default']
})

const lastTraceTime = computed(() => {
  if (!selectedTrace.value) return '14 hours ago'
  const now = new Date()
  const traceTime = new Date(Math.round(selectedTrace.value.start_time_ns / 1000000))
  const diffHours = Math.floor((now.getTime() - traceTime.getTime()) / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
})

const traceTreeData = computed(() => {
  // For now, return sample data. In a real implementation, this would be derived from the actual spans
  return sampleTraceData
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

function getHttpStatus(span: Span): string | null {
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

function getStatusClass(status: string | null): string {
  if (!status) return 'status-info'
  const statusNum = parseInt(status)
  if (statusNum >= 200 && statusNum < 300) return 'status-success'
  if (statusNum >= 400 && statusNum < 500) return 'status-client-error'
  if (statusNum >= 500) return 'status-server-error'
  return 'status-info'
}

function getSpanLevelClass(span: Span): string {
  const status = getHttpStatus(span)
  if (status && parseInt(status) >= 500) return 'span-error'
  if (status && parseInt(status) >= 400) return 'span-warning'
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
  openWaterfallDrawer() // Automatically open waterfall drawer when selecting a trace
}

function closeTraceDetail() {
  showDetailPanel.value = false
  selectedTrace.value = null
}

function openWaterfallDrawer() {
  showWaterfallDrawer.value = true
}

function closeWaterfallDrawer() {
  showWaterfallDrawer.value = false
  selectedWaterfallSpan.value = null
}

function selectSpanInWaterfall(span: Span) {
  selectedWaterfallSpan.value = span
}

function closeAllPanels() {
  closeTraceDetail()
  closeWaterfallDrawer()
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
  margin-bottom: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: auto;
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

.trace-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.trace-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.trace-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.trace-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #3b82f6;
  background-color: #eff6ff;
  padding: 2px 4px;
  border-radius: 3px;
  display: inline-block;
  flex-shrink: 0;
}

.trace-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.attribute {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
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

.children-count {
  font-size: 11px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
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
  width: 600px; /* Reduced width since waterfall is now in drawer */
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

/* Timeline Visualization Styles */
.trace-timeline {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.timeline-header {
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 16px;
  position: relative;
  height: 40px;
}

.timeline-markers {
  position: relative;
  height: 100%;
}

.time-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

.timeline-content {
  padding: 16px;
  position: relative;
  min-height: 200px;
}

.timeline-span {
  position: absolute;
  height: 32px;
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.timeline-span.span-parent {
  top: 0;
  height: 40px;
  background-color: #eff6ff;
  border-color: #3b82f6;
  font-weight: 600;
}

.timeline-span.span-child {
  top: 50px;
  height: 36px;
  background-color: #f0fdf4;
  border-color: #22c55e;
}

.timeline-span.span-nested {
  top: 100px;
  height: 32px;
  background-color: #fefce8;
  border-color: #eab308;
}

.timeline-span:nth-child(4n+1) { top: 0; }
.timeline-span:nth-child(4n+2) { top: 50px; }
.timeline-span:nth-child(4n+3) { top: 100px; }
.timeline-span:nth-child(4n+4) { top: 150px; }

.span-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  overflow: hidden;
}

.span-name {
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.span-duration {
  font-size: 10px;
  color: #6b7280;
}

.span-bar {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
}

.span-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  opacity: 0.1;
}

.span-bar-parent {
  background-color: #3b82f6;
  color: #3b82f6;
}

.span-bar-child {
  background-color: #22c55e;
  color: #22c55e;
}

.span-bar-normal {
  background-color: #6b7280;
  color: #6b7280;
}

.span-bar-warning {
  background-color: #f59e0b;
  color: #f59e0b;
}

.span-bar-error {
  background-color: #ef4444;
  color: #ef4444;
}

.span-method {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  font-weight: 600;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
}

.span-status {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  font-weight: 600;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
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

/* Waterfall Drawer Styles */
.waterfall-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70vh;
  background-color: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.waterfall-drawer.drawer-open {
  transform: translateY(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
  flex-shrink: 0;
}

.drawer-title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.drawer-subtitle {
  font-size: 14px;
  color: #6b7280;
}

.drawer-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.close-drawer-button {
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

.close-drawer-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.drawer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.waterfall-section {
  flex: 2;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
}

.waterfall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.waterfall-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background-color: white;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  border-color: #9ca3af;
  background-color: #f9fafb;
}

.zoom-info {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.waterfall-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-header {
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 16px;
  position: relative;
  height: 40px;
  flex-shrink: 0;
}

.timeline-markers {
  position: relative;
  height: 100%;
}

.time-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

.waterfall-content {
  flex: 1;
  padding: 16px;
  position: relative;
  overflow: auto;
}

.waterfall-span {
  position: absolute;
  height: 32px;
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.waterfall-span:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.waterfall-span.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.waterfall-span.span-parent {
  top: 0;
  height: 40px;
  background-color: #eff6ff;
  border-color: #3b82f6;
  font-weight: 600;
}

.waterfall-span.span-child {
  top: 50px;
  height: 36px;
  background-color: #f0fdf4;
  border-color: #22c55e;
}

.waterfall-span.span-nested {
  top: 100px;
  height: 32px;
  background-color: #fefce8;
  border-color: #eab308;
}

.waterfall-span:nth-child(4n+1) { top: 0; }
.waterfall-span:nth-child(4n+2) { top: 50px; }
.waterfall-span:nth-child(4n+3) { top: 100px; }
.waterfall-span:nth-child(4n+4) { top: 150px; }

.span-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  overflow: hidden;
}

.span-name {
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.span-duration {
  font-size: 10px;
  color: #6b7280;
}

.span-bar {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
}

.span-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  opacity: 0.1;
}

.span-bar-parent {
  background-color: #3b82f6;
  color: #3b82f6;
}

.span-bar-child {
  background-color: #22c55e;
  color: #22c55e;
}

.span-bar-normal {
  background-color: #6b7280;
  color: #6b7280;
}

.span-bar-warning {
  background-color: #f59e0b;
  color: #f59e0b;
}

.span-bar-error {
  background-color: #ef4444;
  color: #ef4444;
}

.span-method {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  font-weight: 600;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
}

.span-status {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  font-weight: 600;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
}

.span-details-section {
  flex: 1;
  padding: 24px;
  border-left: 1px solid #e2e8f0;
  overflow-y: auto;
}

.span-detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* New styles for the trace tree */
.trace-tree-section {
  flex: 2;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
}

.trace-tree-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.trace-tree-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trace-icon {
  width: 24px;
  height: 24px;
  background-color: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trace-icon-text {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.trace-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.trace-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.trace-tree-item-wrapper {
  border-bottom: 1px solid #f1f5f9;
}

.trace-tree-item {
  padding: 4px 24px;
}

.trace-item-header {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.trace-item-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.trace-item-left {
  flex: 1;
  min-width: 0;
}

.trace-item-indent {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-button {
  padding: 2px;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-button:hover {
  color: #374151;
}

.trace-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.trace-type-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-navigation {
  background-color: #f97316;
  color: white;
}

.type-http.server {
  background-color: #3b82f6;
}

.type-error {
  background-color: #ef4444;
  color: white;
}

.icon-text {
  font-size: 10px;
  font-weight: bold;
}

.icon-dot {
  width: 8px;
  height: 8px;
  background-color: white;
  border-radius: 2px;
}

.icon-warning {
  font-size: 10px;
  font-weight: bold;
}

.icon-default {
  width: 8px;
  height: 8px;
  background-color: #9ca3af;
  border-radius: 2px;
}

.trace-item-name {
  font-size: 14px;
  color: #1e293b;
  white-space: nowrap;
}

.trace-item-name.error {
  color: #dc2626;
}

.trace-item-path {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.error-indicator {
  width: 16px;
  height: 16px;
  background-color: #fef2f2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.trace-item-timeline {
  flex: 1;
  margin-left: 16px;
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.trace-bar {
  position: relative;
  width: 100%;
  height: 16px;
}

.trace-bar-fill {
  position: absolute;
  height: 100%;
  background-color: #8b5cf6;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  min-width: 2px;
}

.trace-bar-duration {
  color: white;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.trace-children {
  margin-left: 24px;
}

/* Updated stat styles */
.stat-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-subtitle {
  font-size: 12px;
  color: #6b7280;
}

/* Search icon styles */
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9ca3af;
}

.search-input {
  padding-left: 40px;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .drawer-content {
    flex-direction: column;
  }
  
  .trace-tree-section {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .span-details-section {
    border-left: none;
    border-top: 1px solid #e2e8f0;
  }
}

@media (max-width: 768px) {
  .waterfall-drawer {
    height: 90vh;
  }
  
  .trace-stats {
    flex-direction: column;
    gap: 16px;
  }
}
</style>

