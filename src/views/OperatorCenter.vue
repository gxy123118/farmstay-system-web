<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiOperatorOrderSummary, apiOperatorOrders, apiOwnerFarmstays } from '../services/api'
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
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })

const statusOptions = ['CREATED', 'PAID', 'CANCELLED', 'REFUNDED']

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
    { label: '已支付订单', value: `${source?.paidOrderCount ?? 0}`, note: '已完成支付的订单数量' },
    { label: '已退款订单', value: `${source?.refundedOrderCount ?? 0}`, note: '状态为退款的订单数量' },
    { label: '成交总额', value: formatCurrency(source?.grossTransactionAmount), note: 'PAID 与 REFUNDED 订单累计金额' },
    { label: '退款总额', value: formatCurrency(source?.refundAmount), note: '已发起退款的累计金额' },
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

const formatRate = (value?: number | null) => {
  const numeric = Number(value ?? 0)
  const display = numeric > 1 ? numeric : numeric * 100
  return `${display.toFixed(2)}%`
}

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

const handleFarmStayChange = async () => {
  await refreshAll()
}

const handleStatusChange = async () => {
  await loadOrders()
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
        <h2 class="section-title">订单与交易统计</h2>
        <p class="muted">默认展示当前经营者名下全部店铺订单，可按店铺和状态快速筛选。</p>
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
          <p class="muted">展示当前筛选条件下的全部订单与支付信息。</p>
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
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingOrders">
              <td colspan="12" class="empty-cell">正在加载经营者订单...</td>
            </tr>
            <tr v-else-if="!orders.length">
              <td colspan="12" class="empty-cell">当前筛选条件下暂无订单</td>
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
                <span class="status-pill" :class="`status-${String(order.status || '').toLowerCase()}`">
                  {{ order.status || '-' }}
                </span>
              </td>
              <td>{{ order.paymentChannel || '-' }}</td>
              <td>{{ order.reviewed ? '已评价' : '未评价' }}</td>
              <td>{{ formatTime(order.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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
  min-width: 1240px;
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

.status-paid {
  background: rgba(47, 106, 73, 0.12);
  color: var(--brand);
}

.status-created {
  background: rgba(193, 119, 46, 0.14);
  color: var(--brand-2);
}

.status-refunded {
  background: rgba(177, 67, 47, 0.12);
  color: #b1432f;
}

.status-cancelled {
  background: rgba(47, 67, 54, 0.12);
  color: var(--ink-soft);
}

.empty-cell {
  text-align: center;
  color: var(--ink-soft);
  padding: 28px 16px;
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

  .refresh-btn {
    width: 100%;
  }
}
</style>
