<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiRefundBooking } from '../services/api'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

const unpaid = ref<Order[]>([])
const paid = ref<Order[]>([])
const highlightOrderId = ref<number | null>(null)
const unpaidExpanded = ref(false)
const paidExpanded = ref(false)
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })
const router = useRouter()
const route = useRoute()

const visibleUnpaid = computed(() => (unpaidExpanded.value ? unpaid.value : unpaid.value.slice(0, 3)))
const visiblePaid = computed(() => (paidExpanded.value ? paid.value : paid.value.slice(0, 3)))

const orderGroups = computed(() => [
  {
    key: 'created',
    label: '待处理',
    hint: '还未完成支付或已取消的订单',
    orders: unpaid.value,
    visibleOrders: visibleUnpaid.value,
    expanded: unpaidExpanded.value,
    accent: 'sage',
  },
  {
    key: 'finished',
    label: '已完成',
    hint: '已支付、已评价、已退款的旅行账单',
    orders: paid.value,
    visibleOrders: visiblePaid.value,
    expanded: paidExpanded.value,
    accent: 'amber',
  },
])

const setFlash = (message: string, type: 'success' | 'error' = 'success') => {
  flash.message = message
  flash.type = type
  if (message) {
    setTimeout(() => {
      flash.message = ''
      flash.type = ''
    }, 4000)
  }
}

const formatCurrency = (value?: number | null) => `¥${value ?? '-'}`

const formatDate = (value?: string | null) => (value ? value.slice(0, 10) : '-')

const getStatusMeta = (status?: string) => {
  switch (status) {
    case 'CREATED':
      return { label: '待支付', tone: 'pending' }
    case 'PAID':
      return { label: '已支付', tone: 'paid' }
    case 'REFUNDED':
      return { label: '已退款', tone: 'refunded' }
    case 'CANCELLED':
      return { label: '已取消', tone: 'cancelled' }
    default:
      return { label: status || '未知状态', tone: 'neutral' }
  }
}

const loadOrders = async () => {
  try {
    const list = (await apiMyOrders()) as Order[]
    unpaid.value = list.filter((o) => o.status === 'CREATED' || o.status === 'CANCELLED')
    paid.value = list.filter((o) => o.status === 'PAID' || o.status === 'REFUNDED')

    const queryOrderId = Number(route.query.orderId)
    if (!Number.isNaN(queryOrderId) && queryOrderId > 0) {
      highlightOrderId.value = queryOrderId
      await nextTick()
      document.getElementById(`order-${queryOrderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        highlightOrderId.value = null
      }, 3500)
    }
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '游客订单加载失败', 'error')
  }
}

const toggleGroup = (key: string) => {
  if (key === 'created') {
    unpaidExpanded.value = !unpaidExpanded.value
    return
  }
  paidExpanded.value = !paidExpanded.value
}

const openOrder = (orderId: number) => {
  router.push(`/orders/${orderId}`)
}

const goPay = (orderId: number) => {
  router.push(`/pay/${orderId}`)
}

const goReview = (orderId: number) => {
  router.push(`/orders/${orderId}/review`)
}

const requestRefund = async (orderId: number) => {
  try {
    await apiRefundBooking(orderId)
    await loadOrders()
    setFlash('退款已退回余额')
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '退款失败', 'error')
  }
}

onMounted(loadOrders)
</script>

<template>
  <main class="page-shell order-center-page">
    <section class="surface-strong order-stage">
      <header class="stage-hero">
        <div class="hero-copy">
          <p class="eyebrow">Travel Ledger</p>
          <h1 class="section-title">我的订单</h1>
          <p class="hero-text">默认每组只展示三条订单，避免列表无限拉长，需要时再手动展开查看更多。</p>
        </div>

        <div class="hero-actions">
          <div class="hero-stat">
            <span>待处理</span>
            <strong>{{ unpaid.length }}</strong>
          </div>
          <div class="hero-stat">
            <span>已完成</span>
            <strong>{{ paid.length }}</strong>
          </div>
          <button class="btn btn-secondary hero-refresh" @click="loadOrders">刷新账单</button>
        </div>
      </header>

      <section v-for="group in orderGroups" :key="group.key" class="order-block" :class="`accent-${group.accent}`">
        <header class="block-head">
          <div>
            <p class="block-kicker">{{ group.label }}</p>
            <h2>{{ group.label }}订单</h2>
          </div>
          <div class="block-actions">
            <p class="muted">{{ group.hint }}</p>
            <button
              v-if="group.orders.length > 3"
              class="btn btn-secondary list-toggle"
              @click="toggleGroup(group.key)"
            >
              {{ group.expanded ? '收起' : `查看更多（${group.orders.length}）` }}
            </button>
          </div>
        </header>

        <div v-if="!group.orders.length" class="empty-state">
          <strong>当前没有{{ group.label }}订单</strong>
          <p>当你在景区、民宿和乡野活动之间产生新的预订，这里会形成一张更完整的旅行账单。</p>
        </div>

        <div v-else class="order-wall">
          <article
            v-for="o in group.visibleOrders"
            :id="`order-${o.id}`"
            :key="o.id"
            class="order-ticket"
            :class="[getStatusMeta(o.status).tone, { highlight: o.id === highlightOrderId }]"
            @click="openOrder(o.id)"
          >
            <div class="ticket-ribbon">
              <span class="status-pill" :class="getStatusMeta(o.status).tone">{{ getStatusMeta(o.status).label }}</span>
              <span class="ticket-no">#{{ o.orderNo || o.id }}</span>
            </div>

            <div class="ticket-body">
              <div class="ticket-main">
                <div class="ticket-title">
                  <strong>{{ o.farmStay?.name || '未知农家乐' }}</strong>
                  <span>{{ o.room?.name || '未知房型' }}</span>
                </div>

                <div class="ticket-route">
                  <div>
                    <label>入住</label>
                    <strong>{{ formatDate(o.checkInDate) }}</strong>
                  </div>
                  <i />
                  <div>
                    <label>离店</label>
                    <strong>{{ formatDate(o.checkOutDate) }}</strong>
                  </div>
                </div>

                <div class="ticket-meta">
                  <span>{{ o.farmStay?.city || '乡野目的地待确认' }}</span>
                  <span>{{ o.reviewed ? '已完成评价' : '待评价' }}</span>
                  <span>{{ o.paymentChannel === 'BALANCE' ? '余额支付' : '待支付' }}</span>
                </div>
              </div>

              <div class="ticket-side">
                <div class="ticket-amount">
                  <small>总金额</small>
                  <strong>{{ formatCurrency(o.totalAmount) }}</strong>
                </div>

                <div class="ticket-actions">
                  <button v-if="o.status === 'CREATED'" class="btn btn-primary ticket-btn" @click.stop="goPay(o.id)">立即支付</button>
                  <button
                    v-if="o.status === 'PAID' || o.reviewed"
                    class="btn btn-secondary ticket-btn"
                    @click.stop="goReview(o.id)"
                  >
                    {{ o.reviewed ? '查看评价' : '去评价' }}
                  </button>
                  <button
                    v-if="o.status === 'PAID' || o.status === 'REFUNDED'"
                    class="btn btn-secondary ticket-btn"
                    :disabled="o.status === 'REFUNDED'"
                    @click.stop="requestRefund(o.id)"
                  >
                    {{ o.status === 'REFUNDED' ? '已退回余额' : '申请退款' }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div v-if="flash.message" class="status" :class="flash.type === 'error' ? 'error' : ''">{{ flash.message }}</div>
    </section>
  </main>
</template>

<style scoped>
.order-center-page {
  padding-top: 30px;
}

.order-stage {
  position: relative;
  overflow: hidden;
  padding: 28px;
  display: grid;
  gap: 22px;
  background:
    radial-gradient(420px 220px at 0% 0%, rgba(193, 119, 46, 0.12), transparent 70%),
    radial-gradient(420px 260px at 100% 0%, rgba(47, 106, 73, 0.12), transparent 72%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 239, 0.96));
}

.order-stage::before {
  content: '';
  position: absolute;
  inset: 18px;
  border: 1px dashed rgba(47, 67, 54, 0.14);
  border-radius: 28px;
  pointer-events: none;
}

.stage-hero {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto;
  gap: 20px;
  align-items: end;
}

.eyebrow {
  margin-bottom: 10px;
  color: var(--brand-2);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}

.hero-copy h1 {
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1;
}

.hero-text {
  margin-top: 14px;
  max-width: 760px;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  align-items: stretch;
}

.hero-stat {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(47, 67, 54, 0.14);
  background: rgba(255, 255, 255, 0.78);
  display: grid;
  gap: 6px;
  box-shadow: 0 18px 38px rgba(34, 49, 37, 0.08);
}

.hero-stat span {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-stat strong {
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 28px;
}

.hero-refresh {
  min-height: 100%;
  padding-inline: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.86);
}

.order-block {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 28px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background: rgba(255, 255, 255, 0.76);
}

.accent-sage {
  box-shadow: inset 0 1px 0 rgba(47, 106, 73, 0.06);
}

.accent-amber {
  box-shadow: inset 0 1px 0 rgba(193, 119, 46, 0.08);
}

.block-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
}

.block-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}

.block-kicker {
  margin-bottom: 6px;
  color: var(--brand-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.block-head h2 {
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 28px;
}

.list-toggle {
  min-height: 38px;
}

.empty-state {
  padding: 26px;
  border-radius: 24px;
  border: 1px dashed rgba(47, 67, 54, 0.18);
  background: linear-gradient(135deg, rgba(240, 232, 215, 0.48), rgba(255, 255, 255, 0.94));
  display: grid;
  gap: 8px;
}

.empty-state strong {
  color: var(--ink-strong);
  font-size: 18px;
}

.empty-state p {
  color: var(--ink-soft);
  line-height: 1.7;
}

.order-wall {
  display: grid;
  gap: 14px;
}

.order-ticket {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 243, 234, 0.96)),
    #fff;
  box-shadow: 0 16px 36px rgba(34, 49, 37, 0.08);
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.order-ticket::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 8px;
  background: linear-gradient(180deg, rgba(47, 106, 73, 0.88), rgba(193, 119, 46, 0.88));
}

.order-ticket:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 48px rgba(34, 49, 37, 0.14);
  border-color: rgba(47, 106, 73, 0.24);
}

.order-ticket.highlight {
  border-color: rgba(47, 106, 73, 0.32);
  box-shadow: 0 0 0 5px rgba(47, 106, 73, 0.12), 0 22px 48px rgba(34, 49, 37, 0.12);
}

.order-ticket.cancelled::after {
  background: linear-gradient(180deg, rgba(116, 123, 118, 0.76), rgba(84, 93, 87, 0.84));
}

.order-ticket.refunded::after {
  background: linear-gradient(180deg, rgba(193, 119, 46, 0.82), rgba(166, 98, 33, 0.88));
}

.ticket-ribbon {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 18px 20px 0 28px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-pill.pending {
  background: rgba(193, 119, 46, 0.12);
  color: var(--brand-2);
}

.status-pill.paid {
  background: rgba(47, 106, 73, 0.12);
  color: var(--brand);
}

.status-pill.refunded {
  background: rgba(193, 119, 46, 0.16);
  color: #9a6125;
}

.status-pill.cancelled,
.status-pill.neutral {
  background: rgba(47, 67, 54, 0.08);
  color: var(--ink-soft);
}

.ticket-no {
  color: rgba(29, 43, 31, 0.55);
  font-size: 12px;
  letter-spacing: 0.14em;
}

.ticket-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
  padding: 14px 20px 20px 28px;
}

.ticket-main {
  display: grid;
  gap: 16px;
}

.ticket-title {
  display: grid;
  gap: 6px;
}

.ticket-title strong {
  color: var(--ink-strong);
  font-size: 26px;
  line-height: 1.1;
}

.ticket-title span {
  color: var(--ink-soft);
  font-size: 14px;
}

.ticket-route {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.ticket-route label {
  display: block;
  margin-bottom: 8px;
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ticket-route strong {
  color: var(--ink-strong);
  font-size: 20px;
}

.ticket-route i {
  position: relative;
  display: block;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(47, 67, 54, 0.36), transparent);
}

.ticket-route i::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 6px;
  width: 8px;
  height: 8px;
  border-top: 2px solid rgba(47, 67, 54, 0.52);
  border-right: 2px solid rgba(47, 67, 54, 0.52);
  transform: translateY(-50%) rotate(45deg);
}

.ticket-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ticket-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(47, 67, 54, 0.05);
  color: var(--ink-soft);
  font-size: 13px;
}

.ticket-side {
  display: grid;
  align-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(250, 248, 240, 0.95);
  border: 1px dashed rgba(47, 67, 54, 0.16);
}

.ticket-amount {
  display: grid;
  gap: 4px;
}

.ticket-amount small {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ticket-amount strong {
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 32px;
  line-height: 1;
}

.ticket-actions {
  display: grid;
  gap: 10px;
}

.ticket-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 18px;
  justify-content: center;
}

@media (max-width: 960px) {
  .stage-hero,
  .block-head,
  .ticket-body {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .block-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .order-center-page {
    width: min(1220px, 100% - 24px);
  }

  .order-stage {
    padding: 18px;
  }

  .block-head {
    align-items: start;
  }

  .ticket-ribbon,
  .ticket-body {
    padding-left: 22px;
  }

  .ticket-title strong {
    font-size: 22px;
  }

  .ticket-route {
    grid-template-columns: 1fr;
  }

  .ticket-route i {
    display: none;
  }
}
</style>
