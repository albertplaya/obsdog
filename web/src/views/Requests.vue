<template>
  <div class="requests-dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Inbound Requests</h2>
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search requests..." 
            class="search-input"
          />
        </div>
        <div v-if="lastRefresh" class="last-refresh">
          Last updated: {{ lastRefresh.toLocaleTimeString() }}
        </div>
      </div>
      
      <div class="sidebar-section">
        <h3 class="section-title">HTTP Status</h3>
        <div class="filter-group">
          <label v-for="status in httpStatuses" :key="status.value" class="filter-item">
            <input 
              type="checkbox" 
              v-model="selectedStatuses" 
              :value="status.value"
              class="filter-checkbox"
            />
            <span class="filter-label" :class="`status-${status.value}`">
              {{ status.label }}
            </span>
            <span class="filter-count">{{ getStatusCount(status.value) }}</span>
          </label>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="section-title">HTTP Methods</h3>
        <div class="filter-group">
          <label v-for="method in httpMethods" :key="method" class="filter-item">
            <input 
              type="checkbox" 
              v-model="selectedMethods" 
              :value="method"
              class="filter-checkbox"
            />
            <span class="filter-label">{{ method }}</span>
            <span class="filter-count">{{ getMethodCount(method) }}</span>
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
        <h3 class="section-title">Quick Actions</h3>
        <div class="action-buttons">
          <Button variant="outline" size="sm" @click="clearFilters" class="w-full">
            Clear Filters
          </Button>
          <Button variant="outline" size="sm" @click="exportRequests" class="w-full">
            Export
          </Button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-header">
        <div class="header-left">
          <h1 class="page-title">Inbound Requests Dashboard</h1>
          <div class="request-stats">
            <span class="stat-item">
              <span class="stat-label">Total:</span>
              <span class="stat-value">{{ filteredRequests.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Success (2xx):</span>
              <span class="stat-value success">{{ getStatusCount('2xx') }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Client Errors (4xx):</span>
              <span class="stat-value client-error">{{ getStatusCount('4xx') }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Server Errors (5xx):</span>
              <span class="stat-value server-error">{{ getStatusCount('5xx') }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">Avg Response Time:</span>
              <span class="stat-value">{{ averageResponseTime }}ms</span>
            </span>
          </div>
        </div>
        <div class="header-right">
          <Button 
            variant="outline" 
            size="sm" 
            @click="refreshRequests"
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

      <!-- Requests Table -->
      <div class="requests-table-container">
        <table class="requests-table">
          <thead>
            <tr>
              <th class="table-header">TIME</th>
              <th class="table-header">METHOD</th>
              <th class="table-header">PATH</th>
              <th class="table-header">STATUS</th>
              <th class="table-header">DURATION</th>
              <th class="table-header">CLIENT IP</th>
              <th class="table-header">USER AGENT</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="request in paginatedRequests" 
              :key="request.span_id" 
              class="request-row"
              :class="getStatusRowClass(request)"
              @click="openRequestDetail(request)"
            >
              <td class="request-time">{{ formatTime(request.start_time_ns) }}</td>
              <td class="request-method">
                <span class="method-badge">{{ getHttpMethod(request) }}</span>
              </td>
              <td class="request-path">
                <span class="path-text">{{ getHttpPath(request) }}</span>
              </td>
              <td class="request-status">
                <span class="status-badge" :class="getStatusClass(request)">
                  {{ getHttpStatus(request) }}
                </span>
              </td>
              <td class="request-duration">
                <span class="duration-value">{{ formatDuration(request.duration_ns) }}</span>
              </td>
              <td class="request-client-ip">
                <span class="client-ip">{{ getClientIp(request) }}</span>
              </td>
              <td class="request-user-agent">
                <span class="user-agent-text">{{ getUserAgent(request) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredRequests.length) }} of {{ filteredRequests.length }} requests
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

    <!-- Request Detail Side Panel -->
    <div 
      v-if="selectedRequest" 
      class="request-detail-panel"
      :class="{ 'panel-open': showDetailPanel }"
    >
      <div class="panel-header">
        <h3 class="panel-title">Request Details</h3>
        <button 
          @click="closeRequestDetail" 
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
          <h4 class="section-title">Request Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Start Time:</span>
              <span class="detail-value">{{ formatTime(selectedRequest.start_time_ns) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">End Time:</span>
              <span class="detail-value">{{ formatTime(selectedRequest.end_time_ns) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">{{ formatDuration(selectedRequest.duration_ns) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Span ID:</span>
              <span class="detail-value span-id">{{ selectedRequest.span_id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Trace ID:</span>
              <span class="detail-value trace-id">{{ selectedRequest.trace_id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Parent Span ID:</span>
              <span class="detail-value">{{ selectedRequest.parent_span_id || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">HTTP Details</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Method:</span>
              <span class="detail-value">
                <span class="method-badge">{{ getHttpMethod(selectedRequest) }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Path:</span>
              <span class="detail-value">{{ getHttpPath(selectedRequest) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status Code:</span>
              <span class="detail-value">
                <span class="status-badge" :class="getStatusClass(selectedRequest)">
                  {{ getHttpStatus(selectedRequest) }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">URL:</span>
              <span class="detail-value">{{ getHttpUrl(selectedRequest) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host:</span>
              <span class="detail-value">{{ getHttpHost(selectedRequest) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Scheme:</span>
              <span class="detail-value">{{ getHttpScheme(selectedRequest) || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">Network Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Client IP:</span>
              <span class="detail-value">{{ getClientIp(selectedRequest) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Client Port:</span>
              <span class="detail-value">{{ getClientPort(selectedRequest) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host IP:</span>
              <span class="detail-value">{{ getHostIp(selectedRequest) || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Host Port:</span>
              <span class="detail-value">{{ getHostPort(selectedRequest) || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">User Agent</h4>
          <div class="detail-item full-width">
            <span class="detail-label">User Agent:</span>
            <span class="detail-value user-agent">{{ getUserAgent(selectedRequest) || 'N/A' }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">Raw Attributes</h4>
          <div class="raw-json-section">
            <pre class="raw-json">{{ formatRawAttributes(selectedRequest) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div 
      v-if="showDetailPanel" 
      class="backdrop"
      @click="closeRequestDetail"
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
const selectedStatuses = ref(['2xx', '4xx', '5xx'])
const selectedMethods = ref(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
const selectedTimeRange = ref('1h')
const currentPage = ref(1)
const pageSize = ref(50)

// Request detail panel state
const selectedRequest = ref<Span | null>(null)
const showDetailPanel = ref(false)

// Server data
const spans = ref<Span[]>([])
const isLoading = ref(false)
const lastRefresh = ref<Date | null>(null)

// Computed properties
const httpStatuses = [
  { value: '2xx', label: 'Success (2xx)', color: 'text-green-600' },
  { value: '4xx', label: 'Client Error (4xx)', color: 'text-yellow-600' },
  { value: '5xx', label: 'Server Error (5xx)', color: 'text-red-600' }
]

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const timeRanges = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' }
]

// Filter to only inbound requests (kind 2)
const inboundRequests = computed(() => {
  return spans.value.filter(span => span.kind === 2)
})

const filteredRequests = computed(() => {
  return inboundRequests.value.filter(request => {
    // Status filter
    const status = getHttpStatus(request)
    const statusGroup = getStatusGroup(status)
    if (!selectedStatuses.value.includes(statusGroup)) return false
    
    // Method filter
    const method = getHttpMethod(request)
    if (!selectedMethods.value.includes(method)) return false
    
    // Search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return getHttpPath(request).toLowerCase().includes(query) ||
             method.toLowerCase().includes(query) ||
             request.trace_id.toLowerCase().includes(query)
    }
    
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredRequests.value.length / pageSize.value))

const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRequests.value.slice(start, end)
})

const averageResponseTime = computed(() => {
  if (filteredRequests.value.length === 0) return 0
  const totalDuration = filteredRequests.value.reduce((sum, req) => sum + req.duration_ns, 0)
  return Math.round(totalDuration / filteredRequests.value.length / 1000000)
})

// Methods
function getStatusCount(statusGroup: string) {
  return filteredRequests.value.filter(request => {
    const status = getHttpStatus(request)
    return getStatusGroup(status) === statusGroup
  }).length
}

function getMethodCount(method: string) {
  return filteredRequests.value.filter(request => getHttpMethod(request) === method).length
}

function getStatusGroup(status: number): string {
  if (status >= 200 && status < 300) return '2xx'
  if (status >= 400 && status < 500) return '4xx'
  if (status >= 500) return '5xx'
  return 'other'
}

function getHttpMethod(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.method'] || span.name || 'GET'
}

function getHttpPath(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.target'] || attributes['http.route'] || '/'
}

function getHttpStatus(span: Span): number {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.status_code'] || 200
}

function getHttpUrl(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.url']
}

function getHttpHost(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.host']
}

function getHttpScheme(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.scheme']
}

function getClientIp(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['net.peer.ip']
}

function getClientPort(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['net.peer.port']
}

function getHostIp(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['net.host.ip']
}

function getHostPort(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['net.host.port']
}

function getUserAgent(span: Span): string {
  const attributes = parseAttributes(span.attributes_json)
  return attributes['http.user_agent']
}

function getStatusClass(span: Span): string {
  const status = getHttpStatus(span)
  if (status >= 200 && status < 300) return 'status-success'
  if (status >= 400 && status < 500) return 'status-client-error'
  if (status >= 500) return 'status-server-error'
  return 'status-info'
}

function getStatusRowClass(span: Span): string {
  const status = getHttpStatus(span)
  if (status >= 500) return 'row-server-error'
  if (status >= 400) return 'row-client-error'
  return ''
}

function formatTime(timestampNs: number): string {
  const timestamp = Math.round(timestampNs / 1000000)
  return new Date(timestamp).toLocaleString()
}

function formatDuration(durationNs: number): string {
  const durationMs = Math.round(durationNs / 1000000)
  return `${durationMs}ms`
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

function openRequestDetail(request: Span) {
  selectedRequest.value = request
  showDetailPanel.value = true
}

function closeRequestDetail() {
  showDetailPanel.value = false
  selectedRequest.value = null
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatuses.value = ['2xx', '4xx', '5xx']
  selectedMethods.value = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  selectedTimeRange.value = '1h'
  currentPage.value = 1
}

async function refreshRequests() {
  await fetchData()
}

function exportRequests() {
  const dataStr = JSON.stringify(filteredRequests.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inbound-requests-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
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
      if (span.kind === 2) { // Only inbound requests
        spans.value.push(span)
      }
    }
  })
  
  onUnmounted(() => cleanup())
})
</script>

<style scoped>
.requests-dashboard {
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

.request-stats {
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

.stat-value.success {
  color: #059669;
}

.stat-value.client-error {
  color: #d97706;
}

.stat-value.server-error {
  color: #dc2626;
}

.requests-table-container {
  flex: 1;
  overflow: auto;
  padding: 0 24px;
}

.requests-table {
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

.request-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.request-row:hover {
  background-color: #f8fafc;
}

.request-row.row-client-error {
  background-color: #fffbeb;
}

.request-row.row-client-error:hover {
  background-color: #fef3c7;
}

.request-row.row-server-error {
  background-color: #fef2f2;
}

.request-row.row-server-error:hover {
  background-color: #fee2e2;
}

.request-time {
  padding: 12px 16px;
  font-size: 12px;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', monospace;
  white-space: nowrap;
}

.request-method {
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

.request-path {
  padding: 12px 16px;
  max-width: 300px;
}

.path-text {
  font-size: 14px;
  color: #1e293b;
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.request-status {
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

.request-duration {
  padding: 12px 16px;
}

.duration-value {
  font-size: 12px;
  color: #059669;
  font-weight: 500;
}

.request-client-ip {
  padding: 12px 16px;
}

.client-ip {
  font-size: 12px;
  color: #374151;
  font-family: 'Monaco', 'Menlo', monospace;
}

.request-user-agent {
  padding: 12px 16px;
  max-width: 200px;
}

.user-agent-text {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Request Detail Panel Styles */
.request-detail-panel {
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

.request-detail-panel.panel-open {
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
  .sidebar {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .requests-dashboard {
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
  
  .request-stats {
    flex-wrap: wrap;
    gap: 16px;
  }
}
</style>
