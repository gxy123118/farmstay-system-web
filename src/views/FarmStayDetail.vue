<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  apiCreateBooking,
  apiFarmstayDetail,
  apiListActivities,
  apiListCoupons,
  apiListDining,
  apiListReviews,
  apiListRooms,
} from '../services/api'
import { useAuthState } from '../composables/auth'
import type { BookingCreateResponse } from '../types/booking'

type FarmStay = {
  id: number
  name: string
  city: string
  address?: string
  description?: string
  priceRange?: string
  priceLevel?: string
  averageRating?: number
  contactPhone?: string
  tags?: string
}

type Room = {
  id: number
  name: string
  price: number
  stock: number
  bedType?: string
  maxGuests?: number
  tags?: string
}

type Review = {
  id: number
  rating: number
  content: string
  createdAt: string
}

type DiningItem = {
  id: number
  name: string
  description?: string
  price?: number
  tags?: string
}

type ActivityItem = {
  id: number
  name: string
  description?: string
  schedule?: string
  price?: number
  capacity?: number
  tags?: string
}

const route = useRoute()
const router = useRouter()
const { payload } = useAuthState()
const loginType = computed(() => payload.value?.loginType ?? '')

const farmStay = ref<FarmStay | null>(null)
const rooms = ref<Room[]>([])
const reviews = ref<Review[]>([])
const coupons = ref<{ code: string; title: string }[]>([])
const diningItems = ref<DiningItem[]>([])
const activityItems = ref<ActivityItem[]>([])

const loading = ref(false)
const error = ref('')
const orderTip = ref('')
const showBookingModal = ref(false)

const selectedDiningIds = ref<number[]>([])
const selectedActivityIds = ref<number[]>([])

const bookingForm = reactive({
  roomTypeId: '',
  checkInDate: '',
  checkOutDate: '',
  guests: 2,
  couponCode: '',
  contactName: '',
  contactPhone: '',
  remarks: '',
})

const formErrors = reactive({
  roomTypeId: '',
  checkInDate: '',
  checkOutDate: '',
  contactName: '',
  contactPhone: '',
})

const ratingStars = [1, 2, 3, 4, 5]

const resetFormErrors = () => {
  formErrors.roomTypeId = ''
  formErrors.checkInDate = ''
  formErrors.checkOutDate = ''
  formErrors.contactName = ''
  formErrors.contactPhone = ''
}

const formatDateTime = (date: string) => {
  if (!date) return ''
  return new Date(date).toISOString()
}

const validateBookingForm = () => {
  let valid = true
  resetFormErrors()

  if (!bookingForm.roomTypeId.trim()) {
    formErrors.roomTypeId = '请选择房型'
    valid = false
  }

  if (!bookingForm.checkInDate.trim()) {
    formErrors.checkInDate = '请选择入住日期'
    valid = false
  }

  if (!bookingForm.checkOutDate.trim()) {
    formErrors.checkOutDate = '请选择离店日期'
    valid = false
  }

  if (bookingForm.checkInDate && bookingForm.checkOutDate) {
    const inDate = new Date(bookingForm.checkInDate)
    const outDate = new Date(bookingForm.checkOutDate)
    if (outDate <= inDate) {
      formErrors.checkOutDate = '离店时间必须晚于入住时间'
      valid = false
    }
  }

  if (!bookingForm.contactName.trim()) {
    formErrors.contactName = '请填写联系人'
    valid = false
  }

  if (!bookingForm.contactPhone.trim()) {
    formErrors.contactPhone = '请填写联系电话'
    valid = false
  }

  return valid
}

const loadDetail = async () => {
  loading.value = true
  error.value = ''

  try {
    const id = Number(route.params.id)
    farmStay.value = (await apiFarmstayDetail(id)) as FarmStay
    rooms.value = (await apiListRooms(id)) as Room[]
    reviews.value = (await apiListReviews(id)) as Review[]
    coupons.value = (await apiListCoupons(id)) as { code: string; title: string }[]
    diningItems.value = (await apiListDining(id)) as DiningItem[]
    activityItems.value = (await apiListActivities(id)) as ActivityItem[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const selectRoom = (room: Room) => {
  bookingForm.roomTypeId = String(room.id)
  bookingForm.guests = room.maxGuests || 2
}

const toggleDining = (id: number) => {
  if (selectedDiningIds.value.includes(id)) {
    selectedDiningIds.value = selectedDiningIds.value.filter((itemId) => itemId !== id)
  } else {
    selectedDiningIds.value = [...selectedDiningIds.value, id]
  }
}

const toggleActivity = (id: number) => {
  if (selectedActivityIds.value.includes(id)) {
    selectedActivityIds.value = selectedActivityIds.value.filter((itemId) => itemId !== id)
  } else {
    selectedActivityIds.value = [...selectedActivityIds.value, id]
  }
}

const selectedRoom = computed(() => rooms.value.find((room) => String(room.id) === bookingForm.roomTypeId) || null)
const selectedDiningItems = computed(() => diningItems.value.filter((item) => selectedDiningIds.value.includes(item.id)))
const selectedActivityItems = computed(() => activityItems.value.filter((item) => selectedActivityIds.value.includes(item.id)))

const diningTotal = computed(() => selectedDiningItems.value.reduce((sum, item) => sum + (item.price ?? 0), 0))
const activityTotal = computed(() => selectedActivityItems.value.reduce((sum, item) => sum + (item.price ?? 0), 0))
const roomTotal = computed(() => selectedRoom.value?.price ?? 0)
const estimatedTotal = computed(() => roomTotal.value + diningTotal.value + activityTotal.value)

const openBookingModal = () => {
  orderTip.value = ''

  if (!selectedRoom.value) {
    orderTip.value = '请先选择房型'
    return
  }

  if (loginType.value === '') {
    orderTip.value = '请先登录后下单'
    return
  }

  showBookingModal.value = true
}

const closeBookingModal = () => {
  showBookingModal.value = false
}

const submitBooking = async () => {
  if (!farmStay.value) return
  if (!validateBookingForm()) return

  error.value = ''
  try {
    const payload = {
      farmStayId: farmStay.value.id,
      roomTypeId: Number(bookingForm.roomTypeId),
      checkInDate: formatDateTime(bookingForm.checkInDate),
      checkOutDate: formatDateTime(bookingForm.checkOutDate),
      guests: bookingForm.guests,
      couponCode: bookingForm.couponCode || undefined,
      diningItemIds: selectedDiningIds.value,
      activityItemIds: selectedActivityIds.value,
      contactName: bookingForm.contactName,
      contactPhone: bookingForm.contactPhone,
      remarks: bookingForm.remarks || undefined,
    }

    const order = (await apiCreateBooking(payload)) as BookingCreateResponse
    router.push(`/pay/${order.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '下单失败'
  }
}

onMounted(loadDetail)
</script>

<template>
  <main class="page-shell detail-shell">
    <div v-if="loading" class="status">加载中...</div>
    <div v-else-if="error" class="status error">{{ error }}</div>

    <section v-if="farmStay" class="surface hero">
      <div>
        <span class="badge">农家乐详情</span>
        <h1 class="section-title">{{ farmStay.name }}</h1>
        <p class="muted">{{ farmStay.description }}</p>
      </div>
      <div class="hero-meta">
        <p>城市：{{ farmStay.city }}</p>
        <p>联系：{{ farmStay.contactPhone || '暂无' }}</p>
        <p>价格：{{ farmStay.priceRange || farmStay.priceLevel || '面议' }}</p>
      </div>
      <div class="tags">
        <span v-for="tag in (farmStay.tags || '').split(',').filter(Boolean)" :key="tag">{{ tag }}</span>
      </div>
    </section>

    <section class="grid-two">
      <article class="surface-strong block">
        <header class="head-row">
          <h2 class="section-title">房型</h2>
          <p class="muted">先选房，再选餐饮和活动</p>
        </header>

        <div class="card-list">
          <p v-if="!rooms.length" class="muted">暂无房型</p>
          <article v-for="room in rooms" :key="room.id" class="line-item" :class="{ active: bookingForm.roomTypeId === String(room.id) }">
            <div>
              <strong>{{ room.name }}</strong>
              <p class="muted">床型：{{ room.bedType || '-' }} · 人数：{{ room.maxGuests || '-' }} · 库存：{{ room.stock }}</p>
              <p class="muted">标签：{{ room.tags || '-' }}</p>
            </div>
            <div class="item-actions">
              <strong>¥{{ room.price }}</strong>
              <button class="btn btn-secondary" @click="selectRoom(room)">选择</button>
            </div>
          </article>
        </div>
      </article>

      <article class="surface-strong block">
        <header class="head-row">
          <h2 class="section-title">已选服务</h2>
          <p class="muted">确认后直接下单</p>
        </header>

        <div class="summary-list">
          <div><span class="muted">房型</span><strong>{{ selectedRoom?.name || '未选择' }}</strong></div>
          <div>
            <span class="muted">餐饮</span>
            <strong>{{ selectedDiningItems.length ? selectedDiningItems.map((item) => item.name).join('、') : '未选择' }}</strong>
          </div>
          <div>
            <span class="muted">活动</span>
            <strong>{{ selectedActivityItems.length ? selectedActivityItems.map((item) => item.name).join('、') : '未选择' }}</strong>
          </div>
          <div class="total"><span>预计总价</span><strong>¥{{ estimatedTotal }}</strong></div>
        </div>

        <div class="booking-actions">
          <button class="btn btn-primary" :disabled="loginType === ''" @click="openBookingModal">下单</button>
          <p v-if="orderTip" class="status error">{{ orderTip }}</p>
          <p v-if="loginType === ''" class="muted">请先登录后下单</p>
        </div>
      </article>
    </section>

    <section class="grid-two">
      <article class="surface-strong block">
        <header class="head-row">
          <h2 class="section-title">餐饮服务</h2>
        </header>
        <div class="card-list">
          <p v-if="!diningItems.length" class="muted">暂无餐饮信息</p>
          <article v-for="item in diningItems" :key="item.id" class="line-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">{{ item.description || '暂无介绍' }}</p>
              <p class="muted">标签：{{ item.tags || '-' }}</p>
            </div>
            <label class="picker">
              <input type="checkbox" :checked="selectedDiningIds.includes(item.id)" @change="toggleDining(item.id)" />
              <span>¥{{ item.price ?? '-' }}</span>
            </label>
          </article>
        </div>
      </article>

      <article class="surface-strong block">
        <header class="head-row">
          <h2 class="section-title">娱乐活动</h2>
        </header>
        <div class="card-list">
          <p v-if="!activityItems.length" class="muted">暂无活动信息</p>
          <article v-for="item in activityItems" :key="item.id" class="line-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">{{ item.description || '暂无介绍' }}</p>
              <p class="muted">时间：{{ item.schedule || '-' }} · 名额：{{ item.capacity ?? '-' }}</p>
            </div>
            <label class="picker">
              <input type="checkbox" :checked="selectedActivityIds.includes(item.id)" @change="toggleActivity(item.id)" />
              <span>¥{{ item.price ?? '-' }}</span>
            </label>
          </article>
        </div>
      </article>
    </section>

    <section class="surface-strong block">
      <header class="head-row">
        <h2 class="section-title">评价</h2>
      </header>
      <div class="card-list">
        <p v-if="!reviews.length" class="muted">暂无评价</p>
        <article v-for="r in reviews" :key="r.id" class="line-item review-row">
          <div>
            <div class="stars">
              <span v-for="star in ratingStars" :key="star" :class="{ active: r.rating >= star }">★</span>
              <span class="muted">({{ r.rating }}/5)</span>
            </div>
            <p>{{ r.content }}</p>
            <p class="muted">时间：{{ r.createdAt?.slice(0, 10) }}</p>
          </div>
        </article>
      </div>
    </section>
  </main>

  <Teleport to="body">
    <div v-if="showBookingModal" class="modal-backdrop" @click.self="closeBookingModal">
      <div class="modal-card surface-strong">
        <header class="head-row">
          <h3 class="section-title">填写预订信息</h3>
          <button class="btn btn-secondary" @click="closeBookingModal">关闭</button>
        </header>

        <div class="summary-box">
          <p><strong>房型：</strong>{{ selectedRoom?.name || '-' }}</p>
          <p><strong>餐饮：</strong>{{ selectedDiningItems.length ? selectedDiningItems.map((item) => item.name).join('、') : '无' }}</p>
          <p><strong>活动：</strong>{{ selectedActivityItems.length ? selectedActivityItems.map((item) => item.name).join('、') : '无' }}</p>
          <p><strong>预计总价：</strong>¥{{ estimatedTotal }}</p>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>房型ID</span>
            <input v-model="bookingForm.roomTypeId" class="input" />
            <small class="form-error">{{ formErrors.roomTypeId }}</small>
          </label>
          <label class="field">
            <span>入住日期</span>
            <input v-model="bookingForm.checkInDate" class="input" type="date" />
            <small class="form-error">{{ formErrors.checkInDate }}</small>
          </label>
          <label class="field">
            <span>离店日期</span>
            <input v-model="bookingForm.checkOutDate" class="input" type="date" />
            <small class="form-error">{{ formErrors.checkOutDate }}</small>
          </label>
          <label class="field">
            <span>人数</span>
            <input v-model.number="bookingForm.guests" class="input" type="number" min="1" />
          </label>
          <label v-if="coupons.length" class="field">
            <span>优惠券</span>
            <select v-model="bookingForm.couponCode" class="select">
              <option value="">不使用优惠券</option>
              <option v-for="c in coupons" :key="c.code" :value="c.code">{{ c.title }}（{{ c.code }}）</option>
            </select>
          </label>
          <label class="field">
            <span>联系人</span>
            <input v-model="bookingForm.contactName" class="input" />
            <small class="form-error">{{ formErrors.contactName }}</small>
          </label>
          <label class="field">
            <span>电话</span>
            <input v-model="bookingForm.contactPhone" class="input" />
            <small class="form-error">{{ formErrors.contactPhone }}</small>
          </label>
          <label class="field">
            <span>备注</span>
            <textarea v-model="bookingForm.remarks" class="textarea" />
          </label>
        </div>

        <footer class="modal-actions">
          <button class="btn btn-secondary" @click="closeBookingModal">取消</button>
          <button class="btn btn-primary" @click="submitBooking">提交并支付</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.detail-shell {
  display: grid;
  gap: 12px;
}

.hero {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.hero-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--ink-soft);
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tags span {
  border-radius: 999px;
  padding: 4px 10px;
  background: #edf4eb;
  color: var(--brand);
  font-size: 12px;
}

.block {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.line-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 12px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.line-item.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(47, 106, 73, 0.12);
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.item-actions strong {
  color: var(--brand);
}

.summary-list {
  display: grid;
  gap: 8px;
}

.summary-list div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.summary-list .total {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--line-strong);
}

.summary-list .total strong {
  color: var(--brand);
  font-size: 20px;
}

.booking-actions {
  display: grid;
  gap: 8px;
}

.picker {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--brand);
  font-weight: 600;
}

.review-row {
  display: block;
}

.stars {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}

.stars span {
  color: #c7d0c8;
}

.stars span.active {
  color: #e69c32;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(22, 31, 24, 0.48);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  z-index: 20;
}

.modal-card {
  width: min(760px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.summary-box {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: #fff;
  padding: 12px;
  display: grid;
  gap: 4px;
}

.form-error {
  color: var(--danger);
  min-height: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 820px) {
  .head-row,
  .line-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-actions {
    align-items: flex-start;
    flex-direction: row;
  }
}
</style>
