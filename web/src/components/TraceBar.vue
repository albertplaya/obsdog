<template>
  <div class="trace-bar">
    <div 
      class="trace-bar-fill"
      :style="{
        left: `${(item.startTime / totalDuration) * 100}%`,
        width: `${(item.duration / totalDuration) * 100}%`,
        minWidth: '2px'
      }"
    >
      <span class="trace-bar-duration">{{ item.duration.toFixed(2) }}ms</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TraceItem {
  id: string
  type: "navigation" | "http.server" | "error"
  name: string
  duration: number
  startTime: number
  children?: TraceItem[]
  expanded?: boolean
}

interface Props {
  item: TraceItem
  totalDuration: number
}

defineProps<Props>()
</script>

<style scoped>
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
</style>
