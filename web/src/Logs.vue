<template>
  <div class="logs-dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Logs</h2>
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search logs..." 
            class="search-input"
          />
        </div>
        <div v-if="lastRefresh" class="last-refresh">
          Last updated: {{ lastRefresh.toLocaleTimeString() }}
        </div>
      </div>
      
      <div class="sidebar-section">
        <h3 class="section-title">Log Levels</h3>
        <div class="filter-group">
          <label v-for="level in logLevels" :key="level.value" class="filter-item">
            <input 
              type="checkbox" 
              v-model="selectedLevels" 
              :value="level.value"
              class="filter-checkbox"
            />
            <span class="filter-label" :class="`level-${level.value}`">
              {{ level.label }}
            </span>
            <span class="filter-count">{{ getLevelCount(level.value) }}</span>
          </label>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="section-title">Time Range</h3>
        <div class="time-filters">
          <Button 
            v-for="range in timeRanges" 
            :key="range.value"
            :variant="selectedTimeRange === range.value ? 'default' : 'outline'"
            size="sm"
            @click="selectedTimeRange = range.value"
            class="time-button"
          >
            {{ range.label }}
          </Button>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="section-title">Services</h3>
        <div class="filter-group">
          <label v-for="service in availableServices" :key="service" class="filter-item">
            <input 
              type="checkbox" 
              v-model="selectedServices" 
              :value="service"
              class="filter-checkbox"
            />
            <span class="filter-label">{{ service }}</span>
          </label>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="action-buttons">
          <Button variant="outline" size="sm" @click="clearFilters" class="w-full">
            Clear Filters
          </Button>
          <Button variant="outline" size="sm" @click="exportLogs" class="w-full">
            Export
          </Button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-header">
        <div class="header-left">
          <h1 class="page-title">Logs Dashboard</h1>
          <div class="log-stats">
            <span class="stat-item">
              <span class="stat-label">Total:</span>
              <span class="stat-value">{{ filteredLogs.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Errors:</span>
              <span class="stat-value error">{{ getLevelCount('error') }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Warnings:</span>
              <span class="stat-value warning">{{ getLevelCount('warn') }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Spans:</span>
              <span class="stat-value">{{ spans.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">SQL Queries:</span>
              <span class="stat-value">{{ sqls.length }}</span>
            </span>
          </div>
        </div>
        <div class="header-right">
          <Button 
            variant="outline" 
            size="sm" 
            @click="refreshLogs"
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

      <!-- Logs Table -->
      <div class="logs-table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th class="table-header">DATE</th>
              <th class="table-header">RESOURCE</th>
              <th class="table-header">SERVICE</th>
              <th class="table-header">DURATION</th>
              <th class="table-header">METHOD</th>
              <th class="table-header">STATUS CODE</th>
              <th class="table-header">ERROR TYPE</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="log in paginatedLogs" 
              :key="log.id" 
              class="log-row"
              :class="`level-${log.level}`"
              @click="openLogDetail(log)"
            >
              <td class="log-time">{{ formatTime(log.timestamp) }}</td>
              <td class="log-resource">
                <span v-if="log.metadata?.path" class="resource-path">
                  {{ log.metadata.method || 'GET' }} {{ log.metadata.path }}
                </span>
                <span v-else class="resource-path">{{ log.message }}</span>
              </td>
              <td class="log-service">{{ log.service }}</td>
              <td class="log-duration">
                <span v-if="log.duration" class="duration-value">{{ log.duration }}ms</span>
                <span v-else class="no-duration">-</span>
              </td>
              <td class="log-method">
                <span v-if="log.metadata?.method" class="method-badge">
                  {{ log.metadata.method }}
                </span>
                <span v-else class="no-method">-</span>
              </td>
              <td class="log-status">
                <span v-if="log.metadata?.status" 
                      class="status-badge" 
                      :class="getStatusClass(log.metadata.status)">
                  {{ log.metadata.status }}
                </span>
                <span v-else class="no-status">-</span>
              </td>
              <td class="log-error-type">
                <span v-if="log.level === 'error' && log.metadata?.status >= 400" 
                      class="error-type-badge">
                  {{ getErrorType(log.metadata.status) }}
                </span>
                <span v-else class="no-error">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredLogs.length) }} of {{ filteredLogs.length }} logs
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
    </main>

    <!-- Log Detail Side Panel -->
    <div 
      v-if="selectedLog" 
      class="log-detail-panel"
      :class="{ 'panel-open': showDetailPanel }"
    >
      <div class="panel-header">
        <h3 class="panel-title">Log Details</h3>
        <button 
          @click="closeLogDetail" 
          class="close-button"
          aria-label="Close panel"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="panel-content">
        <div class="detail-section">
          <h4 class="section-title">Basic Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Timestamp:</span>
              <span class="detail-value">{{ formatTime(selectedLog.timestamp) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Level:</span>
              <span class="detail-value">
                <span class="level-badge" :class="`level-${selectedLog.level}`">
                  {{ selectedLog.level.toUpperCase() }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Service:</span>
              <span class="detail-value">{{ selectedLog.service }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">{{ selectedLog.duration }}ms</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">HTTP Request</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Method:</span>
              <span class="detail-value">
                <span class="method-badge">{{ selectedLog.metadata?.method || 'N/A' }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Path:</span>
              <span class="detail-value">{{ selectedLog.metadata?.path || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status Code:</span>
              <span class="detail-value">
                <span class="status-badge" :class="getStatusClass(selectedLog.metadata?.status)">
                  {{ selectedLog.metadata?.status || 'N/A' }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status Text:</span>
              <span class="detail-value">{{ selectedLog.metadata?.statusText || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">URL:</span>
              <span class="detail-value">{{ selectedLog.metadata?.url || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host:</span>
              <span class="detail-value">{{ selectedLog.metadata?.host || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Scheme:</span>
              <span class="detail-value">{{ selectedLog.metadata?.scheme || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Flavor:</span>
              <span class="detail-value">{{ selectedLog.metadata?.flavor || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">Network Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Transport:</span>
              <span class="detail-value">{{ selectedLog.metadata?.transport || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host Name:</span>
              <span class="detail-value">{{ selectedLog.metadata?.hostName || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host IP:</span>
              <span class="detail-value">{{ selectedLog.metadata?.hostIp || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host Port:</span>
              <span class="detail-value">{{ selectedLog.metadata?.hostPort || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Peer IP:</span>
              <span class="detail-value">{{ selectedLog.metadata?.peerIp || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Peer Port:</span>
              <span class="detail-value">{{ selectedLog.metadata?.peerPort || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">User Agent</h4>
          <div class="detail-item full-width">
            <span class="detail-label">User Agent:</span>
            <span class="detail-value user-agent">{{ selectedLog.metadata?.userAgent || 'N/A' }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">Trace Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Trace ID:</span>
              <span class="detail-value trace-id">{{ selectedLog.traceId || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Span ID:</span>
              <span class="detail-value span-id">{{ selectedLog.metadata?.spanId || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Parent Span ID:</span>
              <span class="detail-value">{{ selectedLog.metadata?.parentSpanId || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Span Kind:</span>
              <span class="detail-value">{{ selectedLog.metadata?.kind || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">Message & Metadata</h4>
          <div class="detail-item full-width">
            <span class="detail-label">Message:</span>
            <span class="detail-value message-text">{{ selectedLog.message }}</span>
          </div>
          <div v-if="selectedLog.metadata" class="metadata-section">
            <h5 class="metadata-title">Additional Metadata:</h5>
            <div class="metadata-grid">
              <div 
                v-for="(value, key) in selectedLog.metadata" 
                :key="key"
                class="metadata-item"
              >
                <span class="metadata-key">{{ key }}:</span>
                <span class="metadata-value">{{ formatMetadataValue(value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedLog.metadata?.sql" class="detail-section">
          <h4 class="section-title">SQL Query</h4>
          <div class="sql-section">
            <pre class="sql-query">{{ selectedLog.metadata.sql }}</pre>
            <div class="sql-meta">
              <span class="sql-duration">Duration: {{ selectedLog.duration }}ms</span>
              <span v-if="selectedLog.metadata.rows" class="sql-rows">Rows: {{ selectedLog.metadata.rows }}</span>
            </div>
          </div>
        </div>

        <!-- Raw JSON Data Section -->
        <div class="detail-section">
          <h4 class="section-title">Raw Data</h4>
          <div class="raw-json-section">
            <div class="json-header">
              <span class="json-label">Complete log data in JSON format:</span>
              <button 
                @click="copyRawJson" 
                class="copy-button"
                :title="copyButtonText"
              >
                <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ copyButtonText }}
              </button>
            </div>
            <pre class="raw-json">{{ formatRawJson(selectedLog) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div 
      v-if="showDetailPanel" 
      class="backdrop"
      @click="closeLogDetail"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { getSnapshot, connectEvents } from '@/api'

// Types based on new server API with spans
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

interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  message: string
  metadata?: Record<string, any>
  traceId?: string
  duration?: number
}

interface ServerSnapshot {
  spans: Span[]
  requests: Span[] // Keep for backward compatibility
  sql: Array<{
    ts: number
    traceId?: string
    sql: string
    dur_ms: number
    rows?: number
  }>
  logs?: LogEntry[]
}

// Reactive state
const searchQuery = ref('')
const selectedLevels = ref(['info', 'warn', 'error'])
const selectedTimeRange = ref('1h')
const selectedServices = ref<string[]>([])
const currentPage = ref(1)
const pageSize = ref(50)

// Log detail panel state
const selectedLog = ref<LogEntry | null>(null)
const showDetailPanel = ref(false)

// Copy functionality state
const copied = ref(false)
const copyButtonText = computed(() => copied.value ? 'Copied!' : 'Copy JSON')

// Server data
const logs = ref<LogEntry[]>([])
const spans = ref<Span[]>([])
const sqls = ref<ServerSnapshot['sql']>([])
const isLoading = ref(false)
const lastRefresh = ref<Date | null>(null)

// Computed properties
const logLevels = [
  { value: 'debug', label: 'Debug', color: 'text-gray-500' },
  { value: 'info', label: 'Info', color: 'text-blue-600' },
  { value: 'warn', label: 'Warning', color: 'text-yellow-600' },
  { value: 'error', label: 'Error', color: 'text-red-600' }
]

const timeRanges = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' }
]

const availableServices = computed(() => {
  const services = new Set(logs.value.map(log => log.service))
  return Array.from(services).sort()
})

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    // Level filter
    if (!selectedLevels.value.includes(log.level)) return false
    
    // Service filter
    if (selectedServices.value.length > 0 && !selectedServices.value.includes(log.service)) return false
    
    // Search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return log.message.toLowerCase().includes(query) ||
             log.service.toLowerCase().includes(query) ||
             (log.traceId && log.traceId.toLowerCase().includes(query))
    }
    
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / pageSize.value))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

// Methods
function getLevelCount(level: string) {
  return logs.value.filter(log => log.level === level).length
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-success'
  if (status >= 400 && status < 500) return 'status-client-error'
  if (status >= 500) return 'status-server-error'
  return 'status-info'
}

function getErrorType(status: number): string {
  if (status >= 400 && status < 500) return 'Client Error'
  if (status >= 500) return 'Server Error'
  return 'Unknown'
}

function openLogDetail(log: LogEntry) {
  selectedLog.value = log
  showDetailPanel.value = true
}

function closeLogDetail() {
  showDetailPanel.value = false
  selectedLog.value = null
}

function formatMetadataValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function formatRawJson(log: LogEntry): string {
  return JSON.stringify(log, null, 2)
}

async function copyRawJson() {
  try {
    const jsonString = formatRawJson(selectedLog.value!)
    await navigator.clipboard.writeText(jsonString)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = formatRawJson(selectedLog.value!)
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedLevels.value = ['info', 'warn', 'error']
  selectedTimeRange.value = '1h'
  selectedServices.value = []
  currentPage.value = 1
}

async function refreshLogs() {
  await fetchData()
}

function exportLogs() {
  // Export filtered logs as JSON
  const dataStr = JSON.stringify(filteredLogs.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `logs-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function parseSpanAttributes(attributesJson: string): Record<string, any> {
  try {
    return JSON.parse(attributesJson)
  } catch (e) {
    console.warn('Failed to parse span attributes:', e)
    return {}
  }
}

async function fetchData() {
  try {
    isLoading.value = true
    const snapshot: ServerSnapshot = await getSnapshot()
    
    // Update spans and SQL data
    spans.value = snapshot.spans || snapshot.requests || []
    sqls.value = snapshot.sql || []
    
    // If the server provides logs, use them; otherwise, generate logs from spans and SQL data
    if (snapshot.logs && snapshot.logs.length > 0) {
      logs.value = snapshot.logs
    } else {
      // Generate logs from spans and SQL data
      generateLogsFromData(snapshot)
    }
    
    lastRefresh.value = new Date()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    // Fallback to mock data on error
    generateMockLogs()
  } finally {
    isLoading.value = false
  }
}

function generateLogsFromData(snapshot: ServerSnapshot) {
  const generatedLogs: LogEntry[] = []
  
  // Convert spans to log entries
  const allSpans = snapshot.spans || snapshot.requests || []
  allSpans.forEach((span, index) => {
    const attributes = parseSpanAttributes(span.attributes_json)
    const httpMethod = attributes['http.method'] || span.name
    const httpTarget = attributes['http.target'] || '/'
    const httpStatusCode = attributes['http.status_code']
    const httpStatusText = attributes['http.status_text']
    const httpUrl = attributes['http.url']
    const httpHost = attributes['http.host']
    const httpScheme = attributes['http.scheme']
    const httpFlavor = attributes['http.flavor']
    const netTransport = attributes['net.transport']
    const netHostName = attributes['net.host.name']
    const netHostIp = attributes['net.host.ip']
    const netHostPort = attributes['net.host.port']
    const netPeerIp = attributes['net.peer.ip']
    const netPeerPort = attributes['net.peer.port']
    const httpUserAgent = attributes['http.user_agent']
    
    // Determine log level based on HTTP status code
    let level: 'debug' | 'info' | 'warn' | 'error' = 'info'
    if (httpStatusCode >= 500) level = 'error'
    else if (httpStatusCode >= 400) level = 'warn'
    else if (httpStatusCode >= 300) level = 'info'
    else if (httpStatusCode >= 200) level = 'info'
    else level = 'debug'
    
    // Convert nanoseconds to milliseconds
    const durationMs = Math.round(span.duration_ns / 1000000)
    
    // Convert nanoseconds timestamp to milliseconds
    const timestamp = Math.round(span.start_time_ns / 1000000)
    
    generatedLogs.push({
      id: `span-${span.span_id}`,
      timestamp,
      level,
      service: 'web-api',
      message: `${httpMethod} ${httpTarget} - ${httpStatusCode} ${httpStatusText} (${durationMs}ms)`,
      metadata: { 
        method: httpMethod,
        path: httpTarget,
        status: httpStatusCode,
        statusText: httpStatusText,
        url: httpUrl,
        host: httpHost,
        scheme: httpScheme,
        flavor: httpFlavor,
        transport: netTransport,
        hostName: netHostName,
        hostIp: netHostIp,
        hostPort: netHostPort,
        peerIp: netPeerIp,
        peerPort: netPeerPort,
        userAgent: httpUserAgent,
        duration: durationMs,
        spanId: span.span_id,
        kind: span.kind,
        parentSpanId: span.parent_span_id
      },
      traceId: span.trace_id,
      duration: durationMs
    })
  })
  
  // Convert SQL queries to log entries
  snapshot.sql.forEach((sql, index) => {
    const level = sql.dur_ms > 1000 ? 'warn' : 'info'
    generatedLogs.push({
      id: `sql-${index}`,
      timestamp: sql.ts,
      level,
      service: 'database',
      message: `SQL Query executed in ${sql.dur_ms}ms`,
      metadata: { 
        sql: sql.sql.length > 100 ? sql.sql.substring(0, 100) + '...' : sql.sql,
        duration: sql.dur_ms,
        rows: sql.rows
      },
      traceId: sql.traceId,
      duration: sql.dur_ms
    })
  })
  
  // Sort by timestamp (newest first)
  logs.value = generatedLogs.sort((a, b) => b.timestamp - a.timestamp)
}

function generateMockLogs() {
  const mockLogs: LogEntry[] = []
  const services = ['web-api', 'auth-service', 'database', 'cache-service', 'payment-gateway']
  const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error']
  
  for (let i = 0; i < 50; i++) {
    const timestamp = Date.now() - Math.random() * 24 * 60 * 60 * 1000 // Last 24 hours
    const level = levels[Math.floor(Math.random() * levels.length)]
    const service = services[Math.floor(Math.random() * services.length)]
    
    mockLogs.push({
      id: `log-${i}`,
      timestamp,
      level,
      service,
      message: `Sample log message ${i} from ${service}`,
      metadata: Math.random() > 0.7 ? { userId: Math.floor(Math.random() * 1000) } : undefined,
      traceId: Math.random() > 0.5 ? `trace-${Math.random().toString(36).substr(2, 9)}` : undefined,
      duration: Math.random() > 0.6 ? Math.floor(Math.random() * 1000) : undefined
    })
  }
  
  logs.value = mockLogs.sort((a, b) => b.timestamp - a.timestamp)
}

// Lifecycle
onMounted(async () => {
  await fetchData()
  
  // Connect to real-time events
  const cleanup = connectEvents((type, data) => {
    if (type === 'request') {
      // Handle new span data
      const span = data as Span
      spans.value.push(span)
      
      const attributes = parseSpanAttributes(span.attributes_json)
      const httpMethod = attributes['http.method'] || span.name
      const httpTarget = attributes['http.target'] || '/'
      const httpStatusCode = attributes['http.status_code']
      const httpStatusText = attributes['http.status_text']
      const httpUrl = attributes['http.url']
      const httpHost = attributes['http.host']
      const httpScheme = attributes['http.scheme']
      const httpFlavor = attributes['http.flavor']
      const netTransport = attributes['net.transport']
      const netHostName = attributes['net.host.name']
      const netHostIp = attributes['net.host.ip']
      const netHostPort = attributes['net.host.port']
      const netPeerIp = attributes['net.peer.ip']
      const netPeerPort = attributes['net.peer.port']
      const httpUserAgent = attributes['http.user_agent']
      
      const durationMs = Math.round(span.duration_ns / 1000000)
      const timestamp = Math.round(span.start_time_ns / 1000000)
      
      let level: 'debug' | 'info' | 'warn' | 'error' = 'info'
      if (httpStatusCode >= 500) level = 'error'
      else if (httpStatusCode >= 400) level = 'warn'
      else if (httpStatusCode >= 300) level = 'info'
      else if (httpStatusCode >= 200) level = 'info'
      else level = 'debug'
      
      const newLog: LogEntry = {
        id: `span-${span.span_id}`,
        timestamp,
        level,
        service: 'web-api',
        message: `${httpMethod} ${httpTarget} - ${httpStatusCode} ${httpStatusText} (${durationMs}ms)`,
        metadata: { 
          method: httpMethod,
          path: httpTarget,
          status: httpStatusCode,
          statusText: httpStatusText,
          url: httpUrl,
          host: httpHost,
          scheme: httpScheme,
          flavor: httpFlavor,
          transport: netTransport,
          hostName: netHostName,
          hostIp: netHostIp,
          hostPort: netHostPort,
          peerIp: netPeerIp,
          peerPort: netPeerPort,
          userAgent: httpUserAgent,
          duration: durationMs,
          spanId: span.span_id,
          kind: span.kind,
          parentSpanId: span.parent_span_id
        },
        traceId: span.trace_id,
        duration: durationMs
      }
      logs.value.unshift(newLog)
    }
    
    if (type === 'sql') {
      sqls.value.push(data)
      // Add new SQL as a log entry
      const level = data.dur_ms > 1000 ? 'warn' : 'info'
      const newLog: LogEntry = {
        id: `sql-${Date.now()}`,
        timestamp: data.ts,
        level,
        service: 'database',
        message: `SQL Query executed in ${data.dur_ms}ms`,
        metadata: { 
          sql: data.sql.length > 100 ? data.sql.substring(0, 100) + '...' : data.sql,
          duration: data.dur_ms,
          rows: data.rows
        },
        traceId: data.traceId,
        duration: data.dur_ms
      }
      logs.value.unshift(newLog)
    }
  })
  
  // Cleanup on unmount
  onUnmounted(() => cleanup())
})
</script>

<style scoped>
.logs-dashboard {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
}

.sidebar {
  width: 320px;
  background-color: white;
  border-right: 1px solid #e2e8f0;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  margin-bottom: 24px;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.search-box {
  margin-bottom: 16px;
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

.sidebar-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.filter-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.filter-label {
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.filter-count {
  font-size: 12px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}

.time-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-button {
  justify-content: flex-start;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.log-stats {
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

.stat-value.error {
  color: #dc2626;
}

.stat-value.warning {
  color: #d97706;
}

.logs-table-container {
  flex: 1;
  overflow: auto;
  padding: 0 24px;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-header {
  background-color: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
}

.log-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}

.log-row:hover {
  background-color: #f8fafc;
}

.log-row.level-error {
  background-color: #fef2f2;
}

.log-row.level-error:hover {
  background-color: #fee2e2;
}

.log-row.level-warn {
  background-color: #fffbeb;
}

.log-row.level-warn:hover {
  background-color: #fef3c7;
}

.log-time {
  padding: 12px 16px;
  font-size: 12px;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', monospace;
  white-space: nowrap;
}

.log-level {
  padding: 12px 16px;
}

.level-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.level-debug {
  background-color: #f3f4f6;
  color: #6b7280;
}

.level-info {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.level-warn {
  background-color: #fef3c7;
  color: #d97706;
}

.level-error {
  background-color: #fee2e2;
  color: #dc2626;
}

.log-service {
  padding: 12px 16px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.log-message {
  padding: 12px 16px;
  max-width: 400px;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.4;
}

.message-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metadata-item {
  font-size: 11px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.log-trace {
  padding: 12px 16px;
}

.trace-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #3b82f6;
  background-color: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.no-trace {
  color: #9ca3af;
  font-style: italic;
}

.log-duration {
  padding: 12px 16px;
}

.duration-value {
  font-size: 12px;
  color: #059669;
  font-weight: 500;
}

.no-duration {
  color: #9ca3af;
  font-style: italic;
}

.log-span {
  padding: 12px 16px;
}

.span-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #7c3aed;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.no-span {
  color: #9ca3af;
  font-style: italic;
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

.last-refresh {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
}

.refresh-btn {
  min-width: 120px;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive design */
@media (max-width: 1024px) {
  .sidebar {
    width: 280px;
  }
  
  .log-message {
    max-width: 300px;
  }
}

@media (max-width: 768px) {
  .logs-dashboard {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 300px;
  }
  
  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .log-stats {
    flex-wrap: wrap;
    gap: 16px;
  }
}

.log-resource {
  padding: 12px 16px;
  max-width: 300px;
}

.resource-path {
  font-size: 14px;
  color: #1e293b;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.log-method {
  padding: 12px 16px;
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

.no-method {
  color: #9ca3af;
  font-style: italic;
}

.log-status {
  padding: 12px 16px;
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

.no-status {
  color: #9ca3af;
  font-style: italic;
}

.log-error-type {
  padding: 12px 16px;
}

.error-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #fee2e2;
  color: #dc2626;
}

.no-error {
  color: #9ca3af;
  font-style: italic;
}

/* Log Detail Panel Styles */
.log-detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100vh;
  background-color: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  overflow-y: auto;
}

.log-detail-panel.panel-open {
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

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
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

.message-text {
  font-family: 'Monaco', 'Menlo', monospace;
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
}

.metadata-section {
  margin-top: 16px;
}

.metadata-title {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.metadata-item {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.metadata-key {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
}

.metadata-value {
  font-size: 12px;
  color: #1e293b;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.sql-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.sql-query {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
}

.sql-meta {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
}

/* Raw JSON Section */
.raw-json-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.json-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.json-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background-color: white;
  color: #374151;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.copy-button:active {
  background-color: #f3f4f6;
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

/* Make table rows clickable */
.log-row {
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}

.log-row:hover {
  background-color: #f8fafc;
}

.user-agent {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background-color: #f8fafc;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  word-break: break-all;
  line-height: 1.4;
}

</style>