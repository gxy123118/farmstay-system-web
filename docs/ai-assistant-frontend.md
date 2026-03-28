# AI 助手前端对接文档

## 1. 概述

本文档说明前端如何调用 AI 助手的 API，包括聊天接口和知识库管理接口。

## 2. API 列表

### 2.1 聊天接口

#### 创建会话
```typescript
apiAiCreateSession(payload?: { farmStayId?: number; scene?: string }): Promise<AiChatSession>
```
- `farmStayId`: 民宿 ID（可选）
- `scene`: 场景类型，如 `operator`、`travel`

#### 获取会话列表
```typescript
apiAiListSessions(): Promise<AiChatSession[]>
```

#### 获取会话详情
```typescript
apiAiGetSession(sessionId: number): Promise<AiChatSession>
```

#### 修改会话标题
```typescript
apiAiUpdateSession(sessionId: number, payload: { title?: string }): Promise<void>
```

#### 删除单个会话
```typescript
apiAiDeleteSession(sessionId: number): Promise<void>
```

#### 清空全部会话
```typescript
apiAiClearSessions(): Promise<void>
```

#### 发送消息（非流式）
```typescript
apiAiSendMessage(sessionId: number, payload: { question: string }): Promise<AiChatMessage>
```

#### 发送消息（流式）
```typescript
apiAiStreamMessage(
  sessionId: number,
  payload: { question: string },
  onChunk: (chunk: string) => void,
  onMeta?: (meta: { sessionId: number; messageId: number; model: string; fallback: boolean }) => void,
  onCitation?: (citation: { sourceType: string; sourceId: string; snippet: string }) => void,
  onDone?: () => void,
  onError?: (error: string) => void
): Promise<void>
```

#### 获取消息历史
```typescript
apiAiListMessages(sessionId: number): Promise<AiChatMessage[]>
```

#### 发送反馈
```typescript
apiAiFeedback(payload: {
  sessionId: number
  messageId: number
  useful: boolean
  comment?: string
}): Promise<void>
```

### 2.2 知识库管理接口

#### 知识库列表
```typescript
apiKnowledgeList(params?: {
  keyword?: string
  docType?: string
  scope?: string
  status?: string
  farmStayId?: number
  platformOnly?: boolean
  page?: number
  pageSize?: number
}): Promise<any>
```

#### 知识库详情
```typescript
apiKnowledgeDetail(id: number): Promise<any>
```

#### 创建知识库
```typescript
apiKnowledgeCreate(payload: {
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  docType?: string
  scope?: string
  farmStayId?: number | null
  priority?: number
  status?: string
}): Promise<any>
```

#### 更新知识库
```typescript
apiKnowledgeUpdate(id: number, payload: Record<string, unknown>): Promise<any>
```

#### 删除知识库
```typescript
apiKnowledgeDelete(id: number): Promise<void>
```

#### 批量导入/更新
```typescript
apiKnowledgeBatchUpsert(payload: Array<{
  knowledgeCode: string
  title: string
  content: string
  summary?: string
  keywords?: string
  docType?: string
  scope?: string
  farmStayId?: number | null
  priority?: number
  status?: string
}>): Promise<any>
```

#### 更新知识库状态
```typescript
apiKnowledgeUpdateStatus(id: number, payload: { status: string }): Promise<any>
```

#### 检索预览
```typescript
apiKnowledgeRetrievePreview(payload: {
  farmStayId?: number
  scene?: string
  question: string
}): Promise<any>
```

## 3. 类型定义

### AiChatSession
```typescript
type AiChatSession = {
  sessionId: number
  userId: number
  farmStayId?: number | null
  scene?: string | null
  createdAt: string
}
```

### AiChatMessage
```typescript
type AiChatMessage = {
  messageId: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  citations: AiCitation[]
  confidence?: number | null
  refuseReason?: string | null
}
```

### AiCitation
```typescript
type AiCitation = {
  sourceType: string
  sourceId: string
  snippet: string
}
```

## 4. 流式响应事件协议

流式接口返回以下 SSE 事件：

### meta
元信息事件
```json
{
  "type": "meta",
  "sessionId": 12,
  "messageId": 88,
  "model": "MiniMax-M2.5",
  "fallback": false
}
```

### chunk
增量文本事件
```json
{
  "type": "chunk",
  "content": "这是增量文本内容"
}
```

### citation
引用片段事件
```json
{
  "type": "citation",
  "sourceType": "faq",
  "sourceId": "123",
  "snippet": "退款规则说明..."
}
```

### done
流式输出结束

### error
异常事件
```json
{
  "type": "error",
  "message": "模型调用失败"
}
```

## 5. 前端实现示例

### 5.1 发起流式聊天

```typescript
import { apiAiStreamMessage } from '@/services/api'

const submitQuestion = async (sessionId: number, question: string) => {
  const content = ref('')
  const citations = ref([])
  const error = ref('')

  try {
    await apiAiStreamMessage(
      sessionId,
      { question },
      // onChunk - 收到增量文本
      (chunk) => {
        content.value += chunk
      },
      // onMeta - 元信息
      (meta) => {
        console.log('消息ID:', meta.messageId)
        console.log('是否降级:', meta.fallback)
      },
      // onCitation - 引用
      (citation) => {
        citations.value.push(citation)
      },
      // onDone - 完成
      () => {
        console.log('回答完成')
      },
      // onError - 错误
      (errMsg) => {
        error.value = errMsg
      }
    )
  } catch (err) {
    console.error('请求失败:', err)
  }
}
```

### 5.2 打字机效果

流式返回的内容需要前端拼接后显示，可以通过 CSS 动画实现打字机光标效果：

```css
.typing-cursor {
  display: inline-block;
  animation: blink 0.8s infinite;
  color: var(--brand);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

## 6. 降级处理

当前端检测到 `fallback=true` 或收到 `error` 事件时：

- 显示降级提示：`本次回答基于规则生成，可能不够精确`
- 保留已收到的回答内容
- 记录 `refuseReason` 供调试

## 7. 文件位置

- API 函数: `src/services/api.ts`
- 类型定义: `src/types/ai.ts`
- AI 助手组件: `src/components/ai/HomeFloatingAssistant.vue`
