<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type TokenPayload = {
  token: string
  loginType: string
  expire: number
}

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
  const raw = localStorage.getItem('farmstay-token')
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
  localStorage.setItem('farmstay-token', JSON.stringify(payload))
}

const toggleMode = () => {
  mode.value = isRegisterMode.value ? 'login' : 'register'
  clearFeedback()
}

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
    tokenInfo.value = payload.data
    persistToken(payload.data)
    if (isRegisterMode.value) {
      setFeedback('注册成功，已自动登录，请确认页面右侧信息', 'success')
      mode.value = 'login'
    } else {
      setFeedback('登录成功，令牌已准备就绪', 'success')
    }
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
  <section class="login-view">
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
<!--      <div v-if="tokenInfo" class="token-card">-->
<!--        <p><strong>Token</strong> {{ tokenInfo.token }}</p>-->
<!--        <p><strong>角色</strong> {{ tokenInfo.loginType }}</p>-->
<!--        <p><strong>剩余秒数</strong> {{ tokenInfo.expire }}</p>-->
<!--      </div>-->
    </article>
  </section>
</template>
