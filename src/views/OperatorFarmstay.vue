<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiCreateFarmstay, apiDeleteFarmstay, apiOwnerFarmstays, apiUpdateFarmstay } from '../services/api'

type FarmStay = {
  id: number
  name: string
  city: string
  address?: string
  description?: string
  priceRange?: string
  priceLevel?: string
  contactPhone?: string
  tags?: string
  status?: string
}

const farmstays = ref<FarmStay[]>([])
const loading = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)

const createForm = reactive({
  name: '',
  city: '',
  address: '',
  description: '',
  priceRange: '',
  priceLevel: '',
  contactPhone: '',
  tags: '',
})

const editForm = reactive({
  name: '',
  city: '',
  address: '',
  description: '',
  priceRange: '',
  priceLevel: '',
  contactPhone: '',
  tags: '',
})

const resetCreate = () => {
  createForm.name = ''
  createForm.city = ''
  createForm.address = ''
  createForm.description = ''
  createForm.priceRange = ''
  createForm.priceLevel = ''
  createForm.contactPhone = ''
  createForm.tags = ''
}

const loadFarmstays = async () => {
  loading.value = true
  error.value = ''
  try {
    farmstays.value = (await apiOwnerFarmstays()) as FarmStay[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载农家乐失败'
  } finally {
    loading.value = false
  }
}

const createFarmstay = async () => {
  if (!createForm.name.trim() || !createForm.city.trim()) {
    error.value = '请填写农家乐名称和城市'
    return
  }
  error.value = ''
  try {
    await apiCreateFarmstay({ ...createForm })
    resetCreate()
    loadFarmstays()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建失败'
  }
}

const startEdit = (item: FarmStay) => {
  editingId.value = item.id
  editForm.name = item.name || ''
  editForm.city = item.city || ''
  editForm.address = item.address || ''
  editForm.description = item.description || ''
  editForm.priceRange = item.priceRange || ''
  editForm.priceLevel = item.priceLevel || ''
  editForm.contactPhone = item.contactPhone || ''
  editForm.tags = item.tags || ''
}

const cancelEdit = () => {
  editingId.value = null
}

const updateFarmstay = async () => {
  if (!editingId.value) return
  if (!editForm.name.trim() || !editForm.city.trim()) {
    error.value = '请填写农家乐名称和城市'
    return
  }
  error.value = ''
  try {
    await apiUpdateFarmstay(editingId.value, { ...editForm })
    editingId.value = null
    loadFarmstays()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新失败'
  }
}

const removeFarmstay = async (item: FarmStay) => {
  if (!window.confirm(`确定删除/下架“${item.name}”吗？`)) {
    return
  }
  error.value = ''
  try {
    await apiDeleteFarmstay(item.id)
    loadFarmstays()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  }
}

onMounted(() => {
  loadFarmstays()
})
</script>

<template>
  <section class="grid">
    <article class="card">
      <header class="card-header">
        <h3>创建农家乐</h3>
      </header>
      <div class="form">
        <label>名称<input v-model="createForm.name" /></label>
        <label>城市<input v-model="createForm.city" /></label>
        <label>地址<input v-model="createForm.address" /></label>
        <label>联系方式<input v-model="createForm.contactPhone" /></label>
        <label>价格区间<input v-model="createForm.priceRange" /></label>
        <label>价格等级<input v-model="createForm.priceLevel" /></label>
        <label>标签<input v-model="createForm.tags" placeholder="如：亲子,团建" /></label>
        <label>描述<textarea v-model="createForm.description"></textarea></label>
        <button class="btn primary" @click="createFarmstay">创建</button>
      </div>
    </article>

    <article class="card">
      <header class="card-header">
        <h3>我的农家乐</h3>
        <button class="btn" @click="loadFarmstays">刷新</button>
      </header>
      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else class="list">
        <div v-if="!farmstays.length" class="muted">暂无农家乐</div>
        <div v-for="item in farmstays" :key="item.id" class="list-item">
          <div class="list-main">
            <strong>{{ item.name }}</strong>
            <p class="muted">城市：{{ item.city }} · 状态：{{ item.status || '-' }}</p>
            <p class="muted">地址：{{ item.address || '-' }}</p>
            <p class="muted">联系方式：{{ item.contactPhone || '-' }}</p>
            <p class="muted">标签：{{ item.tags || '-' }}</p>
          </div>
          <div class="list-actions">
            <button class="btn" @click="startEdit(item)">编辑</button>
            <button class="btn danger" @click="removeFarmstay(item)">删除</button>
          </div>
        </div>
      </div>
    </article>
  </section>

  <section v-if="editingId" class="card">
    <header class="card-header">
      <h3>编辑农家乐</h3>
    </header>
    <div class="form">
      <label>名称<input v-model="editForm.name" /></label>
      <label>城市<input v-model="editForm.city" /></label>
      <label>地址<input v-model="editForm.address" /></label>
      <label>联系方式<input v-model="editForm.contactPhone" /></label>
      <label>价格区间<input v-model="editForm.priceRange" /></label>
      <label>价格等级<input v-model="editForm.priceLevel" /></label>
      <label>标签<input v-model="editForm.tags" /></label>
      <label>描述<textarea v-model="editForm.description"></textarea></label>
      <div class="btn-row">
        <button class="btn" @click="cancelEdit">取消</button>
        <button class="btn primary" @click="updateFarmstay">保存修改</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
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
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.8rem 1rem;
}

.list-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.list-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
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

.status {
  margin-top: 0.5rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0f172a;
}

.status.error {
  background: #fee2e2;
  border-color: #fecdd3;
  color: #b91c1c;
}

.muted {
  color: #475569;
}

@media (max-width: 720px) {
  .list-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-row,
  .list-actions {
    flex-wrap: wrap;
  }
}
</style>
