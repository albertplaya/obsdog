<template>
  <div class="app">
    <header>
      <h1>Dev Observability</h1>
      <button @click="reload">Reload</button>
    </header>
    <main>
      <RequestList :items="requests" @select="select" />
      <RequestDetail :req="selected" :sqls="sqlByTraceId[selected?.traceId] || []" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getSnapshot, connectEvents } from './api'
import RequestList from './components/RequestList.vue'
import RequestDetail from './components/RequestDetail.vue'

type Req = { id?: string; ts: number; method: string; path: string; status: number; dur_ms: number; traceId?: string }
type SqlEvt = { ts: number; traceId?: string; sql: string; dur_ms: number; rows?: number }

const requests = reactive<Req[]>([])
const sqls     = reactive<SqlEvt[]>([])
const sqlByTraceId: Record<string, SqlEvt[]> = reactive({})
const selected = ref<Req | null>(null)

function indexSql(evt: SqlEvt) {
  if (!evt.traceId) return
  if (!sqlByTraceId[evt.traceId]) sqlByTraceId[evt.traceId] = []
  sqlByTraceId[evt.traceId].push(evt)
}

async function reload() {
  const snap = await getSnapshot()
  requests.splice(0, requests.length, ...snap.requests)
  sqls.splice(0, sqls.length, ...snap.sql)
  sqls.forEach(indexSql)
}

function select(r: Req) {
  selected.value = r
}

onMounted(async () => {
  await reload()
  connectEvents((type, data) => {
    if (type === 'request') requests.push(data)
    if (type === 'sql')     { sqls.push(data); indexSql(data) }
  })
})
</script>

<style scoped>
.app{ font-family: ui-sans-serif, system-ui; padding: 12px; }
header{ display:flex; gap:12px; align-items:center; }
main{ display:grid; grid-template-columns: 2fr 3fr; gap:12px; margin-top:12px; }
button{ padding:6px 10px; border:1px solid #ddd; border-radius:6px; cursor:pointer; background:#fafafa; }
</style>
