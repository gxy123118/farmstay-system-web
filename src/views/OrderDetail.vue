<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMyOrders, apiCreateReview } from '../services/api'

type Order = {
  id: number
  orderNo: string
  status: string
  checkInDate?: string
  checkOutDate?: string
  totalAmount?: number
  farmStayId?: number
}

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(false)
const error = ref('')

const ratingStars = [1, 2, 3, 4, 5]
const reviewForm = reactive({
  rating: 5,
  content: '',
})
const submitting = ref(false)

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

const setRating = (value: number) => {
  reviewForm.rating = value
}

const submitReview = async () => {
  if (!order.value || order.value.status !== 'PAID') {
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await apiCreateReview({
      orderId: order.value.id,
      farmStayId: order.value.farmStayId,
      rating: reviewForm.rating,
      content: reviewForm.content,
    })
    alert('评价成功')
    router.push('/personal')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '评价失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<template>
  <main class="order-page">
    <section class="card">
      <h2>订单详情</h2>
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="order">
        <p>订单号：{{ order.orderNo }}</p>
        <p>入住：{{ order.checkInDate?.slice(0, 10) }} · 离店：{{ order.checkOutDate?.slice(0, 10) }}</p>
        <p>金额：¥{{ order.totalAmount ?? '-' }}</p>
        <p>状态：{{ order.status }}</p>

        <div v-if="order.status === 'PAID'" class="review-box">
          <h3>发表评价</h3>
          <div class="star-row">
            <span
              v-for="star in ratingStars"
              :key="star"
              class="star"
              :class="{ active: reviewForm.rating >= star }"
              @click="setRating(star)"
            >
              ★
            </span>
            <span class="muted">({{ reviewForm.rating }}/5)</span>
          </div>
          <textarea v-model="reviewForm.content" placeholder="写下你的入住体验"></textarea>
          <button class="btn primary" :disabled="submitting" @click="submitReview">
            {{ submitting ? '提交中...' : '提交评价' }}
          </button>
        </div>

        <div v-else class="muted">订单未支付，完成支付后再评价</div>

        <div class="actions">
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
  min-width: 340px;
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

.review-box {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: grid;
  gap: 0.5rem;
}

.star-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.star {
  cursor: pointer;
  color: #cbd5e1;
  font-size: 1.3rem;
  line-height: 1;
  transition: color 0.15s ease;
}

.star.active {
  color: #fbbf24;
}

textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.6rem;
  min-height: 80px;
}

.muted {
  color: #64748b;
}
</style>
