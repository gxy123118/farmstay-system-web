<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiOverview, apiRecommendations, apiListFarmstays } from '../services/api'
import { useAuthState } from '../composables/auth'
import HomeFloatingAssistant from '../components/ai/HomeFloatingAssistant.vue'

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

type PageResponse<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
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
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(8)

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
      { label: '合作农家乐', value: String(data.publishedFarmstays) },
      { label: '日均订单', value: String(data.dailyOrders) },
      { label: '平均评分', value: `${data.averageRating?.toFixed?.(1) ?? '0.0'}` },
    ]
  } catch {
    // Ignore overview failure to keep page available.
  }
}

const fetchRecommendations = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const highlightList = await apiRecommendations({
      city: filters.city.trim() || undefined,
      priceLevel: filters.priceLevel || undefined,
      tag: filters.tag || undefined,
    })
    const response = (await apiListFarmstays({
      city: filters.city.trim() || undefined,
      priceLevel: filters.priceLevel || undefined,
      tag: filters.tag || undefined,
      page: 1,
      pageSize: pageSize.value,
    })) as PageResponse<FarmStay>
    stays.value = Array.isArray(response.list) ? response.list : Array.isArray(highlightList) ? highlightList : []
    total.value = response.total ?? stays.value.length
    currentPage.value = response.page ?? 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : '推荐获取失败'
  } finally {
    isLoading.value = false
  }
}

const resetAndSearch = async () => {
  await search(1)
}

const totalPages = () => {
  return Math.max(1, Math.ceil(total.value / pageSize.value))
}

const goPrevPage = async () => {
  if (currentPage.value <= 1) return
  await search(currentPage.value - 1)
}

const goNextPage = async () => {
  if (currentPage.value >= totalPages()) return
  await search(currentPage.value + 1)
}

const isSearchMode = () => {
  return Boolean(filters.city || filters.keyword || filters.priceLevel || filters.tag)
}

const refreshList = async () => {
  if (isSearchMode()) {
    await search(currentPage.value)
    return
  }
  if (currentPage.value > 1) {
    await search(currentPage.value)
    return
  }
  await fetchRecommendations()
}

const pageSummary = () => {
  if (!total.value) {
    return '暂无结果'
  }
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `第 ${currentPage.value} / ${totalPages()} 页 · 显示 ${start}-${end} / 共 ${total.value} 条`
}

const search = async (page = 1) => {
  isLoading.value = true
  error.value = ''
  try {
    const response = (await apiListFarmstays({
      city: filters.city || undefined,
      keyword: filters.keyword || undefined,
      priceLevel: filters.priceLevel || undefined,
      tag: filters.tag || undefined,
      page,
      pageSize: pageSize.value,
    })) as PageResponse<FarmStay>
    stays.value = Array.isArray(response.list) ? response.list : []
    total.value = response.total ?? 0
    currentPage.value = response.page ?? page
  } catch (err) {
    error.value = err instanceof Error ? err.message : '搜索失败'
  } finally {
    isLoading.value = false
  }
}

const resetFilters = async () => {
  filters.city = ''
  filters.keyword = ''
  filters.priceLevel = ''
  filters.tag = ''
  await fetchRecommendations()
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
  <main class="home-shell page-shell">
    <section class="hero surface">
      <div>
        <span class="badge">乡野度假平台</span>
        <h1 class="section-title">发现真实乡村假期，连接游客与经营者</h1>
        <p class="muted">支持搜索、预订、支付、评价和经营管理，让农宿业务在一个页面体系里完成。</p>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" type="button" @click="$router.push(isAuthenticated ? '/personal' : '/login')">
          {{ isAuthenticated ? '进入个人中心' : '登录 / 注册' }}
        </button>
      </div>
      <div class="hero-stats">
        <article v-for="stat in heroStats" :key="stat.label">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>
    </section>

    <section class="filter-panel surface-strong">
      <h2 class="section-title">快速筛选</h2>
      <div class="filter-grid">
        <label class="field">
          <span>城市</span>
          <input v-model="filters.city" class="input" type="text" placeholder="如 成都 / 杭州" />
        </label>
        <label class="field">
          <span>关键字</span>
          <input v-model="filters.keyword" class="input" type="text" placeholder="名称、特色、标签" />
        </label>
        <label class="field">
          <span>价格等级</span>
          <select v-model="filters.priceLevel" class="select">
            <option value="">不限</option>
            <option value="standard">标准</option>
            <option value="premium">优选</option>
          </select>
        </label>
        <label class="field">
          <span>标签</span>
          <input v-model="filters.tag" class="input" type="text" placeholder="如 亲子,烧烤,采摘" />
        </label>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" type="button" @click="resetAndSearch">搜索</button>
        <button class="btn btn-secondary" type="button" @click="refreshList">刷新列表</button>
        <button class="btn btn-secondary" type="button" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section class="list-section">
      <header class="list-head">
        <div>
          <h2 class="section-title">{{ isSearchMode() ? '搜索结果' : '推荐农家乐' }}</h2>
          <p class="muted">点击卡片查看详情与预订服务</p>
        </div>
        <p class="muted">{{ pageSummary() }}</p>
      </header>

      <div v-if="isLoading" class="status">正在加载推荐数据...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else-if="!stays.length" class="status">暂无匹配数据，换个筛选条件试试。</div>

      <div v-else class="stay-grid">
        <article
          v-for="stay in stays"
          :key="stay.id"
          class="stay-card"
          :style="{
            backgroundImage: stay.coverImage
              ? `linear-gradient(180deg, rgba(18, 28, 18, 0.12) 0%, rgba(18, 28, 18, 0.72) 70%), url(${stay.coverImage})`
              : 'linear-gradient(130deg, #376846 0%, #8b5d32 100%)',
          }"
          @click="toDetail(stay.id)"
        >
          <div class="stay-content">
            <div class="stay-head">
              <div>
                <h3>{{ stay.name }}</h3>
                <p>{{ stay.city }}</p>
              </div>
              <span>★ {{ typeof stay.averageRating === 'number' ? stay.averageRating.toFixed(1) : '--' }}</span>
            </div>

            <p class="stay-desc">{{ stay.description }}</p>

            <div class="stay-foot">
              <strong>{{ stay.priceRange || stay.priceLevel || '价格面议' }}</strong>
              <div class="stay-tags">
                <span v-for="tag in (stay.tags || '').split(',').filter(Boolean).slice(0, 3)" :key="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-if="totalPages() > 1" class="pager">
        <button class="btn btn-secondary" type="button" :disabled="currentPage <= 1 || isLoading" @click="goPrevPage">
          上一页
        </button>
        <strong>{{ currentPage }} / {{ totalPages() }}</strong>
        <button
          class="btn btn-secondary"
          type="button"
          :disabled="currentPage >= totalPages() || isLoading"
          @click="goNextPage"
        >
          下一页
        </button>
      </div>
    </section>
  </main>
  <HomeFloatingAssistant />
</template>

<style scoped>
.home-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  padding: 24px;
  display: grid;
  grid-template-columns: 1.5fr auto;
  gap: 16px;
  align-items: center;
}

.hero h1 {
  margin: 10px 0;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.1;
}

.hero-actions {
  justify-self: end;
}

.hero-stats {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hero-stats article {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: grid;
  gap: 3px;
}

.hero-stats strong {
  font-size: 28px;
  color: var(--ink-strong);
  font-family: var(--font-display);
}

.filter-panel {
  padding: 22px;
  display: grid;
  gap: 14px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.filter-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: end;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.stay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.stay-card {
  min-height: 256px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-size: cover;
  background-position: center;
  box-shadow: 0 14px 32px rgba(29, 43, 31, 0.2);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stay-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 36px rgba(29, 43, 31, 0.24);
}

.stay-content {
  height: 100%;
  padding: 14px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(8, 12, 8, 0.15) 0%, rgba(8, 12, 8, 0.78) 72%);
}

.stay-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stay-head h3 {
  font-size: 20px;
  line-height: 1.2;
}

.stay-head p {
  opacity: 0.86;
  margin-top: 2px;
}

.stay-desc {
  line-height: 1.55;
  opacity: 0.92;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stay-foot {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.stay-foot strong {
  color: #ffe9c8;
}

.stay-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stay-tags span {
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #1b291d;
}

@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-self: start;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .list-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .pager {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
