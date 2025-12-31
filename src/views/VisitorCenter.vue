<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiMyOrders } from '../services/api'

type Order = {
  id: number
  orderNo: string
  status: string
  checkInDate?: string
  checkOutDate?: string
  totalAmount?: number
}

const orders = ref<Order[]>([])
const unpaid = ref<Order[]>([])
const paid = ref<Order[]>([])
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })

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
    orders.value = list
    unpaid.value = list.filter((o) => o.status !== 'PAID')
    paid.value = list.filter((o) => o.status === 'PAID')
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '游客订单加载失败', 'error')
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
        <div v-for="o in unpaid" :key="o.id" class="list-item">
          <div>
            <strong>{{ o.orderNo }}</strong>
            <p class="muted">入住 {{ o.checkInDate?.slice(0, 10) }} · 离店 {{ o.checkOutDate?.slice(0, 10) }}</p>
          </div>
          <div class="list-actions">
            <span class="price">¥{{ o.totalAmount ?? '-' }}</span>
            <button class="btn primary" @click="$router.push(`/pay/${o.id}`)">去支付</button>
            <button class="btn" @click="$router.push(`/orders/${o.id}`)">查看详情</button>
          </div>
        </div>
      </div>
      <h4>已支付</h4>
      <div class="list">
        <div v-if="!paid.length" class="muted">暂无已支付订单</div>
        <div v-for="o in paid" :key="o.id" class="list-item">
          <div>
            <strong>{{ o.orderNo }}</strong>
            <p class="muted">入住 {{ o.checkInDate?.slice(0, 10) }} · 离店 {{ o.checkOutDate?.slice(0, 10) }}</p>
          </div>
          <div class="list-actions">
            <span class="price">¥{{ o.totalAmount ?? '-' }}</span>
            <button class="btn" @click="$router.push(`/orders/${o.id}`)">查看详情 / 评价</button>
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
}

.list-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
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
</style>
