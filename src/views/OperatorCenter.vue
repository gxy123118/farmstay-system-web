<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiOwnerOrders, apiUpdateBookingStatus } from '../services/api'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

const ownerFarmStayId = ref('')
const ownerOrders = ref<Order[]>([])
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

const loadOwnerOrders = async () => {
  if (!ownerFarmStayId.value) {
    setFlash('请输入农家乐ID', 'error')
    return
  }
  try {
    ownerOrders.value = (await apiOwnerOrders(Number(ownerFarmStayId.value))) as Order[]
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '经营者订单加载失败', 'error')
  }
}

const updateOrderStatus = async (orderId: number, status: string) => {
  try {
    await apiUpdateBookingStatus({ orderId, status })
    setFlash('订单状态已更新')
    loadOwnerOrders()
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '更新失败', 'error')
  }
}

onMounted(() => {
  // 可选：自动加载默认农家乐ID的订单
})
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h3>经营者订单</h3>
      <div class="actions">
        <input v-model="ownerFarmStayId" placeholder="农家乐ID" />
        <button class="btn" @click="loadOwnerOrders">加载</button>
      </div>
    </header>
    <div class="list">
      <div v-if="!ownerOrders.length" class="muted">暂无订单</div>
      <div v-for="o in ownerOrders" :key="o.id" class="list-item">
        <div>
          <strong>{{ o.orderNo }}</strong>
          <p class="muted">状态：{{ o.status }}</p>
          <p class="muted order-meta">
            {{ o.farmStay?.name || '未知农家乐' }} · {{ o.farmStay?.city || '' }}
            <br />
            房型：{{ o.room?.name || '暂无' }} · ¥{{ o.room?.price ?? '-' }}
          </p>
        </div>
        <div class="list-actions">
          <button class="btn" @click="updateOrderStatus(o.id, 'COMPLETED')">标记完成</button>
          <button class="btn danger" @click="updateOrderStatus(o.id, 'CANCELLED')">取消</button>
        </div>
      </div>
    </div>
  </section>

  <section v-if="flash.message" class="status" :class="flash.type">
    {{ flash.message }}
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

.btn.primary {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}

.btn.danger {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
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

.order-meta {
  font-size: 0.85rem;
  color: #475569;
  margin-top: 0.2rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.actions input {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.status {
  margin-top: 0.5rem;
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
</style>
