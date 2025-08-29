<template>
  <div class="trace-tree-item">
    <div class="trace-item-header">
      <div class="trace-item-content">
        <div class="trace-item-left">
          <div class="trace-item-indent" :style="{ paddingLeft: `${level * 24 + 16}px` }">
            <button 
              v-if="item.children && item.children.length > 0" 
              class="expand-button"
              @click="toggleExpanded"
            >
              <ChevronDown v-if="item.expanded" class="w-3 h-3 text-gray-500" />
              <ChevronRight v-else class="w-3 h-3 text-gray-500" />
            </button>
            <div v-else class="w-4"></div>
            
            <div class="trace-item-info">
              <div class="trace-type-icon" :class="`type-${item.type}`">
                <span v-if="item.type === 'navigation'" class="icon-text">JS</span>
                <div v-else-if="item.type === 'http.server'" class="icon-dot"></div>
                <span v-else-if="item.type === 'error'" class="icon-warning">⚠</span>
                <div v-else class="icon-default"></div>
              </div>
              
              <span class="trace-item-name" :class="{ 'error': item.type === 'error' }">
                {{ item.type === 'http.server' ? 'http.server' : item.type }}
              </span>
              
              <span class="trace-item-path">- {{ item.name }}</span>
              
              <div v-if="item.type === 'error'" class="error-indicator">
                ⚠
              </div>
            </div>
          </div>
        </div>
        
        <div class="trace-item-timeline">
          <TraceBar :item="item" :total-duration="totalDuration" />
        </div>
      </div>
    </div>
    
    <div v-if="item.expanded && item.children && item.children.length > 0" class="trace-children">
      <TraceTreeItem 
        v-for="child in item.children" 
        :key="child.id" 
        :item="child" 
        :level="level + 1" 
        :total-duration="totalDuration"
        @select-span="$emit('select-span', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, ChevronDown } from 'lucide-vue-next'
import TraceBar from './TraceBar.vue'

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
  level?: number
  totalDuration: number
}

const props = withDefaults(defineProps<Props>(), {
  level: 0
})

const emit = defineEmits<{
  selectSpan: [span: any]
}>()

function toggleExpanded() {
  props.item.expanded = !props.item.expanded
}
</script>

<style scoped>
.trace-tree-item {
  padding: 4px 0;
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

.trace-children {
  margin-left: 24px;
}
</style>
