import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface AuthTokenPayload {
  token: string
  loginType: string
  expire: number
  username?: string
  displayName?: string
}

export const AUTH_STORAGE_KEY = 'farmstay-token'

export const readAuthPayload = (): AuthTokenPayload | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthTokenPayload
  } catch {
    return null
  }
}

export const persistAuthPayload = (payload: AuthTokenPayload) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

export const clearAuthPayload = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const useAuthState = () => {
  const payload = ref<AuthTokenPayload | null>(null)
  const sync = () => {
    payload.value = readAuthPayload()
  }

  const storageHandler = () => sync()

  onMounted(() => {
    sync()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', storageHandler)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler)
    }
  })

  const isAuthenticated = computed(() => Boolean(payload.value && payload.value.token))

  return {
    payload,
    isAuthenticated,
    sync,
  }
}
