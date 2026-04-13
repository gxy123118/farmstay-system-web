
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import {
  apiCreateFarmstay,
  apiDeleteFarmstay,
  apiListActivities,
  apiListDining,
  apiListRooms,
  apiOfflineFarmstay,
  apiOwnerFarmstays,
  apiPublishFarmstay,
  apiSaveFarmstayResources,
  apiUploadImage,
} from '../services/api'
import type {
  ActivityManage,
  DiningManage,
  FarmStayManage,
  RoomManage,
} from '../types/farmstay-management'

type FormMode = 'create' | 'edit'
type DraftMode = 'create' | 'edit'

type RoomDraft = {
  localKey: string
  id?: number
  mode: DraftMode
  expanded: boolean
  name: string
  description: string
  bedType: string
  maxGuests: string
  price: string
  stock: string
  tags: string
  status: string
}

type DiningDraft = {
  localKey: string
  id?: number
  mode: DraftMode
  expanded: boolean
  name: string
  description: string
  price: string
  tags: string
  status: string
}

type ActivityDraft = {
  localKey: string
  id?: number
  mode: DraftMode
  expanded: boolean
  name: string
  description: string
  schedule: string
  capacity: string
  price: string
  tags: string
  status: string
}

const PRICE_LEVEL_OPTIONS = [
  { label: '标准', value: 'standard' },
  { label: '优选', value: 'premium' },
] as const

const STATUS_OPTIONS = [
  { label: '上架中', value: 'ACTIVE' },
  { label: '暂不开放', value: 'INACTIVE' },
]

const farmstays = ref<FarmStayManage[]>([])
const rooms = ref<RoomManage[]>([])
const diningItems = ref<DiningManage[]>([])
const activityItems = ref<ActivityManage[]>([])
const roomDrafts = ref<RoomDraft[]>([])
const diningDrafts = ref<DiningDraft[]>([])
const activityDrafts = ref<ActivityDraft[]>([])

const loading = ref(false)
const saving = ref(false)
const loadingResources = ref(false)
const editorVisible = ref(false)
const formMode = ref<FormMode>('create')
const activeId = ref<number | null>(null)

const error = ref('')
const success = ref('')

const farmstayImageUploading = ref(false)

const activeResourceForm = ref<'room' | 'dining' | 'activity' | null>(null)
const activeDraftKey = ref<string | null>(null)

const activeFarmstay = computed(() => farmstays.value.find((item) => item.id === activeId.value) || null)
const canManageResources = computed(() => activeId.value !== null)
const isFarmstayDown = (status?: string | null) => status === 'INACTIVE' || status === 'OFFLINE'

const form = reactive({
  name: '',
  city: '',
  address: '',
  description: '',
  coverImage: '',
  priceRange: '',
  priceLevel: 'standard',
  contactPhone: '',
  tags: '',
})

const setMessage = (message: string, type: 'error' | 'success') => {
  if (type === 'error') {
    error.value = message
    success.value = ''
    return
  }
  success.value = message
  error.value = ''
}

const clearMessage = () => {
  error.value = ''
  success.value = ''
}

const normalizeInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : String(value)

const parseOptionalInteger = (value: string | number | null | undefined) => {
  const trimmed = normalizeInputValue(value).trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const parseRequiredInteger = (value: string | number | null | undefined) => {
  const trimmed = normalizeInputValue(value).trim()
  if (!trimmed) return Number.NaN
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const parseRequiredNumber = (value: string | number | null | undefined) => {
  const trimmed = normalizeInputValue(value).trim()
  if (!trimmed) return Number.NaN
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const splitTags = (tags?: string) =>
  (tags || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)

const resetForm = () => {
  form.name = ''
  form.city = ''
  form.address = ''
  form.description = ''
  form.coverImage = ''
  form.priceRange = ''
  form.priceLevel = 'standard'
  form.contactPhone = ''
  form.tags = ''
}

const fillForm = (item: FarmStayManage) => {
  form.name = item.name || ''
  form.city = item.city || ''
  form.address = item.address || ''
  form.description = item.description || ''
  form.coverImage = item.coverImage || ''
  form.priceRange = item.priceRange || ''
  form.priceLevel = item.priceLevel || 'standard'
  form.contactPhone = item.contactPhone || ''
  form.tags = item.tags || ''
}

const createLocalKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const draftKey = (target: 'room' | 'dining' | 'activity', localKey: string) => `${target}:${localKey}`

const createRoomDraft = (item?: RoomManage, expanded = true): RoomDraft => ({
  localKey: createLocalKey(),
  id: item?.id,
  mode: item?.id ? 'edit' : 'create',
  expanded,
  name: item?.name || '',
  description: item?.description || '',
  bedType: item?.bedType || '',
  maxGuests: item?.maxGuests === undefined ? '' : String(item.maxGuests),
  price: item?.price === undefined ? '' : String(item.price),
  stock: item?.stock === undefined ? '' : String(item.stock),
  tags: item?.tags || '',
  status: item?.status || 'ACTIVE',
})

const createDiningDraft = (item?: DiningManage, expanded = true): DiningDraft => ({
  localKey: createLocalKey(),
  id: item?.id,
  mode: item?.id ? 'edit' : 'create',
  expanded,
  name: item?.name || '',
  description: item?.description || '',
  price: item?.price === undefined ? '' : String(item.price),
  tags: item?.tags || '',
  status: item?.status || 'ACTIVE',
})

const createActivityDraft = (item?: ActivityManage, expanded = true): ActivityDraft => ({
  localKey: createLocalKey(),
  id: item?.id,
  mode: item?.id ? 'edit' : 'create',
  expanded,
  name: item?.name || '',
  description: item?.description || '',
  schedule: item?.schedule || '',
  capacity: item?.capacity === undefined ? '' : String(item.capacity),
  price: item?.price === undefined ? '' : String(item.price),
  tags: item?.tags || '',
  status: item?.status || 'ACTIVE',
})

const isRoomDraftBlank = (draft: RoomDraft) =>
  ![
    draft.name,
    draft.description,
    draft.bedType,
    draft.maxGuests,
    draft.price,
    draft.stock,
    draft.tags,
  ].some((value) => value.trim())

const roomDraftCount = computed(() => roomDrafts.value.filter((draft) => !isRoomDraftBlank(draft)).length)
const diningDraftCount = computed(() => diningDrafts.value.filter((draft) => !isDiningDraftBlank(draft)).length)
const activityDraftCount = computed(() => activityDrafts.value.filter((draft) => !isActivityDraftBlank(draft)).length)

const rebuildDraftCollections = () => {
  roomDrafts.value = rooms.value.map((item) => createRoomDraft(item, false))
  diningDrafts.value = diningItems.value.map((item) => createDiningDraft(item, false))
  activityDrafts.value = activityItems.value.map((item) => createActivityDraft(item, false))
  activeDraftKey.value = null
  activeResourceForm.value = null
}

const resetResourceForms = () => {
  rebuildDraftCollections()
}

const focusDraft = async (target: 'room' | 'dining' | 'activity', localKey: string) => {
  activeResourceForm.value = target
  activeDraftKey.value = draftKey(target, localKey)
  await nextTick()
  const container = document.getElementById(`${target}-draft-${localKey}`)
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const input = document.getElementById(`${target}-name-input-${localKey}`) as HTMLInputElement | null
  if (input) input.focus()
}

const addRoomDraft = async () => {
  roomDrafts.value.forEach((draft) => { draft.expanded = false })
  const draft = createRoomDraft(undefined, true)
  roomDrafts.value.unshift(draft)
  await focusDraft('room', draft.localKey)
}

const addDiningDraft = async () => {
  diningDrafts.value.forEach((draft) => { draft.expanded = false })
  const draft = createDiningDraft(undefined, true)
  diningDrafts.value.unshift(draft)
  await focusDraft('dining', draft.localKey)
}

const addActivityDraft = async () => {
  activityDrafts.value.forEach((draft) => { draft.expanded = false })
  const draft = createActivityDraft(undefined, true)
  activityDrafts.value.unshift(draft)
  await focusDraft('activity', draft.localKey)
}

const toggleRoomDraft = async (localKey: string) => {
  roomDrafts.value = roomDrafts.value.map((draft) => ({
    ...draft,
    expanded: draft.localKey === localKey ? !draft.expanded : false,
  }))
  const active = roomDrafts.value.find((draft) => draft.localKey === localKey)
  if (active?.expanded) {
    await focusDraft('room', localKey)
    return
  }
  if (activeDraftKey.value === draftKey('room', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const removeRoomDraft = (localKey: string) => {
  roomDrafts.value = roomDrafts.value.filter((draft) => draft.localKey !== localKey)
  if (activeDraftKey.value === draftKey('room', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const toggleDiningDraft = async (localKey: string) => {
  diningDrafts.value = diningDrafts.value.map((draft) => ({
    ...draft,
    expanded: draft.localKey === localKey ? !draft.expanded : false,
  }))
  const active = diningDrafts.value.find((draft) => draft.localKey === localKey)
  if (active?.expanded) {
    await focusDraft('dining', localKey)
    return
  }
  if (activeDraftKey.value === draftKey('dining', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const toggleActivityDraft = async (localKey: string) => {
  activityDrafts.value = activityDrafts.value.map((draft) => ({
    ...draft,
    expanded: draft.localKey === localKey ? !draft.expanded : false,
  }))
  const active = activityDrafts.value.find((draft) => draft.localKey === localKey)
  if (active?.expanded) {
    await focusDraft('activity', localKey)
    return
  }
  if (activeDraftKey.value === draftKey('activity', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const removeDiningDraft = (localKey: string) => {
  diningDrafts.value = diningDrafts.value.filter((draft) => draft.localKey !== localKey)
  if (activeDraftKey.value === draftKey('dining', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const removeActivityDraft = (localKey: string) => {
  activityDrafts.value = activityDrafts.value.filter((draft) => draft.localKey !== localKey)
  if (activeDraftKey.value === draftKey('activity', localKey)) {
    activeDraftKey.value = null
    activeResourceForm.value = null
  }
}

const isDiningDraftBlank = (draft: DiningDraft) =>
  ![draft.name, draft.description, draft.price, draft.tags].some((value) => value.trim())

const isActivityDraftBlank = (draft: ActivityDraft) =>
  ![
    draft.name,
    draft.description,
    draft.schedule,
    draft.capacity,
    draft.price,
    draft.tags,
  ].some((value) => value.trim())

const validateRoomDraft = (draft: RoomDraft, label: string) => {
  if (isRoomDraftBlank(draft)) return true
  if (!draft.name.trim()) {
    setMessage(`请填写${label}名称`, 'error')
    return false
  }
  const price = parseRequiredNumber(draft.price)
  const stock = parseRequiredInteger(draft.stock)
  const maxGuests = parseOptionalInteger(draft.maxGuests)
  if (Number.isNaN(price)) {
    setMessage(`请填写${label}价格`, 'error')
    return false
  }
  if (Number.isNaN(stock)) {
    setMessage(`请填写${label}库存`, 'error')
    return false
  }
  if (Number.isNaN(maxGuests)) {
    setMessage(`${label}可住人数必须是整数`, 'error')
    return false
  }
  return true
}

const normalizeRoomDraft = (draft: RoomDraft) => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  bedType: draft.bedType.trim(),
  maxGuests: parseOptionalInteger(draft.maxGuests),
  price: parseRequiredNumber(draft.price),
  stock: parseRequiredInteger(draft.stock),
  tags: draft.tags.trim(),
  status: draft.status,
})

const validateRoomDraftCollection = () => {
  for (const draft of roomDrafts.value) {
    if (isRoomDraftBlank(draft)) continue
    if (!validateRoomDraft(draft, '房型')) return false
  }
  return true
}

const validateDiningDraftCollection = () => {
  for (const draft of diningDrafts.value) {
    if (isDiningDraftBlank(draft)) continue
    if (!draft.name.trim()) {
      setMessage('请填写餐饮名称', 'error')
      return false
    }
    const price = parseRequiredNumber(draft.price)
    if (Number.isNaN(price)) {
      setMessage('请填写有效的餐饮价格', 'error')
      return false
    }
  }
  return true
}

const validateActivityDraftCollection = () => {
  for (const draft of activityDrafts.value) {
    if (isActivityDraftBlank(draft)) continue
    if (!draft.name.trim()) {
      setMessage('请填写活动名称', 'error')
      return false
    }
    const price = parseRequiredNumber(draft.price)
    const capacity = parseOptionalInteger(draft.capacity)
    if (Number.isNaN(price)) {
      setMessage('请填写有效的活动价格', 'error')
      return false
    }
    if (Number.isNaN(capacity)) {
      setMessage('活动人数必须是整数', 'error')
      return false
    }
  }
  return true
}

const normalizeDiningDraft = (draft: DiningDraft) => ({
  id: draft.id,
  name: draft.name.trim(),
  description: draft.description.trim(),
  price: parseRequiredNumber(draft.price),
  tags: draft.tags.trim(),
  status: draft.status,
})

const normalizeActivityDraft = (draft: ActivityDraft) => ({
  id: draft.id,
  name: draft.name.trim(),
  description: draft.description.trim(),
  schedule: draft.schedule.trim(),
  capacity: parseOptionalInteger(draft.capacity),
  price: parseRequiredNumber(draft.price),
  tags: draft.tags.trim(),
  status: draft.status,
})

const loadFarmstays = async () => {
  loading.value = true
  error.value = ''
  try {
    farmstays.value = await apiOwnerFarmstays()
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '加载店铺失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadResources = async (farmStayId: number) => {
  loadingResources.value = true
  try {
    const [roomList, diningList, activityList] = await Promise.all([
      apiListRooms(farmStayId),
      apiListDining(farmStayId),
      apiListActivities(farmStayId),
    ])
    rooms.value = roomList
    diningItems.value = diningList
    activityItems.value = activityList
    rebuildDraftCollections()
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '加载店铺资源失败', 'error')
  } finally {
    loadingResources.value = false
  }
}

const openCreate = () => {
  formMode.value = 'create'
  activeId.value = null
  editorVisible.value = true
  clearMessage()
  resetForm()
  rooms.value = []
  diningItems.value = []
  activityItems.value = []
  roomDrafts.value = []
  diningDrafts.value = []
  activityDrafts.value = []
  resetResourceForms()
}

const openEdit = async (item: FarmStayManage) => {
  formMode.value = 'edit'
  activeId.value = item.id
  editorVisible.value = true
  clearMessage()
  fillForm(item)
  rooms.value = []
  diningItems.value = []
  activityItems.value = []
  resetResourceForms()
  await loadResources(item.id)
}

const closeEditor = () => {
  editorVisible.value = false
}

const validateBaseForm = () => {
  if (!form.name.trim()) {
    setMessage('请填写店铺名称', 'error')
    return false
  }
  if (!form.city.trim()) {
    setMessage('请填写所在城市', 'error')
    return false
  }
  if (!form.priceLevel) {
    setMessage('请选择价格等级', 'error')
    return false
  }
  return true
}

const submitForm = async () => {
  if (!validateBaseForm()) return
  if (!validateRoomDraftCollection()) return
  if (!validateDiningDraftCollection()) return
  if (!validateActivityDraftCollection()) return

  saving.value = true
  clearMessage()
  try {
    const basePayload = {
      ...form,
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      coverImage: form.coverImage.trim(),
      priceRange: form.priceRange.trim(),
      priceLevel: form.priceLevel,
      contactPhone: form.contactPhone.trim(),
      tags: form.tags.trim(),
    }

    if (formMode.value === 'create') {
      const created = await apiCreateFarmstay(basePayload)
      await loadFarmstays()
      formMode.value = 'edit'
      activeId.value = created.id
      fillForm(created)
      await loadResources(created.id)
      setMessage('店铺基础资料已创建，当前已切换到编辑模式，可继续维护房型、餐饮和娱乐活动', 'success')
      return
    }

    if (!activeId.value) return
    const saved = await apiSaveFarmstayResources(activeId.value, {
      ...basePayload,
      rooms: roomDrafts.value
        .filter((draft) => !isRoomDraftBlank(draft))
        .map((draft) => normalizeRoomDraft(draft)),
      dinings: diningDrafts.value
        .filter((draft) => !isDiningDraftBlank(draft))
        .map((draft) => normalizeDiningDraft(draft)),
      activities: activityDrafts.value
        .filter((draft) => !isActivityDraftBlank(draft))
        .map((draft) => normalizeActivityDraft(draft)),
    })
    await loadFarmstays()
    fillForm(saved.farmStay)
    rooms.value = saved.rooms
    diningItems.value = saved.dinings
    activityItems.value = saved.activities
    rebuildDraftCollections()
    setMessage('店铺资料与资源已统一保存', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const removeFarmstay = async () => {
  if (!activeFarmstay.value) return
  if (!window.confirm(`确定删除“${activeFarmstay.value.name}”吗？`)) return
  try {
    await apiDeleteFarmstay(activeFarmstay.value.id)
    await loadFarmstays()
    closeEditor()
    setMessage('店铺已删除', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '店铺删除失败', 'error')
  }
}

const offlineFarmstay = async () => {
  if (!activeFarmstay.value) return
  if (!window.confirm(`确定下架“${activeFarmstay.value.name}”吗？`)) return
  try {
    const updated = await apiOfflineFarmstay(activeFarmstay.value.id)
    await loadFarmstays()
    fillForm(updated)
    setMessage('店铺已下架', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '店铺下架失败', 'error')
  }
}

const publishFarmstay = async () => {
  if (!activeFarmstay.value) return
  if (!window.confirm(`确定上架“${activeFarmstay.value.name}”吗？`)) return
  try {
    const updated = await apiPublishFarmstay(activeFarmstay.value.id)
    await loadFarmstays()
    fillForm(updated)
    setMessage('店铺已上架', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '店铺上架失败', 'error')
  }
}

const uploadImageFile = async (file: File) => {
  if (!file) return
  farmstayImageUploading.value = true
  clearMessage()
  try {
    const uploaded = await apiUploadImage(file)
    form.coverImage = uploaded.url
    setMessage('图片上传成功', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : '图片上传失败', 'error')
  } finally {
    farmstayImageUploading.value = false
  }
}

const onFarmstayImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await uploadImageFile(file)
  input.value = ''
}

onMounted(loadFarmstays)
</script>

<template>
  <section class="catalog-shell">
    <header class="catalog-head surface">
      <div>
        <span class="badge">店铺资料管理</span>
        <h3 class="section-title">我的农家乐卡片库</h3>
        <p class="muted">先建店铺基础信息，再继续管理房型、餐饮和娱乐活动。</p>
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
        <strong>先补资料，再完善房型和服务</strong>
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
              <span v-for="tag in splitTags(item.tags).slice(0, 3)" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>

  </section>

  <Teleport to="body">
    <div v-if="editorVisible" class="modal-backdrop" @click.self="closeEditor">
      <section class="editor-modal surface-strong">
        <header class="editor-head">
          <div>
            <span class="badge">{{ formMode === 'create' ? '创建模式' : '编辑模式' }}</span>
            <h3 class="section-title">{{ formMode === 'create' ? '新建农家乐资料' : activeFarmstay?.name || '编辑农家乐资料' }}</h3>
          </div>
          <button class="btn btn-secondary" @click="closeEditor">关闭</button>
        </header>

        <div v-if="error" class="status error editor-notice">{{ error }}</div>
        <div v-if="success" class="status editor-notice">{{ success }}</div>

        <div class="editor-content">
          <div class="snapshot-grid" v-if="formMode === 'edit' && activeFarmstay">
            <article><span>城市</span><strong>{{ activeFarmstay.city || '-' }}</strong></article>
            <article><span>联系方式</span><strong>{{ activeFarmstay.contactPhone || '-' }}</strong></article>
            <article><span>资源概况</span><strong>{{ roomDraftCount }} 房型 · {{ diningDraftCount }} 餐饮 · {{ activityDraftCount }} 活动</strong></article>
          </div>

          <section class="surface base-panel">
            <div class="panel-heading">
              <div>
                <span class="mini-kicker">Step 1</span>
                <h4>基础资料</h4>
              </div>
              <span class="muted">店铺名称、城市、封面图、价格等级</span>
            </div>

            <div class="editor-grid">
              <label class="field"><span>店铺名称</span><input v-model="form.name" class="input" placeholder="例如：溪谷稻田农宿" /></label>
              <label class="field"><span>所在城市</span><input v-model="form.city" class="input" placeholder="例如：成都" /></label>
              <label class="field span-2"><span>详细地址</span><input v-model="form.address" class="input" placeholder="填写精确到乡镇/村落的地址" /></label>
              <div class="field span-2">
                <span>封面图片</span>
                <div class="upload-card">
                  <div class="upload-preview" :style="{ backgroundImage: form.coverImage ? `linear-gradient(180deg, rgba(15, 25, 18, 0.08), rgba(15, 25, 18, 0.52)), url(${form.coverImage})` : 'linear-gradient(135deg, rgba(47, 106, 73, 0.9), rgba(196, 122, 51, 0.75))' }">
                    <span>{{ form.coverImage ? '已上传店铺封面' : '上传店铺封面图' }}</span>
                  </div>
                  <div class="upload-actions">
                    <label class="btn btn-secondary file-btn">{{ farmstayImageUploading ? '上传中...' : '选择图片' }}<input type="file" accept="image/png,image/jpeg,image/webp" @change="onFarmstayImageChange" /></label>
                    <button class="btn btn-secondary" type="button" @click="form.coverImage = ''">移除图片</button>
                    <span class="muted">支持 jpg、png、webp，大小不超过 5MB</span>
                  </div>
                </div>
              </div>
              <label class="field"><span>联系方式</span><input v-model="form.contactPhone" class="input" placeholder="用于游客咨询" /></label>
              <label class="field"><span>价格区间</span><input v-model="form.priceRange" class="input" placeholder="例如：¥268-¥588" /></label>
              <label class="field"><span>价格等级</span><select v-model="form.priceLevel" class="select"><option v-for="option in PRICE_LEVEL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
              <label class="field"><span>店铺标签</span><input v-model="form.tags" class="input" placeholder="例如：亲子,采摘,露营" /></label>
              <label class="field span-2"><span>店铺介绍</span><textarea v-model="form.description" class="textarea" placeholder="突出环境、体验特色、适合人群和核心服务" /></label>
            </div>
          </section>

          <section v-if="formMode === 'edit' && activeFarmstay" class="resource-board surface">
            <div class="panel-heading">
              <div>
                <span class="mini-kicker">Step 2</span>
                <h4>房型、餐饮与娱乐活动</h4>
              </div>
            </div>

            <div v-if="loadingResources" class="status">正在加载店铺资源...</div>
            <div class="resource-grid">
              <section class="resource-panel">
                <div class="resource-head">
                  <div><h5>房型</h5><p class="muted">已编辑 {{ roomDraftCount }} 个房型，新增、修改和删除会在右下角“保存修改”时统一提交</p></div>
                  <button class="btn btn-secondary" type="button" :disabled="!canManageResources" @click="addRoomDraft">新增房型</button>
                </div>
                <div v-if="roomDrafts.length" class="resource-list draft-list">
                  <article
                    v-for="draft in roomDrafts"
                    :id="`room-draft-${draft.localKey}`"
                    :key="draft.localKey"
                    class="resource-draft"
                  >
                    <div
                      class="resource-item draft-summary"
                      role="button"
                      tabindex="0"
                      :class="{ 'is-highlighted': activeDraftKey === draftKey('room', draft.localKey) }"
                      @click="toggleRoomDraft(draft.localKey)"
                      @keydown.enter.prevent="toggleRoomDraft(draft.localKey)"
                      @keydown.space.prevent="toggleRoomDraft(draft.localKey)"
                    >
                      <div class="resource-main">
                        <strong>{{ draft.name || '未命名房型' }}</strong>
                        <p>{{ draft.bedType || '床型待补充' }} · {{ draft.maxGuests || '-' }} 人 · 库存 {{ draft.stock || '-' }}</p>
                        <div class="resource-meta">
                          <span>{{ draft.status === 'INACTIVE' ? '暂不开放' : '上架中' }}</span>
                          <span v-if="draft.tags">{{ draft.tags }}</span>
                          <span>{{ draft.id ? '已保存' : '待保存' }}</span>
                        </div>
                      </div>
                      <div class="draft-side">
                        <span class="resource-price">¥{{ draft.price || 0 }}</span>
                        <button class="btn btn-danger" type="button" @click.stop="removeRoomDraft(draft.localKey)">删除</button>
                      </div>
                    </div>
                    <div v-if="draft.expanded" class="resource-form draft-body is-active">
                      <div class="inline-fields">
                        <input
                          :id="`room-name-input-${draft.localKey}`"
                          v-model="draft.name"
                          class="input"
                          placeholder="房型名称"
                        />
                        <input v-model="draft.bedType" class="input" placeholder="床型，例如：大床 / 双床" />
                      </div>
                      <div class="inline-fields triple">
                        <input v-model="draft.maxGuests" class="input" type="number" min="1" placeholder="可住人数" />
                        <input v-model="draft.price" class="input" type="number" min="0" step="0.01" placeholder="价格" />
                        <input v-model="draft.stock" class="input" type="number" min="0" step="1" placeholder="库存" />
                      </div>
                      <div class="inline-fields">
                        <input v-model="draft.tags" class="input" placeholder="标签，例如：湖景,露台" />
                        <select v-model="draft.status" class="select">
                          <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                      </div>
                      <textarea v-model="draft.description" class="textarea compact-area" placeholder="房型介绍" />
                    </div>
                  </article>
                </div>
                <div v-else class="empty-resource-card">
                  <strong>当前店铺还没有房型草稿</strong>
                  <p class="muted">先点击“新增房型”创建一个草稿，再通过右下角“保存修改”统一提交。</p>
                </div>
              </section>

              <section class="resource-panel">
                <div class="resource-head">
                  <div><h5>餐饮服务</h5><p class="muted">已编辑 {{ diningDraftCount }} 项餐饮，新增、修改和删除会在右下角“保存修改”时统一提交</p></div>
                  <button class="btn btn-secondary" type="button" :disabled="!canManageResources" @click="addDiningDraft">新增餐饮</button>
                </div>
                <div v-if="diningDrafts.length" class="resource-list draft-list">
                  <article
                    v-for="draft in diningDrafts"
                    :id="`dining-draft-${draft.localKey}`"
                    :key="draft.localKey"
                    class="resource-draft"
                  >
                    <div
                      class="resource-item draft-summary"
                      role="button"
                      tabindex="0"
                      :class="{ 'is-highlighted': activeDraftKey === draftKey('dining', draft.localKey) }"
                      @click="toggleDiningDraft(draft.localKey)"
                      @keydown.enter.prevent="toggleDiningDraft(draft.localKey)"
                      @keydown.space.prevent="toggleDiningDraft(draft.localKey)"
                    >
                      <div class="resource-main">
                        <strong>{{ draft.name || '未命名餐饮' }}</strong>
                        <p>{{ draft.description || '暂无描述' }}</p>
                        <div class="resource-meta">
                          <span>{{ draft.status === 'INACTIVE' ? '暂不开放' : '上架中' }}</span>
                          <span v-if="draft.tags">{{ draft.tags }}</span>
                          <span>{{ draft.id ? '已保存' : '待保存' }}</span>
                        </div>
                      </div>
                      <div class="draft-side">
                        <span class="resource-price">¥{{ draft.price || 0 }}</span>
                        <button class="btn btn-danger" type="button" @click.stop="removeDiningDraft(draft.localKey)">删除</button>
                      </div>
                    </div>
                    <div v-if="draft.expanded" class="resource-form draft-body is-active">
                      <div class="inline-fields">
                        <input
                          :id="`dining-name-input-${draft.localKey}`"
                          v-model="draft.name"
                          class="input"
                          placeholder="餐饮名称"
                        />
                        <input v-model="draft.price" class="input" type="number" min="0" step="0.01" placeholder="价格" />
                      </div>
                      <div class="inline-fields">
                        <input v-model="draft.tags" class="input" placeholder="标签，例如：早餐,土灶" />
                        <select v-model="draft.status" class="select">
                          <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                      </div>
                      <textarea v-model="draft.description" class="textarea compact-area" placeholder="餐饮介绍" />
                    </div>
                  </article>
                </div>
                <div v-else class="empty-resource-card">
                  <strong>当前店铺还没有餐饮草稿</strong>
                  <p class="muted">先点击“新增餐饮”创建一个草稿，再通过右下角“保存修改”统一提交。</p>
                </div>
              </section>

              <section class="resource-panel">
                <div class="resource-head">
                  <div><h5>娱乐活动</h5><p class="muted">已编辑 {{ activityDraftCount }} 项活动，新增、修改和删除会在右下角“保存修改”时统一提交</p></div>
                  <button class="btn btn-secondary" type="button" :disabled="!canManageResources" @click="addActivityDraft">新增活动</button>
                </div>
                <div v-if="activityDrafts.length" class="resource-list draft-list">
                  <article
                    v-for="draft in activityDrafts"
                    :id="`activity-draft-${draft.localKey}`"
                    :key="draft.localKey"
                    class="resource-draft"
                  >
                    <div
                      class="resource-item draft-summary"
                      role="button"
                      tabindex="0"
                      :class="{ 'is-highlighted': activeDraftKey === draftKey('activity', draft.localKey) }"
                      @click="toggleActivityDraft(draft.localKey)"
                      @keydown.enter.prevent="toggleActivityDraft(draft.localKey)"
                      @keydown.space.prevent="toggleActivityDraft(draft.localKey)"
                    >
                      <div class="resource-main">
                        <strong>{{ draft.name || '未命名活动' }}</strong>
                        <p>{{ draft.schedule || '时间待补充' }} · 容量 {{ draft.capacity || '-' }} 人</p>
                        <div class="resource-meta">
                          <span>{{ draft.status === 'INACTIVE' ? '暂不开放' : '上架中' }}</span>
                          <span v-if="draft.tags">{{ draft.tags }}</span>
                          <span>{{ draft.id ? '已保存' : '待保存' }}</span>
                        </div>
                      </div>
                      <div class="draft-side">
                        <span class="resource-price">¥{{ draft.price || 0 }}</span>
                        <button class="btn btn-danger" type="button" @click.stop="removeActivityDraft(draft.localKey)">删除</button>
                      </div>
                    </div>
                    <div v-if="draft.expanded" class="resource-form draft-body is-active">
                      <div class="inline-fields">
                        <input
                          :id="`activity-name-input-${draft.localKey}`"
                          v-model="draft.name"
                          class="input"
                          placeholder="活动名称"
                        />
                        <input v-model="draft.schedule" class="input" placeholder="活动时间，例如：每周六 16:00" />
                      </div>
                      <div class="inline-fields triple">
                        <input v-model="draft.capacity" class="input" type="number" min="1" step="1" placeholder="人数上限" />
                        <input v-model="draft.price" class="input" type="number" min="0" step="0.01" placeholder="价格" />
                        <select v-model="draft.status" class="select">
                          <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                      </div>
                      <input v-model="draft.tags" class="input" placeholder="标签，例如：露营,手作,亲子" />
                      <textarea v-model="draft.description" class="textarea compact-area" placeholder="活动介绍" />
                    </div>
                  </article>
                </div>
                <div v-else class="empty-resource-card">
                  <strong>当前店铺还没有活动草稿</strong>
                  <p class="muted">先点击“新增活动”创建一个草稿，再通过右下角“保存修改”统一提交。</p>
                </div>
              </section>
            </div>
          </section>
        </div>

        <div class="editor-actions">
          <button class="btn btn-secondary" @click="formMode === 'create' ? (resetForm(), resetResourceForms()) : activeFarmstay && (fillForm(activeFarmstay), resetResourceForms())">{{ formMode === 'create' ? '清空表单' : '恢复当前数据' }}</button>
          <div class="action-group">
            <button
              v-if="formMode === 'edit' && activeFarmstay && isFarmstayDown(activeFarmstay.status)"
              class="btn btn-secondary"
              @click="publishFarmstay"
            >上架店铺</button>
            <button
              v-if="formMode === 'edit' && activeFarmstay && !isFarmstayDown(activeFarmstay.status)"
              class="btn btn-danger"
              @click="offlineFarmstay"
            >下架店铺</button>
            <button
              v-if="formMode === 'edit' && activeFarmstay && isFarmstayDown(activeFarmstay.status)"
              class="btn btn-danger"
              @click="removeFarmstay"
            >删除店铺</button>
            <button class="btn btn-primary" :disabled="saving" @click="submitForm">{{ saving ? '保存中...' : formMode === 'create' ? '创建店铺' : '保存修改' }}</button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.catalog-shell { display: grid; gap: 16px; }
.catalog-head { padding: 18px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.catalog-actions, .action-group { display: flex; gap: 8px; flex-wrap: wrap; }
.metrics-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.metric-card { padding: 14px; display: grid; gap: 6px; }
.metric-card span { color: var(--ink-soft); font-size: 13px; }
.metric-card strong { color: var(--ink-strong); font-family: var(--font-display); font-size: 26px; }
.stay-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.stay-card { min-height: 276px; border-radius: var(--radius-lg); overflow: hidden; background-size: cover; background-position: center; box-shadow: 0 14px 32px rgba(29, 43, 31, 0.2); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.stay-card:hover { transform: translateY(-3px); box-shadow: 0 22px 36px rgba(29, 43, 31, 0.24); }
.stay-content { height: 100%; padding: 16px; color: #fff; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(180deg, rgba(8, 12, 8, 0.12) 0%, rgba(8, 12, 8, 0.8) 72%); }
.stay-head { display: flex; justify-content: space-between; gap: 10px; }
.stay-head h4 { font-size: 22px; line-height: 1.2; }
.stay-head p { opacity: 0.88; margin-top: 2px; }
.chip { border-radius: 999px; padding: 5px 10px; background: rgba(255, 255, 255, 0.9); color: #203223; font-size: 12px; height: fit-content; }
.stay-desc { line-height: 1.6; opacity: 0.94; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.stay-foot { display: flex; flex-direction: column; gap: 8px; }
.stay-foot strong { color: #ffe8c7; }
.stay-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.stay-tags span { border-radius: 999px; padding: 4px 9px; font-size: 12px; background: rgba(255, 255, 255, 0.9); color: #1b291d; }
.empty-state { padding: 24px; display: grid; gap: 6px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(19, 28, 21, 0.56); display: flex; justify-content: center; align-items: center; padding: 20px; z-index: 60; }
.editor-modal { width: min(1220px, 100%); max-height: 92vh; overflow: hidden; padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.editor-head, .editor-actions { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.editor-content { min-height: 0; flex: 1; display: grid; gap: 16px; overflow-y: auto; padding-right: 6px; }
.editor-notice { margin: 0; }
.snapshot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.snapshot-grid article { border: 1px solid var(--line); border-radius: var(--radius-md); background: #fff; padding: 12px; display: grid; gap: 4px; }
.snapshot-grid span { font-size: 12px; color: var(--ink-soft); }
.base-panel, .resource-board { padding: 16px; border-radius: 20px; display: grid; gap: 14px; }
.panel-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
.panel-heading h4 { font-size: 22px; color: var(--ink-strong); }
.mini-kicker { display: inline-flex; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); }
.editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.span-2 { grid-column: span 2; }
.upload-card { border: 1px solid var(--line); border-radius: 18px; padding: 12px; display: grid; gap: 12px; background: rgba(255, 255, 255, 0.82); }
.upload-preview { min-height: 180px; border-radius: 16px; background-size: cover; background-position: center; display: flex; align-items: flex-end; padding: 14px; color: #fff; font-weight: 700; }
.upload-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.file-btn { position: relative; overflow: hidden; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.resource-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.resource-panel { border: 1px solid rgba(47, 106, 73, 0.14); border-radius: 18px; background: rgba(255, 255, 255, 0.78); padding: 14px; display: grid; gap: 12px; align-content: start; }
.resource-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.resource-head h5 { font-size: 20px; color: var(--ink-strong); }
.resource-list { display: grid; gap: 10px; }
.resource-draft { display: grid; gap: 10px; }
.resource-item.draft-summary { width: 100%; }
.resource-item { border: 1px solid rgba(47, 106, 73, 0.16); border-radius: 16px; background: linear-gradient(180deg, #ffffff 0%, #f8fbf7 100%); padding: 14px 16px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; text-align: left; cursor: pointer; box-shadow: 0 10px 22px rgba(28, 46, 31, 0.08); }
.resource-item.is-highlighted { border-color: rgba(47, 106, 73, 0.5); box-shadow: 0 0 0 3px rgba(47, 106, 73, 0.14), 0 14px 28px rgba(28, 46, 31, 0.14); }
.resource-main { display: grid; gap: 6px; }
.draft-side { display: grid; justify-items: end; gap: 10px; align-content: start; }
.resource-item strong { color: var(--ink-strong); }
.resource-item p { margin-top: 4px; color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
.resource-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.resource-meta span { padding: 4px 10px; border-radius: 999px; background: rgba(47, 106, 73, 0.08); color: var(--ink-soft); font-size: 12px; }
.resource-price { color: var(--brand-strong); font-weight: 700; white-space: nowrap; }
.resource-form { border-top: 1px dashed var(--line-strong); padding-top: 12px; display: grid; gap: 10px; }
.resource-form.is-active { border-top-style: solid; border-top-color: rgba(47, 106, 73, 0.35); box-shadow: inset 0 1px 0 rgba(47, 106, 73, 0.08); }
.resource-form-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.inline-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.inline-fields.triple { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.compact-area { min-height: 104px; }
.full-btn { width: 100%; }
.empty-resource-card { border: 1px dashed var(--line-strong); border-radius: 16px; background: rgba(248, 251, 247, 0.9); padding: 16px; display: grid; gap: 6px; }
@media (max-width: 980px) {
  .catalog-head,
  .editor-head,
  .editor-actions,
  .panel-heading,
  .resource-head { flex-direction: column; align-items: flex-start; }
  .metrics-row,
  .snapshot-grid,
  .editor-grid,
  .inline-fields,
  .inline-fields.triple { grid-template-columns: 1fr; }
  .span-2 { grid-column: span 1; }
}
</style>
