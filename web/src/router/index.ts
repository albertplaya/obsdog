import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/App.vue'
import Logs from '@/Logs.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
