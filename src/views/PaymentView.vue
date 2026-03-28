<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiPayBooking } from '../services/api'
import type { BookingDetail, BookingPaymentResponse } from '../types/booking'

type Order = BookingDetail

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)
const error = ref('')
const paying = ref(false)
const successTip = ref('')
const currentBalance = ref<number | null>(null)

const isPaid = computed(() => order.value?.status === 'PAID')
const canPay = computed(() => order.value?.status === 'CREATED')
const paymentChannelLabel = computed(() => {
  if (!order.value?.paymentChannel || order.value.paymentChannel === 'UNPAID') {
    return '待支付'
  }
  if (order.value.paymentChannel === 'BALANCE') {
    return '余额支付'
  }
  return order.value.paymentChannel
})

const loadOrder = async () => {
  loading.value = true
  error.value = ''

  try {
    const id = Number(route.params.orderId)
    const list = (await apiMyOrders()) as Order[]
    order.value = list.find((o) => o.id === id) || null
    if (!order.value) {
      error.value = '未找到订单'
      return
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载订单失败'
  } finally {
    loading.value = false
  }
}

const pay = async () => {
  if (!order.value || !canPay.value) return
  paying.value = true
  error.value = ''
  successTip.value = ''

  try {
    const result = (await apiPayBooking({
      orderId: order.value.id,
      channel: 'BALANCE',
    })) as BookingPaymentResponse
    await loadOrder()
    currentBalance.value = result.currentBalance ?? null
    successTip.value = result.payInfo || '余额支付成功'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '支付失败'
  } finally {
    paying.value = false
  }
}

onMounted(loadOrder)
</script>

<template>
  <main class="page-shell pay-shell">
    <section class="surface-strong panel">
      <h1 class="section-title">订单支付</h1>

      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="order" class="detail">
        <p>订单号：{{ order.orderNo }}</p>
        <p>金额：¥{{ order.totalAmount ?? '-' }}</p>
        <p>状态：{{ order.status }}</p>
        <p>支付方式：{{ paymentChannelLabel }}</p>
        <p class="muted">当前阶段只支持余额支付。</p>
        <p class="muted">农家乐：{{ order.farmStay?.name || '暂无信息' }} · {{ order.farmStay?.city || '-' }}</p>
        <p class="muted">房型：{{ order.room?.name || '暂无房型' }} · ¥{{ order.room?.price ?? '-' }}</p>
        <p v-if="successTip" class="status success">{{ successTip }}</p>
        <p v-if="currentBalance !== null" class="muted">支付后余额：¥{{ currentBalance }}</p>

        <div class="actions">
          <button class="btn btn-primary" :disabled="paying || !canPay" @click="pay">
            {{ isPaid ? '已支付' : paying ? '支付中...' : '余额支付' }}
          </button>
          <button class="btn btn-secondary" @click="router.push(`/orders/${order.id}`)">查看订单</button>
          <button class="btn btn-secondary" @click="router.push('/personal')">返回个人中心</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.pay-shell {
  display: grid;
  place-items: center;
}

.panel {
  width: min(560px, 100%);
  padding: 20px;
  display: grid;
  gap: 12px;
}

.detail {
  display: grid;
  gap: 6px;
}

.success {
  color: #1f7a45;
}

.actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
