<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthState, clearAuthPayload } from '../composables/auth'
import VisitorCenter from './VisitorCenter.vue'
import OperatorCenter from './OperatorCenter.vue'

const router = useRouter()
const { payload, isAuthenticated, sync } = useAuthState()
const loginType = computed(() => payload.value?.loginType ?? '')

const logout = () => {
  clearAuthPayload()
  sync()
  router.push({ name: 'login' })
}
</script>

<template>
  <main class="personal-page">
    <section class="card">
      <header class="card-header">
        <div>
          <p class="pill">账户</p>
          <h2>{{ payload?.displayName || payload?.username || '未登录' }}</h2>
          <p class="muted">身份：{{ payload?.loginType || '-' }}</p>
        </div>
        <div class="actions">
          <button class="btn" @click="sync">刷新</button>
          <button class="btn danger" @click="logout">退出</button>
        </div>
      </header>
      <div class="muted">Token: {{ payload?.token?.slice(0, 12) }}...</div>
    </section>

    <section v-if="!isAuthenticated" class="status error">
      请先登录后查看个人中心。
    </section>

    <VisitorCenter v-else-if="loginType === 'visitor'" />
    <OperatorCenter v-else-if="loginType === 'operator'" />

    <section v-else class="status error">
      当前角色未知，请重新登录。
    </section>
  </main>
</template>

<style scoped>
.personal-page {
  min-height: 100vh;
  padding: 2rem;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #0f172a;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfeff;
  color: #0ea5e9;
  margin-bottom: 6px;
}

.muted {
  color: #111827;
}

h1,
h2,
h3,
h4,
strong {
  color: #0f172a;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  background: #f8fafc;
}

.btn.danger {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.status {
  margin-top: 0.5rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0f172a;
}

.status.error {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}
</style>
