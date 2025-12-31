<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFarmstayDetail, apiListRooms, apiListReviews, apiCreateBooking, apiListCoupons } from '../services/api'
import { useAuthState } from '../composables/auth'

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
  farmStayId: number
}

type Review = {
  id: number
  rating: number
  content: string
  status: string
  createdAt: string
}

type Booking = {
  id: number
  orderNo: string
  totalAmount: number
  status: string
  roomTypeId: number
}

const route = useRoute()
const router = useRouter()
const { payload } = useAuthState()
const loginType = computed(() => payload.value?.loginType ?? '')

const farmStay = ref<FarmStay | null>(null)
const rooms = ref<Room[]>([])
const reviews = ref<Review[]>([])
const coupons = ref<{ code: string; title: string }[]>([])
const loading = ref(false)
const error = ref('')

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

const ratingStars = [1, 2, 3, 4, 5]

const formatDateTime = (date: string) => {
  if (!date) return ''
  return new Date(date).toISOString()
}

const loadDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.params.id)
    const detail = (await apiFarmstayDetail(id)) as FarmStay
    farmStay.value = detail
    rooms.value = (await apiListRooms(id)) as Room[]
    reviews.value = (await apiListReviews(id)) as Review[]
    coupons.value = (await apiListCoupons(id)) as { code: string; title: string }[]
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

const submitBooking = async () => {
  if (!farmStay.value) return
  try {
    const payload = {
      farmStayId: farmStay.value.id,
      roomTypeId: Number(bookingForm.roomTypeId),
      checkInDate: formatDateTime(bookingForm.checkInDate),
      checkOutDate: formatDateTime(bookingForm.checkOutDate),
      guests: bookingForm.guests,
      couponCode: bookingForm.couponCode || undefined,
      contactName: bookingForm.contactName,
      contactPhone: bookingForm.contactPhone,
      remarks: bookingForm.remarks || undefined,
    }
    const order = (await apiCreateBooking(payload)) as Booking
    router.push(`/pay/${order.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '下单失败'
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <main class="detail-page">
    <div v-if="loading" class="status-card">加载中...</div>
    <div v-else-if="error" class="status-card error">{{ error }}</div>

    <section v-if="farmStay" class="card">
      <header class="card-header">
        <div>
          <p class="pill">农家乐</p>
          <h1>{{ farmStay.name }}</h1>
          <p class="muted">{{ farmStay.description }}</p>
        </div>
        <div class="stat-block">
          <span>价格: </span>
          <strong>{{ farmStay.priceRange || farmStay.priceLevel || '面议' }}</strong>
        </div>
      </header>
      <div class="muted">城市：{{ farmStay.city }} · 联系：{{ farmStay.contactPhone || '暂无' }}</div>
      <div class="tags">
        <span v-for="tag in (farmStay.tags || '').split(',').filter(Boolean)" :key="tag">{{ tag }}</span>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <header class="card-header">
          <h2>房型</h2>
          <span class="muted">选择房型后填写入住信息</span>
        </header>
        <div class="list">
          <div v-if="!rooms.length" class="muted">暂无房型</div>
          <div
            v-for="room in rooms"
            :key="room.id"
            class="list-item"
            :class="{ active: bookingForm.roomTypeId === String(room.id) }"
          >
            <div>
              <strong>{{ room.name }}</strong>
              <p class="muted">
                床型：{{ room.bedType || '-' }} · 人数：{{ room.maxGuests || '-' }} · 库存：{{ room.stock }}
              </p>
              <p class="muted">标签：{{ room.tags || '无' }}</p>
            </div>
            <div class="list-actions">
              <span class="price">¥{{ room.price }}</span>
              <button class="btn" @click="selectRoom(room)">选择</button>
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <header class="card-header">
          <h2>提交预订</h2>
          <span class="muted">需登录后下单，创建后跳转支付页</span>
        </header>
        <div class="form">
          <label>房型ID <input v-model="bookingForm.roomTypeId" /></label>
          <label>入住日期 <input v-model="bookingForm.checkInDate" type="date" /></label>
          <label>离店日期 <input v-model="bookingForm.checkOutDate" type="date" /></label>
          <label>人数 <input v-model.number="bookingForm.guests" type="number" min="1" /></label>
          <label>优惠券码 <input v-model="bookingForm.couponCode" placeholder="可选" /></label>
          <label>联系人<input v-model="bookingForm.contactName" /></label>
          <label>电话 <input v-model="bookingForm.contactPhone" /></label>
          <label>备注 <textarea v-model="bookingForm.remarks"></textarea></label>
          <div class="btn-row">
            <button class="btn primary" :disabled="loginType === ''" @click="submitBooking">下单并去支付</button>
          </div>
          <div v-if="coupons.length" class="muted">
            可用优惠券：<span v-for="c in coupons" :key="c.code">{{ c.title }} ({{ c.code }})；</span>
          </div>
        </div>
      </article>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>评价</h2>
      </header>
      <div class="list">
        <div v-if="!reviews.length" class="muted">暂无评价</div>
        <div v-for="r in reviews" :key="r.id" class="list-item">
          <div>
            <div class="star-row readonly">
              <span v-for="star in ratingStars" :key="star" class="star" :class="{ active: r.rating >= star }">★</span>
              <span class="muted">({{ r.rating }}/5)</span>
            </div>
            <p class="muted">{{ r.content }}</p>
            <p class="muted">状态：{{ r.status }} · 时间：{{ r.createdAt?.slice(0, 10) }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 2rem;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

h1,
h2,
h3,
h4,
strong {
  color: #0f172a;
}
.pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfeff;
  color: #0ea5e9;
  margin-bottom: 6px;
}

.muted {
  color: #64748b;
  font-size: 0.95rem;
}

.tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tags span {
  background: #ecfdf5;
  color: #065f46;
  padding: 4px 10px;
  border-radius: 10px;
}

.stat-block {
  padding: 0.8rem 1rem;
  background: #0f766e;
  color: #fff;
  border-radius: 12px;
  text-align: right;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
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
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.list-item.active {
  border-color: #0f766e;
  background: #ecfdf3;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
}

.list-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-end;
}

.price {
  color: #0f766e;
  font-weight: 700;
}

.form {
  display: flex;
  flex-direction: column; 
  gap: 0.6rem;
  color: #0f172a;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.95rem;
}

.form input,
.form textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.btn-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
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

.status-card {
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0f172a;
}

.status-card.error {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
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

.star-row.readonly .star {
  cursor: default;
}

@media (max-width: 720px) {
  .list-item {
    flex-direction: column;
  }
}
</style>
