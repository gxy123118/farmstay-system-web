<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <section class="hero-column">
      <div class="hero-card">
        <h1>连接游客与乡野民宿</h1>
        <div class="hero-stats">
          <article>
            <span class="stat-number">120+</span>
            <span class="stat-label">注册民宿</span>
          </article>
          <article>
            <span class="stat-number">24h</span>
            <span class="stat-label">订单状态更新</span>
          </article>
        </div>
      </div>
    </section>

    <main class="content-column">
      <RouterView />
    </main>
  </div>
</template>
<style></style>
