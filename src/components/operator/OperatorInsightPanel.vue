<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  apiOperatorInsightGenerate,
  apiOperatorInsightHistory,
  apiOperatorInsightLatest,
  apiOperatorInsightHistoryDetail,
  apiOperatorInsightDeleteHistory,
  apiOwnerFarmstays,
} from '../../services/api'
import type { OperatorInsightReport, OwnedFarmStayLite } from '../../types/ai'

const ownedFarmstays = ref<OwnedFarmStayLite[]>([])
const selectedFarmStayId = ref('')
const periodDays = ref(30)
const currentReport = ref<OperatorInsightReport | null>(null)
const reportHistory = ref<OperatorInsightReport[]>([])
const loading = ref(false)
const generating = ref(false)
const error = ref('')
const detailModalVisible = ref(false)
const detailReport = ref<OperatorInsightReport | null>(null)
const detailLoading = ref(false)
const deletingReportId = ref<number | null | 'all'>(null)

const canQuery = computed(() => Boolean(selectedFarmStayId.value))

const loadFarmstays = async () => {
  try {
    ownedFarmstays.value = (await apiOwnerFarmstays()) as OwnedFarmStayLite[]
    if (!selectedFarmStayId.value && ownedFarmstays.value.length) {
      selectedFarmStayId.value = String(ownedFarmstays.value[0].id)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载经营店铺失败'
  }
}

const loadLatest = async () => {
  if (!canQuery.value) {
    return
  }
  loading.value = true
  error.value = ''
  try {
    currentReport.value = (await apiOperatorInsightLatest(Number(selectedFarmStayId.value))) as OperatorInsightReport
    reportHistory.value = (await apiOperatorInsightHistory(Number(selectedFarmStayId.value))) as OperatorInsightReport[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '经营建议加载失败'
  } finally {
    loading.value = false
  }
}

const generateReport = async () => {
  if (!canQuery.value) {
    error.value = '请先选择农家乐'
    return
  }
  generating.value = true
  error.value = ''
  try {
    currentReport.value = (await apiOperatorInsightGenerate(Number(selectedFarmStayId.value), periodDays.value)) as OperatorInsightReport
    reportHistory.value = (await apiOperatorInsightHistory(Number(selectedFarmStayId.value))) as OperatorInsightReport[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '经营建议生成失败'
  } finally {
    generating.value = false
  }
}

const viewDetail = async (report: OperatorInsightReport) => {
  detailLoading.value = true
  detailModalVisible.value = true
  detailReport.value = null
  try {
    detailReport.value = (await apiOperatorInsightHistoryDetail(Number(selectedFarmStayId.value), report.reportId)) as OperatorInsightReport
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取报告详情失败'
    detailModalVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const deleteReport = async (reportId: number) => {
  if (!confirm('确定要删除这条历史报告吗？')) return
  deletingReportId.value = reportId
  try {
    await apiOperatorInsightDeleteHistory(Number(selectedFarmStayId.value), reportId)
    reportHistory.value = (await apiOperatorInsightHistory(Number(selectedFarmStayId.value))) as OperatorInsightReport[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    deletingReportId.value = null
  }
}

const deleteAllReports = async () => {
  if (!confirm(`确定要删除全部 ${reportHistory.value.length} 条历史报告吗？此操作不可恢复。`)) return
  deletingReportId.value = 'all'
  try {
    for (const report of reportHistory.value) {
      await apiOperatorInsightDeleteHistory(Number(selectedFarmStayId.value), report.reportId)
    }
    reportHistory.value = (await apiOperatorInsightHistory(Number(selectedFarmStayId.value))) as OperatorInsightReport[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    deletingReportId.value = null
  }
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  detailReport.value = null
}

onMounted(async () => {
  await loadFarmstays()
  await loadLatest()
})
</script>

<template>
  <section class="insight-shell surface-strong">
    <header class="insight-head">
      <div>
        <span class="badge">Operator Insight</span>
        <h3 class="section-title">评价驱动经营建议</h3>
        <p class="muted">汇总评论情绪与主题问题，生成可执行经营动作建议。</p>
      </div>
      <div class="toolbar">
        <label class="field">
          <span>农家乐</span>
          <select v-model="selectedFarmStayId" class="select" @change="loadLatest">
            <option value="">请选择</option>
            <option v-for="item in ownedFarmstays" :key="item.id" :value="String(item.id)">
              {{ item.name }} · {{ item.city }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>周期</span>
          <select v-model.number="periodDays" class="select">
            <option :value="7">近 7 天</option>
            <option :value="30">近 30 天</option>
            <option :value="90">近 90 天</option>
          </select>
        </label>
        <button class="btn btn-primary" :disabled="generating || !canQuery" @click="generateReport">
          {{ generating ? '生成中...' : '生成建议' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="status">正在加载经营建议...</div>
    <div v-else-if="error" class="status error">{{ error }}</div>
    <div v-else-if="currentReport" class="insight-grid">
      <section class="hero-panel">
        <article class="summary-card">
          <span class="summary-label">本期摘要</span>
          <h4>{{ currentReport.summary }}</h4>
          <p class="muted">生成时间：{{ currentReport.generatedAt?.slice(0, 16).replace('T', ' ') }}</p>
        </article>
        <div class="metric-grid">
          <article>
            <span>评论数</span>
            <strong>{{ currentReport.reviewCount }}</strong>
          </article>
          <article>
            <span>平均评分</span>
            <strong>{{ currentReport.averageRating?.toFixed?.(1) ?? currentReport.averageRating }}</strong>
          </article>
          <article>
            <span>分析周期</span>
            <strong>{{ currentReport.periodDays }} 天</strong>
          </article>
        </div>
      </section>

      <section class="content-grid">
        <article class="list-card">
          <header class="card-head">
            <h4>问题优先级</h4>
            <span class="muted">按影响程度排序</span>
          </header>
          <div class="issue-list">
            <article v-for="issue in currentReport.issues" :key="issue.topic" class="issue-item">
              <div>
                <strong>{{ issue.topic }}</strong>
                <p class="muted">负向占比 {{ Math.round(issue.negativeRatio * 100) }}% · 影响分 {{ issue.impactScore }}</p>
              </div>
              <span class="priority" :class="issue.priority.toLowerCase()">{{ issue.priority }}</span>
            </article>
          </div>
        </article>

        <article class="list-card">
          <header class="card-head">
            <h4>建议动作</h4>
            <span class="muted">优先从前三项开始整改</span>
          </header>
          <div class="action-list">
            <article v-for="action in currentReport.actions" :key="`${action.topic}-${action.action}`" class="action-item">
              <strong>{{ action.topic }}</strong>
              <p>{{ action.action }}</p>
              <span class="muted">{{ action.expectedBenefit }}</span>
            </article>
          </div>
        </article>
      </section>

      <section class="history-card">
        <header class="card-head">
          <div>
            <h4>历史报告</h4>
            <span class="muted">用于观察周期变化</span>
          </div>
          <button 
            v-if="reportHistory.length > 0"
            class="btn-delete-all"
            :disabled="deletingReportId !== null"
            @click="deleteAllReports"
          >
            {{ deletingReportId === 'all' ? '删除中...' : '删除全部' }}
          </button>
        </header>
        <div v-if="reportHistory.length === 0" class="status muted">暂无历史报告</div>
        <div v-else class="history-list">
          <article 
            v-for="report in reportHistory" 
            :key="report.reportId" 
            class="history-item"
            @click="viewDetail(report)"
          >
            <div class="history-info">
              <strong>#{{ report.reportId }}</strong>
              <p class="muted">{{ report.generatedAt?.slice(0, 16).replace('T', ' ') }}</p>
            </div>
            <div class="history-stats">
              <p>评论 {{ report.reviewCount }} 条</p>
              <p class="muted">均分 {{ report.averageRating }}</p>
            </div>
            <button 
              class="btn-delete" 
              :disabled="deletingReportId === report.reportId || deletingReportId === 'all'"
              @click.stop="deleteReport(report.reportId)"
            >
              {{ deletingReportId === report.reportId ? '...' : '删除' }}
            </button>
          </article>
        </div>
      </section>
    </div>
    <div v-else class="status">请选择农家乐并生成经营建议。</div>

    <Teleport to="body">
      <div v-if="detailModalVisible" class="modal-overlay" @click="closeDetailModal">
        <div class="modal-content" @click.stop>
          <header class="modal-header">
            <h3>报告详情 #{{ detailReport?.reportId }}</h3>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </header>
          <div v-if="detailLoading" class="status">加载中...</div>
          <div v-else-if="detailReport" class="detail-content">
            <section class="hero-panel">
              <article class="summary-card">
                <span class="summary-label">本期摘要</span>
                <h4>{{ detailReport.summary }}</h4>
                <p class="muted">生成时间：{{ detailReport.generatedAt?.slice(0, 16).replace('T', ' ') }}</p>
              </article>
              <div class="metric-grid">
                <article>
                  <span>评论数</span>
                  <strong>{{ detailReport.reviewCount }}</strong>
                </article>
                <article>
                  <span>平均评分</span>
                  <strong>{{ detailReport.averageRating?.toFixed?.(1) ?? detailReport.averageRating }}</strong>
                </article>
                <article>
                  <span>分析周期</span>
                  <strong>{{ detailReport.periodDays }} 天</strong>
                </article>
              </div>
            </section>

            <section class="content-grid">
              <article class="list-card">
                <header class="card-head">
                  <h4>问题优先级</h4>
                  <span class="muted">按影响程度排序</span>
                </header>
                <div class="issue-list">
                  <article v-for="issue in detailReport.issues" :key="issue.topic" class="issue-item">
                    <div>
                      <strong>{{ issue.topic }}</strong>
                      <p class="muted">负向占比 {{ Math.round(issue.negativeRatio * 100) }}% · 影响分 {{ issue.impactScore }}</p>
                    </div>
                    <span class="priority" :class="issue.priority.toLowerCase()">{{ issue.priority }}</span>
                  </article>
                </div>
              </article>

              <article class="list-card">
                <header class="card-head">
                  <h4>建议动作</h4>
                  <span class="muted">优先从前三项开始整改</span>
                </header>
                <div class="action-list">
                  <article v-for="action in detailReport.actions" :key="`${action.topic}-${action.action}`" class="action-item">
                    <strong>{{ action.topic }}</strong>
                    <p>{{ action.action }}</p>
                    <span class="muted">{{ action.expectedBenefit }}</span>
                  </article>
                </div>
              </article>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.insight-shell {
  padding: 18px;
  display: grid;
  gap: 18px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.98) 0%, rgba(255, 255, 255, 1) 100%);
}

.insight-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}

.insight-grid {
  display: grid;
  gap: 16px;
}

.hero-panel {
  display: grid;
  grid-template-columns: 1.2fr minmax(0, 1fr);
  gap: 14px;
}

.summary-card,
.list-card,
.history-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: #fff;
  padding: 16px;
}

.summary-card {
  background:
    linear-gradient(135deg, rgba(28, 54, 39, 0.95) 0%, rgba(71, 110, 82, 0.95) 100%);
  color: #fff;
}

.summary-card h4 {
  font-size: 24px;
  line-height: 1.35;
  margin: 10px 0 12px;
}

.summary-card .muted,
.summary-label {
  color: rgba(255, 255, 255, 0.82);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-grid article {
  border-radius: var(--radius-md);
  border: 1px solid rgba(47, 67, 54, 0.14);
  background: #fff;
  padding: 14px;
  display: grid;
  gap: 6px;
}

.metric-grid span {
  color: var(--ink-soft);
  font-size: 13px;
}

.metric-grid strong {
  font-size: 28px;
  color: var(--ink-strong);
  font-family: var(--font-display);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.card-head div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.issue-list,
.action-list,
.history-list {
  display: grid;
  gap: 10px;
}

.issue-item,
.action-item,
.history-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.action-item {
  display: grid;
}

.priority {
  border-radius: 999px;
  padding: 4px 10px;
  height: fit-content;
  font-size: 12px;
  font-weight: 700;
}

.priority.p1 {
  background: #fff0ed;
  color: #b64736;
}

.priority.p2 {
  background: #fff7e8;
  color: #b87520;
}

.priority.p3 {
  background: #edf4eb;
  color: var(--brand);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.history-item:hover {
  background: #f8f9f8;
  border-color: var(--brand);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-info strong {
  display: block;
  color: var(--ink-strong);
}

.history-stats {
  text-align: right;
  flex-shrink: 0;
}

.history-stats p {
  margin: 0;
}

.btn-delete {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--ink-soft);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-delete:hover:not(:disabled) {
  background: #fee;
  border-color: #f88;
  color: #c44;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete-all {
  padding: 6px 14px;
  border: 1px solid #f88;
  border-radius: 8px;
  background: #fff5f5;
  color: #c44;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete-all:hover:not(:disabled) {
  background: #fee;
  border-color: #e44;
}

.btn-delete-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--ink-soft);
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--ink);
}

.detail-content {
  padding: 20px;
  display: grid;
  gap: 18px;
}

@media (max-width: 980px) {
  .insight-head,
  .hero-panel,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .insight-head {
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>

