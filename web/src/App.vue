<template>
  <div class="app">
    <header class="app-header">
      <h1>Dev Observability</h1>
      <nav class="nav-menu">
        <router-link to="/" class="nav-link">Dashboard</router-link>
        <router-link to="/logs" class="nav-link">Logs</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// This component now serves as the main layout with navigation
</script>

<style scoped>
.app {
  font-family: ui-sans-serif, system-ui;
  min-height: 100vh;
  background-color: #f8fafc;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.nav-menu {
  display: flex;
  gap: 24px;
}

.nav-link {
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.nav-link.router-link-active {
  color: #3b82f6;
  background-color: #eff6ff;
}

.app-main {
  flex: 1;
}
</style>
