<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  apiFarmstayDetail,
  apiListRooms,
  apiListReviews,
  apiCreateBooking,
  apiListCoupons,
  apiListDining,
  apiListActivities,
} from '../services/api'
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

const formatDateTime = (date: string) => {
  if (!date) return ''
  return new Date(date).toISOString()
}

const resetFormErrors = () => {
  formErrors.roomTypeId = ''
  formErrors.checkInDate = ''
  formErrors.checkOutDate = ''
  formErrors.contactName = ''
  formErrors.contactPhone = ''
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
    formErrors.checkOutDate = '请选择退房日期'
    valid = false
  }
  if (bookingForm.checkInDate && bookingForm.checkOutDate) {
    const inDate = new Date(bookingForm.checkInDate)
    const outDate = new Date(bookingForm.checkOutDate)
    if (outDate <= inDate) {
      formErrors.checkOutDate = '退房时间必须晚于入住时间'
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
    const detail = (await apiFarmstayDetail(id)) as FarmStay
    farmStay.value = detail
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

const selectedRoom = computed(() => {
  return rooms.value.find((room) => String(room.id) === bookingForm.roomTypeId) || null
})

const selectedDiningItems = computed(() => {
  return diningItems.value.filter((item) => selectedDiningIds.value.includes(item.id))
})

const selectedActivityItems = computed(() => {
  return activityItems.value.filter((item) => selectedActivityIds.value.includes(item.id))
})

const diningTotal = computed(() => {
  return selectedDiningItems.value.reduce((sum, item) => sum + (item.price ?? 0), 0)
})

const activityTotal = computed(() => {
  return selectedActivityItems.value.reduce((sum, item) => sum + (item.price ?? 0), 0)
})

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
  if (!validateBookingForm()) {
    return
  }
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
      <div class="muted">
        城市：{{ farmStay.city }} · 联系：{{ farmStay.contactPhone || '暂无' }}
      </div>
      <div class="tags">
        <span v-for="tag in (farmStay.tags || '').split(',').filter(Boolean)" :key="tag">{{
          tag
        }}</span>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <header class="card-header">
          <h2>房型</h2>
          <span class="muted">选择房型后再组合餐饮与活动服务</span>
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
                床型：{{ room.bedType || '-' }} · 人数：{{ room.maxGuests || '-' }} · 库存：{{
                  room.stock
                }}
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
          <h2>已选服务</h2>
          <span class="muted">选择房型、餐饮和活动后再下单</span>
        </header>
        <div class="summary-list">
          <div class="summary-item">
            <span class="muted">房型</span>
            <strong>{{ selectedRoom?.name || '未选择' }}</strong>
          </div>
          <div class="summary-item">
            <span class="muted">餐饮服务</span>
            <span>{{
              selectedDiningItems.length
                ? selectedDiningItems.map((item) => item.name).join('、')
                : '未选择'
            }}</span>
          </div>
          <div class="summary-item">
            <span class="muted">娱乐活动</span>
            <span>{{
              selectedActivityItems.length
                ? selectedActivityItems.map((item) => item.name).join('、')
                : '未选择'
            }}</span>
          </div>
          <div class="summary-item total">
            <span>预估总价</span>
            <strong>¥{{ estimatedTotal }}</strong>
          </div>
          <div class="btn-row">
            <button class="btn primary" :disabled="loginType === ''" @click="openBookingModal">
              下单
            </button>
            <span v-if="orderTip" class="field-error">{{ orderTip }}</span>
          </div>
          <div v-if="loginType === ''" class="muted note">请先登录后下单</div>
        </div>
      </article>
    </section>

    <section class="grid">
      <article class="card">
        <header class="card-header">
          <h2>餐饮服务</h2>
          <span class="muted">选择需要的餐饮套餐</span>
        </header>
        <div class="list">
          <div v-if="!diningItems.length" class="muted">暂无餐饮信息</div>
          <div v-for="item in diningItems" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">{{ item.description || '暂无介绍' }}</p>
              <p class="muted">标签：{{ item.tags || '-' }}</p>
            </div>
            <div class="list-actions">
              <span class="price">¥{{ item.price ?? '-' }}</span>
              <label class="chip">
                <input
                  type="checkbox"
                  :checked="selectedDiningIds.includes(item.id)"
                  @change="toggleDining(item.id)"
                />
                选择
              </label>
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <header class="card-header">
          <h2>娱乐活动</h2>
          <span class="muted">选择需要的活动项目</span>
        </header>
        <div class="list">
          <div v-if="!activityItems.length" class="muted">暂无活动信息</div>
          <div v-for="item in activityItems" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">{{ item.description || '暂无介绍' }}</p>
              <p class="muted">
                时间：{{ item.schedule || '-' }} · 名额：{{ item.capacity ?? '-' }}
              </p>
              <p class="muted">标签：{{ item.tags || '-' }}</p>
            </div>
            <div class="list-actions">
              <span class="price">¥{{ item.price ?? '-' }}</span>
              <label class="chip">
                <input
                  type="checkbox"
                  :checked="selectedActivityIds.includes(item.id)"
                  @change="toggleActivity(item.id)"
                />
                选择
              </label>
            </div>
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
              <span
                v-for="star in ratingStars"
                :key="star"
                class="star"
                :class="{ active: r.rating >= star }"
                >★</span
              >
              <span class="muted">({{ r.rating }}/5)</span>
            </div>
            <p class="muted">{{ r.content }}</p>
            <p class="muted">时间：{{ r.createdAt?.slice(0, 10) }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <Teleport to="body">
    <div v-if="showBookingModal" class="modal-backdrop" @click.self="closeBookingModal">
      <div class="modal-card">
        <header class="modal-header">
          <h3>填写预订信息</h3>
          <button class="btn" @click="closeBookingModal">关闭</button>
        </header>
        <div class="modal-body">
          <div class="summary">
            <div>
              <strong>已选房型：</strong>
              <span>{{ selectedRoom?.name || '-' }}</span>
            </div>
            <div>
              <strong>餐饮：</strong>
              <span>{{
                selectedDiningItems.length
                  ? selectedDiningItems.map((item) => item.name).join('、')
                  : '无'
              }}</span>
            </div>
            <div>
              <strong>活动：</strong>
              <span>{{
                selectedActivityItems.length
                  ? selectedActivityItems.map((item) => item.name).join('、')
                  : '无'
              }}</span>
            </div>
            <div class="summary-total">
              <span>预估总价</span>
              <strong>¥{{ estimatedTotal }}</strong>
            </div>
          </div>
          <div class="form">
            <label
              >房型ID
              <input
                v-model="bookingForm.roomTypeId"
                :class="{ 'input-error': formErrors.roomTypeId }"
              />
              <span class="field-error" v-if="formErrors.roomTypeId">{{
                formErrors.roomTypeId
              }}</span>
            </label>
            <label
              >入住日期
              <input
                v-model="bookingForm.checkInDate"
                type="date"
                :class="{ 'input-error': formErrors.checkInDate }"
              />
              <span class="field-error" v-if="formErrors.checkInDate">{{
                formErrors.checkInDate
              }}</span>
            </label>
            <label
              >退房日期
              <input
                v-model="bookingForm.checkOutDate"
                type="date"
                :class="{ 'input-error': formErrors.checkOutDate }"
              />
              <span class="field-error" v-if="formErrors.checkOutDate">{{
                formErrors.checkOutDate
              }}</span>
            </label>
            <label>人数 <input v-model.number="bookingForm.guests" type="number" min="1" /></label>
            <label v-if="coupons.length">
              可用优惠券
              <select v-model="bookingForm.couponCode">
                <option value="">不使用优惠券</option>
                <option v-for="c in coupons" :key="c.code" :value="c.code">
                  {{ c.title }}（{{ c.code }}）
                </option>
              </select>
            </label>
            <div v-else class="muted note">暂无可用优惠券</div>
            <label
              >联系人
              <input
                v-model="bookingForm.contactName"
                :class="{ 'input-error': formErrors.contactName }"
              />
              <span class="field-error" v-if="formErrors.contactName">{{
                formErrors.contactName
              }}</span>
            </label>
            <label
              >电话
              <input
                v-model="bookingForm.contactPhone"
                :class="{ 'input-error': formErrors.contactPhone }"
              />
              <span class="field-error" v-if="formErrors.contactPhone">{{
                formErrors.contactPhone
              }}</span>
            </label>
            <label>备注 <textarea v-model="bookingForm.remarks"></textarea></label>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="btn" @click="closeBookingModal">取消</button>
          <button class="btn primary" @click="submitBooking">提交并支付</button>
        </footer>
      </div>
    </div>
  </Teleport>
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
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
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
.form textarea,
.form select {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.25);
}

.field-error {
  color: #ef4444;
  font-size: 0.85rem;
  min-height: 1.2em;
}

.note {
  font-size: 0.85rem;
  color: #64748b;
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

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-item.total {
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
}

.summary-item.total strong {
  color: #0f766e;
  font-size: 1.1rem;
}

.chip {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  font-size: 0.85rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 40;
}

.modal-card {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header,
.modal-footer {
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-footer {
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
}

.modal-body {
  padding: 1rem 1.2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary {
  display: grid;
  gap: 0.5rem;
  background: #f8fafc;
  border-radius: 12px;
  padding: 0.8rem 1rem;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px dashed #cbd5e1;
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
