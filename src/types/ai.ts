export type AiCitation = {
  sourceType: string
  sourceId: string
  snippet: string
}

export type AiChatSession = {
  sessionId: number
  userId: number
  farmStayId?: number | null
  scene?: string | null
  title?: string | null
  lastMessageAt?: string | null
  createdAt: string
}

export type AiChatMessage = {
  messageId: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  citations: AiCitation[]
  confidence?: number | null
  refuseReason?: string | null
  fallback?: boolean | null
}

export type OperatorInsightIssue = {
  topic: string
  priority: string
  issueCount: number
  negativeRatio: number
  impactScore: number
}

export type OperatorInsightAction = {
  topic: string
  action: string
  expectedBenefit: string
}

export type OperatorInsightReport = {
  reportId: number
  farmStayId: number
  periodDays: number
  reviewCount: number
  averageRating: number
  summary: string
  generatedAt: string
  issues: OperatorInsightIssue[]
  actions: OperatorInsightAction[]
}

export type OwnedFarmStayLite = {
  id: number
  name: string
  city: string
}
