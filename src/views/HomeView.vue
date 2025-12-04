<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthState } from '../composables/auth'

type HeroStat = { label: string; value: string }

type StayCard = {
  id: number
  name: string
  city: string
  description: string
  coverImage?: string
  priceRange?: string
  averageRating?: number
  tags: string[]
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const heroStats = ref<HeroStat[]>([
  { label: '合作农家乐', value: '--' },
  { label: '日均订单', value: '--' },
  { label: '平均评分', value: '--' },
])

const stays = ref<StayCard[]>([])
const isLoadingStays = ref(false)
const staysError = ref('')

const searchForm = reactive({
  location: '',
  dateRange: '',
  price: 'all',
  roomType: 'all',
})

const amenities = [
  { label: '真实评价', description: '每条评论均由入住游客认证发布，避免刷单困扰。' },
  { label: '便捷预订', description: '支持多日组合、房型搭配，一站式完成下单。' },
  { label: '安全支付', description: '支付宝、微信与银行卡多渠道结算，定期对账。' },
  { label: '经营者直连', description: '房态、活动与优惠由经营者实时更新，信息同步。' },
]

const formatTags = (raw?: string) => {
  if (!raw) {
    return []
  }
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag)
}

const loadOverview = async () => {
  try {
    const response = await fetch(`${apiBase}/api/home/overview`)
    const payload = await response.json()
    if (!response.ok || payload.code !== 200) {
      throw new Error(payload.message || '无法获取首页统计')
    }
    const data = payload.data
    const averageRating =
      typeof data.averageRating === 'number' && !Number.isNaN(data.averageRating)
        ? data.averageRating.toFixed(1)
        : '0.0'
    heroStats.value = [
      { label: '合作农家乐', value: `${data.publishedFarmstays}` },
      { label: '日均订单', value: `${data.dailyOrders}` },
      { label: '平均评分', value: averageRating },
    ]
  } catch (error) {
    console.error(error)
    heroStats.value = [
      { label: '合作农家乐', value: '0' },
      { label: '日均订单', value: '0' },
      { label: '平均评分', value: '0.0' },
    ]
  }
}

const buildRecommendationUrl = () => {
  const params = new URLSearchParams()
  if (searchForm.location.trim()) {
    params.append('city', searchForm.location.trim())
  }
  if (searchForm.price !== 'all') {
    params.append('priceLevel', searchForm.price)
  }
  if (searchForm.roomType !== 'all') {
    params.append('tag', searchForm.roomType)
  }
  const query = params.toString()
  return `${apiBase}/api/home/recommendations${query ? `?${query}` : ''}`
}

const loadRecommendations = async () => {
  isLoadingStays.value = true
  staysError.value = ''
  try {
    const response = await fetch(buildRecommendationUrl())
    const payload = await response.json()
    if (!response.ok || payload.code !== 200) {
      throw new Error(payload.message || '无法获取推荐房源')
    }
    const list = Array.isArray(payload.data) ? payload.data : []
    stays.value = list.map((item: any) => ({
      id: item.id,
      name: item.name,
      city: item.city,
      description: item.description,
      coverImage: item.coverImage,
      priceRange: item.priceRange,
      averageRating: item.averageRating,
      tags: formatTags(item.tags),
    }))
  } catch (error) {
    console.error(error)
    staysError.value = '房源加载失败，请稍后重试'
  } finally {
    isLoadingStays.value = false
  }
}

const applyFilters = () => {
  loadRecommendations()
}

const router = useRouter()
const { payload: authPayload, isAuthenticated } = useAuthState()

const avatarInitial = computed(() => {
  const name = authPayload.value?.displayName || authPayload.value?.username
  if (!name) {
    return '我'
  }
  return name.charAt(0).toUpperCase()
})

const handleAuthButton = () => {
  if (isAuthenticated.value) {
    router.push({ name: 'personal' })
  } else {
    router.push({ name: 'login' })
  }
}

onMounted(() => {
  loadOverview()
  loadRecommendations()
})
</script>

<template>
  <div class="home-page">
    <header class="home-topbar">
      <div>
        <p class="topbar-eyebrow">连接游客与经营者的乡野旅居平台</p>
        <h2>一处入口，掌握所有农家乐体验</h2>
      </div>
      <button class="auth-button" type="button" @click="handleAuthButton">
        <span v-if="isAuthenticated" class="auth-avatar">{{ avatarInitial }}</span>
        <span>{{ isAuthenticated ? '个人中心' : '登录' }}</span>
      </button>
    </header>
    <section class="home-hero">
      <div class="hero-header">
        <p>乡野与智能相遇的旅居平台</p>
        <h1>发现与预订真正适合你的农家乐</h1>
        <p class="hero-subtitle">
          支持游客端浏览比对、预订和评价，也为经营者提供完整的客流、订单与评论控制台。
        </p>
      </div>
      <div class="hero-actions">
        <button class="btn-primary" type="button">立即浏览房源</button>
      </div>
      <div class="hero-stats">
        <article v-for="stat in heroStats" :key="stat.label">
          <span class="stat-number">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </article>
      </div>
    </section>

    <section class="home-search">
      <h2>精准搜索与筛选</h2>
      <div class="search-form">
        <label>
          <span>目的地</span>
          <input v-model="searchForm.location" type="text" placeholder="例如：安吉、都江堰" />
        </label>
        <label>
          <span>入住时间</span>
          <input v-model="searchForm.dateRange" type="text" placeholder="选择日期范围" />
        </label>
        <label>
          <span>价格等级</span>
          <select v-model="searchForm.price">
            <option value="all">全部</option>
            <option value="standard">4-6百档</option>
            <option value="premium">6百以上</option>
          </select>
        </label>
        <label>
          <span>特色房型</span>
          <select v-model="searchForm.roomType">
            <option value="all">全部</option>
            <option value="亲子">亲子</option>
            <option value="户外">户外</option>
            <option value="茶">茶</option>
          </select>
        </label>
        <button type="button" class="btn-outline" @click="applyFilters">应用筛选</button>
      </div>
    </section>

    <section class="stay-list">
      <header>
        <h2>推荐农家乐</h2>
        <p>实时库存、服务与点评同步更新。</p>
      </header>
      <div class="stay-grid-container">
        <div v-if="isLoadingStays" class="stay-loading">正在加载房源…</div>
        <div v-else-if="staysError" class="stay-error">{{ staysError }}</div>
        <div v-else-if="!stays.length" class="stay-empty">暂无匹配的推荐，可扩大筛选条件。</div>
        <div v-else class="stay-grid">
          <article v-for="stay in stays" :key="stay.id" class="stay-card">
            <div
              class="stay-image"
              :style="stay.coverImage ? { backgroundImage: `url(${stay.coverImage})` } : {}"
            ></div>
            <div class="stay-body">
              <div class="stay-head">
                <div>
                  <h3>{{ stay.name }}</h3>
                  <p>{{ stay.city }}</p>
                </div>
                <span class="stay-rating">
                  ★ {{ stay.averageRating ? stay.averageRating.toFixed(1) : '—' }}
                </span>
              </div>
              <p class="stay-description">{{ stay.description }}</p>
              <p class="stay-price">{{ stay.priceRange || '价格面议' }}</p>
              <div class="stay-tags">
                <span v-for="tag in stay.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="amenities">
      <h2>平台能力</h2>
      <div class="amenity-grid">
        <article v-for="item in amenities" :key="item.label">
          <h3>{{ item.label }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="cta">
      <h2>经营者与游客，同步掌控</h2>
      <p>经营者可实时管理房间、订单与活动；游客可以随时预订与评价，数据闭环可信。</p>
      <p class="cta-note">登录入口已移至右上角，可在任意页面唤起。</p>
    </section>
  </div>
</template>
<style>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem;
}

.home-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 15px 30px rgba(15, 23, 42, 0.12);
}

.topbar-eyebrow {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #0f766e;
}

.auth-button {
  border-radius: 999px;
  border: none;
  padding: 0.6rem 1.2rem;
  background: #0f766e;
  color: #fff;
  font-weight: 600;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
}

.auth-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #10b981;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.home-hero {
  background: linear-gradient(135deg, #0f766e, #34d399);
  border-radius: 24px;
  padding: 2.5rem;
  color: #fff;
  box-shadow: 0 20px 45px rgba(15, 118, 110, 0.35);
}

.hero-header h1 {
  font-size: 2.8rem;
  margin: 0.5rem 0;
}

.hero-subtitle {
  max-width: 480px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary,
.btn-outline {
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.btn-primary {
  background: #fff;
  color: #0f766e;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.5);
  text-decoration: none;
}

.button-group :is(.btn-primary, .btn-secondary):hover,
.btn-outline:hover {
  transform: translateY(-1px);
}

.home-search {
  background: #fff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.08);
}

.search-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.search-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #1f2937;
  gap: 0.35rem;
}

.search-form input,
.search-form select {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 0.7rem;
  font-size: 1rem;
}

.btn-outline {
  border: 1px solid #0f766e;
  background: transparent;
  color: #0f766e;
  place-self: flex-end;
}

.stay-list header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stay-grid-container {
  margin-top: 1.5rem;
}

.stay-loading,
.stay-error,
.stay-empty {
  padding: 1.5rem;
  border-radius: 18px;
  text-align: center;
  background: #fff;
  color: #0f172a;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
}

.stay-error {
  color: #b91c1c;
}

.stay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.stay-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 45px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
}

.stay-image {
  height: 160px;
  background-size: cover;
  background-position: center;
  background-color: #e2e8f0;
}

.stay-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.stay-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.stay-head h3 {
  margin: 0;
}

.stay-rating {
  font-weight: 600;
  color: #0f766e;
}

.stay-description {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.stay-price {
  font-weight: 700;
  color: #0f766e;
}

.stay-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stay-tags span {
  background: #ecfdf5;
  color: #065f46;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
}

.amenities {
  background: #f8fafc;
  border-radius: 24px;
  padding: 2rem;
}

.amenity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.2rem;
}

.amenity-grid article {
  background: #fff;
  border-radius: 18px;
  padding: 1.2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.cta {
  background: #0f172a;
  color: #fff;
  border-radius: 24px;
  padding: 2rem;
  text-align: center;
}

.cta-note {
  color: #a5f3fc;
  margin-top: 1rem;
  font-weight: 500;
}

@media (max-width: 780px) {
  .home-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .auth-button {
    align-self: flex-end;
  }
}
</style>
