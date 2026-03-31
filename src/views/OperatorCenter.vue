<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { persistAuthPayload, useAuthState } from '../composables/auth'
import {
  apiCompleteBooking,
  apiCurrentUser,
  apiOperatorOrderSummary,
  apiOperatorOrders,
  apiOwnerFarmstays,
  mergeAuthPayload,
} from '../services/api'
import type { BookingDetail, FarmStaySummary, OperatorOrderSummary } from '../types/booking'

const filters = reactive({
  farmStayId: '',
  status: '',
})

const farmStayOptions = ref<FarmStaySummary[]>([])
const orders = ref<BookingDetail[]>([])
const summary = ref<OperatorOrderSummary | null>(null)
const loadingFarmstays = ref(false)
const loadingSummary = ref(false)
const loadingOrders = ref(false)
const completingOrderId = ref<number | null>(null)
const detailOrder = ref<BookingDetail | null>(null)
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })
const { sync } = useAuthState()

const statusOptions = ['CREATED', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED']

const selectedFarmStayId = computed(() => {
  if (!filters.farmStayId) {
    return undefined
  }
  const parsed = Number(filters.farmStayId)
  return Number.isFinite(parsed) ? parsed : undefined
})

const summaryCards = computed(() => {
  const source = summary.value
  return [
    { label: '店铺数', value: `${source?.farmStayCount ?? 0}`, note: '纳入统计的农家乐数量' },
    { label: '订单总数', value: `${source?.orderCount ?? 0}`, note: '当前经营者名下订单总量' },
    { label: '已支付订单', value: `${source?.paidOrderCount ?? 0}`, note: 'PAID、COMPLETED、REFUNDED 订单总数' },
    { label: '已退款订单', value: `${source?.refundedOrderCount ?? 0}`, note: '状态为退款的订单数量' },
    { label: '成交总额', value: formatCurrency(source?.grossTransactionAmount), note: '历史累计成交金额' },
    { label: '退款总额', value: formatCurrency(source?.refundAmount), note: '已退款的累计金额' },
    { label: '净成交额', value: formatCurrency(source?.netTransactionAmount), note: '成交总额减退款总额' },
    { label: '退款率', value: formatRate(source?.refundRate), note: '按订单数口径统计' },
  ]
})

const setFlash = (message: string, type: 'success' | 'error' = 'success') => {
  flash.message = message
  flash.type = type
  if (message) {
    window.setTimeout(() => {
      if (flash.message === message) {
        flash.message = ''
        flash.type = ''
      }
    }, 4000)
  }
}

const formatCurrency = (value?: number | null) => `¥${Number(value ?? 0).toFixed(2)}`

const formatRate = (value?: number | null) => `${(Number(value ?? 0) * 100).toFixed(2)}%`

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

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const statusMeta = (status?: string) => {
  switch (status) {
    case 'CREATED':
      return { label: '待支付', tone: 'created' }
    case 'PAID':
      return { label: '待核销', tone: 'paid' }
    case 'COMPLETED':
      return { label: '已完成', tone: 'completed' }
    case 'REFUNDED':
      return { label: '已退款', tone: 'refunded' }
    case 'CANCELLED':
      return { label: '已取消', tone: 'cancelled' }
    default:
      return { label: status || '-', tone: 'neutral' }
  }
}

const closeDetail = () => {
  detailOrder.value = null
}

const openDetail = (order: BookingDetail) => {
  detailOrder.value = order
}

const detailSections = computed(() => {
  if (!detailOrder.value) {
    return null
  }
  const order = detailOrder.value
  return {
    orderInfo: [
      { label: '订单号', value: order.orderNo || '-' },
      { label: '状态', value: statusMeta(order.status).label },
      { label: '下单时间', value: formatTime(order.createdAt) },
      { label: '订单金额', value: formatCurrency(order.totalAmount) },
      { label: '支付渠道', value: order.paymentChannel || '-' },
    ],
    stayInfo: [
      { label: '入住日期', value: formatDate(order.checkInDate) },
      { label: '离店日期', value: formatDate(order.checkOutDate) },
      { label: '入住人数', value: String(order.guests ?? '-') },
      { label: '房型名称', value: order.room?.name || '-' },
      { label: '床型', value: order.room?.bedType || '-' },
      { label: '房型可住', value: order.room?.maxGuests ? `${order.room.maxGuests} 人` : '-' },
    ],
    contactInfo: [
      { label: '联系人', value: order.contactName || '-' },
      { label: '联系电话', value: order.contactPhone || '-' },
    ],
    visitorInfo: [
      { label: '游客昵称', value: order.visitorName || '-' },
      { label: '游客账号', value: order.visitorUsername || '-' },
    ],
    farmStayInfo: [
      { label: '农家乐名称', value: order.farmStay?.name || '-' },
      { label: '所在城市', value: order.farmStay?.city || '-' },
      { label: '详细地址', value: order.farmStay?.address || '-' },
    ],
  }
})

const orderParams = () => ({
  farmStayId: selectedFarmStayId.value,
  status: filters.status || undefined,
})

const summaryParams = () => ({
  farmStayId: selectedFarmStayId.value,
})

const loadFarmStayOptions = async () => {
  loadingFarmstays.value = true
  try {
    farmStayOptions.value = (await apiOwnerFarmstays()) as FarmStaySummary[]
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '店铺列表加载失败', 'error')
  } finally {
    loadingFarmstays.value = false
  }
}

const loadSummary = async () => {
  loadingSummary.value = true
  try {
    summary.value = await apiOperatorOrderSummary(summaryParams())
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '交易统计加载失败', 'error')
  } finally {
    loadingSummary.value = false
  }
}

const loadOrders = async () => {
  loadingOrders.value = true
  try {
    orders.value = await apiOperatorOrders(orderParams())
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '经营者订单加载失败', 'error')
  } finally {
    loadingOrders.value = false
  }
}

const refreshAll = async () => {
  await loadSummary()
  await loadOrders()
}

const syncOperatorProfile = async () => {
  try {
    const latest = mergeAuthPayload(await apiCurrentUser())
    persistAuthPayload(latest)
    sync()
  } catch {
    // keep current session payload if profile refresh fails
  }
}

const handleFarmStayChange = async () => {
  await refreshAll()
}

const handleStatusChange = async () => {
  await loadOrders()
}

const completeOrder = async (order: BookingDetail) => {
  if (order.status !== 'PAID' || completingOrderId.value !== null) {
    return
  }

  completingOrderId.value = order.id
  try {
    await apiCompleteBooking(order.id)
    await Promise.all([loadSummary(), loadOrders(), syncOperatorProfile()])
    setFlash(`订单 ${order.orderNo} 已核销完成，金额已结算到经营者余额`)
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '核销完成失败', 'error')
  } finally {
    completingOrderId.value = null
  }
}

onMounted(async () => {
  await loadFarmStayOptions()
  await refreshAll()
})
</script>

<template>
  <section class="surface-strong operator-board">
    <header class="board-head">
      <div class="board-copy">
        <p class="eyebrow">Operator Orders</p>
        <h2 class="section-title">履约核销与交易统计</h2>
        <p class="muted">默认展示当前经营者名下全部店铺订单，支付后可在这里执行核销完成并同步结算。</p>
      </div>
      <button class="btn btn-secondary refresh-btn" :disabled="loadingSummary || loadingOrders" @click="refreshAll">
        {{ loadingSummary || loadingOrders ? '刷新中...' : '刷新数据' }}
      </button>
    </header>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card">
        <span>{{ card.label }}</span>
        <strong>{{ loadingSummary ? '加载中...' : card.value }}</strong>
        <p>{{ card.note }}</p>
      </article>
    </section>

    <section class="surface filter-bar">
      <label class="filter-field">
        <span>店铺筛选</span>
        <select v-model="filters.farmStayId" class="select" :disabled="loadingFarmstays" @change="handleFarmStayChange">
          <option value="">全部店铺</option>
          <option v-for="item in farmStayOptions" :key="item.id" :value="String(item.id)">
            {{ item.name || `农家乐 #${item.id}` }}
          </option>
        </select>
      </label>

      <label class="filter-field">
        <span>订单状态</span>
        <select v-model="filters.status" class="select" @change="handleStatusChange">
          <option value="">全部状态</option>
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
      </label>
    </section>

    <section class="surface table-shell">
      <header class="table-head">
        <div>
          <h3>订单列表</h3>
          <p class="muted">展示当前筛选条件下的订单、支付与履约状态，`PAID` 订单可直接核销完成。</p>
        </div>
        <span class="table-count">{{ loadingOrders ? '加载中...' : `${orders.length} 条订单` }}</span>
      </header>

      <div class="table-wrap">
        <table class="order-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>农家乐名称</th>
              <th>房型名称</th>
              <th>游客昵称</th>
              <th>游客账号</th>
              <th>入住日期</th>
              <th>离店日期</th>
              <th>订单金额</th>
              <th>订单状态</th>
              <th>支付渠道</th>
              <th>是否已评价</th>
              <th>下单时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingOrders">
              <td colspan="13" class="empty-cell">正在加载经营者订单...</td>
            </tr>
            <tr v-else-if="!orders.length">
              <td colspan="13" class="empty-cell">当前筛选条件下暂无订单</td>
            </tr>
            <tr v-for="order in orders" :key="order.id">
              <td class="mono-cell">{{ order.orderNo || '-' }}</td>
              <td>{{ order.farmStay?.name || '-' }}</td>
              <td>{{ order.room?.name || '-' }}</td>
              <td>{{ order.visitorName || '-' }}</td>
              <td>{{ order.visitorUsername || '-' }}</td>
              <td>{{ formatDate(order.checkInDate) }}</td>
              <td>{{ formatDate(order.checkOutDate) }}</td>
              <td>{{ formatCurrency(order.totalAmount) }}</td>
              <td>
                <span class="status-pill" :class="`status-${statusMeta(order.status).tone}`">
                  {{ statusMeta(order.status).label }}
                </span>
              </td>
              <td>{{ order.paymentChannel || '-' }}</td>
              <td>{{ order.reviewed ? '已评价' : '未评价' }}</td>
              <td>{{ formatTime(order.createdAt) }}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-secondary table-btn table-btn-secondary" @click="openDetail(order)">
                    查看详情
                  </button>
                  <button
                    v-if="order.status === 'PAID'"
                    class="btn btn-primary table-btn"
                    :disabled="completingOrderId === order.id"
                    @click="completeOrder(order)"
                  >
                    {{ completingOrderId === order.id ? '核销中...' : '核销完成' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="detailOrder && detailSections" class="detail-mask" @click.self="closeDetail">
      <aside class="detail-drawer surface-strong">
        <header class="drawer-head">
          <div>
            <p class="eyebrow">Order Detail</p>
            <h3>{{ detailOrder.farmStay?.name || '订单详情' }}</h3>
            <p class="muted">{{ detailOrder.room?.name || '房型待确认' }} · {{ statusMeta(detailOrder.status).label }}</p>
          </div>
          <button class="btn btn-secondary drawer-close" @click="closeDetail">关闭</button>
        </header>

        <div class="drawer-body">
          <section class="detail-block">
            <h4>订单信息</h4>
            <div class="detail-grid">
              <div v-for="item in detailSections.orderInfo" :key="item.label" class="detail-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-block">
            <h4>入住信息</h4>
            <div class="detail-grid">
              <div v-for="item in detailSections.stayInfo" :key="item.label" class="detail-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-block dual-block">
            <div>
              <h4>联系方式</h4>
              <div class="detail-grid compact-grid">
                <div v-for="item in detailSections.contactInfo" :key="item.label" class="detail-item">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
            <div>
              <h4>游客信息</h4>
              <div class="detail-grid compact-grid">
                <div v-for="item in detailSections.visitorInfo" :key="item.label" class="detail-item">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="detail-block">
            <h4>店铺信息</h4>
            <div class="detail-grid">
              <div v-for="item in detailSections.farmStayInfo" :key="item.label" class="detail-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-block dual-block">
            <div>
              <h4>餐饮服务</h4>
              <div v-if="detailOrder.diningItems?.length" class="service-list">
                <article v-for="item in detailOrder.diningItems" :key="item.id" class="service-item">
                  <div>
                    <strong>{{ item.itemName || '餐饮服务' }}</strong>
                    <span>x {{ item.quantity ?? 1 }}</span>
                  </div>
                  <em>{{ formatCurrency(item.price) }}</em>
                </article>
              </div>
              <p v-else class="empty-copy">当前没有餐饮附加服务。</p>
            </div>
            <div>
              <h4>活动服务</h4>
              <div v-if="detailOrder.activityItems?.length" class="service-list">
                <article v-for="item in detailOrder.activityItems" :key="item.id" class="service-item">
                  <div>
                    <strong>{{ item.itemName || '活动服务' }}</strong>
                    <span>x {{ item.quantity ?? 1 }}</span>
                  </div>
                  <em>{{ formatCurrency(item.price) }}</em>
                </article>
              </div>
              <p v-else class="empty-copy">当前没有活动附加服务。</p>
            </div>
          </section>

          <section class="detail-block dual-block">
            <div>
              <h4>备注</h4>
              <p class="remark-copy">{{ detailOrder.remarks || '暂无备注' }}</p>
            </div>
            <div>
              <h4>评价状态</h4>
              <p class="remark-copy">{{ detailOrder.reviewed ? '游客已评价' : '游客尚未评价' }}</p>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <section v-if="flash.message" class="status" :class="flash.type === 'error' ? 'error' : ''">
      {{ flash.message }}
    </section>
  </section>
</template>

<style scoped>
.operator-board {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.board-head,
.table-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.board-copy,
.table-head > div {
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

.refresh-btn {
  min-height: 46px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(47, 67, 54, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 236, 0.92));
  display: grid;
  gap: 8px;
}

.summary-card span,
.summary-card p,
.table-count,
.filter-field span {
  color: var(--ink-soft);
}

.summary-card strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1.1;
}

.filter-bar {
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(200px, 240px);
  gap: 12px;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 8px;
}

.table-shell {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.table-wrap {
  overflow: auto;
  border: 1px solid rgba(47, 67, 54, 0.08);
  border-radius: 18px;
}

.order-table {
  width: 100%;
  min-width: 1380px;
  border-collapse: collapse;
  background: #fff;
}

.order-table th,
.order-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(47, 67, 54, 0.08);
  vertical-align: top;
}

.order-table th {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(247, 244, 236, 0.72);
}

.mono-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(47, 67, 54, 0.08);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.status-created {
  background: rgba(193, 119, 46, 0.14);
  color: var(--brand-2);
}

.status-paid {
  background: rgba(47, 106, 73, 0.12);
  color: var(--brand);
}

.status-completed {
  background: rgba(36, 85, 133, 0.12);
  color: #245585;
}

.status-refunded {
  background: rgba(177, 67, 47, 0.12);
  color: #b1432f;
}

.status-cancelled,
.status-neutral {
  background: rgba(47, 67, 54, 0.12);
  color: var(--ink-soft);
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  gap: 8px;
  flex-wrap: wrap;
}

.table-btn {
  min-height: 32px;
  min-width: 92px;
  padding: 0 14px;
  border-radius: 10px;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1;
  justify-content: center;
}

.table-btn-secondary {
  background: #fff;
}

.action-empty {
  color: var(--ink-soft);
}

.empty-cell {
  text-align: center;
  color: var(--ink-soft);
  padding: 28px 16px;
}

.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(20, 28, 22, 0.24);
  display: flex;
  justify-content: flex-end;
}

.detail-drawer {
  width: min(560px, 100vw);
  height: 100vh;
  padding: 22px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  border-radius: 0;
  box-shadow: -20px 0 48px rgba(20, 28, 22, 0.18);
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.drawer-head h3 {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 28px;
}

.drawer-close {
  min-height: 40px;
}

.drawer-body {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 14px;
  padding-right: 4px;
}

.detail-block {
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(47, 67, 54, 0.08);
  background: rgba(255, 255, 255, 0.94);
  display: grid;
  gap: 12px;
}

.detail-block h4 {
  color: var(--ink-strong);
  font-size: 16px;
  font-weight: 700;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.compact-grid {
  grid-template-columns: 1fr;
}

.detail-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(247, 244, 236, 0.92);
  display: grid;
  gap: 6px;
}

.detail-item span,
.service-item span {
  color: var(--ink-soft);
  font-size: 12px;
}

.detail-item strong,
.service-item strong {
  color: var(--ink-strong);
  line-height: 1.5;
  word-break: break-word;
}

.dual-block {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.service-list {
  display: grid;
  gap: 10px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(247, 244, 236, 0.92);
}

.service-item div {
  display: grid;
  gap: 4px;
}

.service-item em {
  color: var(--brand);
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}

.empty-copy,
.remark-copy {
  color: var(--ink-soft);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .board-head,
  .table-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-bar,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid,
  .dual-block {
    grid-template-columns: 1fr;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>
