<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearAuthPayload, persistAuthPayload, useAuthState } from '../composables/auth'
import {
  apiAccountBalance,
  apiAccountBalanceFlows,
  apiCreateRecharge,
  apiCurrentUser,
  apiGetRecharge,
  mergeAuthPayload,
} from '../services/api'
import type { BalanceFlowResponse, RechargeResponse } from '../types/account'
import VisitorCenter from './VisitorCenter.vue'
import OperatorCenter from './OperatorCenter.vue'
import OperatorFarmstay from './OperatorFarmstay.vue'
import OperatorInsightPanel from '../components/operator/OperatorInsightPanel.vue'

type TabKey = 'orders' | 'farmstay' | 'insight'

const router = useRouter()
const route = useRoute()
const { payload, isAuthenticated, sync } = useAuthState()
const loginType = computed(() => payload.value?.loginType ?? '')
const activeTab = ref<TabKey>('orders')
const profileLoading = ref(false)
const balanceLoading = ref(false)
const flowExpanded = ref(false)
const balance = ref<number | null>(payload.value?.balance ?? null)
const balanceFlows = ref<BalanceFlowResponse[]>([])
const rechargeOpen = ref(false)
const qrCodeDataUrl = ref('')
const statusMessage = reactive({ message: '', type: '' as 'success' | 'error' | '' })
const rechargeForm = reactive({ amount: '100' })
const rechargeState = reactive({
  loading: false,
  polling: false,
  recharge: null as RechargeResponse | null,
  successVisible: false,
  successBalance: null as number | null,
})

let pollTimer: number | null = null
let successTimer: number | null = null

const menuItems = computed(() => {
  const base = [{ key: 'orders', label: '我的订单', note: '订单、评价与支付记录' }]
  if (loginType.value === 'operator') {
    base.splice(1, 0, { key: 'farmstay', label: '我的农家乐', note: '店铺资料与房型管理' })
    base.push({ key: 'insight', label: '经营建议', note: '评论驱动分析结果' })
  }
  return base
})

const accountRows = computed(() => [
  { label: '账号', value: payload.value?.username || '-' },
  { label: '昵称', value: payload.value?.displayName || '-' },
  { label: '角色', value: payload.value?.loginType || '-' },
])

const canRecharge = computed(() => isAuthenticated.value && loginType.value === 'visitor')
const visibleFlows = computed(() => (flowExpanded.value ? balanceFlows.value : []))

const formatCurrency = (value?: number | null) => `¥${Number(value ?? 0).toFixed(2)}`

const formatTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const flowMeta = (flow: BalanceFlowResponse) => {
  switch (flow.changeType) {
    case 'RECHARGE':
      return { label: '充值入账', tone: 'income' }
    case 'PAY_ORDER':
      return { label: '余额支付', tone: 'expense' }
    case 'REFUND':
      return { label: '退款退回', tone: 'income' }
    default:
      return { label: flow.changeType || '账户变动', tone: 'neutral' }
  }
}

const setStatus = (message: string, type: 'success' | 'error' = 'success') => {
  statusMessage.message = message
  statusMessage.type = type
  if (message) {
    window.setTimeout(() => {
      if (statusMessage.message === message) {
        statusMessage.message = ''
        statusMessage.type = ''
      }
    }, 4000)
  }
}

const stopPolling = () => {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
  rechargeState.polling = false
}

const clearSuccessTimer = () => {
  if (successTimer !== null) {
    window.clearTimeout(successTimer)
    successTimer = null
  }
}

const updateStoredBalance = (nextBalance: number) => {
  if (!payload.value) return
  persistAuthPayload({
    ...payload.value,
    balance: nextBalance,
  })
  sync()
}

const refreshAccountData = async () => {
  if (!isAuthenticated.value) return

  try {
    if (loginType.value === 'visitor') {
      balanceLoading.value = true
      const [balanceResult, flowResult] = await Promise.all([apiAccountBalance(), apiAccountBalanceFlows()])
      balance.value = Number(balanceResult.balance ?? 0)
      balanceFlows.value = flowResult
      updateStoredBalance(balance.value)
    } else {
      balance.value = null
      balanceFlows.value = []
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : '账户余额加载失败', 'error')
  } finally {
    balanceLoading.value = false
  }
}

const refreshProfile = async () => {
  if (!isAuthenticated.value) return
  profileLoading.value = true
  try {
    const latest = mergeAuthPayload(await apiCurrentUser())
    persistAuthPayload(latest)
    sync()
    await refreshAccountData()
  } catch {
    // keep local cache on profile request failure
  } finally {
    profileLoading.value = false
  }
}

const openRecharge = () => {
  rechargeOpen.value = true
  rechargeForm.amount = '100'
  qrCodeDataUrl.value = ''
  rechargeState.recharge = null
  rechargeState.loading = false
  rechargeState.successVisible = false
  rechargeState.successBalance = null
  clearSuccessTimer()
  stopPolling()
}

const closeRecharge = () => {
  rechargeOpen.value = false
  qrCodeDataUrl.value = ''
  rechargeState.recharge = null
  rechargeState.loading = false
  rechargeState.successVisible = false
  rechargeState.successBalance = null
  clearSuccessTimer()
  stopPolling()
}

const syncRechargeStatus = async (rechargeNo: string) => {
  const latest = await apiGetRecharge(rechargeNo)
  rechargeState.recharge = latest
  if (latest.status === 'SUCCESS') {
    stopPolling()
    await refreshProfile()
    rechargeState.successVisible = true
    rechargeState.successBalance = balance.value
    setStatus(`充值成功，已到账 ${formatCurrency(latest.amount)}`)
    clearSuccessTimer()
    successTimer = window.setTimeout(() => {
      closeRecharge()
    }, 1600)
  } else if (latest.status === 'FAILED') {
    stopPolling()
    setStatus('充值单已关闭，请重新发起充值', 'error')
  }
}

const startPolling = (rechargeNo: string) => {
  stopPolling()
  rechargeState.polling = true
  pollTimer = window.setInterval(() => {
    syncRechargeStatus(rechargeNo).catch(() => {
      // keep polling
    })
  }, 2500)
}

const submitRecharge = async () => {
  const amount = Number(rechargeForm.amount)
  if (!Number.isFinite(amount) || amount < 0.01) {
    setStatus('充值金额必须大于 0.01 元', 'error')
    return
  }

  rechargeState.loading = true
  try {
    const recharge = await apiCreateRecharge({ amount })
    rechargeState.recharge = recharge
    qrCodeDataUrl.value = recharge.qrCode
      ? await QRCode.toDataURL(recharge.qrCode, {
          margin: 1,
          width: 240,
          color: {
            dark: '#163826',
            light: '#ffffff',
          },
        })
      : ''

    if (recharge.status === 'PENDING') {
      startPolling(recharge.rechargeNo)
    } else if (recharge.status === 'SUCCESS') {
      await refreshProfile()
      rechargeState.successVisible = true
      rechargeState.successBalance = balance.value
      clearSuccessTimer()
      successTimer = window.setTimeout(() => {
        closeRecharge()
      }, 1600)
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : '充值单创建失败', 'error')
  } finally {
    rechargeState.loading = false
  }
}

const setTab = (tab: TabKey) => {
  activeTab.value = tab
  const nextQuery = { ...route.query }
  if (tab === 'orders') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = tab
  }
  router.replace({ name: 'personal', query: nextQuery })
}

const logout = () => {
  clearAuthPayload()
  sync()
  router.push({ name: 'login' })
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'farmstay' && loginType.value === 'operator') {
      activeTab.value = 'farmstay'
    } else if (tab === 'insight' && loginType.value === 'operator') {
      activeTab.value = 'insight'
    } else {
      activeTab.value = 'orders'
    }
  },
  { immediate: true },
)

watch(loginType, (value) => {
  if (value !== 'operator' && (activeTab.value === 'farmstay' || activeTab.value === 'insight')) {
    activeTab.value = 'orders'
  }
})

watch(rechargeOpen, (open) => {
  if (!open) {
    stopPolling()
  }
})

onMounted(refreshProfile)
onBeforeUnmount(() => {
  stopPolling()
  clearSuccessTimer()
})
</script>

<template>
  <main class="personal-shell page-shell">
    <section class="profile-shell surface">
      <header class="profile-head">
        <div class="identity">
          <div class="avatar">{{ (payload?.displayName || payload?.username || '未').slice(0, 1) }}</div>
          <div class="identity-copy">
            <p class="eyebrow">Account Desk</p>
            <h1 class="section-title">{{ payload?.displayName || payload?.username || '未登录用户' }}</h1>
            <p class="muted">保留资料和账户入口，其余无效说明区全部去掉。</p>
          </div>
        </div>

        <div class="quick-actions">
          <button class="btn btn-secondary" @click="router.push('/')">返回首页</button>
          <button class="btn btn-secondary" :disabled="profileLoading" @click="refreshProfile">
            {{ profileLoading ? '刷新中...' : '刷新资料' }}
          </button>
          <button class="btn btn-danger" @click="logout">退出登录</button>
        </div>
      </header>

      <div class="account-strip">
        <div class="account-info">
          <div v-for="item in accountRows" :key="item.label" class="info-row">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div v-if="canRecharge" class="balance-side">
          <div class="balance-copy">
            <span>余额</span>
            <strong>{{ balanceLoading ? '加载中...' : formatCurrency(balance) }}</strong>
          </div>
          <button class="btn btn-primary balance-action" @click="openRecharge">去充值</button>
        </div>
      </div>
    </section>

    <section v-if="!isAuthenticated" class="status error">请先登录后查看个人中心。</section>

    <template v-else>
      <section v-if="canRecharge" class="account-board">
        <article class="surface-strong flow-panel">
          <header class="board-head">
            <div>
              <p class="eyebrow">Balance Flow</p>
              <h2 class="section-title">最近余额动态</h2>
            </div>
            <div class="board-actions">
              <button class="btn btn-secondary" @click="flowExpanded = !flowExpanded">
                {{ flowExpanded ? '收起动态' : `展开动态${balanceFlows.length ? `（${balanceFlows.length}）` : ''}` }}
              </button>
              <button class="btn btn-secondary" :disabled="balanceLoading" @click="refreshAccountData">
                {{ balanceLoading ? '刷新中...' : '刷新余额' }}
              </button>
            </div>
          </header>

          <div v-if="!flowExpanded" class="collapsed-tip">余额动态默认收起，点击展开后再查看最近充值、支付和退款记录。</div>
          <div v-else-if="!visibleFlows.length" class="empty-line">当前还没有余额流水。</div>

          <div v-else class="flow-list">
            <article v-for="flow in visibleFlows" :key="flow.flowNo" class="flow-item">
              <div class="flow-main">
                <span class="flow-type" :class="flowMeta(flow).tone">{{ flowMeta(flow).label }}</span>
                <strong>{{ flow.remark || flow.bizNo }}</strong>
                <p>{{ formatTime(flow.createdAt) }}</p>
              </div>
              <div class="flow-side">
                <em :class="Number(flow.amount) >= 0 ? 'income' : 'expense'">
                  {{ Number(flow.amount) >= 0 ? '+' : '' }}{{ formatCurrency(flow.amount) }}
                </em>
                <span>变动后 {{ formatCurrency(flow.balanceAfter) }}</span>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section class="workspace">
        <aside class="sidebar surface-strong">
          <button
            v-for="item in menuItems"
            :key="item.key"
            class="nav-item"
            :class="{ active: activeTab === item.key }"
            @click="setTab(item.key as TabKey)"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.note }}</span>
          </button>
        </aside>

        <section class="panel">
          <VisitorCenter v-if="loginType === 'visitor' && activeTab === 'orders'" />
          <OperatorCenter v-else-if="loginType === 'operator' && activeTab === 'orders'" />
          <OperatorFarmstay v-else-if="loginType === 'operator' && activeTab === 'farmstay'" />
          <OperatorInsightPanel v-else-if="loginType === 'operator' && activeTab === 'insight'" />
          <section v-else class="status error">当前角色未知，请重新登录。</section>
        </section>
      </section>
    </template>

    <div v-if="statusMessage.message" class="status" :class="statusMessage.type === 'error' ? 'error' : ''">
      {{ statusMessage.message }}
    </div>

    <div v-if="rechargeOpen" class="modal-mask" @click.self="closeRecharge">
      <section class="recharge-modal surface-strong">
        <header class="modal-head">
          <div>
            <p class="eyebrow">Balance Recharge</p>
            <h2 class="section-title">支付宝充值</h2>
          </div>
          <button class="btn btn-secondary" @click="closeRecharge">关闭</button>
        </header>

        <div class="recharge-layout">
          <article class="recharge-form">
            <template v-if="!rechargeState.successVisible">
              <label class="field">
                <span>充值金额</span>
                <input v-model="rechargeForm.amount" class="input amount-input" type="number" min="0.01" step="0.01" placeholder="输入自定义金额" />
              </label>

              <div class="recharge-summary">
                <span>当前余额</span>
                <strong>{{ formatCurrency(balance) }}</strong>
              </div>

              <button class="btn btn-primary submit-btn" :disabled="rechargeState.loading" @click="submitRecharge">
                {{ rechargeState.loading ? '生成中...' : '确认充值' }}
              </button>

              <p class="muted">后端会创建充值单并返回支付宝预下单二维码，前端每 2.5 秒轮询一次支付状态。</p>
            </template>

            <div v-else class="success-panel">
              <span>支付成功</span>
              <strong>{{ formatCurrency(rechargeState.recharge?.amount) }}</strong>
              <p>充值金额已到账，弹层即将自动关闭。</p>
              <em>最新余额 {{ formatCurrency(rechargeState.successBalance) }}</em>
            </div>
          </article>

          <article class="qr-panel">
            <template v-if="rechargeState.successVisible">
              <div class="qr-success">
                <strong>充值完成</strong>
                <p>余额和账户资料已经同步刷新。</p>
              </div>
            </template>
            <template v-else-if="rechargeState.recharge">
              <div class="qr-header">
                <span>充值金额</span>
                <strong>{{ formatCurrency(rechargeState.recharge.amount) }}</strong>
              </div>
              <div class="qr-box">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="充值二维码" />
                <p v-else class="muted">当前充值单未返回二维码，请检查支付配置。</p>
              </div>
              <div class="qr-meta">
                <p>充值单号：{{ rechargeState.recharge.rechargeNo }}</p>
                <p>状态：{{ rechargeState.recharge.status }}</p>
                <p>{{ rechargeState.recharge.payInfo || '请使用支付宝扫码完成支付。' }}</p>
              </div>
            </template>
            <div v-else class="qr-placeholder">
              <strong>生成充值单后，这里会出现二维码。</strong>
              <p>扫码完成后页面会自动感知支付结果并刷新余额。</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.personal-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-shell {
  padding: 22px;
  display: grid;
  gap: 18px;
}

.profile-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #254d35, #3d7a56);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  box-shadow: 0 14px 32px rgba(47, 106, 73, 0.2);
}

.identity-copy {
  display: grid;
  gap: 6px;
}

.eyebrow {
  color: var(--brand-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.account-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 18px 0 10px;
  border-top: 1px solid rgba(47, 67, 54, 0.1);
  border-bottom: 1px solid rgba(47, 67, 54, 0.1);
}

.account-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.info-row,
.balance-copy {
  display: grid;
  gap: 6px;
}

.info-row span,
.balance-copy span,
.recharge-summary span,
.qr-header span {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.info-row strong,
.balance-copy strong {
  color: var(--ink-strong);
  font-size: 18px;
}

.balance-copy strong {
  font-family: var(--font-display);
  font-size: 36px;
}

.balance-side {
  display: flex;
  align-items: center;
  gap: 16px;
}

.balance-action {
  min-height: 46px;
  padding-inline: 22px;
}

.account-board {
  display: grid;
}

.flow-panel {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.board-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.board-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.collapsed-tip,
.empty-line {
  padding: 16px;
  border-radius: 16px;
  background: rgba(247, 244, 236, 0.9);
  color: var(--ink-soft);
}

.flow-list {
  display: grid;
  gap: 10px;
}

.flow-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(47, 67, 54, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 236, 0.92));
}

.flow-main {
  display: grid;
  gap: 5px;
}

.flow-main strong {
  color: var(--ink-strong);
}

.flow-main p,
.flow-side span {
  color: var(--ink-soft);
  font-size: 13px;
}

.flow-type {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  width: fit-content;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.flow-type.income {
  background: rgba(47, 106, 73, 0.12);
  color: var(--brand);
}

.flow-type.expense {
  background: rgba(193, 119, 46, 0.12);
  color: var(--brand-2);
}

.flow-type.neutral {
  background: rgba(47, 67, 54, 0.08);
  color: var(--ink-soft);
}

.flow-side {
  display: grid;
  gap: 5px;
  text-align: right;
}

.flow-side em {
  font-style: normal;
  font-size: 18px;
  font-weight: 700;
}

.flow-side em.income {
  color: var(--brand);
}

.flow-side em.expense {
  color: var(--brand-2);
}

.workspace {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
}

.sidebar {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: fit-content;
}

.nav-item {
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  background: #fff;
  color: var(--ink);
  text-align: left;
  padding: 12px 14px;
  cursor: pointer;
  display: grid;
  gap: 4px;
}

.nav-item strong {
  font-size: 14px;
}

.nav-item span {
  font-size: 12px;
  color: var(--ink-soft);
}

.nav-item.active {
  background: var(--brand);
  color: #fff;
  border-color: transparent;
}

.nav-item.active span {
  color: rgba(255, 255, 255, 0.8);
}

.panel {
  min-width: 0;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(20, 28, 22, 0.34);
  display: grid;
  place-items: center;
  padding: 24px;
}

.recharge-modal {
  width: min(920px, 100%);
  padding: 22px;
  display: grid;
  gap: 18px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.recharge-layout {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
}

.recharge-form,
.qr-panel {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(47, 67, 54, 0.1);
  background: rgba(255, 255, 255, 0.86);
  display: grid;
  gap: 14px;
}

.amount-input {
  min-height: 46px;
}

.recharge-summary {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(247, 244, 236, 0.92);
}

.recharge-summary strong,
.qr-header strong,
.success-panel strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
}

.recharge-summary strong,
.qr-header strong {
  font-size: 32px;
}

.submit-btn {
  min-height: 48px;
}

.qr-panel {
  align-content: start;
}

.success-panel,
.qr-success {
  min-height: 100%;
  display: grid;
  align-content: center;
  gap: 10px;
}

.success-panel span,
.qr-success strong {
  color: var(--brand);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.success-panel strong {
  font-size: 42px;
  line-height: 1;
}

.success-panel p,
.success-panel em,
.qr-success p,
.qr-meta,
.qr-placeholder {
  color: var(--ink-soft);
  line-height: 1.8;
  font-style: normal;
}

.qr-box {
  min-height: 288px;
  border-radius: 22px;
  border: 1px dashed rgba(47, 67, 54, 0.16);
  background: rgba(248, 246, 239, 0.94);
  display: grid;
  place-items: center;
  padding: 18px;
}

.qr-box img {
  width: min(240px, 100%);
  height: auto;
  display: block;
}

.qr-placeholder strong {
  color: var(--ink-strong);
}

@media (max-width: 980px) {
  .workspace,
  .account-strip,
  .recharge-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .account-info {
    grid-template-columns: 1fr;
  }

  .balance-side,
  .flow-item {
    justify-content: space-between;
    grid-template-columns: 1fr;
  }

  .flow-side {
    text-align: left;
  }
}

@media (max-width: 720px) {
  .profile-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .quick-actions {
    justify-content: flex-start;
  }

  .modal-mask {
    padding: 12px;
  }
}
</style>
