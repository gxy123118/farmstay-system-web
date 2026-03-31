<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiRefundBooking } from '../services/api'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)
const error = ref('')
const refunding = ref(false)

const loadOrder = async () => {
  loading.value = true
  error.value = ''

  try {
    const id = Number(route.params.orderId)
    const list = (await apiMyOrders()) as Order[]
    order.value = list.find((item) => item.id === id) || null
    if (!order.value) {
      error.value = '未找到订单'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载订单失败'
  } finally {
    loading.value = false
  }
}

const canRefund = computed(() => order.value?.status === 'PAID')
const canPay = computed(() => order.value?.status === 'CREATED')
const reviewLabel = computed(() => (order.value?.reviewed ? '查看评价' : '去评价'))
const refundLabel = computed(() => (order.value?.status === 'REFUNDED' ? '已退回余额' : '申请退款'))
const canReview = computed(() => order.value?.status === 'PAID' || order.value?.status === 'COMPLETED')
const diningItems = computed(() => order.value?.diningItems ?? [])
const activityItems = computed(() => order.value?.activityItems ?? [])

const formatDate = (value?: string | null) => (value ? value.slice(0, 10) : '-')
const formatCurrency = (value?: number | null) => `¥${value ?? '-'}`

const statusMeta = computed(() => {
  switch (order.value?.status) {
    case 'CREATED':
      return { label: '待支付', tone: 'pending', note: '订单已生成，等待完成支付后生效。' }
    case 'PAID':
      return { label: '已支付', tone: 'paid', note: '订单已生效，可以继续查看详情、评价或申请退款。' }
    case 'COMPLETED':
      return { label: '已完成', tone: 'completed', note: '订单已完成履约并已结算给经营者，当前不可再申请退款。' }
    case 'REFUNDED':
      return { label: '已退款', tone: 'refunded', note: '退款金额已按后端规则退回余额。' }
    case 'CANCELLED':
      return { label: '已取消', tone: 'cancelled', note: '该订单已经取消，不再参与后续流程。' }
    default:
      return { label: order.value?.status || '未知状态', tone: 'neutral', note: '当前状态信息不可用。' }
  }
})

const paymentChannelLabel = computed(() => {
  if (!order.value?.paymentChannel || order.value.paymentChannel === 'UNPAID') {
    return '待支付'
  }
  if (order.value.paymentChannel === 'BALANCE') {
    return '余额支付'
  }
  return order.value.paymentChannel
})

const summaryItems = computed(() => [
  { label: '入住日期', value: formatDate(order.value?.checkInDate) },
  { label: '离店日期', value: formatDate(order.value?.checkOutDate) },
  { label: '支付方式', value: paymentChannelLabel.value },
])

const goReview = () => {
  if (!order.value) return
  router.push(`/orders/${order.value.id}/review`)
}

const goPay = () => {
  if (!order.value) return
  router.push(`/pay/${order.value.id}`)
}

const requestRefund = async () => {
  if (!order.value || !canRefund.value) return
  refunding.value = true
  error.value = ''

  try {
    await apiRefundBooking(order.value.id)
    await loadOrder()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '退款失败'
  } finally {
    refunding.value = false
  }
}

onMounted(loadOrder)
</script>

<template>
  <main class="page-shell detail-page">
    <section class="surface-strong detail-stage">
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>

      <template v-else-if="order">
        <header class="detail-hero">
          <div class="hero-main">
            <p class="eyebrow">Order Detail</p>
            <div class="hero-headline">
              <div>
                <h1 class="section-title">{{ order.farmStay?.name || '旅途订单' }}</h1>
                <p class="hero-subtitle">{{ order.room?.name || '未知房型' }} · {{ order.farmStay?.city || '乡野目的地' }}</p>
              </div>
              <span class="hero-status" :class="statusMeta.tone">{{ statusMeta.label }}</span>
            </div>
            <p class="hero-note">{{ statusMeta.note }}</p>

            <div class="summary-strip">
              <div v-for="item in summaryItems" :key="item.label" class="summary-cell">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <div class="order-no-row">
              <span>订单编号</span>
              <code>{{ order.orderNo || order.id }}</code>
            </div>
          </div>

          <aside class="amount-side">
            <div class="amount-block">
              <span>账单总额</span>
              <strong>{{ formatCurrency(order.totalAmount) }}</strong>
            </div>
            <div class="amount-meta">
              <span>支付方式</span>
              <strong>{{ paymentChannelLabel }}</strong>
            </div>
          </aside>
        </header>

        <section class="detail-grid">
          <article class="detail-card">
            <div class="card-heading">
              <p class="card-kicker">Stay</p>
              <h2>入住信息</h2>
            </div>

            <div class="stay-route">
              <div>
                <span>入住</span>
                <strong>{{ formatDate(order.checkInDate) }}</strong>
              </div>
              <i />
              <div>
                <span>离店</span>
                <strong>{{ formatDate(order.checkOutDate) }}</strong>
              </div>
            </div>

            <div class="stay-meta">
              <div>
                <label>农家乐</label>
                <strong>{{ order.farmStay?.name || '暂无信息' }}</strong>
              </div>
              <div>
                <label>房型</label>
                <strong>{{ order.room?.name || '暂无房型' }}</strong>
              </div>
              <div>
                <label>城市</label>
                <strong>{{ order.farmStay?.city || '-' }}</strong>
              </div>
              <div>
                <label>房价</label>
                <strong>{{ formatCurrency(order.room?.price) }}</strong>
              </div>
            </div>
          </article>

          <article class="detail-card">
            <div class="card-heading">
              <p class="card-kicker">Receipt</p>
              <h2>费用明细</h2>
            </div>

            <div class="receipt-line">
              <span>房费</span>
              <strong>{{ formatCurrency(order.room?.price) }}</strong>
            </div>
            <div class="receipt-line">
              <span>餐饮金额</span>
              <strong>{{ formatCurrency(order.diningAmount ?? 0) }}</strong>
            </div>
            <div class="receipt-line">
              <span>活动金额</span>
              <strong>{{ formatCurrency(order.activityAmount ?? 0) }}</strong>
            </div>
            <div class="receipt-line total">
              <span>总计</span>
              <strong>{{ formatCurrency(order.totalAmount) }}</strong>
            </div>
          </article>

          <article class="detail-card service-card">
            <div class="card-heading">
              <p class="card-kicker">Services</p>
              <h2>餐饮与活动</h2>
            </div>

            <div class="service-section">
              <header>
                <strong>餐饮清单</strong>
                <span>{{ diningItems.length }} 项</span>
              </header>
              <p v-if="!diningItems.length" class="muted">当前没有附加餐饮项目。</p>
              <div v-for="item in diningItems" :key="item.id" class="service-row">
                <div>
                  <strong>{{ item.itemName || '餐饮' }}</strong>
                  <span>x {{ item.quantity ?? 1 }}</span>
                </div>
                <em>{{ formatCurrency(item.price) }}</em>
              </div>
            </div>

            <div class="service-section">
              <header>
                <strong>活动清单</strong>
                <span>{{ activityItems.length }} 项</span>
              </header>
              <p v-if="!activityItems.length" class="muted">当前没有附加活动项目。</p>
              <div v-for="item in activityItems" :key="item.id" class="service-row">
                <div>
                  <strong>{{ item.itemName || '活动' }}</strong>
                  <span>x {{ item.quantity ?? 1 }}</span>
                </div>
                <em>{{ formatCurrency(item.price) }}</em>
              </div>
            </div>
          </article>

          <article class="detail-card control-card">
            <div class="card-heading">
              <p class="card-kicker">Actions</p>
              <h2>订单操作</h2>
            </div>

            <p class="control-note">订单号和金额都降级为辅助信息，主视区只保留真正需要快速识别的内容。</p>

            <div class="action-stack">
              <button v-if="canPay" class="btn btn-primary action-btn" @click="goPay">去支付</button>
              <button v-else-if="canReview" class="btn btn-primary action-btn" @click="goReview">{{ reviewLabel }}</button>
              <button class="btn btn-secondary action-btn" :disabled="!canRefund || refunding || order.status === 'REFUNDED'" @click="requestRefund">
                {{ refunding ? '退款处理中...' : refundLabel }}
              </button>
              <button class="btn btn-secondary action-btn" @click="router.push('/personal')">返回个人中心</button>
            </div>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.detail-page {
  padding-top: 30px;
}

.detail-stage {
  overflow: hidden;
  padding: 28px;
  display: grid;
  gap: 20px;
  background:
    radial-gradient(520px 240px at 100% 0%, rgba(193, 119, 46, 0.1), transparent 72%),
    radial-gradient(420px 220px at 0% 0%, rgba(47, 106, 73, 0.08), transparent 72%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 239, 0.96));
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 20px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 42px rgba(34, 49, 37, 0.08);
}

.eyebrow,
.card-kicker {
  color: var(--brand-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.eyebrow {
  margin-bottom: 10px;
}

.hero-headline {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.hero-headline h1 {
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1;
}

.hero-subtitle {
  margin-top: 10px;
  color: var(--ink-soft);
  font-size: 15px;
}

.hero-status {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.hero-status.pending {
  background: rgba(193, 119, 46, 0.12);
  color: var(--brand-2);
}

.hero-status.paid {
  background: rgba(47, 106, 73, 0.12);
  color: var(--brand);
}

.hero-status.completed {
  background: rgba(36, 85, 133, 0.12);
  color: #245585;
}

.hero-status.refunded {
  background: rgba(193, 119, 46, 0.16);
  color: #9a6125;
}

.hero-status.cancelled,
.hero-status.neutral {
  background: rgba(47, 67, 54, 0.08);
  color: var(--ink-soft);
}

.hero-note {
  margin-top: 14px;
  max-width: 720px;
  color: var(--ink-soft);
  line-height: 1.8;
}

.summary-strip {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-cell {
  padding: 16px;
  border-radius: 20px;
  background: rgba(245, 242, 232, 0.84);
  border: 1px solid rgba(47, 67, 54, 0.08);
  display: grid;
  gap: 8px;
}

.summary-cell span,
.amount-block span,
.amount-meta span,
.order-no-row span,
.stay-route span,
.stay-meta label {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.summary-cell strong {
  color: var(--ink-strong);
  font-size: 18px;
}

.order-no-row {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.order-no-row code {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px dashed rgba(47, 67, 54, 0.18);
  background: rgba(250, 248, 240, 0.95);
  color: var(--ink-strong);
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.amount-side {
  display: grid;
  align-content: start;
  gap: 18px;
  padding-left: 8px;
}

.amount-block,
.amount-meta {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
}

.amount-block strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1;
}

.amount-meta strong {
  color: var(--brand);
  font-size: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 16px;
}

.detail-card {
  padding: 22px;
  border-radius: 26px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 34px rgba(34, 49, 37, 0.06);
  display: grid;
  gap: 18px;
}

.card-heading {
  display: grid;
  gap: 6px;
}

.card-heading h2 {
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 28px;
}

.stay-route {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.stay-route strong {
  color: var(--ink-strong);
  font-size: 24px;
}

.stay-route i {
  position: relative;
  display: block;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(47, 67, 54, 0.36), transparent);
}

.stay-route i::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 8px;
  width: 10px;
  height: 10px;
  border-top: 2px solid rgba(47, 67, 54, 0.52);
  border-right: 2px solid rgba(47, 67, 54, 0.52);
  transform: translateY(-50%) rotate(45deg);
}

.stay-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stay-meta div {
  padding: 16px;
  border-radius: 18px;
  background: rgba(246, 243, 234, 0.9);
  border: 1px solid rgba(47, 67, 54, 0.08);
  display: grid;
  gap: 6px;
}

.stay-meta strong,
.receipt-line strong,
.service-row strong {
  color: var(--ink-strong);
}

.receipt-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(47, 67, 54, 0.12);
}

.receipt-line span {
  color: var(--ink-soft);
}

.receipt-line strong {
  font-size: 18px;
}

.receipt-line.total {
  padding-top: 16px;
  border-bottom: 0;
}

.receipt-line.total strong {
  font-family: var(--font-display);
  font-size: 30px;
}

.service-card {
  grid-column: 1 / 2;
}

.service-section {
  display: grid;
  gap: 10px;
}

.service-section header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.service-section header span,
.service-row span,
.control-note {
  color: var(--ink-soft);
}

.service-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(246, 243, 234, 0.92);
  border: 1px solid rgba(47, 67, 54, 0.08);
}

.service-row div {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.service-row em {
  color: var(--brand);
  font-style: normal;
  font-weight: 700;
}

.control-note {
  line-height: 1.8;
}

.action-stack {
  display: grid;
  gap: 12px;
}

.action-btn {
  width: 100%;
  min-height: 50px;
  border-radius: 18px;
  justify-content: center;
}

@media (max-width: 980px) {
  .detail-hero,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .amount-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-left: 0;
  }

  .amount-block,
  .amount-meta {
    justify-items: start;
    text-align: left;
  }
}

@media (max-width: 720px) {
  .detail-page {
    width: min(1220px, 100% - 24px);
  }

  .detail-stage,
  .detail-hero,
  .detail-card {
    padding: 18px;
  }

  .hero-headline,
  .summary-strip,
  .stay-route,
  .stay-meta,
  .amount-side {
    grid-template-columns: 1fr;
  }

  .stay-route i {
    display: none;
  }
}
</style>
