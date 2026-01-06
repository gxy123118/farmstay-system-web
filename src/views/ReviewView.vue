<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiCreateReview, apiGetReviewByOrder, apiListReviews, apiMyOrders, apiUpdateReview } from '../services/api'
import { useAuthState } from '../composables/auth'
import type { BookingDetail } from '../types/booking'

type Order = BookingDetail

type Review = {
  id: number
  orderId: number
  visitorId: number
  rating: number
  content: string
  visitorName?: string
  createdAt?: string
}

const route = useRoute()
const router = useRouter()
const { payload } = useAuthState()
const order = ref<Order | null>(null)
const review = ref<Review | null>(null)
const reviewList = ref<Review[]>([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)

const ratingStars = [1, 2, 3, 4, 5]
const reviewForm = reactive({
  rating: 5,
  content: '',
})

const canReview = computed(() => order.value?.status === 'PAID' && !review.value)
const canEditReview = computed(() => typeof payload.value?.userId === 'number')

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.params.orderId)
    const list = (await apiMyOrders()) as Order[]
    order.value = list.find((o) => o.id === id) || null
    review.value = (await apiGetReviewByOrder(id)) as Review | null
    if (review.value) {
      reviewForm.rating = review.value.rating
      reviewForm.content = review.value.content
    } else {
      reviewForm.rating = 5
      reviewForm.content = ''
    }
    const farmStayId = order.value?.farmStay?.id || order.value?.farmStayId
    if (farmStayId) {
      reviewList.value = (await apiListReviews(farmStayId)) as Review[]
    } else {
      reviewList.value = []
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载评价失败'
  } finally {
    loading.value = false
  }
}

const setRating = (value: number) => {
  reviewForm.rating = value
}

const submitReview = async () => {
  if (!order.value || !canReview.value) {
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await apiCreateReview({
      orderId: order.value.id,
      farmStayId: order.value.farmStay?.id || order.value.farmStayId,
      rating: reviewForm.rating,
      content: reviewForm.content,
    })
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '评价失败'
  } finally {
    submitting.value = false
  }
}

const updateReview = async () => {
  if (!order.value || !review.value) return
  submitting.value = true
  error.value = ''
  try {
    await apiUpdateReview(review.value.orderId, {
      orderId: review.value.orderId,
      farmStayId: order.value.farmStay?.id || order.value.farmStayId,
      rating: reviewForm.rating,
      content: reviewForm.content,
    })
    await loadData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '修改评价失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <main class="review-page">
    <section class="card">
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="order">
        <p class="muted">农家乐：{{ order.farmStay?.name || '暂无信息' }}</p>
        <p class="muted">房型：{{ order.room?.name || '暂无房型' }}</p>

        <div class="review-section">
          <div class="review-form">
            <h3>{{ review ? '已提交评价' : '填写评价' }}</h3>
            <div class="star-row" :class="{ readonly: order.status !== 'PAID' }">
              <span
                v-for="star in ratingStars"
                :key="star"
                class="star"
                :class="{ active: reviewForm.rating >= star }"
                @click="order.status === 'PAID' ? setRating(star) : undefined"
              >
                ★
              </span>
              <span class="muted">({{ reviewForm.rating }}/5)</span>
            </div>
            <textarea v-model="reviewForm.content" placeholder="写下你的入住体验"></textarea>
            <div class="form-actions">
              <button
                v-if="!review"
                class="btn primary"
                :disabled="submitting || !canReview"
                @click="submitReview"
              >
                {{ submitting ? '提交中...' : '提交评价' }}
              </button>
              <button
                v-else
                class="btn primary"
                :disabled="submitting || !canEditReview || review?.orderId !== order.id"
                @click="updateReview"
              >
                {{ submitting ? '提交中...' : '更新评价' }}
              </button>
            </div>
            <p v-if="order.status !== 'PAID'" class="muted">订单未支付，无法评价</p>
          </div>
          <div class="review-list">
            <div v-if="!reviewList.length" class="muted">暂无评价</div>
            <div v-for="item in reviewList" :key="item.id" class="review-item">
              <div class="review-head">
                <strong>{{ item.visitorName || '游客' }}</strong>
                <span class="muted">{{ item.createdAt?.slice(0, 10) }}</span>
              </div>
              <div class="star-row readonly">
                <span v-for="star in ratingStars" :key="star" class="star" :class="{ active: item.rating >= star }">
                  ★
                </span>
                <span class="muted">({{ item.rating }}/5)</span>
              </div>
              <p class="muted">{{ item.content }}</p>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="router.push({ name: 'personal', query: { orderId: String(order.id), from: 'review' } })">
            返回个人中心
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.review-page {
  min-height: 100vh;
  padding: 2rem;
  background: #f1f5f9;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.6rem 2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  width: 100%;
  min-height: calc(100vh - 4rem);
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

.review-section {
  display: grid;
  grid-template-columns: minmax(260px, 360px) 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
}

.review-form,
.review-list {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.review-item {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.8rem;
}

.review-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.review-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.star-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 0.6rem;
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

.star-row.readonly .star {
  cursor: default;
}

textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.6rem;
  min-height: 80px;
  width: 100%;
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

.actions {
  margin-top: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.muted {
  color: #64748b;
}

@media (max-width: 900px) {
  .review-section {
    grid-template-columns: 1fr;
  }
}
</style>
