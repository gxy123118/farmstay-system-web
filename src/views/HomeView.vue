<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiOverview, apiRecommendations, apiListFarmstays } from '../services/api'
import { useAuthState } from '../composables/auth'

type FarmStay = {
  id: number
  name: string
  city: string
  description: string
  coverImage?: string
  priceRange?: string
  priceLevel?: string
  averageRating?: number
  tags?: string
}

type HomeOverview = {
  publishedFarmstays: number
  dailyOrders: number
  averageRating: number
}

const router = useRouter()
const { isAuthenticated } = useAuthState()

const heroStats = ref([
  { label: '合作农家乐', value: '--' },
  { label: '日均订单', value: '--' },
  { label: '平均评分', value: '--' },
])

const stays = ref<FarmStay[]>([])
const isLoading = ref(false)
const error = ref('')

const filters = reactive({
  city: '',
  keyword: '',
  priceLevel: '',
  tag: '',
})

const fetchOverview = async () => {
  try {
    const data = (await apiOverview()) as HomeOverview
    heroStats.value = [
      { label: '合作农家乐', value: `${data.publishedFarmstays}` },
      { label: '日均订单', value: `${data.dailyOrders}` },
      { label: '平均评分', value: `${data.averageRating?.toFixed?.(1) ?? '0.0'}` },
    ]
  } catch (err) {
    console.error(err)
  }
}

const fetchRecommendations = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const list = await apiRecommendations({
      city: filters.city.trim() || undefined,
      priceLevel: filters.priceLevel || undefined,
      tag: filters.tag || undefined,
    })
    stays.value = Array.isArray(list) ? list : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '推荐获取失败'
  } finally {
    isLoading.value = false
  }
}

const search = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const list = await apiListFarmstays({
      city: filters.city || undefined,
      keyword: filters.keyword || undefined,
      priceLevel: filters.priceLevel || undefined,
      tag: filters.tag || undefined,
    })
    stays.value = Array.isArray(list) ? list : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '搜索失败'
  } finally {
    isLoading.value = false
  }
}

const toDetail = (id: number) => {
  router.push({ name: 'farmstay-detail', params: { id } })
}

onMounted(() => {
  fetchOverview()
  fetchRecommendations()
})
</script>

<template>
  <div class="home-page">
    <header class="home-topbar">
      <div>
        <h2>一处入口，掌握所有农家乐体验</h2>
        <p>游客浏览/预订/评价，经营者同步管理房型、订单与优惠券</p>
      </div>
      <button class="auth-button" type="button" @click="$router.push(isAuthenticated ? '/personal' : '/login')">
        {{ isAuthenticated ? '进入个人中心' : '登录/注册' }}
      </button>
    </header>

    <section class="home-hero">
      <div class="hero-content">
        <p class="eyebrow">乡野与智能的预订平台</p>
        <h1>发现并预订真实的乡村度假</h1>
        <p class="hero-subtitle">真实评价、实时库存、优惠券、模拟支付全流程。</p>
        <div class="hero-stats">
          <article v-for="stat in heroStats" :key="stat.label">
            <span class="stat-number">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="home-search">
      <div class="search-form">
        <label>
          <span>城市</span>
          <input v-model="filters.city" type="text" placeholder="如 成都 / 杭州" />
        </label>
        <label>
          <span>关键词</span>
          <input v-model="filters.keyword" type="text" placeholder="名称或标签" />
        </label>
        <label>
          <span>价格等级</span>
          <select v-model="filters.priceLevel">
            <option value="">不限</option>
            <option value="standard">standard</option>
            <option value="premium">premium</option>
          </select>
        </label>
        <label>
          <span>标签</span>
          <input v-model="filters.tag" type="text" placeholder="tea,bbq,spa..." />
        </label>
        <div class="search-actions">
          <button class="btn-primary" type="button" @click="search">搜索</button>
          <button class="btn-secondary" type="button" @click="fetchRecommendations">刷新推荐</button>
        </div>
      </div>
    </section>

    <section class="stay-list">
      <header>
        <h2>农家乐列表</h2>
        <p>点击查看详情与预订</p>
      </header>
      <div class="stay-grid-container">
        <div v-if="isLoading" class="stay-loading">正在加载...</div>
        <div v-else-if="error" class="stay-error">{{ error }}</div>
        <div v-else-if="!stays.length" class="stay-empty">暂无数据，试试更宽松的筛选</div>
        <div v-else class="stay-grid">
          <article
            v-for="stay in stays"
            :key="stay.id"
            class="stay-card"
            :style="{
              backgroundImage: stay.coverImage
                ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 65%), url(${stay.coverImage})`
                : 'linear-gradient(135deg, #0f766e, #0b1a31)',
            }"
            @click="toDetail(stay.id)"
          >
            <div class="stay-body">
              <div class="stay-head">
                <div class="stay-title">
                  <h3>{{ stay.name }}</h3>
                  <p>{{ stay.city }}</p>
                </div>
                <span class="stay-rating">★ {{ typeof stay.averageRating === 'number' ? stay.averageRating.toFixed(1) : '—' }}</span>
              </div>
              <p class="stay-description">{{ stay.description }}</p>
              <div class="stay-footer">
                <p class="stay-price">{{ stay.priceRange || stay.priceLevel || '价格面议' }}</p>
                <div class="stay-tags">
                  <span
                    v-for="tag in (stay.tags || '')
                      .split(',')
                      .filter(Boolean)
                      .slice(0, 2)"
                    :key="tag"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem;
  background:
    radial-gradient(circle at top, rgba(29, 140, 248, 0.25), transparent 40%),
    radial-gradient(circle at 20% 20%, rgba(252, 211, 77, 0.3), transparent 45%), var(--color-dusk);
}

.home-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 18px;
  background: linear-gradient(135deg, #0f766e, #22d3ee);
  box-shadow: 0 15px 30px rgba(15, 23, 42, 0.12);
  color: #fff;
}

.auth-button {
  border-radius: 999px;
  border: none;
  padding: 0.6rem 1.2rem;
  background: #fff;
  color: #0f766e;
  font-weight: 600;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
}

.home-hero {
  background: linear-gradient(135deg, #0f766e, #22d3ee);
  border-radius: 24px;
  padding: 2.5rem;
  color: #fff;
  box-shadow: 0 20px 45px rgba(15, 118, 110, 0.35);
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eyebrow {
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.9;
}

.hero-subtitle {
  max-width: 520px;
  line-height: 1.6;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.hero-stats article {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 0.8rem 1rem;
}

.stat-number {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
}

.stat-label {
  opacity: 0.85;
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
}

.search-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #1f2937;
  gap: 0.35rem;
}

.search-form input,
.search-form select {
  border: 1px solid #0f766e;
  border-radius: 12px;
  padding: 0.7rem;
  font-size: 1rem;
}

.search-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-primary,
.btn-secondary {
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #0f766e;
  color: #fff;
}

.btn-secondary {
  background: #ecfeff;
  color: #0f766e;
  border: 1px solid #0ea5e9;
}

.stay-list header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: #fff;
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
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.2rem;
}

.stay-card {
  position: relative;
  min-height: 260px;
  border-radius: 18px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.2);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  color: #fff;
}

.stay-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 25px 45px rgba(15, 23, 42, 0.28);
}

.stay-body {
  position: absolute;
  inset: 0;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.7) 65%, rgba(0, 0, 0, 0.85) 100%);
}

.stay-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.stay-title h3 {
  margin: 0;
  color: #ecfeff;
  line-height: 1.2;
  font-size: 1.05rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stay-title p {
  margin: 2px 0 0;
  color: rgba(236, 254, 255, 0.8);
  font-size: 0.95rem;
}

.stay-rating {
  min-width: 60px;
  text-align: right;
  font-weight: 700;
  color: #facc15;
  display: inline-flex;
  justify-content: flex-end;
}

.stay-description {
  margin: 0.6rem 0;
  color: rgba(236, 254, 255, 0.85);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stay-footer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stay-price {
  font-weight: 800;
  color: #34d399;
  margin: 0;
}

.stay-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.stay-tags span {
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
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
