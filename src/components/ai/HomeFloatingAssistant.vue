<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useAuthState } from '../../composables/auth'
import {
  apiAiClearSessions,
  apiAiCreateSession,
  apiAiDeleteSession,
  apiAiListMessages,
  apiAiListSessions,
  apiAiStreamMessage,
  apiAiUpdateSession,
} from '../../services/api'
import type { AiChatMessage, AiChatSession, AiCitation } from '../../types/ai'

const props = defineProps<{
  farmStayId?: number | null
}>()

const { payload } = useAuthState()
const loginType = computed(() => payload.value?.loginType ?? 'visitor')
const currentScene = computed(() => (loginType.value === 'operator' ? 'operator' : 'travel'))

const expanded = ref(false)
const maximized = ref(false)
const session = ref<AiChatSession | null>(null)
const sessions = ref<AiChatSession[]>([])
const messages = ref<AiChatMessage[]>([])
const question = ref('')
const loading = ref(false)
const loadingSessions = ref(false)
const sending = ref(false)
const streaming = ref(false)
const streamingContent = ref('')
const streamingCitations = ref<AiCitation[]>([])
const streamingMessageId = ref<number | null>(null)
const error = ref('')
const actionBusy = ref(false)
const dialogueRef = ref<HTMLElement | null>(null)
const position = reactive({
  x: 24,
  y: 96,
})
const dragging = ref(false)

const dialogMode = ref<'rename' | 'delete' | 'clear' | null>(null)
const dialogSession = ref<AiChatSession | null>(null)
const dialogTitleInput = ref('')

let dragOffsetX = 0
let dragOffsetY = 0

const normalizeTime = (value?: string | null) => {
  if (!value) {
    return 0
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const panelStyle = computed(() => ({
  right: maximized.value ? '16px' : `${position.x}px`,
  bottom: maximized.value ? '16px' : `${position.y}px`,
}))

const placeholder = computed(() =>
  loginType.value === 'operator'
    ? '例如：这家店最近适合推什么活动？游客常问哪些问题？'
    : '例如：这家农家乐适合亲子吗？退款规则是什么？',
)

const panelClasses = computed(() => ({
  maximized: maximized.value,
}))

const visibleSessions = computed(() =>
  [...sessions.value]
    .filter((item) => item.scene === currentScene.value)
    .filter((item) => props.farmStayId == null || item.farmStayId == null || item.farmStayId === props.farmStayId)
    .sort((a, b) => normalizeTime(b.lastMessageAt ?? b.createdAt) - normalizeTime(a.lastMessageAt ?? a.createdAt)),
)

const dialogTitle = computed(() => {
  switch (dialogMode.value) {
    case 'rename':
      return '重命名会话'
    case 'delete':
      return '删除会话'
    case 'clear':
      return '清空会话'
    default:
      return ''
  }
})

const dialogDescription = computed(() => {
  const name = dialogSession.value?.title || (dialogSession.value ? `会话 #${dialogSession.value.sessionId}` : '')
  switch (dialogMode.value) {
    case 'rename':
      return '输入新的会话标题。'
    case 'delete':
      return `确认删除“${name}”吗？`
    case 'clear':
      return '确认清空当前 AI 助手的全部会话吗？'
    default:
      return ''
  }
})

const dialogConfirmText = computed(() => {
  switch (dialogMode.value) {
    case 'rename':
      return '保存'
    case 'delete':
      return '删除'
    case 'clear':
      return '清空'
    default:
      return '确认'
  }
})

const formatSessionTime = (value?: string | null) => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const syncSessionEntry = (entry: AiChatSession) => {
  const next = [...sessions.value]
  const index = next.findIndex((item) => item.sessionId === entry.sessionId)
  if (index >= 0) {
    next[index] = { ...next[index], ...entry }
  } else {
    next.unshift(entry)
  }
  sessions.value = next
}

const buildDraftTitle = (text: string) => {
  const normalized = text.trim().replace(/\s+/g, ' ')
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized
}

const scrollToLatestMessage = async () => {
  await nextTick()
  if (!dialogueRef.value) {
    return
  }
  dialogueRef.value.scrollTop = dialogueRef.value.scrollHeight
}

const clampPosition = () => {
  if (typeof window === 'undefined' || maximized.value) {
    return
  }
  const maxRight = expanded.value ? window.innerWidth - 960 : window.innerWidth - 180
  const maxBottom = expanded.value ? window.innerHeight - 700 : window.innerHeight - 72
  position.x = Math.min(Math.max(position.x, 16), Math.max(maxRight, 16))
  position.y = Math.min(Math.max(position.y, 16), Math.max(maxBottom, 16))
}

const onDragMove = (event: MouseEvent) => {
  if (!dragging.value || typeof window === 'undefined' || maximized.value) {
    return
  }
  position.x = window.innerWidth - event.clientX - dragOffsetX
  position.y = window.innerHeight - event.clientY - dragOffsetY
  clampPosition()
}

const stopDrag = () => {
  dragging.value = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', stopDrag)
}

const startDrag = (event: MouseEvent) => {
  if (typeof window === 'undefined' || maximized.value) {
    return
  }
  dragging.value = true
  dragOffsetX = window.innerWidth - event.clientX - position.x
  dragOffsetY = window.innerHeight - event.clientY - position.y
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', stopDrag)
}

const closeActionDialog = () => {
  if (actionBusy.value) {
    return
  }
  dialogMode.value = null
  dialogSession.value = null
  dialogTitleInput.value = ''
}

const openRenameDialog = (target: AiChatSession) => {
  dialogMode.value = 'rename'
  dialogSession.value = target
  dialogTitleInput.value = target.title || ''
}

const openDeleteDialog = (target: AiChatSession) => {
  dialogMode.value = 'delete'
  dialogSession.value = target
  dialogTitleInput.value = ''
}

const openClearDialog = () => {
  dialogMode.value = 'clear'
  dialogSession.value = null
  dialogTitleInput.value = ''
}

const ensureSession = async () => {
  if (session.value) {
    return session.value
  }

  const created = (await apiAiCreateSession({
    farmStayId: props.farmStayId ?? undefined,
    scene: currentScene.value,
  })) as AiChatSession

  syncSessionEntry(created)
  session.value = created
  messages.value = []
  return created
}

const createFreshSession = async () => {
  loading.value = true
  error.value = ''
  try {
    const created = (await apiAiCreateSession({
      farmStayId: props.farmStayId ?? undefined,
      scene: currentScene.value,
    })) as AiChatSession
    session.value = created
    messages.value = []
    syncSessionEntry(created)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新建会话失败'
  } finally {
    loading.value = false
  }
}

const confirmActionDialog = async () => {
  if (!dialogMode.value) {
    return
  }

  actionBusy.value = true
  try {
    if (dialogMode.value === 'rename') {
      const target = dialogSession.value
      const trimmed = dialogTitleInput.value.trim()
      if (!target) {
        return
      }
      if (!trimmed) {
        error.value = '会话标题不能为空'
        return
      }
      const updated = (await apiAiUpdateSession(target.sessionId, { title: trimmed })) as AiChatSession
      syncSessionEntry(updated)
      if (session.value?.sessionId === target.sessionId) {
        session.value = { ...session.value, ...updated }
      }
      closeActionDialog()
      return
    }

    if (dialogMode.value === 'delete') {
      const target = dialogSession.value
      if (!target) {
        return
      }
      await apiAiDeleteSession(target.sessionId)
      sessions.value = sessions.value.filter((item) => item.sessionId !== target.sessionId)
      if (session.value?.sessionId === target.sessionId) {
        session.value = null
        messages.value = []
        if (visibleSessions.value.length > 0) {
          await selectSession(visibleSessions.value[0])
        }
      }
      closeActionDialog()
      return
    }

    await apiAiClearSessions()
    sessions.value = []
    session.value = null
    messages.value = []
    streaming.value = false
    streamingMessageId.value = null
    closeActionDialog()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '会话操作失败'
  } finally {
    actionBusy.value = false
  }
}

const findStreamingAssistantIndex = () => {
  if (streamingMessageId.value != null) {
    const exactIndex = messages.value.findIndex((message) => message.messageId === streamingMessageId.value)
    if (exactIndex >= 0) {
      return exactIndex
    }
  }

  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    if (messages.value[index].role === 'assistant') {
      return index
    }
  }

  return -1
}

const loadMessages = async (sessionId = session.value?.sessionId) => {
  if (!sessionId) {
    messages.value = []
    await scrollToLatestMessage()
    return
  }

  loading.value = true
  error.value = ''
  try {
    messages.value = (await apiAiListMessages(sessionId)) as AiChatMessage[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'AI 对话加载失败'
  } finally {
    loading.value = false
    await scrollToLatestMessage()
  }
}

const selectSession = async (target: AiChatSession) => {
  session.value = target
  streaming.value = false
  streamingMessageId.value = null
  streamingContent.value = ''
  streamingCitations.value = []
  await loadMessages(target.sessionId)
}

const loadSessions = async () => {
  loadingSessions.value = true
  error.value = ''
  try {
    sessions.value = (await apiAiListSessions()) as AiChatSession[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '会话列表加载失败'
  } finally {
    loadingSessions.value = false
  }
}

const initializeAssistant = async () => {
  await loadSessions()

  const currentSessionId = session.value?.sessionId
  const matchedCurrent = currentSessionId
    ? visibleSessions.value.find((item) => item.sessionId === currentSessionId)
    : undefined
  if (matchedCurrent) {
    await selectSession(matchedCurrent)
    return
  }

  if (visibleSessions.value.length > 0) {
    await selectSession(visibleSessions.value[0])
    return
  }

  session.value = null
  messages.value = []
}

const toggleExpanded = async () => {
  expanded.value = !expanded.value
  if (!expanded.value) {
    maximized.value = false
    closeActionDialog()
    return
  }

  clampPosition()
  await initializeAssistant()
}

const toggleMaximized = () => {
  maximized.value = !maximized.value
  if (!maximized.value) {
    clampPosition()
  }
}

const submitQuestion = async () => {
  if (!question.value.trim()) {
    error.value = '请输入问题'
    return
  }

  sending.value = true
  streaming.value = true
  streamingContent.value = ''
  streamingCitations.value = []
  error.value = ''

  const userQuestion = question.value.trim()
  question.value = ''

  const userMsg: AiChatMessage = {
    messageId: Date.now(),
    role: 'user',
    content: userQuestion,
    createdAt: new Date().toISOString(),
    citations: [],
  }

  const assistantMsg: AiChatMessage = {
    messageId: Date.now() + 1,
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    citations: [],
  }

  messages.value = [...messages.value, userMsg, assistantMsg]
  streamingMessageId.value = assistantMsg.messageId

  try {
    const current = await ensureSession()

    syncSessionEntry({
      ...current,
      title: current.title || buildDraftTitle(userQuestion),
      lastMessageAt: new Date().toISOString(),
    })

    await apiAiStreamMessage(
      current.sessionId,
      { question: userQuestion },
      (chunk) => {
        streamingContent.value += chunk
        const assistantIdx = findStreamingAssistantIndex()
        if (assistantIdx >= 0) {
          messages.value[assistantIdx].content = streamingContent.value
          messages.value = [...messages.value]
        }
        void scrollToLatestMessage()
      },
      (meta) => {
        const assistantIdx = findStreamingAssistantIndex()
        if (assistantIdx >= 0) {
          messages.value[assistantIdx].messageId = meta.messageId
          streamingMessageId.value = meta.messageId
          messages.value = [...messages.value]
        }
      },
      (citation) => {
        streamingCitations.value.push(citation)
        const assistantIdx = findStreamingAssistantIndex()
        if (assistantIdx >= 0) {
          messages.value[assistantIdx].citations = [...streamingCitations.value]
          messages.value = [...messages.value]
        }
        void scrollToLatestMessage()
      },
      async () => {
        streaming.value = false
        streamingMessageId.value = null
        await loadSessions()
        const refreshed = visibleSessions.value.find((item) => item.sessionId === current.sessionId)
        if (refreshed) {
          syncSessionEntry(refreshed)
          session.value = refreshed
        }
        await scrollToLatestMessage()
      },
      (errMsg) => {
        streaming.value = false
        error.value = errMsg || '流式响应中断'
      },
    )
  } catch (err) {
    streaming.value = false
    error.value = err instanceof Error ? err.message : '发送失败'
  } finally {
    sending.value = false
  }
}

watch(
  () => [props.farmStayId, currentScene.value],
  () => {
    session.value = null
    sessions.value = []
    messages.value = []
    streaming.value = false
    streamingMessageId.value = null
    closeActionDialog()
  },
)

watch(
  () => [expanded.value, maximized.value],
  () => {
    if (expanded.value) {
      void scrollToLatestMessage()
    }
  },
)

watch(
  () => [messages.value.length, streamingContent.value, expanded.value],
  ([, , isExpanded]) => {
    if (isExpanded) {
      void scrollToLatestMessage()
    }
  },
)

onMounted(() => {
  clampPosition()
  window.addEventListener('resize', clampPosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', clampPosition)
  stopDrag()
})
</script>

<template>
  <Teleport to="body">
    <div class="assistant-wrap" :style="panelStyle">
      <transition name="assistant-panel">
        <section v-if="expanded" class="assistant-panel surface-strong" :class="panelClasses">
          <header class="assistant-header" @mousedown.prevent="startDrag">
            <div>
              <span class="badge">AI 助手</span>
              <h3>旅途小助手</h3>
            </div>
            <div class="header-actions">
              <button class="icon-btn" type="button" @click.stop="toggleMaximized">
                {{ maximized ? '还原' : '放大' }}
              </button>
              <button class="icon-btn" type="button" @click.stop="toggleExpanded">收起</button>
            </div>
          </header>

          <div class="assistant-shell">
            <aside class="session-sidebar">
              <div class="session-sidebar-head">
                <div>
                  <div class="sidebar-title">历史会话</div>
                  <div class="sidebar-meta">{{ loadingSessions ? '加载中...' : `${visibleSessions.length} 个会话` }}</div>
                </div>
                <div class="sidebar-actions">
                  <button class="mini-btn strong" type="button" @click="createFreshSession">新会话</button>
                  <button class="mini-btn" type="button" @click="openClearDialog">清空</button>
                </div>
              </div>

              <div class="session-list">
                <div
                  v-for="item in visibleSessions"
                  :key="item.sessionId"
                  class="session-item"
                  :class="{ active: item.sessionId === session?.sessionId }"
                >
                  <button class="session-main" type="button" @click="selectSession(item)">
                    <span class="session-item-title">{{ item.title || `会话 #${item.sessionId}` }}</span>
                    <span class="session-item-time">{{ formatSessionTime(item.lastMessageAt || item.createdAt) }}</span>
                  </button>
                  <div class="session-item-actions">
                    <button class="text-btn" type="button" @click="openRenameDialog(item)">重命名</button>
                    <button class="text-btn danger" type="button" @click="openDeleteDialog(item)">删除</button>
                  </div>
                </div>

                <div v-if="!loadingSessions && !visibleSessions.length" class="session-empty">
                  暂无历史会话
                </div>
              </div>
            </aside>

            <div class="chat-pane">
              <div class="assistant-subtitle">
                <span>对话模式</span>
                <span>{{ loginType === 'operator' ? '经营辅助' : '游客咨询' }}</span>
              </div>

              <div ref="dialogueRef" class="assistant-dialogue">
                <div v-if="loading" class="status">正在同步对话...</div>
                <div v-else-if="!messages.length" class="empty-dialogue">
                  <strong>现在可以直接提问</strong>
                  <p class="muted">支持规则咨询、房型问答、活动信息和经营辅助。</p>
                </div>
                <article
                  v-for="message in messages"
                  :key="message.messageId"
                  class="bubble"
                  :class="message.role === 'assistant' ? 'assistant' : 'user'"
                >
                  <span class="bubble-role">{{ message.role === 'assistant' ? 'AI' : '你' }}</span>
                  <p>
                    {{ message.content }}<span
                      v-if="streaming && message.messageId === streamingMessageId"
                      class="typing-cursor"
                    >▊</span>
                  </p>
                  <div v-if="message.citations?.length" class="citation-row">
                    <span
                      v-for="citation in message.citations"
                      :key="`${message.messageId}-${citation.sourceType}-${citation.sourceId}`"
                    >
                      {{ citation.sourceType }} · {{ citation.snippet }}
                    </span>
                  </div>
                  <p v-if="message.refuseReason" class="muted">拒答原因：{{ message.refuseReason }}</p>
                  <p v-if="message.fallback" class="muted">当前回答为降级结果</p>
                </article>
              </div>

              <form class="assistant-form" @submit.prevent="submitQuestion">
                <textarea
                  v-model="question"
                  class="textarea"
                  :placeholder="placeholder"
                />
                <div class="assistant-actions">
                  <span class="muted">{{ maximized ? '已放大显示，可查看完整历史' : '拖拽顶部可移动位置' }}</span>
                  <button class="btn btn-primary" type="submit" :disabled="sending">
                    {{ sending ? '发送中...' : '发送' }}
                  </button>
                </div>
              </form>

              <div v-if="error" class="status error">{{ error }}</div>
            </div>
          </div>

          <div v-if="dialogMode" class="dialog-mask" @click.self="closeActionDialog">
            <div class="dialog-card">
              <h4>{{ dialogTitle }}</h4>
              <p class="dialog-copy">{{ dialogDescription }}</p>
              <input
                v-if="dialogMode === 'rename'"
                v-model="dialogTitleInput"
                class="dialog-input"
                maxlength="40"
                placeholder="请输入会话标题"
              />
              <div class="dialog-actions">
                <button class="mini-btn" type="button" :disabled="actionBusy" @click="closeActionDialog">取消</button>
                <button class="mini-btn strong" type="button" :disabled="actionBusy" @click="confirmActionDialog">
                  {{ actionBusy ? '处理中...' : dialogConfirmText }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </transition>

      <button
        v-if="!expanded"
        class="assistant-launcher"
        type="button"
        @mousedown.prevent="startDrag"
        @click="toggleExpanded"
      >
        <span class="launcher-mark">AI</span>
        <span class="launcher-text">旅途小助手</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.assistant-wrap {
  position: fixed;
  z-index: 50;
}

.assistant-launcher {
  border: 0;
  border-radius: 999px;
  padding: 12px 16px 12px 12px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: grab;
  color: #fff;
  background: linear-gradient(135deg, #1f3c2a 0%, #35684a 55%, #c47a33 100%);
  box-shadow: 0 20px 36px rgba(27, 45, 33, 0.28);
}

.launcher-mark {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  font-weight: 800;
}

.launcher-text {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.assistant-panel {
  position: relative;
  width: min(920px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 32px));
  padding: 14px;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(20, 33, 25, 0.24);
  display: grid;
  gap: 12px;
  background:
    radial-gradient(circle at top right, rgba(196, 122, 51, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 244, 236, 0.98) 100%);
}

.assistant-panel.maximized {
  width: min(1240px, calc(100vw - 32px));
  height: calc(100vh - 32px);
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  cursor: grab;
  user-select: none;
}

.assistant-header h3 {
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 24px;
  margin-top: 6px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.assistant-shell {
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
}

.session-sidebar {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  border: 1px solid rgba(47, 106, 73, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  padding: 12px;
}

.session-sidebar-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-strong);
}

.sidebar-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-soft);
}

.sidebar-actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.session-list {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 6px;
}

.session-item {
  border: 1px solid rgba(47, 106, 73, 0.12);
  border-radius: 12px;
  background: #fff;
  height: 58px;
  padding: 6px 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.session-item.active {
  border-color: rgba(47, 106, 73, 0.42);
  background: rgba(233, 243, 234, 0.95);
}

.session-main {
  border: 0;
  background: transparent;
  padding: 0;
  display: grid;
  gap: 2px;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
}

.session-item-title {
  color: var(--ink-strong);
  font-weight: 600;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item-time {
  font-size: 10px;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.text-btn {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 10px;
  color: var(--brand);
  cursor: pointer;
  line-height: 1;
}

.text-btn.danger {
  color: #b1432f;
}

.session-empty {
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  padding: 14px;
  color: var(--ink-soft);
  font-size: 13px;
}

.chat-pane {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 12px;
}

.icon-btn {
  border: 1px solid var(--line-strong);
  background: #fff;
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
}

.assistant-subtitle {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--ink-soft);
}

.assistant-dialogue {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding-right: 4px;
}

.empty-dialogue {
  border: 1px dashed var(--line-strong);
  border-radius: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 6px;
}

.bubble {
  display: grid;
  gap: 8px;
  border-radius: 18px;
  padding: 12px;
}

.bubble.user {
  background: #fff;
  border: 1px solid var(--line);
}

.bubble.assistant {
  background: linear-gradient(180deg, rgba(233, 243, 234, 1) 0%, rgba(255, 255, 255, 1) 100%);
  border: 1px solid rgba(47, 106, 73, 0.22);
}

.bubble-role {
  font-size: 12px;
  color: var(--ink-soft);
  font-weight: 700;
}

.bubble p {
  line-height: 1.7;
  white-space: pre-wrap;
}

.typing-cursor {
  display: inline-block;
  animation: blink 0.8s infinite;
  color: var(--brand);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.citation-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.citation-row span {
  font-size: 12px;
  color: var(--brand);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(47, 106, 73, 0.08);
}

.mini-btn {
  border: 1px solid var(--line-strong);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--ink);
}

.mini-btn.strong,
.mini-btn.active {
  background: var(--brand);
  color: #fff;
  border-color: transparent;
}

.sidebar-actions :deep(.mini-btn) {
  padding: 5px 8px;
  font-size: 11px;
  line-height: 1;
}

.assistant-form {
  display: grid;
  gap: 10px;
}

.assistant-form .textarea {
  min-height: 104px;
}

.assistant-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.dialog-mask {
  position: absolute;
  inset: 0;
  background: rgba(25, 33, 28, 0.28);
  display: grid;
  place-items: center;
  border-radius: 24px;
}

.dialog-card {
  width: min(420px, calc(100% - 32px));
  background: #fffdf9;
  border-radius: 20px;
  padding: 18px;
  display: grid;
  gap: 12px;
  box-shadow: 0 24px 48px rgba(20, 33, 25, 0.2);
}

.dialog-card h4 {
  font-size: 18px;
  color: var(--ink-strong);
}

.dialog-copy {
  color: var(--ink-soft);
  line-height: 1.6;
}

.dialog-input {
  width: 100%;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: all 0.18s ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 900px) {
  .assistant-panel,
  .assistant-panel.maximized {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }

  .assistant-shell {
    grid-template-columns: 1fr;
  }

  .session-sidebar {
    max-height: 220px;
  }
}

@media (max-width: 640px) {
  .assistant-actions,
  .session-sidebar-head,
  .assistant-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions,
  .sidebar-actions,
  .dialog-actions {
    width: 100%;
  }
}
</style>
