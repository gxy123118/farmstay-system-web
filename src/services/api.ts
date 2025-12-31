import { readAuthPayload, AUTH_STORAGE_KEY, clearAuthPayload } from '../composables/auth'

export const LOGIN_REDIRECT_KEY = 'farmstay-redirect'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type HttpMethod = 'GET' | 'POST' | 'PUT'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

const buildHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const payload = readAuthPayload()
  if (payload?.token) {
    headers['farmstay-token'] = payload.token
  }
  return headers
}

const request = async <T = unknown>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.code >= 400) {
    const message = payload?.message || '请求失败'
    if (payload.code === 401) {
      clearAuthPayload()
      if (typeof window !== 'undefined' && !path.startsWith('/api/auth')) {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
        const redirectTo = currentPath === '/login' ? '/' : currentPath
        try {
          localStorage.setItem(LOGIN_REDIRECT_KEY, redirectTo)
        } catch {
          // ignore storage error
        }
        if (window.confirm('登录已失效，请重新登录')) {
          window.location.assign('/login')
        }
      }
    }
    throw new Error(message)
  }
  return payload.data
}

export const apiLogin = (payload: { username: string; password: string; userType: string }) =>
  request<{ token: string; loginType: string; expire: number }>('/api/auth/login', 'POST', payload)

export const apiRegister = (payload: {
  username: string
  password: string
  userType: string
  displayName?: string
}) =>
  request<{ token: string; loginType: string; expire: number }>('/api/auth/register', 'POST', payload)

export const apiOverview = () => request('/api/home/overview')

export const apiRecommendations = (params: { city?: string; priceLevel?: string; tag?: string }) => {
  const query = new URLSearchParams()
  if (params.city) query.append('city', params.city)
  if (params.priceLevel) query.append('priceLevel', params.priceLevel)
  if (params.tag) query.append('tag', params.tag)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/home/recommendations${suffix}`)
}

export const apiListFarmstays = (params: { city?: string; keyword?: string; priceLevel?: string; tag?: string }) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) query.append(k, v as string)
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/farmstays/search/${suffix}`)
}

export const apiFarmstayDetail = (id: number) => request(`/api/farmstays/${id}`)
export const apiCreateFarmstay = (payload: Record<string, unknown>) =>
  request('/api/farmstays', 'POST', payload)
export const apiUpdateFarmstay = (id: number, payload: Record<string, unknown>) =>
  request(`/api/farmstays/${id}`, 'PUT', payload)

export const apiListRooms = (farmStayId: number) =>
  request(`/api/rooms?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)
export const apiCreateRoom = (payload: Record<string, unknown>) => request('/api/rooms', 'POST', payload)
export const apiUpdateRoom = (id: number, payload: Record<string, unknown>) =>
  request(`/api/rooms/${id}`, 'PUT', payload)

export const apiCreateBooking = (payload: Record<string, unknown>) =>
  request('/api/bookings', 'POST', payload)
export const apiPayBooking = (payload: Record<string, unknown>) => request('/api/bookings/pay', 'POST', payload)
export const apiCancelBooking = (orderId: number) =>
  request(`/api/bookings/${orderId}/cancel`, 'POST')
export const apiUpdateBookingStatus = (payload: Record<string, unknown>) =>
  request('/api/bookings/status', 'PUT', payload)
export const apiMyOrders = () => request('/api/bookings/mine')
export const apiOwnerOrders = (farmStayId: number) =>
  request(`/api/bookings?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)

export const apiListReviews = (farmStayId: number) =>
  request(`/api/reviews?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)
export const apiCreateReview = (payload: Record<string, unknown>) =>
  request('/api/reviews', 'POST', payload)
export const apiModerateReview = (id: number, status: string) =>
  request(`/api/reviews/${id}/status?${new URLSearchParams({ status }).toString()}`, 'PUT')

export const apiListCoupons = (farmStayId?: number) => {
  const params = farmStayId ? `?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}` : ''
  return request(`/api/coupons${params}`)
}
export const apiCreateCoupon = (payload: Record<string, unknown>) =>
  request('/api/coupons', 'POST', payload)

export const clearAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
