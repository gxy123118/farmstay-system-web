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
const hoverRating = ref(0)

const ratingStars = [1, 2, 3, 4, 5]
const reviewForm = reactive({
  rating: 5,
  content: '',
})

const canReview = computed(() => (order.value?.status === 'PAID' || order.value?.status === 'COMPLETED') && !review.value)
const canEditReview = computed(() => typeof payload.value?.userId === 'number')
const displayRating = computed(() => hoverRating.value || reviewForm.rating)
const reviewButtonLabel = computed(() => (review.value ? '更新评价' : '提交评价'))
const pageTitle = computed(() => (review.value ? '修改这次旅途的评价' : '写下这次旅途的评价'))

const formatDate = (value?: string | null) => (value ? value.slice(0, 10) : '-')

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const id = Number(route.params.orderId)
    const list = (await apiMyOrders()) as Order[]
    order.value = list.find((item) => item.id === id) || null
    review.value = (await apiGetReviewByOrder(id)) as Review | null

    if (review.value) {
      reviewForm.rating = review.value.rating
      reviewForm.content = review.value.content
    } else {
      reviewForm.rating = 5
      reviewForm.content = ''
    }

    const farmStayId = order.value?.farmStay?.id || order.value?.farmStayId
    reviewList.value = farmStayId ? ((await apiListReviews(farmStayId)) as Review[]) : []
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
  if (!order.value || !canReview.value) return

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

onMounted(loadData)
</script>

<template>
  <main class="page-shell review-page">
    <section class="surface-strong review-stage">
      <div v-if="loading" class="status">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>

      <template v-else-if="order">
        <header class="review-hero">
          <div class="hero-copy">
            <p class="eyebrow">Guest Notes</p>
            <h1 class="section-title">{{ pageTitle }}</h1>
            <p class="hero-subtitle">
              {{ order.farmStay?.name || '目的地待确认' }} · {{ order.room?.name || '房型待确认' }} · 入住 {{ formatDate(order.checkInDate) }}
            </p>

            <div class="hero-order-meta">
              <span>订单编号</span>
              <code>{{ order.orderNo || order.id }}</code>
            </div>
          </div>

          <div class="hero-side">
            <div class="hero-state">
              <span>订单状态</span>
              <strong>{{ order.status === 'PAID' || order.status === 'COMPLETED' ? '订单已完成支付，可继续评价' : '未支付，当前不可提交' }}</strong>
            </div>
            <div class="hero-side-meta">
              <span>本次评分</span>
              <strong>{{ reviewForm.rating }} / 5</strong>
            </div>
          </div>
        </header>

        <section class="review-layout">
          <article class="review-editor">
            <div class="editor-head">
              <div>
                <p class="card-kicker">Your Voice</p>
                <h2>{{ review ? '编辑评价' : '评价这次住宿' }}</h2>
              </div>
              <span class="rating-badge">{{ reviewForm.rating }} / 5</span>
            </div>

            <div class="rating-stage" :class="{ locked: order.status !== 'PAID' && order.status !== 'COMPLETED' }">
              <button
                v-for="star in ratingStars"
                :key="star"
                type="button"
                class="star-tile"
                :class="{ active: displayRating >= star }"
                :disabled="order.status !== 'PAID' && order.status !== 'COMPLETED'"
                @mouseenter="hoverRating = star"
                @mouseleave="hoverRating = 0"
                @click="setRating(star)"
              >
                <span class="star-mark">★</span>
                <small>{{ ['很差', '较差', '一般', '满意', '强烈推荐'][star - 1] }}</small>
              </button>
            </div>

            <label class="field review-field">
              <span>入住印象</span>
              <textarea
                v-model="reviewForm.content"
                class="textarea review-textarea"
                placeholder="写下房间、环境、服务、餐饮或活动体验，让评价真正有信息量。"
              />
            </label>

            <div class="editor-actions">
              <button
                class="btn btn-primary action-btn"
                :disabled="submitting || (!review ? !canReview : !canEditReview || review?.orderId !== order.id)"
                @click="review ? updateReview() : submitReview()"
              >
                {{ submitting ? '提交中...' : reviewButtonLabel }}
              </button>
              <button
                class="btn btn-secondary action-btn"
                @click="router.push({ name: 'personal', query: { orderId: String(order.id), from: 'review' } })"
              >
                返回个人中心
              </button>
            </div>

            <p v-if="order.status !== 'PAID' && order.status !== 'COMPLETED'" class="editor-tip">当前订单未支付，评分区保留只读展示，提交按钮不可用。</p>
          </article>

          <aside class="review-sidebar">
            <article class="side-card">
              <p class="card-kicker">Guide</p>
              <h2>评价指引</h2>
              <ul class="guide-list">
                <li>房间是否整洁、安静，和预期是否一致。</li>
                <li>餐饮、活动是否值得加购，是否有明确亮点。</li>
                <li>适合什么样的游客，避开什么常见误解。</li>
              </ul>
            </article>

            <article class="side-card">
              <p class="card-kicker">Guest Feed</p>
              <h2>同住客评价</h2>

              <p v-if="!reviewList.length" class="muted">当前还没有可参考的评价。</p>
              <div v-else class="review-feed">
                <article v-for="item in reviewList" :key="item.id" class="feed-item">
                  <header>
                    <div>
                      <strong>{{ item.visitorName || '游客' }}</strong>
                      <span>{{ formatDate(item.createdAt) }}</span>
                    </div>
                    <em>{{ item.rating }} / 5</em>
                  </header>
                  <div class="mini-stars">
                    <span v-for="star in ratingStars" :key="star" :class="{ active: item.rating >= star }">★</span>
                  </div>
                  <p>{{ item.content }}</p>
                </article>
              </div>
            </article>
          </aside>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.review-page {
  padding-top: 30px;
}

.review-stage {
  padding: 28px;
  display: grid;
  gap: 18px;
  background:
    radial-gradient(520px 260px at 0% 0%, rgba(193, 119, 46, 0.1), transparent 72%),
    radial-gradient(420px 220px at 100% 0%, rgba(47, 106, 73, 0.08), transparent 70%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 239, 0.96));
}

.review-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 20px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 42px rgba(34, 49, 37, 0.08);
}

.eyebrow,
.card-kicker {
  color: var(--brand-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.eyebrow {
  margin-bottom: 10px;
}

.hero-copy h1 {
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.02;
}

.hero-subtitle {
  margin-top: 12px;
  color: var(--ink-soft);
  line-height: 1.8;
}

.hero-order-meta {
  margin-top: 16px;
  display: grid;
  gap: 8px;
}

.hero-order-meta span,
.hero-state span,
.hero-side-meta span {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-order-meta code {
  display: block;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px dashed rgba(47, 67, 54, 0.18);
  background: rgba(250, 248, 240, 0.95);
  color: var(--ink-strong);
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.hero-side {
  display: grid;
  align-content: start;
  gap: 18px;
}

.hero-state,
.hero-side-meta {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
}

.hero-state strong {
  color: var(--ink-strong);
  font-size: 18px;
  line-height: 1.5;
}

.hero-side-meta strong {
  color: var(--brand);
  font-family: var(--font-display);
  font-size: 34px;
  line-height: 1;
}

.review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 360px;
  gap: 16px;
}

.review-editor,
.side-card {
  padding: 22px;
  border-radius: 26px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 34px rgba(34, 49, 37, 0.06);
}

.review-editor {
  display: grid;
  gap: 20px;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.editor-head h2,
.side-card h2 {
  margin-top: 6px;
  font-family: var(--font-display);
  color: var(--ink-strong);
  font-size: 28px;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(193, 119, 46, 0.12);
  color: var(--brand-2);
  font-weight: 700;
  white-space: nowrap;
}

.rating-stage {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.rating-stage.locked {
  opacity: 0.72;
}

.star-tile {
  min-height: 110px;
  border: 1px solid rgba(47, 67, 54, 0.12);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 243, 234, 0.95));
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--ink-soft);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.star-tile:hover:not(:disabled),
.star-tile.active {
  transform: translateY(-4px);
  border-color: rgba(193, 119, 46, 0.3);
  box-shadow: 0 18px 38px rgba(193, 119, 46, 0.16);
  color: var(--brand-2);
}

.star-tile:disabled {
  cursor: default;
}

.star-mark {
  font-size: 34px;
  line-height: 1;
}

.star-tile small {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.review-field {
  gap: 10px;
}

.review-field > span {
  color: var(--ink-strong);
  font-weight: 700;
}

.review-textarea {
  min-height: 220px;
  border-radius: 24px;
  padding: 18px;
  background: rgba(250, 248, 240, 0.96);
}

.editor-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 180px;
  min-height: 50px;
  border-radius: 18px;
  justify-content: center;
}

.editor-tip,
.guide-list,
.feed-item p {
  color: var(--ink-soft);
  line-height: 1.8;
}

.review-sidebar {
  display: grid;
  gap: 16px;
}

.guide-list {
  padding-left: 18px;
}

.review-feed {
  display: grid;
  gap: 12px;
}

.feed-item {
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(248, 246, 239, 0.96), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(47, 67, 54, 0.08);
  display: grid;
  gap: 10px;
}

.feed-item header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.feed-item header div {
  display: grid;
  gap: 4px;
}

.feed-item strong {
  color: var(--ink-strong);
}

.feed-item span {
  color: var(--ink-soft);
  font-size: 13px;
}

.feed-item em {
  color: var(--brand-2);
  font-style: normal;
  font-weight: 700;
}

.mini-stars {
  display: flex;
  gap: 4px;
  color: rgba(193, 119, 46, 0.24);
}

.mini-stars .active {
  color: var(--brand-2);
}

@media (max-width: 1040px) {
  .review-hero,
  .review-layout {
    grid-template-columns: 1fr;
  }

  .hero-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-state,
  .hero-side-meta {
    justify-items: start;
    text-align: left;
  }
}

@media (max-width: 760px) {
  .review-page {
    width: min(1220px, 100% - 24px);
  }

  .review-stage,
  .review-hero,
  .review-editor,
  .side-card {
    padding: 18px;
  }

  .rating-stage,
  .hero-side {
    grid-template-columns: 1fr;
  }
}
</style>
