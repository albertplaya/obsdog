<template>
  <div class="card">
    <div class="title">Requests</div>
    <table>
      <thead>
        <tr>
          <th>Time</th><th>M</th><th>Path</th><th>St</th><th>ms</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in items" :key="r.ts + r.path" @click="$emit('select', r)">
          <td>{{ new Date(r.ts).toLocaleTimeString() }}</td>
          <td>{{ r.method }}</td>
          <td class="path">{{ r.path }}</td>
          <td :class="{bad:r.status>=400}">{{ r.status }}</td>
          <td>{{ r.dur_ms }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ items: Array })
</script>

<style scoped>
.card{ border:1px solid #eee; border-radius:12px; padding:10px }
.title{ font-weight:600; margin-bottom:6px }
table{ width:100%; border-collapse:collapse }
th,td{ padding:6px; border-bottom:1px solid #f0f0f0 }
tr{ cursor:pointer }
tr:hover{ background:#f9f9f9 }
.bad{ color:#c33 }
.path{ max-width:420px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
</style>
