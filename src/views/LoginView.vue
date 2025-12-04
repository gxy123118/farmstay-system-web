<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { AUTH_STORAGE_KEY } from '../composables/auth'
import { useRouter } from 'vue-router'

type TokenPayload = {
  token: string
  loginType: string
  expire: number
  username?: string
  displayName?: string
}

const loginHeroStats = [
  { label: '合作农家乐', value: '220+' },
  { label: '实时订单处理', value: '24h' },
  { label: '平均满意度', value: '4.8/5' },
]

const form = reactive({
  username: '',
  password: '',
  userType: 'visitor',
  displayName: '',
})

const feedback = reactive({ message: '', type: '' as 'success' | 'error' | '' })
const isSubmitting = ref(false)
const mode = ref<'login' | 'register'>('login')

const loadPersistedToken = (): TokenPayload | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as TokenPayload
  } catch {
    return null
  }
}

const tokenInfo = ref<TokenPayload | null>(loadPersistedToken())

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const isRegisterMode = computed(() => mode.value === 'register')

const canSubmit = computed(() => {
  const base = Boolean(form.username && form.password && form.userType)
  if (isRegisterMode.value) {
    return base && Boolean(form.displayName?.trim())
  }
  return base
})

const clearFeedback = () => {
  feedback.message = ''
  feedback.type = ''
}

const setFeedback = (message: string, type: 'success' | 'error') => {
  feedback.message = message
  feedback.type = type
}

const persistToken = (payload: TokenPayload) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

const toggleMode = () => {
  mode.value = isRegisterMode.value ? 'login' : 'register'
  clearFeedback()
}

const router = useRouter()

const handleSubmit = async () => {
  if (!canSubmit.value) {
    setFeedback('请将所有字段填写完整', 'error')
    return
  }
  isSubmitting.value = true
  clearFeedback()
  try {
    const response = await fetch(`${apiBase}/api/auth/${mode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: form.username,
        password: form.password,
        userType: form.userType,
        displayName: isRegisterMode.value ? form.displayName : undefined,
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload.code !== 200) {
      throw new Error(payload.message || '请求失败')
    }
    const storedPayload: TokenPayload = {
      ...payload.data,
      username: form.username,
      displayName: form.displayName || form.username,
    }
    tokenInfo.value = storedPayload
    persistToken(storedPayload)
    if (isRegisterMode.value) {
      setFeedback('注册成功，已自动登录，请确认页面右侧信息', 'success')
      mode.value = 'login'
    } else {
      setFeedback('登录成功，令牌已准备就绪', 'success')
    }
    await router.push({ name: 'home' })
  } catch (error) {
    if (error instanceof Error) {
      setFeedback(error.message, 'error')
    } else {
      setFeedback('登录请求失败', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <p class="hero-eyebrow">游客与经营者的乡野联动</p>
      <h1>在农家乐与管理之间切换自如</h1>
      <p class="hero-copy">
        全平台覆盖游客预订与经营者后台，实时同步库存、订单与评论，帮助你快速上架并获得更多好评。
      </p>
      <div class="hero-stats">
        <article v-for="stat in loginHeroStats" :key="stat.label">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </article>
      </div>
    </section>

    <section class="login-panel">
      <article class="login-card">
        <header>
          <p class="eyebrow">{{ isRegisterMode ? '新用户注册' : '双角色登录' }}</p>
          <h2>你好, 欢迎使用农家乐服务平台</h2>
        </header>

        <form class="login-form" @submit.prevent="handleSubmit">
          <label class="input-label">
            <span>账号:</span>
            <input v-model="form.username" type="text" placeholder="输入手机号或账号" autocomplete="username" />
          </label>

          <label class="input-label">
            <span>密码:</span>
            <input v-model="form.password" type="password" placeholder="输入密码" autocomplete="current-password" />
          </label>

          <label v-if="isRegisterMode" class="input-label">
            <span>昵称:</span>
            <input v-model="form.displayName" type="text" placeholder="呈现给其他人看的名字" />
          </label>

          <label class="input-label select-label">
            <span>身份:</span>
            <div class="radio-group">
              <label>
                <input v-model="form.userType" type="radio" value="visitor" />
                游客
              </label>
              <label>
                <input v-model="form.userType" type="radio" value="operator" />
                经营者
              </label>
            </div>
          </label>

          <button class="btn-submit" type="submit" :disabled="isSubmitting || !canSubmit">
            <span v-if="!isSubmitting">{{ isRegisterMode ? '注册并登录' : '登录' }}</span>
            <span v-else>通信中 …</span>
          </button>
        </form>

        <button class="mode-switch" type="button" @click="toggleMode">
          {{ isRegisterMode ? '已有账号？切换到登录' : '需要新账号？去注册' }}
        </button>

        <div v-if="feedback.message" class="status" :class="feedback.type">
          {{ feedback.message }}
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(320px, 420px) 1fr;
  gap: 2rem;
  padding: 3rem;
  background: #eef2ff;
}

.login-hero {
  border-radius: 30px;
  padding: 3rem;
  background: linear-gradient(135deg, #0f766e, #22d3ee);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 30px 60px rgba(15, 118, 110, 0.3);
}

.hero-eyebrow {
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  margin: 0;
  opacity: 0.85;
}

.hero-copy {
  line-height: 1.7;
  max-width: 360px;
  margin: 0;
}

.hero-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-stats article {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 1rem 1.2rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 24px;
  padding: 3rem 2.5rem;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.15);
}

.login-card header h2 {
  margin: 0.5rem 0 1.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #1f2937;
}

.input-label input {
  border-radius: 12px;
  border: 1px solid #d1d5db;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.select-label .radio-group {
  flex-direction: row;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
}

.btn-submit {
  margin-top: 0.5rem;
  border: none;
  border-radius: 12px;
  padding: 0.9rem;
  background: #0f766e;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.mode-switch {
  margin-top: 1rem;
  background: transparent;
  border: none;
  color: #0f766e;
  font-weight: 600;
  cursor: pointer;
}

.status {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
}

.status.success {
  background: #ecfdf5;
  color: #065f46;
}

.status.error {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 2rem;
  }

  .login-panel {
    order: 1;
  }

  .login-hero {
    order: 2;
  }
}
</style>
