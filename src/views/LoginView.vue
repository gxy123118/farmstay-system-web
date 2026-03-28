<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiLogin, apiRegister, LOGIN_REDIRECT_KEY, mergeAuthPayload } from '../services/api'
import { persistAuthPayload, readAuthPayload, type AuthTokenPayload } from '../composables/auth'

type TokenPayload = AuthTokenPayload

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
const tokenInfo = ref<TokenPayload | null>(readAuthPayload())

const isRegisterMode = computed(() => mode.value === 'register')

const canSubmit = computed(() => {
  const base = Boolean(form.username && form.password && form.userType)
  if (isRegisterMode.value) {
    return form.userType !== 'admin' && base && Boolean(form.displayName?.trim())
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
    const payload =
      mode.value === 'register'
        ? await apiRegister({
            username: form.username,
            password: form.password,
            userType: form.userType,
            displayName: form.displayName,
          })
        : await apiLogin({
            username: form.username,
            password: form.password,
            userType: form.userType,
          })

    const storedPayload: TokenPayload = mergeAuthPayload(payload)

    tokenInfo.value = storedPayload
    persistAuthPayload(storedPayload)

    if (isRegisterMode.value) {
      setFeedback('注册成功，已自动登录', 'success')
      mode.value = 'login'
    } else {
      setFeedback('登录成功', 'success')
    }

    const redirect = localStorage.getItem(LOGIN_REDIRECT_KEY)
    if (redirect) {
      localStorage.removeItem(LOGIN_REDIRECT_KEY)
      await router.replace(redirect)
    } else {
      await router.replace({ name: storedPayload.loginType === 'admin' ? 'admin-console' : 'home' })
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
  <main class="login-shell page-shell">
    <section class="login-intro surface">
      <span class="badge">农宿业务中台</span>
      <h1 class="section-title">把乡野住宿、订单与评价放进一个清晰系统</h1>
      <p class="muted">
        游客可搜索、预订、支付、评价，经营者可管理农家乐、订单和服务项。
      </p>
      <div class="intro-stats">
        <article v-for="stat in loginHeroStats" :key="stat.label">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>
      <div v-if="tokenInfo" class="token-panel">
        <p><strong>当前账号：</strong>{{ tokenInfo.displayName || tokenInfo.username }}</p>
        <p><strong>角色：</strong>{{ tokenInfo.loginType }}</p>
      </div>
    </section>

    <section class="login-panel surface-strong">
      <header>
        <h2 class="section-title">{{ isRegisterMode ? '创建账户' : '欢迎回来' }}</h2>
        <p class="muted">{{ isRegisterMode ? '先注册，再一键进入平台' : '继续管理你的农宿业务' }}</p>
      </header>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>账号</span>
          <input v-model="form.username" class="input" type="text" placeholder="请输入账号" autocomplete="username" />
        </label>

        <label class="field">
          <span>密码</span>
          <input v-model="form.password" class="input" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </label>

        <label v-if="isRegisterMode" class="field">
          <span>昵称</span>
          <input v-model="form.displayName" class="input" type="text" placeholder="展示给其他用户的名字" />
        </label>

        <label class="field">
          <span>身份</span>
          <div class="role-toggle">
            <label class="role-item">
              <input v-model="form.userType" type="radio" value="visitor" />
              游客
            </label>
            <label class="role-item">
              <input v-model="form.userType" type="radio" value="operator" />
              经营者
            </label>
            <label v-if="!isRegisterMode" class="role-item">
              <input v-model="form.userType" type="radio" value="admin" />
              管理员
            </label>
          </div>
        </label>

        <button class="btn btn-primary" type="submit" :disabled="isSubmitting || !canSubmit">
          {{ isSubmitting ? '处理中...' : isRegisterMode ? '注册并登录' : '登录' }}
        </button>
      </form>

      <button class="switch-btn" type="button" @click="toggleMode">
        {{ isRegisterMode ? '已有账号，去登录' : '没有账号，去注册' }}
      </button>

      <div v-if="feedback.message" class="status" :class="feedback.type === 'error' ? 'error' : ''">
        {{ feedback.message }}
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-shell {
  display: grid;
  grid-template-columns: minmax(300px, 0.95fr) minmax(340px, 1fr);
  gap: 24px;
  align-items: stretch;
}

.login-intro,
.login-panel {
  padding: 28px;
}

.login-intro {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-intro h1 {
  font-size: clamp(30px, 4.2vw, 44px);
  line-height: 1.16;
}

.intro-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.intro-stats article {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.intro-stats strong {
  color: var(--ink-strong);
  font-size: 24px;
  font-family: var(--font-display);
}

.intro-stats span {
  color: var(--ink-soft);
  font-size: 13px;
}

.token-panel {
  border-radius: var(--radius-md);
  border: 1px dashed var(--line-strong);
  padding: 12px;
  background: rgba(248, 246, 238, 0.7);
  color: var(--ink-soft);
  display: grid;
  gap: 6px;
}

.login-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
}

.login-form {
  display: grid;
  gap: 12px;
}

.role-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.role-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  color: var(--ink);
}

.switch-btn {
  border: 0;
  background: transparent;
  color: var(--brand);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

@media (max-width: 980px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-intro {
    order: 2;
  }

  .login-panel {
    order: 1;
  }

  .intro-stats {
    grid-template-columns: 1fr;
  }
}
</style>
