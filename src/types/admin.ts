export type PageResponse<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type AdminUser = {
  id: number
  username: string
  displayName?: string
  userType: string
  status: string
  balance?: number
  createdAt?: string
  updatedAt?: string
}

export type AdminReview = {
  id: number
  orderId: number
  farmStayId: number
  farmStayName?: string
  visitorId: number
  visitorUsername?: string
  rating: number
  content: string
  createdAt?: string
}

export type AdminDashboardOverview = {
  orderCount: number
  turnover: number
  refundRate: number
  farmStayCount: number
  activeOperatorCount: number
}

export type AdminKnowledgeDocument = {
  id: number
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  scope: string
  farmStayId?: number | null
  status?: string
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
}

export type AdminKnowledgePayload = {
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  scope: string
  farmStayId?: number | null
  status?: string
}

export type AdminCitation = {
  sourceType: string
  sourceId: string
  snippet: string
}
