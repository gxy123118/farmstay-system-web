<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiRefundBooking } from '../services/api'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

const unpaid = ref<Order[]>([])
const paid = ref<Order[]>([])
const highlightOrderId = ref<number | null>(null)
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })
const router = useRouter()
const route = useRoute()

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

const loadOrders = async () => {
  try {
    const list = (await apiMyOrders()) as Order[]
    unpaid.value = list.filter((o) => o.status === 'CREATED' || o.status === 'CANCELLED')
    paid.value = list.filter((o) => o.status === 'PAID' || o.status === 'REFUNDED')
    const queryOrderId = Number(route.query.orderId)
    if (!Number.isNaN(queryOrderId) && queryOrderId > 0) {
      highlightOrderId.value = queryOrderId
      await nextTick()
      const target = document.getElementById(`order-${queryOrderId}`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setTimeout(() => {
        highlightOrderId.value = null
      }, 3500)
    }
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '游客订单加载失败', 'error')
  }
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
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '退款失败', 'error')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h3>我的订单</h3>
      <button class="btn" @click="loadOrders">刷新</button>
    </header>
    <div class="list-group">
      <h4>待支付</h4>
      <div class="list">
        <div v-if="!unpaid.length" class="muted">暂无待支付订单</div>
        <div
          v-for="o in unpaid"
          :key="o.id"
          :id="`order-${o.id}`"
          class="list-item clickable"
          :class="{ highlight: o.id === highlightOrderId }"
          @click="$router.push(`/orders/${o.id}`)"
        >
          <div class="list-content">
            <strong>{{ o.farmStay?.name || '未知农家乐' }}</strong>
            <p class="muted">{{ o.room?.name || '未知房型' }} · ¥{{ o.room?.price ?? '-' }}</p>
            <p class="muted">入住 {{ o.checkInDate?.slice(0, 10) }} · 离店 {{ o.checkOutDate?.slice(0, 10) }}</p>
          </div>
          <div class="list-actions">
            <span class="price">¥{{ o.totalAmount ?? '-' }}</span>
            <button v-if="o.status === 'CREATED'" class="btn primary" @click.stop="goPay(o.id)">去支付</button>
          </div>
        </div>
      </div>
      <h4>已支付</h4>
      <div class="list">
        <div v-if="!paid.length" class="muted">暂无已支付订单</div>
        <div
          v-for="o in paid"
          :key="o.id"
          :id="`order-${o.id}`"
          class="list-item clickable"
          :class="{ highlight: o.id === highlightOrderId }"
          @click="$router.push(`/orders/${o.id}`)"
        >
          <div class="list-content">
            <strong>{{ o.farmStay?.name || '未知农家乐' }}</strong>
            <p class="muted">{{ o.room?.name || '未知房型' }} · ¥{{ o.room?.price ?? '-' }}</p>
            <p class="muted">入住 {{ o.checkInDate?.slice(0, 10) }} · 离店 {{ o.checkOutDate?.slice(0, 10) }}</p>
          </div>
          <div class="list-actions">
            <span class="price">¥{{ o.totalAmount ?? '-' }}</span>
            <button class="btn" @click.stop="goReview(o.id)">{{ o.reviewed ? '查看评价' : '去评价' }}</button>
            <button class="btn" :disabled="o.status === 'REFUNDED'" @click.stop="requestRefund(o.id)">
              {{ o.status === 'REFUNDED' ? '退款成功' : '申请退款' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="flash.message" class="status" :class="flash.type">
      {{ flash.message }}
    </div>
  </section>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.muted {
  color: #111827;
}

.btn {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  background: #f8fafc;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.8rem 1rem;
  align-items: center;
}

.list-item.highlight {
  border-color: #0f766e;
  box-shadow: 0 10px 25px rgba(15, 118, 110, 0.18);
}

.list-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.list-content {
  flex: 1;
  min-width: 0;
}

.price {
  color: #0f766e;
  font-weight: 700;
}

.status {
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0f172a;
}

.status.error {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.list-group h4 {
  margin: 0.8rem 0 0.4rem;
  color: #0f172a;
}

.btn.primary {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}

.clickable {
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.clickable:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}
</style>
