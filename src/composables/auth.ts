import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface AuthTokenPayload {
  token: string
  loginType: string
  expire: number
  userId?: number
  username?: string
  displayName?: string
  status?: string
  balance?: number
}

export const AUTH_STORAGE_KEY = 'farmstay-token'
const AUTH_SYNC_EVENT = 'farmstay-auth-sync'

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
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT))
}

export const clearAuthPayload = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT))
}

export const useAuthState = () => {
  const payload = ref<AuthTokenPayload | null>(null)
  const sync = () => {
    payload.value = readAuthPayload()
  }

  const storageHandler = () => sync()
  const authSyncHandler = () => sync()

  onMounted(() => {
    sync()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', storageHandler)
      window.addEventListener(AUTH_SYNC_EVENT, authSyncHandler)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener(AUTH_SYNC_EVENT, authSyncHandler)
    }
  })

  const isAuthenticated = computed(() => Boolean(payload.value && payload.value.token))

  return {
    payload,
    isAuthenticated,
    sync,
  }
}
