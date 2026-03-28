<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiCreateFarmstay, apiDeleteFarmstay, apiOwnerFarmstays, apiUpdateFarmstay } from '../services/api'

type FarmStay = {
  id: number
  name: string
  city: string
  address?: string
  description?: string
  coverImage?: string
  priceRange?: string
  priceLevel?: string
  contactPhone?: string
  tags?: string
  status?: string
}

type FormMode = 'create' | 'edit'

const farmstays = ref<FarmStay[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const editorVisible = ref(false)
const formMode = ref<FormMode>('create')
const activeId = ref<number | null>(null)

const form = reactive({
  name: '',
  city: '',
  address: '',
  description: '',
  coverImage: '',
  priceRange: '',
  priceLevel: '',
  contactPhone: '',
  tags: '',
})

const activeFarmstay = computed(() => farmstays.value.find((item) => item.id === activeId.value) || null)

const setMessage = (message: string, type: 'error' | 'success') => {
  if (type === 'error') {
    error.value = message
    success.value = ''
  } else {
    success.value = message
    error.value = ''
  }
}

const resetForm = () => {
  form.name = ''
  form.city = ''
  form.address = ''
  form.description = ''
  form.coverImage = ''
  form.priceRange = ''
  form.priceLevel = ''
  form.contactPhone = ''
  form.tags = ''
}

const fillForm = (item: FarmStay) => {
  form.name = item.name || ''
  form.city = item.city || ''
  form.address = item.address || ''
  form.description = item.description || ''
  form.coverImage = item.coverImage || ''
  form.priceRange = item.priceRange || ''
  form.priceLevel = item.priceLevel || ''
  form.contactPhone = item.contactPhone || ''
  form.tags = item.tags || ''
}

const loadFarmstays = async () => {
  loading.value = true
  error.value = ''
  try {
    farmstays.value = (await apiOwnerFarmstays()) as FarmStay[]
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '加载店铺失败', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  formMode.value = 'create'
  activeId.value = null
  resetForm()
  editorVisible.value = true
  error.value = ''
  success.value = ''
}

const openEdit = (item: FarmStay) => {
  formMode.value = 'edit'
  activeId.value = item.id
  fillForm(item)
  editorVisible.value = true
  error.value = ''
  success.value = ''
}

const closeEditor = () => {
  editorVisible.value = false
}

const validateForm = () => {
  if (!form.name.trim()) {
    setMessage('请填写农家乐名称', 'error')
    return false
  }
  if (!form.city.trim()) {
    setMessage('请填写所在城市', 'error')
    return false
  }
  return true
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }
  saving.value = true
  try {
    if (formMode.value === 'create') {
      await apiCreateFarmstay({ ...form })
      setMessage('店铺已创建', 'success')
    } else if (activeId.value) {
      await apiUpdateFarmstay(activeId.value, { ...form })
      setMessage('店铺资料已更新', 'success')
    }
    await loadFarmstays()
    closeEditor()
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const removeFarmstay = async () => {
  if (!activeFarmstay.value) {
    return
  }
  if (!window.confirm(`确定下架“${activeFarmstay.value.name}”吗？`)) {
    return
  }
  try {
    await apiDeleteFarmstay(activeFarmstay.value.id)
    setMessage('店铺已下架', 'success')
    await loadFarmstays()
    closeEditor()
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '下架失败', 'error')
  }
}

onMounted(loadFarmstays)
</script>

<template>
  <section class="catalog-shell">
    <header class="catalog-head surface">
      <div>
        <span class="badge">店铺资料管理</span>
        <h3 class="section-title">我的农家乐卡片库</h3>
        <p class="muted">先浏览卡片，再进入单店编辑。更适合经营者管理多家店铺。</p>
      </div>
      <div class="catalog-actions">
        <button class="btn btn-secondary" @click="loadFarmstays">刷新列表</button>
        <button class="btn btn-primary" @click="openCreate">新建店铺</button>
      </div>
    </header>

    <div class="metrics-row">
      <article class="metric-card surface-strong">
        <span>店铺总数</span>
        <strong>{{ farmstays.length }}</strong>
      </article>
      <article class="metric-card surface-strong">
        <span>当前状态</span>
        <strong>{{ farmstays.length ? '可继续维护' : '待创建' }}</strong>
      </article>
      <article class="metric-card surface-strong">
        <span>工作建议</span>
        <strong>先补资料，再做房型与活动</strong>
      </article>
    </div>

    <div v-if="loading" class="status">正在加载店铺卡片...</div>
    <div v-else-if="!farmstays.length" class="empty-state surface-strong">
      <strong>还没有店铺资料</strong>
      <p class="muted">点击右上角“新建店铺”，创建第一张农家乐资料卡。</p>
    </div>
    <div v-else class="stay-grid">
      <article
        v-for="item in farmstays"
        :key="item.id"
        class="stay-card"
        :style="{
          backgroundImage: item.coverImage
            ? `linear-gradient(180deg, rgba(18, 28, 18, 0.12) 0%, rgba(18, 28, 18, 0.76) 70%), url(${item.coverImage})`
            : 'linear-gradient(180deg, rgba(18, 28, 18, 0.12) 0%, rgba(18, 28, 18, 0.72) 70%), linear-gradient(135deg, #2f6a49 0%, #8b5d32 100%)',
        }"
        @click="openEdit(item)"
      >
        <div class="stay-content">
          <div class="stay-head">
            <div>
              <h4>{{ item.name }}</h4>
              <p>{{ item.city }}</p>
            </div>
            <span class="chip">{{ item.status || 'PUBLISHED' }}</span>
          </div>

          <p class="stay-desc">{{ item.description || '这家店铺还没有完善对外介绍。' }}</p>

          <div class="stay-foot">
            <strong>{{ item.priceRange || item.priceLevel || '价格待完善' }}</strong>
            <div class="stay-tags">
              <span v-for="tag in (item.tags || '').split(',').filter(Boolean).slice(0, 3)" :key="tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="error" class="status error">{{ error }}</div>
    <div v-if="success" class="status">{{ success }}</div>
  </section>

  <Teleport to="body">
    <div v-if="editorVisible" class="modal-backdrop" @click.self="closeEditor">
      <section class="editor-modal surface-strong">
        <header class="editor-head">
          <div>
            <span class="badge">{{ formMode === 'create' ? '创建模式' : '编辑模式' }}</span>
            <h3 class="section-title">{{ formMode === 'create' ? '新建农家乐资料' : activeFarmstay?.name || '编辑农家乐资料' }}</h3>
            <p class="muted">
              {{ formMode === 'create' ? '先把基础信息补齐，再继续做房型、活动与优惠。' : '当前是在单店编辑视图中，保存后返回卡片库。' }}
            </p>
          </div>
          <button class="btn btn-secondary" @click="closeEditor">关闭</button>
        </header>

        <div class="snapshot-grid" v-if="formMode === 'edit' && activeFarmstay">
          <article>
            <span>城市</span>
            <strong>{{ activeFarmstay.city || '-' }}</strong>
          </article>
          <article>
            <span>联系方式</span>
            <strong>{{ activeFarmstay.contactPhone || '-' }}</strong>
          </article>
          <article>
            <span>价格标签</span>
            <strong>{{ activeFarmstay.priceRange || activeFarmstay.priceLevel || '-' }}</strong>
          </article>
        </div>

        <div class="editor-grid">
          <label class="field">
            <span>店铺名称</span>
            <input v-model="form.name" class="input" placeholder="例如：溪谷稻田农宿" />
          </label>
          <label class="field">
            <span>所在城市</span>
            <input v-model="form.city" class="input" placeholder="例如：成都" />
          </label>
          <label class="field span-2">
            <span>详细地址</span>
            <input v-model="form.address" class="input" placeholder="填写精确到乡镇/村落的地址" />
          </label>
          <label class="field span-2">
            <span>封面图片</span>
            <input v-model="form.coverImage" class="input" placeholder="填写图片 URL，用于卡片背景展示" />
          </label>
          <label class="field">
            <span>联系方式</span>
            <input v-model="form.contactPhone" class="input" placeholder="用于游客咨询" />
          </label>
          <label class="field">
            <span>价格区间</span>
            <input v-model="form.priceRange" class="input" placeholder="例如：¥268-¥588" />
          </label>
          <label class="field">
            <span>价格等级</span>
            <input v-model="form.priceLevel" class="input" placeholder="例如：premium" />
          </label>
          <label class="field">
            <span>店铺标签</span>
            <input v-model="form.tags" class="input" placeholder="例如：亲子,采摘,露营" />
          </label>
          <label class="field span-2">
            <span>店铺介绍</span>
            <textarea
              v-model="form.description"
              class="textarea"
              placeholder="突出环境、体验特色、适合人群和核心服务"
            />
          </label>
        </div>

        <div class="tips-panel">
          <article>
            <strong>内容建议</strong>
            <p class="muted">介绍优先写“适合谁”“特色体验”“从城市怎么到”。</p>
          </article>
          <article>
            <strong>标签建议</strong>
            <p class="muted">控制在 3-5 个核心标签，便于首页筛选和识别。</p>
          </article>
          <article>
            <strong>下一步</strong>
            <p class="muted">资料保存后，再继续完善房型、活动、餐饮和优惠券。</p>
          </article>
        </div>

        <div class="editor-actions">
          <button class="btn btn-secondary" @click="formMode === 'create' ? resetForm() : activeFarmstay && fillForm(activeFarmstay)">
            {{ formMode === 'create' ? '清空表单' : '恢复当前数据' }}
          </button>
          <div class="action-group">
            <button v-if="formMode === 'edit'" class="btn btn-danger" @click="removeFarmstay">下架店铺</button>
            <button class="btn btn-primary" :disabled="saving" @click="submitForm">
              {{ saving ? '保存中...' : formMode === 'create' ? '创建店铺' : '保存修改' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.catalog-shell {
  display: grid;
  gap: 16px;
}

.catalog-head {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.catalog-actions,
.action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.metric-card span {
  color: var(--ink-soft);
  font-size: 13px;
}

.metric-card strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 26px;
}

.stay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.stay-card {
  min-height: 276px;
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
  padding: 16px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(8, 12, 8, 0.12) 0%, rgba(8, 12, 8, 0.8) 72%);
}

.stay-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stay-head h4 {
  font-size: 22px;
  line-height: 1.2;
}

.stay-head p {
  opacity: 0.88;
  margin-top: 2px;
}

.chip {
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #203223;
  font-size: 12px;
  height: fit-content;
}

.stay-desc {
  line-height: 1.6;
  opacity: 0.94;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.stay-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stay-foot strong {
  color: #ffe8c7;
}

.stay-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stay-tags span {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #1b291d;
}

.empty-state {
  padding: 24px;
  display: grid;
  gap: 6px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(19, 28, 21, 0.56);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 60;
}

.editor-modal {
  width: min(980px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 18px;
  display: grid;
  gap: 16px;
}

.editor-head,
.editor-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.snapshot-grid article {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: #fff;
  padding: 12px;
  display: grid;
  gap: 4px;
}

.snapshot-grid span {
  font-size: 12px;
  color: var(--ink-soft);
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.span-2 {
  grid-column: span 2;
}

.tips-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tips-panel article {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 243, 234, 0.92) 100%);
  border: 1px solid var(--line);
  padding: 14px;
  display: grid;
  gap: 6px;
}

@media (max-width: 980px) {
  .catalog-head,
  .editor-head,
  .editor-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .metrics-row,
  .snapshot-grid,
  .tips-panel,
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
