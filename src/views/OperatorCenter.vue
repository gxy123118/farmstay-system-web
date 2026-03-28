<script setup lang="ts">
import { reactive, ref } from 'vue'
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
</script>

<template>
  <section class="surface-strong block">
    <header class="header-row">
      <h3 class="section-title">经营者订单</h3>
      <div class="search-row">
        <input v-model="ownerFarmStayId" class="input" placeholder="输入农家乐ID" />
        <button class="btn btn-primary" @click="loadOwnerOrders">加载</button>
      </div>
    </header>

    <div class="card-list">
      <p v-if="!ownerOrders.length" class="muted">暂无订单</p>
      <article v-for="o in ownerOrders" :key="o.id" class="order-item">
        <div class="summary">
          <strong>{{ o.orderNo }}</strong>
          <p class="muted">状态：{{ o.status }}</p>
          <p class="muted">游客：{{ o.visitorName || o.visitorUsername || o.contactName || '未知游客' }}</p>
          <p class="muted">账号：{{ o.visitorUsername || '-' }} · 联系人：{{ o.contactName || '-' }}</p>
          <p class="muted">电话：{{ o.contactPhone || '-' }} · 人数：{{ o.guests ?? '-' }}</p>
          <p class="muted">{{ o.farmStay?.name || '未知农家乐' }} · {{ o.farmStay?.city || '' }}</p>
          <p class="muted">房型：{{ o.room?.name || '暂无' }} · ¥{{ o.room?.price ?? '-' }}</p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click="updateOrderStatus(o.id, 'COMPLETED')">标记完成</button>
          <button class="btn btn-danger" @click="updateOrderStatus(o.id, 'CANCELLED')">取消</button>
        </div>
      </article>
    </div>

    <section v-if="flash.message" class="status" :class="flash.type === 'error' ? 'error' : ''">
      {{ flash.message }}
    </section>
  </section>
</template>

<style scoped>
.block {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.search-row {
  display: flex;
  gap: 8px;
}

.order-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: #fff;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.summary {
  display: grid;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 820px) {
  .header-row,
  .order-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-row {
    width: 100%;
    flex-direction: column;
  }
}
</style>
