<template>
  <div class="card">
    <div class="title">Details</div>
    <div v-if="!req" class="empty">Select a request…</div>
    <div v-else>
      <div class="meta">
        <div><b>{{ req.method }}</b> {{ req.path }}</div>
        <div>Status: <b :class="{bad:req.status>=400}">{{ req.status }}</b> · {{ req.dur_ms }} ms</div>
        <div v-if="req.traceId">traceId: <code>{{ req.traceId }}</code></div>
      </div>
      <h4>SQL</h4>
      <table v-if="sqls.length">
        <thead><tr><th>ms</th><th>rows</th><th>sql</th></tr></thead>
        <tbody>
          <tr v-for="(s,i) in sqls" :key="i">
            <td>{{ s.dur_ms }}</td>
            <td>{{ s.rows ?? '' }}</td>
            <td class="sql">{{ s.sql }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">No SQL captured.</div>
    </div>
  </div>
</template>

<script setup>
defineProps({ req:Object, sqls:Array })
</script>

<style scoped>
.card{ border:1px solid #eee; border-radius:12px; padding:10px }
.title{ font-weight:600; margin-bottom:6px }
.meta{ margin-bottom:12px }
.empty{ color:#777 }
.bad{ color:#c33 }
.sql{ max-width:500px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
</style>
