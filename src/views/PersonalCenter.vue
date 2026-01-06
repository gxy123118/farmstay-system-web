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
    <button class="back-home-icon" aria-label="返回首页" @click="router.push('/')">
      <span class="back-icon">←</span>
    </button>
    <section class="profile-card">
      <header class="profile-top">
        <div class="profile-main">
          <div class="avatar">
            {{ (payload?.displayName || payload?.username || '未登录').slice(0, 1) }}
          </div>
          <div class="profile-text">
            <h2>{{ payload?.displayName || payload?.username || '未登录' }}</h2>
            <p class="muted">身份：{{ payload?.loginType || '-' }}</p>
          </div>
        </div>
        <div class="actions">
          <button class="btn ghost" @click="sync">刷新</button>
          <button class="btn danger" @click="logout">退出</button>
        </div>
      </header>
      <div class="profile-meta">
        <div class="meta-item">
          <span class="meta-label">账号</span>
          <span class="meta-value">{{ payload?.username || '-' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">昵称</span>
          <span class="meta-value">{{ payload?.displayName || '-' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">身份</span>
          <span class="meta-value">{{ payload?.loginType || '-' }}</span>
        </div>
      </div>
      <p class="tip">温馨提示：公共设备使用后记得退出账号。</p>
    </section>

    <section v-if="!isAuthenticated" class="status error">
      请先登录后查看个人中心。
    </section>

    <section v-else class="content-card">
      <VisitorCenter v-if="loginType === 'visitor'" />
      <OperatorCenter v-else-if="loginType === 'operator'" />
      <section v-else class="status error">
        当前角色未知，请重新登录。
      </section>
    </section>
  </main>
</template>

<style scoped>
.personal-page {
  min-height: 100vh;
  padding: 2rem;
  background: radial-gradient(circle at top, #e2f8f1 0%, #f8fafc 45%, #eef2f7 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #0f172a;
  position: relative;
}

.profile-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(15, 118, 110, 0.08);
}

.profile-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.profile-main {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.avatar {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #0f766e;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.28);
}

.profile-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.meta-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meta-item.wide {
  grid-column: span 2;
}

.meta-label {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: #64748b;
  text-transform: uppercase;
}

.meta-value {
  color: #0f172a;
  font-weight: 600;
  word-break: break-all;
}

.tip {
  margin-top: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #ecfeff;
  color: #0f172a;
  border: 1px dashed #bae6fd;
  font-size: 0.85rem;
}

.back-home-icon {
  position: fixed;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #0f766e;
  background: #0f766e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 118, 110, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.back-home-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.35);
}

.back-home-icon::after {
  content: '返回首页';
  position: absolute;
  left: 110%;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 8px;
  background: #0f172a;
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.back-home-icon:hover::after {
  opacity: 1;
}

.back-icon {
  font-size: 18px;
  color: #fff;
  line-height: 1;
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

.btn.ghost {
  background: #fff;
  border-color: #cbd5f5;
  color: #0f172a;
}

.btn.danger {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.content-card {
  border-radius: 16px;
  padding: 0;
  background: transparent;
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

@media (max-width: 720px) {
  .profile-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta-item.wide {
    grid-column: span 1;
  }
}
</style>
