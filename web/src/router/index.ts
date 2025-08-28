import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/App.vue'
import Logs from '@/Logs.vue'
import Requests from '@/views/Requests.vue'
import Traces from '@/views/Traces.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/logs',
    name: 'Logs',
    component: Logs
  },
  {
    path: '/requests',
    name: 'Requests',
    component: Requests
  },
  {
    path: '/traces',
    name: 'Traces',
    component: Traces
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
