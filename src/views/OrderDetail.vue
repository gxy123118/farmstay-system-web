<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiRefundBooking } from '../services/api'
import { BookingDetail } from '../types/booking'

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
    order.value = list.find((o) => o.id === id) || null
    if (!order.value) {
      error.value = '未找到订单'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载订单失败'
  } finally {
    loading.value = false
  }
}

const reviewLabel = computed(() => (order.value?.reviewed ? '查看评价' : '去评价'))
const canRefund = computed(() => order.value?.status === 'PAID')
const canPay = computed(() => order.value?.status === 'CREATED')
const refundLabel = computed(() => (order.value?.status === 'REFUNDED' ? '退款成功' : '申请退款'))

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

onMounted(() => {
  loadOrder()
})
</script>

<template>
  <main class="order-page">
    <section class="card">
      <header class="detail-header">
        <div>
          <h2>订单详情</h2>
          <p class="muted">订单号：{{ order?.orderNo || '-' }}</p>
        </div>
        <span v-if="order" class="status-pill">{{ order.status }}</span>
      </header>
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="order">
        <div class="detail-grid">
          <div class="detail-block">
            <h3>入住信息</h3>
            <p>入住：{{ order.checkInDate?.slice(0, 10) }}</p>
            <p>离店：{{ order.checkOutDate?.slice(0, 10) }}</p>
            <p>金额：¥{{ order.totalAmount ?? '-' }}</p>
          </div>
          <div class="detail-block">
            <h3>农家乐与房型</h3>
            <p>农家乐：{{ order.farmStay?.name || '暂无信息' }}</p>
            <p>城市：{{ order.farmStay?.city || '-' }}</p>
            <p>房型：{{ order.room?.name || '暂无房型' }}</p>
            <p>房价：¥{{ order.room?.price ?? '-' }}</p>
          </div>
        </div>
        <div class="actions">
          <button v-if="canPay" class="btn primary" @click="goPay">去支付</button>
          <button v-else-if="order.status === 'PAID'" class="btn primary" @click="goReview">
            {{ reviewLabel }}
          </button>
          <button class="btn" :disabled="!canRefund || refunding || order.status === 'REFUNDED'" @click="requestRefund">
            {{ refunding ? '退款处理中...' : refundLabel }}
          </button>
          <button class="btn" @click="$router.push('/personal')">返回个人中心</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.order-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background: #f1f5f9;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.8rem 2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  width: min(960px, 100%);
  color: #0f172a;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-pill {
  background: #ecfeff;
  color: #0f766e;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.detail-block {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
}

.detail-block h3 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
}

.status {
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0f172a;
}

.status.error {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.actions {
  margin-top: 1rem;
}

.btn {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  background: #f8fafc;
}

.btn.primary {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}

.muted {
  color: #64748b;
}

@media (max-width: 640px) {
  .card {
    padding: 1.2rem;
  }

  .actions {
    display: grid;
    gap: 0.6rem;
  }
}
</style>
