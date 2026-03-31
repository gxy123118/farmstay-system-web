<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  apiAdminApproveWithdraw,
  apiAdminCompleteWithdrawTransfer,
  apiAdminDashboardOverview,
  apiAdminDeleteReview,
  apiAdminKnowledgeCreate,
  apiAdminKnowledgeDelete,
  apiAdminKnowledgeList,
  apiAdminKnowledgeRetrievePreview,
  apiAdminKnowledgeUpdate,
  apiAdminKnowledgeUpdateStatus,
  apiAdminRejectWithdraw,
  apiAdminReviews,
  apiAdminUpdateUserStatus,
  apiAdminUsers,
  apiAdminWithdraws,
} from '../services/api'
import { clearAuthPayload, useAuthState } from '../composables/auth'
import type {
  AdminWithdraw,
  AdminCitation,
  AdminDashboardOverview,
  AdminKnowledgeDocument,
  AdminKnowledgePayload,
  AdminReview,
  AdminUser,
} from '../types/admin'

type AdminTab = 'dashboard' | 'users' | 'reviews' | 'knowledge' | 'withdraws'

const router = useRouter()
const { payload } = useAuthState()

const activeTab = ref<AdminTab>('dashboard')
const flash = reactive({ message: '', type: '' as 'success' | 'error' | '' })

const dashboard = ref<AdminDashboardOverview | null>(null)
const dashboardLoading = ref(false)

const userFilters = reactive({
  keyword: '',
  userType: '',
  status: '',
  page: 1,
  pageSize: 10,
})
const userList = ref<AdminUser[]>([])
const userTotal = ref(0)
const userLoading = ref(false)

const reviewFilters = reactive({
  keyword: '',
  page: 1,
  pageSize: 10,
})
const reviewList = ref<AdminReview[]>([])
const reviewTotal = ref(0)
const reviewLoading = ref(false)
const selectedReviewFarmStayId = ref<number | null>(null)

const knowledgeFilters = reactive({
  keyword: '',
  status: '',
  page: 1,
  pageSize: 10,
})
const knowledgeList = ref<AdminKnowledgeDocument[]>([])
const knowledgeTotal = ref(0)
const knowledgeLoading = ref(false)
const withdrawFilters = reactive({
  status: '',
  page: 1,
  pageSize: 10,
})
const withdrawList = ref<AdminWithdraw[]>([])
const withdrawTotal = ref(0)
const withdrawLoading = ref(false)

const knowledgeEditorOpen = ref(false)
const knowledgePreviewLoading = ref(false)
const knowledgePreview = ref<AdminCitation[]>([])
const editingKnowledgeId = ref<number | null>(null)
const withdrawDialogMode = ref<'approve' | 'reject' | 'transfer' | null>(null)
const withdrawDialogTarget = ref<AdminWithdraw | null>(null)
const withdrawDialogForm = reactive({
  reviewRemark: '',
  transferNo: '',
})
const withdrawActionLoading = ref(false)
const knowledgeForm = reactive<AdminKnowledgePayload>({
  knowledgeCode: '',
  title: '',
  content: '',
  summary: '',
  keywords: '',
  scope: 'public',
  farmStayId: null,
  status: 'ACTIVE',
})

const dashboardCards = computed(() => {
  if (!dashboard.value) return []
  return [
    { label: '平台订单量', value: `${dashboard.value.orderCount ?? 0}`, note: '全平台累计订单' },
    { label: '平台交易额', value: `¥${Number(dashboard.value.turnover ?? 0).toFixed(2)}`, note: '已支付类订单总额' },
    { label: '退款率', value: `${((dashboard.value.refundRate ?? 0) * 100).toFixed(1)}%`, note: '退款订单占比' },
    { label: '农家乐数量', value: `${dashboard.value.farmStayCount ?? 0}`, note: '平台入驻总量' },
    { label: '活跃经营者', value: `${dashboard.value.activeOperatorCount ?? 0}`, note: 'ACTIVE 经营者' },
  ]
})

const reviewFarmstays = computed(() => {
  const map = new Map<number, { id: number; name: string; count: number; latest?: string }>()
  for (const item of reviewList.value) {
    const key = item.farmStayId
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if ((item.createdAt || '') > (existing.latest || '')) {
        existing.latest = item.createdAt
      }
    } else {
      map.set(key, {
        id: key,
        name: item.farmStayName || `农家乐 #${key}`,
        count: 1,
        latest: item.createdAt,
      })
    }
  }
  return Array.from(map.values())
})

const selectedFarmStayReviews = computed(() =>
  selectedReviewFarmStayId.value === null
    ? []
    : reviewList.value.filter((item) => item.farmStayId === selectedReviewFarmStayId.value),
)

const selectedFarmStayName = computed(() => {
  const target = reviewFarmstays.value.find((item) => item.id === selectedReviewFarmStayId.value)
  return target?.name || ''
})

const setFlash = (message: string, type: 'success' | 'error' = 'success') => {
  flash.message = message
  flash.type = type
  if (message) {
    window.setTimeout(() => {
      if (flash.message === message) {
        flash.message = ''
        flash.type = ''
      }
    }, 4000)
  }
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadDashboard = async () => {
  dashboardLoading.value = true
  try {
    dashboard.value = await apiAdminDashboardOverview()
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '平台统计加载失败', 'error')
  } finally {
    dashboardLoading.value = false
  }
}

const loadUsers = async () => {
  userLoading.value = true
  try {
    const result = await apiAdminUsers(userFilters)
    userList.value = result.list
    userTotal.value = result.total
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '用户列表加载失败', 'error')
  } finally {
    userLoading.value = false
  }
}

const loadReviews = async () => {
  reviewLoading.value = true
  try {
    const result = await apiAdminReviews(reviewFilters)
    reviewList.value = result.list
    reviewTotal.value = result.total
    if (selectedReviewFarmStayId.value !== null) {
      const exists = result.list.some((item) => item.farmStayId === selectedReviewFarmStayId.value)
      if (!exists) {
        selectedReviewFarmStayId.value = null
      }
    }
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '评论列表加载失败', 'error')
  } finally {
    reviewLoading.value = false
  }
}

const loadKnowledge = async () => {
  knowledgeLoading.value = true
  try {
    const result = await apiAdminKnowledgeList(knowledgeFilters)
    knowledgeList.value = result.list
    knowledgeTotal.value = result.total
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '知识库列表加载失败', 'error')
  } finally {
    knowledgeLoading.value = false
  }
}

const loadWithdraws = async () => {
  withdrawLoading.value = true
  try {
    const result = await apiAdminWithdraws(withdrawFilters)
    withdrawList.value = result.list
    withdrawTotal.value = result.total
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '提现列表加载失败', 'error')
  } finally {
    withdrawLoading.value = false
  }
}

const loadAll = async () => {
  await Promise.all([loadDashboard(), loadUsers(), loadReviews(), loadKnowledge(), loadWithdraws()])
}

const updateUserStatus = async (user: AdminUser, status: 'ACTIVE' | 'DISABLED') => {
  try {
    await apiAdminUpdateUserStatus(user.id, { status })
    await loadUsers()
    setFlash(`已更新用户 ${user.username} 状态`)
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '用户状态更新失败', 'error')
  }
}

const deleteReview = async (review: AdminReview) => {
  try {
    await apiAdminDeleteReview(review.id)
    await loadReviews()
    setFlash(`已删除评论 #${review.id}`)
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '评论删除失败', 'error')
  }
}

const resetKnowledgeForm = () => {
  editingKnowledgeId.value = null
  knowledgeForm.knowledgeCode = ''
  knowledgeForm.title = ''
  knowledgeForm.content = ''
  knowledgeForm.summary = ''
  knowledgeForm.keywords = ''
  knowledgeForm.scope = 'public'
  knowledgeForm.farmStayId = null
  knowledgeForm.status = 'ACTIVE'
  knowledgePreview.value = []
}

const openKnowledgeCreate = () => {
  resetKnowledgeForm()
  knowledgeEditorOpen.value = true
}

const openKnowledgeEdit = (item: AdminKnowledgeDocument) => {
  editingKnowledgeId.value = item.id
  knowledgeForm.knowledgeCode = item.knowledgeCode
  knowledgeForm.title = item.title
  knowledgeForm.content = item.content
  knowledgeForm.summary = item.summary || ''
  knowledgeForm.keywords = item.keywords || ''
  knowledgeForm.scope = item.scope
  knowledgeForm.farmStayId = item.farmStayId ?? null
  knowledgeForm.status = item.status || 'ACTIVE'
  knowledgePreview.value = []
  knowledgeEditorOpen.value = true
}

const saveKnowledge = async () => {
  try {
    if (editingKnowledgeId.value) {
      await apiAdminKnowledgeUpdate(editingKnowledgeId.value, knowledgeForm)
      setFlash(`已更新知识文档 #${editingKnowledgeId.value}`)
    } else {
      await apiAdminKnowledgeCreate(knowledgeForm)
      setFlash('已创建知识文档')
    }
    knowledgeEditorOpen.value = false
    await loadKnowledge()
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '知识文档保存失败', 'error')
  }
}

const updateKnowledgeStatus = async (item: AdminKnowledgeDocument, status: string) => {
  try {
    await apiAdminKnowledgeUpdateStatus(item.id, { status })
    await loadKnowledge()
    setFlash(`已更新知识状态：${item.title}`)
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '知识状态更新失败', 'error')
  }
}

const deleteKnowledge = async (item: AdminKnowledgeDocument) => {
  try {
    await apiAdminKnowledgeDelete(item.id)
    await loadKnowledge()
    setFlash(`已删除知识文档：${item.title}`)
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '知识删除失败', 'error')
  }
}

const previewKnowledge = async () => {
  knowledgePreviewLoading.value = true
  try {
    knowledgePreview.value = await apiAdminKnowledgeRetrievePreview({
      farmStayId: knowledgeForm.farmStayId ?? undefined,
      scene: 'ADMIN_CONSOLE',
      question: knowledgeForm.title || knowledgeForm.content.slice(0, 50),
    })
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '知识预览失败', 'error')
  } finally {
    knowledgePreviewLoading.value = false
  }
}

const withdrawStatusLabel = (status?: string) => {
  switch (status) {
    case 'PENDING':
      return '审核中'
    case 'APPROVED':
      return '待打款'
    case 'SUCCESS':
      return '已到账'
    case 'REJECTED':
      return '已驳回'
    default:
      return status || '-'
  }
}

const openWithdrawDialog = (mode: 'approve' | 'reject' | 'transfer', item: AdminWithdraw) => {
  withdrawDialogMode.value = mode
  withdrawDialogTarget.value = item
  withdrawDialogForm.reviewRemark = ''
  withdrawDialogForm.transferNo = ''
}

const resetWithdrawDialog = () => {
  withdrawDialogMode.value = null
  withdrawDialogTarget.value = null
  withdrawDialogForm.reviewRemark = ''
  withdrawDialogForm.transferNo = ''
}

const closeWithdrawDialog = () => {
  if (withdrawActionLoading.value) {
    return
  }
  resetWithdrawDialog()
}

const confirmWithdrawDialog = async () => {
  if (!withdrawDialogMode.value || !withdrawDialogTarget.value) {
    return
  }

  const reviewRemark = withdrawDialogForm.reviewRemark.trim()
  if ((withdrawDialogMode.value === 'approve' || withdrawDialogMode.value === 'reject') && !reviewRemark) {
    setFlash('审核备注不能为空', 'error')
    return
  }
  if (withdrawDialogMode.value === 'transfer' && !withdrawDialogForm.transferNo.trim()) {
    setFlash('打款凭证号不能为空', 'error')
    return
  }

  withdrawActionLoading.value = true
  try {
    if (withdrawDialogMode.value === 'approve') {
      await apiAdminApproveWithdraw(withdrawDialogTarget.value.id, { reviewRemark })
      setFlash(`提现单 ${withdrawDialogTarget.value.withdrawNo} 已审核通过`)
    } else if (withdrawDialogMode.value === 'reject') {
      await apiAdminRejectWithdraw(withdrawDialogTarget.value.id, { reviewRemark })
      setFlash(`提现单 ${withdrawDialogTarget.value.withdrawNo} 已驳回`)
    } else {
      await apiAdminCompleteWithdrawTransfer(withdrawDialogTarget.value.id, {
        transferNo: withdrawDialogForm.transferNo.trim(),
        reviewRemark: reviewRemark || undefined,
      })
      setFlash(`提现单 ${withdrawDialogTarget.value.withdrawNo} 已确认打款完成`)
    }
    await loadWithdraws()
    resetWithdrawDialog()
  } catch (err) {
    setFlash(err instanceof Error ? err.message : '提现审核操作失败', 'error')
  } finally {
    withdrawActionLoading.value = false
  }
}

const logout = () => {
  clearAuthPayload()
  router.replace({ name: 'login' })
}

onMounted(loadAll)
</script>

<template>
  <main class="page-shell admin-page">
    <section class="surface-strong admin-shell">
      <header class="admin-head">
        <div>
          <p class="eyebrow">Admin Console</p>
          <h1 class="section-title">平台管理后台</h1>
          <p class="muted">当前管理员：{{ payload?.displayName || payload?.username || 'admin' }}</p>
        </div>
        <div class="head-actions">
          <button class="btn btn-secondary" @click="loadAll">刷新全部</button>
          <button class="btn btn-danger" @click="logout">退出登录</button>
        </div>
      </header>

      <section class="admin-layout">
        <aside class="admin-nav">
          <button class="nav-btn" :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">平台统计</button>
          <button class="nav-btn" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">用户管理</button>
          <button class="nav-btn" :class="{ active: activeTab === 'reviews' }" @click="activeTab = 'reviews'">评论治理</button>
          <button class="nav-btn" :class="{ active: activeTab === 'withdraws' }" @click="activeTab = 'withdraws'">提现审核</button>
          <button class="nav-btn" :class="{ active: activeTab === 'knowledge' }" @click="activeTab = 'knowledge'">知识库管理</button>
        </aside>

        <section class="admin-panel">
          <section v-if="activeTab === 'dashboard'" class="panel-block">
            <header class="block-head">
              <div>
                <p class="eyebrow">Overview</p>
                <h2 class="section-title">平台统计页</h2>
              </div>
            </header>

            <div v-if="dashboardLoading" class="status">加载中...</div>
            <div v-else class="stats-grid">
              <article v-for="card in dashboardCards" :key="card.label" class="stat-card">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
                <p>{{ card.note }}</p>
              </article>
            </div>
          </section>

          <section v-else-if="activeTab === 'users'" class="panel-block">
            <header class="block-head">
              <div>
                <p class="eyebrow">Users</p>
                <h2 class="section-title">用户管理页</h2>
              </div>
              <div class="toolbar">
                <input v-model="userFilters.keyword" class="input compact-input" placeholder="搜索账号或昵称" />
                <select v-model="userFilters.userType" class="select compact-input">
                  <option value="">全部角色</option>
                  <option value="visitor">游客</option>
                  <option value="operator">经营者</option>
                  <option value="admin">管理员</option>
                </select>
                <select v-model="userFilters.status" class="select compact-input">
                  <option value="">全部状态</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
                <button class="btn btn-secondary" @click="loadUsers">筛选</button>
              </div>
            </header>

            <div class="table-card">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>账号</th>
                    <th>昵称</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>余额</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="userLoading">
                    <td colspan="7">加载中...</td>
                  </tr>
                  <tr v-for="user in userList" :key="user.id">
                    <td>{{ user.username }}</td>
                    <td>{{ user.displayName || '-' }}</td>
                    <td>{{ user.userType }}</td>
                    <td>{{ user.status }}</td>
                    <td>¥{{ Number(user.balance ?? 0).toFixed(2) }}</td>
                    <td>{{ formatTime(user.createdAt) }}</td>
                    <td class="action-cell">
                      <button
                        v-if="user.userType !== 'admin' && user.status !== 'ACTIVE'"
                        class="btn btn-secondary table-btn"
                        @click="updateUserStatus(user, 'ACTIVE')"
                      >
                        启用
                      </button>
                      <button
                        v-if="user.userType !== 'admin' && user.status !== 'DISABLED'"
                        class="btn btn-danger table-btn"
                        @click="updateUserStatus(user, 'DISABLED')"
                      >
                        禁用
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="table-foot">共 {{ userTotal }} 条用户记录</p>
            </div>
          </section>

          <section v-else-if="activeTab === 'reviews'" class="panel-block">
            <header class="block-head">
              <div>
                <p class="eyebrow">Reviews</p>
                <h2 class="section-title">评论治理页</h2>
              </div>
              <div class="toolbar">
                <input v-model="reviewFilters.keyword" class="input compact-input wide-input" placeholder="搜索评论内容 / 民宿名 / 游客账号" />
                <button class="btn btn-secondary" @click="loadReviews">筛选</button>
              </div>
            </header>

            <template v-if="selectedReviewFarmStayId === null">
              <div class="review-wall">
                <article v-if="reviewLoading" class="review-card">加载中...</article>
                <article v-for="farmstay in reviewFarmstays" :key="farmstay.id" class="review-card review-group-card">
                  <div class="review-head">
                    <strong>{{ farmstay.name }}</strong>
                    <span>{{ farmstay.count }} 条评论</span>
                  </div>
                  <p class="review-meta">最近评论时间：{{ formatTime(farmstay.latest) }}</p>
                  <div class="review-actions">
                    <span>先进入对应农家乐，再处理其下评论。</span>
                    <button class="btn btn-secondary table-btn" @click="selectedReviewFarmStayId = farmstay.id">查看评论</button>
                  </div>
                </article>
                <p class="table-foot">当前页共聚合 {{ reviewFarmstays.length }} 个农家乐，评论总数 {{ reviewTotal }} 条</p>
              </div>
            </template>
            <template v-else>
              <div class="review-detail-head">
                <div>
                  <p class="eyebrow">Farmstay Reviews</p>
                  <h3>{{ selectedFarmStayName }}</h3>
                </div>
                <button class="btn btn-secondary" @click="selectedReviewFarmStayId = null">返回农家乐列表</button>
              </div>

              <div class="review-wall">
                <article v-for="review in selectedFarmStayReviews" :key="review.id" class="review-card">
                  <div class="review-head">
                    <strong>{{ review.farmStayName || '未知民宿' }}</strong>
                    <span>{{ review.rating }}/5</span>
                  </div>
                  <p class="review-meta">游客：{{ review.visitorUsername || '-' }} · 订单：#{{ review.orderId }}</p>
                  <p class="review-content">{{ review.content }}</p>
                  <div class="review-actions">
                    <span>{{ formatTime(review.createdAt) }}</span>
                    <button class="btn btn-danger table-btn" @click="deleteReview(review)">删除评论</button>
                  </div>
                </article>
                <p class="table-foot">当前农家乐评论数 {{ selectedFarmStayReviews.length }}</p>
              </div>
            </template>
          </section>

          <section v-else-if="activeTab === 'withdraws'" class="panel-block">
            <header class="block-head">
              <div>
                <p class="eyebrow">Withdraws</p>
                <h2 class="section-title">提现审核页</h2>
              </div>
              <div class="toolbar">
                <select v-model="withdrawFilters.status" class="select compact-input">
                  <option value="">全部状态</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
                <button class="btn btn-secondary" @click="loadWithdraws">筛选</button>
              </div>
            </header>

            <div class="table-card">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>提现单号</th>
                    <th>经营者</th>
                    <th>金额</th>
                    <th>渠道</th>
                    <th>收款人</th>
                    <th>绑定手机号</th>
                    <th>状态</th>
                    <th>申请时间</th>
                    <th>审核备注</th>
                    <th>打款凭证号</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="withdrawLoading">
                    <td colspan="11">加载中...</td>
                  </tr>
                  <tr v-for="item in withdrawList" :key="item.id">
                    <td>{{ item.withdrawNo }}</td>
                    <td>{{ item.displayName || item.username || '-' }}</td>
                    <td>¥{{ Number(item.amount ?? 0).toFixed(2) }}</td>
                    <td>{{ item.channel }}</td>
                    <td>{{ item.accountName }}</td>
                    <td>{{ item.accountNo }}</td>
                    <td>{{ withdrawStatusLabel(item.status) }}</td>
                    <td>{{ formatTime(item.createdAt) }}</td>
                    <td>{{ item.reviewRemark || '-' }}</td>
                    <td>{{ item.transferNo || '-' }}</td>
                    <td class="action-cell">
                      <button
                        v-if="item.status === 'PENDING'"
                        class="btn table-btn table-btn-enable"
                        @click="openWithdrawDialog('approve', item)"
                      >
                        通过
                      </button>
                      <button
                        v-if="item.status === 'PENDING'"
                        class="btn table-btn table-btn-delete"
                        @click="openWithdrawDialog('reject', item)"
                      >
                        驳回
                      </button>
                      <button
                        v-if="item.status === 'APPROVED'"
                        class="btn table-btn table-btn-edit"
                        @click="openWithdrawDialog('transfer', item)"
                      >
                        确认打款
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="table-foot">共 {{ withdrawTotal }} 条提现申请</p>
            </div>
          </section>

          <section v-else class="panel-block">
            <header class="block-head">
              <div>
                <p class="eyebrow">Knowledge</p>
                <h2 class="section-title">知识库管理页</h2>
              </div>
              <div class="toolbar">
                <input v-model="knowledgeFilters.keyword" class="input compact-input" placeholder="搜索标题 / 关键词" />
                <select v-model="knowledgeFilters.status" class="select compact-input">
                  <option value="">全部状态</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
                <button class="btn btn-secondary" @click="loadKnowledge">筛选</button>
                <button class="btn btn-primary" @click="openKnowledgeCreate">新建文档</button>
              </div>
            </header>

            <div class="table-card">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>编码</th>
                    <th>标题</th>
                    <th>范围</th>
                    <th>状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="knowledgeLoading">
                    <td colspan="6">加载中...</td>
                  </tr>
                  <tr v-for="item in knowledgeList" :key="item.id">
                    <td>{{ item.knowledgeCode }}</td>
                    <td>{{ item.title }}</td>
                    <td>{{ item.scope }}</td>
                    <td>{{ item.status }}</td>
                    <td>{{ formatTime(item.updatedAt) }}</td>
                    <td class="action-cell">
                      <button class="btn btn-secondary table-btn table-btn-edit" @click="openKnowledgeEdit(item)">编辑</button>
                      <button
                        class="btn table-btn"
                        :class="item.status === 'ACTIVE' ? 'table-btn-warn' : 'table-btn-enable'"
                        @click="updateKnowledgeStatus(item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')"
                      >
                        {{ item.status === 'ACTIVE' ? '停用' : '启用' }}
                      </button>
                      <button class="btn btn-danger table-btn table-btn-delete" @click="deleteKnowledge(item)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="table-foot">共 {{ knowledgeTotal }} 条知识文档</p>
            </div>
          </section>
        </section>
      </section>

      <div v-if="flash.message" class="status" :class="flash.type === 'error' ? 'error' : ''">{{ flash.message }}</div>
    </section>

    <div v-if="knowledgeEditorOpen" class="modal-mask" @click.self="knowledgeEditorOpen = false">
      <section class="knowledge-modal surface-strong">
        <header class="block-head">
          <div>
            <p class="eyebrow">Knowledge Editor</p>
            <h2 class="section-title">{{ editingKnowledgeId ? '编辑知识文档' : '新建知识文档' }}</h2>
          </div>
          <button class="btn btn-secondary" @click="knowledgeEditorOpen = false">关闭</button>
        </header>

        <div class="knowledge-layout">
          <div class="editor-form">
            <input v-model="knowledgeForm.knowledgeCode" class="input" placeholder="知识编码" />
            <input v-model="knowledgeForm.title" class="input" placeholder="标题" />
            <textarea v-model="knowledgeForm.summary" class="textarea" placeholder="摘要" />
            <textarea v-model="knowledgeForm.content" class="textarea editor-content" placeholder="正文内容" />
            <input v-model="knowledgeForm.keywords" class="input" placeholder="关键词，逗号分隔" />
            <div class="inline-fields">
              <select v-model="knowledgeForm.scope" class="select">
                <option value="public">public</option>
                <option value="operator_only">operator_only</option>
              </select>
              <select v-model="knowledgeForm.status" class="select">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <input v-model="knowledgeForm.farmStayId" class="input" type="number" placeholder="农家乐ID，可空" />
            <div class="toolbar">
              <button class="btn btn-secondary" :disabled="knowledgePreviewLoading" @click="previewKnowledge">
                {{ knowledgePreviewLoading ? '预览中...' : '检索预览' }}
              </button>
              <button class="btn btn-primary" @click="saveKnowledge">保存文档</button>
            </div>
          </div>

          <div class="preview-panel">
            <p class="eyebrow">Retrieve Preview</p>
            <div v-if="!knowledgePreview.length" class="empty-preview">当前没有预览引用，点击“检索预览”后这里会显示召回结果。</div>
            <article v-for="item in knowledgePreview" :key="`${item.sourceType}-${item.sourceId}-${item.snippet}`" class="preview-item">
              <strong>{{ item.sourceType }} · {{ item.sourceId }}</strong>
              <p>{{ item.snippet }}</p>
            </article>
          </div>
        </div>
      </section>
    </div>

    <div v-if="withdrawDialogMode" class="modal-mask" @click.self="closeWithdrawDialog">
      <section class="dialog-card surface-strong">
        <header class="block-head">
          <div>
            <p class="eyebrow">Withdraw Action</p>
            <h2 class="section-title">
              {{
                withdrawDialogMode === 'approve'
                  ? '审核通过'
                  : withdrawDialogMode === 'reject'
                    ? '审核驳回'
                    : '确认人工打款'
              }}
            </h2>
          </div>
          <button class="btn btn-secondary" :disabled="withdrawActionLoading" @click="closeWithdrawDialog">关闭</button>
        </header>

        <div class="editor-form">
          <p class="muted">提现单号：{{ withdrawDialogTarget?.withdrawNo }}</p>
          <p class="muted">经营者：{{ withdrawDialogTarget?.displayName || withdrawDialogTarget?.username || '-' }}</p>
          <p class="muted">金额：¥{{ Number(withdrawDialogTarget?.amount ?? 0).toFixed(2) }}</p>

          <input
            v-if="withdrawDialogMode === 'transfer'"
            v-model="withdrawDialogForm.transferNo"
            class="input"
            placeholder="请输入人工打款凭证号"
          />

          <textarea
            v-model="withdrawDialogForm.reviewRemark"
            class="textarea"
            :placeholder="withdrawDialogMode === 'transfer' ? '可选备注' : '请输入审核备注'"
          />

          <div class="dialog-actions">
            <button class="btn btn-secondary" :disabled="withdrawActionLoading" @click="closeWithdrawDialog">取消</button>
            <button class="btn btn-primary" :disabled="withdrawActionLoading" @click="confirmWithdrawDialog">
              {{ withdrawActionLoading ? '处理中...' : '确认提交' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.admin-page {
  padding-top: 24px;
}

.admin-shell {
  padding: 24px;
  display: grid;
  gap: 18px;
}

.admin-head,
.block-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.block-head > div:first-child {
  flex: 0 0 auto;
  min-width: 140px;
}

.block-head .section-title {
  white-space: nowrap;
  word-break: keep-all;
}

.eyebrow {
  color: var(--brand-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.head-actions,
.review-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: min(100%, 820px);
  margin-left: auto;
}

.admin-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.admin-nav {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(148px, max-content);
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.nav-btn {
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  background: #fff;
  color: var(--ink);
  text-align: center;
  min-height: 52px;
  padding: 0 18px;
  cursor: pointer;
  font-weight: 700;
  white-space: nowrap;
}

.nav-btn.active {
  background: var(--brand);
  color: #fff;
  border-color: transparent;
}

.admin-panel,
.panel-block {
  display: grid;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card,
.review-card,
.table-card,
.preview-panel,
.editor-form {
  border: 1px solid rgba(47, 67, 54, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
}

.stat-card {
  padding: 18px;
  display: grid;
  gap: 8px;
}

.stat-card span,
.review-meta,
.table-foot,
.empty-preview {
  color: var(--ink-soft);
}

.stat-card strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 32px;
}

.table-card {
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th,
.admin-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(47, 67, 54, 0.08);
  vertical-align: top;
}

.admin-table th {
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.table-foot {
  padding: 14px 16px;
}

.toolbar > .input,
.toolbar > .select {
  flex: 0 1 auto;
}

.toolbar .btn {
  min-height: 46px;
  min-width: 96px;
  padding: 0 18px;
  border-radius: 18px;
  justify-content: center;
  white-space: nowrap;
}

.compact-input {
  min-width: 140px;
}

.wide-input {
  min-width: 300px;
  flex: 1 1 320px;
}

.table-btn {
  min-height: 34px;
  padding: 6px 12px;
}

.table-btn-edit {
  background: #fff;
  border-color: rgba(47, 67, 54, 0.2);
  color: var(--ink);
}

.table-btn-enable {
  background: rgba(47, 106, 73, 0.12);
  border: 1px solid rgba(47, 106, 73, 0.22);
  color: var(--brand);
}

.table-btn-warn {
  background: rgba(193, 119, 46, 0.12);
  border: 1px solid rgba(193, 119, 46, 0.24);
  color: var(--brand-2);
}

.table-btn-delete {
  background: #fff4f3;
}

.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.review-wall {
  display: grid;
  gap: 12px;
}

.review-card {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.review-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.review-head strong {
  color: var(--ink-strong);
}

.review-head span {
  color: var(--brand-2);
  font-weight: 700;
}

.review-content {
  color: var(--ink);
  line-height: 1.8;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(20, 28, 22, 0.34);
  display: grid;
  place-items: center;
  padding: 24px;
}

.knowledge-modal {
  width: min(1180px, 100%);
  padding: 22px;
  display: grid;
  gap: 18px;
}

.knowledge-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 14px;
}

.editor-form,
.preview-panel {
  padding: 18px;
  display: grid;
  gap: 12px;
}

.editor-content {
  min-height: 220px;
}

.inline-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.preview-item {
  padding: 14px;
  border-radius: 18px;
  background: rgba(247, 244, 236, 0.88);
  display: grid;
  gap: 8px;
}

.preview-item strong {
  color: var(--ink-strong);
}

.preview-item p {
  color: var(--ink-soft);
  line-height: 1.7;
}

.dialog-card {
  width: min(520px, 100%);
  padding: 22px;
  display: grid;
  gap: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1080px) {
  .knowledge-layout,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-head,
  .block-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .block-head > div:first-child {
    min-width: 0;
  }

  .block-head .section-title {
    white-space: normal;
  }

  .toolbar {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-left: 0;
  }

  .admin-nav {
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    grid-auto-columns: unset;
    overflow-x: visible;
  }

  .inline-fields {
    grid-template-columns: 1fr;
  }
}
</style>
