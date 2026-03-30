import { readAuthPayload, AUTH_STORAGE_KEY, clearAuthPayload } from '../composables/auth'
import type { AuthTokenPayload } from '../composables/auth'
import type {
  BookingCreatePayload,
  BookingCreateResponse,
  BookingDetail,
  OperatorOrderSummary,
  BookingPaymentPayload,
  BookingPaymentResponse,
} from '../types/booking'
import type {
  BalanceFlowResponse,
  BalanceResponse,
  RechargeCreatePayload,
  RechargeResponse,
} from '../types/account'
import type {
  AdminCitation,
  AdminDashboardOverview,
  AdminKnowledgeDocument,
  AdminKnowledgePayload,
  AdminReview,
  AdminUser,
  PageResponse,
} from '../types/admin'

export const LOGIN_REDIRECT_KEY = 'farmstay-redirect'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

export type AuthPayload = {
  token: string
  loginType: string
  expire: number
  userId: number
  username?: string
  displayName?: string
  status?: string
  balance?: number
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
        if (window.confirm('登录已失效，请重新登录？')) {
          window.location.assign('/login')
        }
      }
    }
    throw new Error(message)
  }
  return payload.data
}

export const apiLogin = (payload: { username: string; password: string; userType: string }) =>
  request<AuthPayload>('/api/auth/login', 'POST', payload)

export const apiRegister = (payload: {
  username: string
  password: string
  userType: string
  displayName?: string
}) => request<AuthPayload>('/api/auth/register', 'POST', payload)

export const apiCurrentUser = () => request<AuthPayload>('/api/auth/me')
export const apiAccountBalance = () => request<BalanceResponse>('/api/account/balance')
export const apiAccountBalanceFlows = () => request<BalanceFlowResponse[]>('/api/account/balance/flows')
export const apiCreateRecharge = (payload: RechargeCreatePayload) =>
  request<RechargeResponse>('/api/account/recharges', 'POST', payload)
export const apiGetRecharge = (rechargeNo: string) => request<RechargeResponse>(`/api/account/recharges/${rechargeNo}`)

export const apiOverview = () => request('/api/home/overview')

export const apiRecommendations = (params: { city?: string; priceLevel?: string; tag?: string }) => {
  const query = new URLSearchParams()
  if (params.city) query.append('city', params.city)
  if (params.priceLevel) query.append('priceLevel', params.priceLevel)
  if (params.tag) query.append('tag', params.tag)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/home/recommendations${suffix}`)
}

export const apiListFarmstays = (params: {
  city?: string
  keyword?: string
  priceLevel?: string
  tag?: string
  page?: number
  pageSize?: number
}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') query.append(k, String(v))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/farmstays/search${suffix}`)
}

export const apiFarmstayDetail = (id: number) => request(`/api/farmstays/detail/${id}`)
export const apiCreateFarmstay = (payload: Record<string, unknown>) =>
  request('/api/farmstays', 'POST', payload)
export const apiUpdateFarmstay = (id: number, payload: Record<string, unknown>) =>
  request(`/api/farmstays/${id}`, 'PUT', payload)
export const apiDeleteFarmstay = (id: number) => request(`/api/farmstays/${id}`, 'DELETE')
export const apiOwnerFarmstays = () => request('/api/farmstays/owner')

export const apiListRooms = (farmStayId: number) =>
  request(`/api/rooms?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)
export const apiCreateRoom = (payload: Record<string, unknown>) => request('/api/rooms', 'POST', payload)
export const apiUpdateRoom = (id: number, payload: Record<string, unknown>) =>
  request(`/api/rooms/${id}`, 'PUT', payload)

export const apiListDining = (farmStayId: number) =>
  request(`/api/dinings?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)

export const apiListActivities = (farmStayId: number) =>
  request(`/api/activities?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)

export const apiCreateBooking = (payload: BookingCreatePayload) =>
  request<BookingCreateResponse>('/api/bookings', 'POST', payload)
export const apiPayBooking = (payload: BookingPaymentPayload) =>
  request<BookingPaymentResponse>('/api/bookings/pay', 'POST', payload)
export const apiCancelBooking = (orderId: number) => request<BookingCreateResponse>(`/api/bookings/${orderId}/cancel`, 'POST')
export const apiRefundBooking = (orderId: number) => request<BookingCreateResponse>(`/api/bookings/${orderId}/refund`, 'POST')
export const apiUpdateBookingStatus = (payload: Record<string, unknown>) =>
  request('/api/bookings/status', 'PUT', payload)
export const apiMyOrders = () => request<BookingDetail[]>('/api/bookings/mine')
export const apiOwnerOrders = (farmStayId: number) =>
  request<BookingDetail[]>(`/api/bookings?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)

export const apiOperatorOrders = (params?: { farmStayId?: number; status?: string }) => {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') query.append(key, String(value))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<BookingDetail[]>(`/api/bookings/operator/orders${suffix}`)
}

export const apiOperatorOrderSummary = (params?: { farmStayId?: number }) => {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') query.append(key, String(value))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<OperatorOrderSummary>(`/api/bookings/operator/summary${suffix}`)
}

export const apiListReviews = (farmStayId: number) =>
  request(`/api/reviews?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}`)
export const apiGetReviewByOrder = (orderId: number) => request(`/api/reviews/order/${orderId}`)
export const apiUpdateReview = (orderId: number, payload: Record<string, unknown>) =>
  request(`/api/reviews/order/${orderId}`, 'PUT', payload)
export const apiCreateReview = (payload: Record<string, unknown>) =>
  request('/api/reviews', 'POST', payload)

export const apiListCoupons = (farmStayId?: number) => {
  const params = farmStayId ? `?${new URLSearchParams({ farmStayId: String(farmStayId) }).toString()}` : ''
  return request(`/api/coupons${params}`)
}
export const apiCreateCoupon = (payload: Record<string, unknown>) =>
  request('/api/coupons', 'POST', payload)

export const apiAiCreateSession = (payload?: { farmStayId?: number; scene?: string }) =>
  request('/api/ai/chat/sessions', 'POST', payload ?? {})

export const apiAiGetSession = (sessionId: number) => request(`/api/ai/chat/sessions/${sessionId}`)

export const apiAiListSessions = () => request('/api/ai/chat/sessions')

export const apiAiUpdateSession = (sessionId: number, payload: { title?: string }) =>
  request(`/api/ai/chat/sessions/${sessionId}`, 'PUT', payload)

export const apiAiDeleteSession = (sessionId: number) => request(`/api/ai/chat/sessions/${sessionId}`, 'DELETE')

export const apiAiClearSessions = () => request('/api/ai/chat/sessions', 'DELETE')

export const apiAiSendMessage = (sessionId: number, payload: { question: string }) =>
  request(`/api/ai/chat/sessions/${sessionId}/messages`, 'POST', payload)

export const apiAiStreamMessage = (
  sessionId: number,
  payload: { question: string },
  onChunk: (chunk: string) => void,
  onMeta?: (meta: { sessionId: number; messageId: number; model: string; fallback: boolean }) => void,
  onCitation?: (citation: { sourceType: string; sourceId: string; snippet: string }) => void,
  onDone?: () => void,
  onError?: (error: string) => void
) => {
  console.log('[apiAiStreamMessage] Called with sessionId:', sessionId, 'payload:', payload)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  const authPayload = readAuthPayload()
  if (authPayload?.token) {
    headers['farmstay-token'] = authPayload.token
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  const url = `${apiBase}/api/ai/chat/sessions/${sessionId}/stream`
  console.log('[apiAiStreamMessage] Fetching:', url)

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).then(async (response) => {
    console.log('[apiAiStreamMessage] Response status:', response.status, 'ok:', response.ok)

    if (!response.ok || !response.body) {
      const errText = await response.text()
      console.log('[apiAiStreamMessage] Error response:', errText)
      throw new Error(`流式请求失败: ${response.status} - ${errText}`)
    }

    console.log('[apiAiStreamMessage] Starting to read body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let doneCalled = false

    const emitDone = () => {
      if (!doneCalled) {
        doneCalled = true
        onDone?.()
      }
    }

    const processEventBlock = (rawBlock: string) => {
      const lines = rawBlock
        .split('\n')
        .map((line) => line.replace(/\r$/, ''))

      let eventType = ''
      const dataLines: string[] = []

      for (const line of lines) {
        if (!line) {
          continue
        }

        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim()
          continue
        }

        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        }
      }

      if (!dataLines.length) {
        return
      }

      const data = dataLines.join('\n')
      if (data === '[DONE]') {
        emitDone()
        return
      }

      try {
        const event = JSON.parse(data)
        const resolvedEventType = event.type || event.event || eventType
        console.log('[AI Stream] Parsed - eventType:', resolvedEventType, 'event:', event)

        switch (resolvedEventType) {
          case 'meta':
            onMeta?.({
              sessionId: event.sessionId,
              messageId: event.messageId,
              model: event.model || '',
              fallback: Boolean(event.fallback),
            })
            break
          case 'chunk':
            onChunk(event.content || '')
            break
          case 'citation':
            onCitation?.({
              sourceType: event.citation?.sourceType || event.sourceType || '',
              sourceId: event.citation?.sourceId || event.sourceId || '',
              snippet: event.citation?.snippet || event.snippet || '',
            })
            break
          case 'error':
            onError?.(event.message || '未知错误')
            break
          case 'done':
            emitDone()
            break
          default:
            console.log('[AI Stream] Unknown event type:', resolvedEventType)
        }
      } catch (e) {
        console.error('[AI Stream] Parse error:', e, 'data:', data)
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex >= 0) {
        const block = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + 2)
        processEventBlock(block)
        separatorIndex = buffer.indexOf('\n\n')
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      processEventBlock(buffer)
    }

    emitDone()
  })
}

export const apiAiListMessages = (sessionId: number) => request(`/api/ai/chat/sessions/${sessionId}/messages`)

export const apiAiFeedback = (payload: {
  sessionId: number
  messageId: number
  useful: boolean
  comment?: string
}) => request('/api/ai/chat/feedback', 'POST', payload)

export const apiOperatorInsightGenerate = (farmStayId: number, periodDays = 30) =>
  request(
    `/api/operator/insights/reviews/${farmStayId}/generate?${new URLSearchParams({ periodDays: String(periodDays) }).toString()}`,
    'POST',
  )

export const apiOperatorInsightLatest = (farmStayId: number) =>
  request(`/api/operator/insights/reviews/${farmStayId}`)

export const apiOperatorInsightHistory = (farmStayId: number) =>
  request(`/api/operator/insights/reviews/${farmStayId}/history`)

export const apiOperatorInsightHistoryDetail = (farmStayId: number, reportId: number) =>
  request(`/api/operator/insights/reviews/${farmStayId}/history/${reportId}`)

export const apiOperatorInsightDeleteHistory = (farmStayId: number, reportId: number) =>
  request(`/api/operator/insights/reviews/${farmStayId}/history/${reportId}`, 'DELETE')

export const apiOperatorInsightIssues = (farmStayId: number) =>
  request(`/api/operator/insights/reviews/${farmStayId}/issues`)

export const apiKnowledgeList = (params?: {
  keyword?: string
  scope?: string
  status?: string
  farmStayId?: number
  platformOnly?: boolean
  page?: number
  pageSize?: number
}) => {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') query.append(k, String(v))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/ai/knowledge${suffix}`)
}

export const apiKnowledgeDetail = (id: number) => request(`/api/ai/knowledge/${id}`)

export const apiKnowledgeCreate = (payload: {
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  scope?: string
  farmStayId?: number | null
  status?: string
}) => request('/api/ai/knowledge', 'POST', payload)

export const apiKnowledgeUpdate = (id: number, payload: Record<string, unknown>) =>
  request(`/api/ai/knowledge/${id}`, 'PUT', payload)

export const apiKnowledgeDelete = (id: number) => request(`/api/ai/knowledge/${id}`, 'DELETE')

export const apiKnowledgeBatchUpsert = (payload: Array<{
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  scope?: string
  farmStayId?: number | null
  status?: string
}>) => request('/api/ai/knowledge/batch-upsert', 'POST', payload)

export const apiKnowledgeUpdateStatus = (id: number, payload: { status: string }) =>
  request(`/api/ai/knowledge/${id}/status`, 'PUT', payload)

export const apiKnowledgeRetrievePreview = (payload: {
  farmStayId?: number
  scene?: string
  question: string
}) => request('/api/ai/knowledge/retrieve-preview', 'POST', payload)

export const apiAdminUsers = (params: {
  keyword?: string
  userType?: string
  status?: string
  page?: number
  pageSize?: number
}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') query.append(key, String(value))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<PageResponse<AdminUser>>(`/api/admin/users${suffix}`)
}

export const apiAdminUpdateUserStatus = (userId: number, payload: { status: 'ACTIVE' | 'DISABLED' }) =>
  request<AdminUser>(`/api/admin/users/${userId}/status`, 'PUT', payload)

export const apiAdminReviews = (params: { keyword?: string; page?: number; pageSize?: number }) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') query.append(key, String(value))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<PageResponse<AdminReview>>(`/api/admin/reviews${suffix}`)
}

export const apiAdminDeleteReview = (reviewId: number) => request<void>(`/api/admin/reviews/${reviewId}`, 'DELETE')

export const apiAdminDashboardOverview = () => request<AdminDashboardOverview>('/api/admin/dashboard/overview')

export const apiAdminKnowledgeList = (params?: {
  keyword?: string
  status?: string
  farmStayId?: number
  platformOnly?: boolean
  page?: number
  pageSize?: number
}) => {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') query.append(key, String(value))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request<PageResponse<AdminKnowledgeDocument>>(`/api/admin/knowledge${suffix}`)
}

export const apiAdminKnowledgeDetail = (id: number) => request<AdminKnowledgeDocument>(`/api/admin/knowledge/${id}`)

export const apiAdminKnowledgeCreate = (payload: AdminKnowledgePayload) =>
  request<AdminKnowledgeDocument>('/api/admin/knowledge', 'POST', payload)

export const apiAdminKnowledgeUpdate = (id: number, payload: AdminKnowledgePayload) =>
  request<AdminKnowledgeDocument>(`/api/admin/knowledge/${id}`, 'PUT', payload)

export const apiAdminKnowledgeDelete = (id: number) => request<void>(`/api/admin/knowledge/${id}`, 'DELETE')

export const apiAdminKnowledgeUpdateStatus = (id: number, payload: { status: string }) =>
  request<AdminKnowledgeDocument>(`/api/admin/knowledge/${id}/status`, 'PUT', payload)

export const apiAdminKnowledgeRetrievePreview = (payload: {
  farmStayId?: number
  scene?: string
  question: string
}) => request<AdminCitation[]>('/api/admin/knowledge/retrieve-preview', 'POST', payload)

export const clearAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const mergeAuthPayload = (payload: AuthPayload): AuthTokenPayload => ({
  token: payload.token,
  loginType: payload.loginType,
  expire: payload.expire,
  userId: payload.userId,
  username: payload.username,
  displayName: payload.displayName,
  status: payload.status,
  balance: payload.balance,
})
