<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiPayBooking } from '../services/api'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)
const error = ref('')
const paying = ref(false)

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

const pay = async () => {
  if (!order.value) return
  paying.value = true
  error.value = ''
  try {
    await apiPayBooking({ orderId: order.value.id, channel: 'mock' })
    await loadOrder()
    alert('支付成功')
    router.push('/personal')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '支付失败'
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<template>
  <main class="pay-page">
    <section class="card">
      <h2>订单支付</h2>
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="order">
        <p>订单号：{{ order.orderNo }}</p>
        <p>金额：¥{{ order.totalAmount ?? '-' }}</p>
        <p>状态：{{ order.status }}</p>
        <p class="muted order-meta">农家乐：{{ order.farmStay?.name || '暂无信息' }} · {{ order.farmStay?.city || '-' }}</p>
        <p class="muted order-meta">房型：{{ order.room?.name || '暂无房型' }} · ¥{{ order.room?.price ?? '-' }}</p>
        <div class="actions">
          <button class="btn primary" :disabled="paying || order.status === 'PAID'" @click="pay">
            {{ order.status === 'PAID' ? '已支付' : paying ? '支付中...' : '去支付' }}
          </button>
          <button class="btn" @click="$router.push('/personal')">返回个人中心</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.pay-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f1f5f9;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.4rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  min-width: 320px;
  color: #0f172a;
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

.order-meta {
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 0.25rem;
}

.actions {
  display: flex;
  gap: 0.6rem;
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
</style>
