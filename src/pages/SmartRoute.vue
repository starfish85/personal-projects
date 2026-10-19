<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { parseRequirement } from '../utils/requirementParser'
import { planRoutes } from '../utils/routePlanner'
import { formatDistance } from '../utils/geo'
import { CATEGORIES, getPoi } from '../data/pois'
import { buildRoute } from '../data/paths'
import ParkMap from '../components/ParkMap.vue'

const router = useRouter()

// ── 页面状态 ──
const input = ref('')           // 用户输入的自然语言需求
const loading = ref(false)      // 是否正在请求 LLM
const error = ref('')           // 错误提示
const requirement = ref(null)   // LLM 解析出的结构化需求
const route = ref(null)          // 当前展示/选中的路线方案
const plans = ref([])            // 多个路线方案（方案1 / 方案2）
const selectedPlanId = ref(null) // 用户选中的方案 id

// 地图折线：把当前方案的各段真实路网拼接起来（route 变化时自动重算）
const routePoints = computed(() =>
  route.value && requirement.value
    ? buildPolyline(requirement.value.startGate, route.value)
    : []
)

// 地图上要打的点（从 stops 换成带 type 的完整 POI，供地图组件渲染标记）
const stopPois = computed(() =>
  (route.value?.stops || []).map((s) => getPoi(s.id)).filter(Boolean)
)

// 示例输入：帮用户快速体验，也覆盖不同需求场景
const examples = [
  '我有两个小时，喜欢湖景和花，少走路，中途想休息一下',
  '带小孩玩半天，想看花和玩水',
  '一小时内，随便走走，看看森林',
]

function useExample(text) {
  input.value = text
}

// 拼接一个方案的景点名：景点A → 景点B → …
const planStopsText = (plan) =>
  plan.stops.length ? plan.stops.map((s) => s.name).join(' → ') : '暂无推荐景点'

// 点选/取消点选某个方案（白 → 浅灰表示选中），并把它设为当前展示路线
function selectPlan(id) {
  selectedPlanId.value = selectedPlanId.value === id ? null : id
  const plan = plans.value.find((p) => p.id === id)
  if (plan) route.value = plan
}

// 只有选中了方案后才能开始导航，导航到该方案第一个景点
function goNavigate() {
  if (!selectedPlanId.value) return
  const plan = plans.value.find((p) => p.id === selectedPlanId.value)
  if (!plan || !plan.stops.length) return
  router.push({ name: 'navigate', params: { id: plan.stops[0].id } })
}

// 跳转到详情页，展示该方案整条路线的所有景点介绍
function showPlanDetail(plan) {
  if (!plan.stops.length) return
  router.push({
    name: 'detail',
    params: { id: plan.stops[0].id },
    query: { ids: plan.stops.map((s) => s.id).join(',') },
  })
}

// ── 核心：解析需求 + 规划路线 ──
// 这是整个页面的主流程，分两步：
//   1. parseRequirement：自然语言 → 结构化需求（有 Key 走 LLM，无 Key 自动用规则解析）
//   2. planRoute：结构化需求 → 路线方案（本地多目标算法）
async function plan() {
  if (!input.value.trim()) {
    error.value = '请输入您的游览需求'
    return
  }

  loading.value = true
  error.value = ''
  requirement.value = null
  route.value = null
  plans.value = []
  selectedPlanId.value = null

  try {
    // 第一步：解析需求（异步；无 API Key 时自动降级为本地规则解析，不阻塞演示）
    const req = await parseRequirement(input.value)
    requirement.value = req

    // 第二步：生成多条多样化路线方案（帕累托 + MMR，同步在浏览器端跑）
    const routes = planRoutes(req, 3)
    plans.value = routes.map((r, i) => ({ ...r, id: `plan-${i + 1}` }))
    // 默认展示方案1（地图折线 routePoints 随 route 变化自动重算）
    route.value = plans.value[0]
  } catch (e) {
    // 任何环节出错都显示给用户
    error.value = e.message || '解析失败，请重试'
  } finally {
    // finally 保证无论成功失败，loading 都会重置
    loading.value = false
  }
}

/**
 * 把规划结果展开成地图折线：起点门 → 每个景点 → 出口门。
 * 每段调用 buildRoute 取真实路网点（A* 结果），拼接成一条连续折线，
 * 这样地图上画出来的就是"实际要走的步道"，而不是景点之间的直线。
 */
function buildPolyline(startGateId, result) {
  const pts = []
  let prev = getPoi(startGateId) || getPoi('gate-south')
  const legs = [...result.stops.map((s) => s.id)]
  if (result.exit) legs.push(result.exit.id)
  for (const id of legs) {
    const leg = buildRoute(prev, id)
    if (leg?.points?.length) {
      pts.push(...leg.points)
    } else {
      const p = getPoi(id)
      if (p) pts.push({ lat: p.lat, lng: p.lng })
    }
    prev = getPoi(id) || prev
  }
  return pts
}

// 类别中文标签
const categoryLabel = (cat) => CATEGORIES[cat]?.label || cat
// 步行态度中文标签
const toleranceLabel = (t) =>
  ({ low: '希望少走', medium: '正常', high: '能多走' }[t] || '正常')
</script>

<template>
  <main class="page smart-route">
    <header class="header">
      <button class="back" @click="router.back()">←</button>
      <h1>智能路线</h1>
    </header>

    <section class="input-section">
      <p class="hint">用一句话告诉我您的游览需求：</p>
      <textarea
        v-model="input"
        class="input-box"
        placeholder="例如：我有两小时，喜欢湖景和花，少走路，中途想休息一下"
        rows="3"
      ></textarea>

      <div class="examples">
        <button v-for="ex in examples" :key="ex" class="example" @click="useExample(ex)">
          {{ ex }}
        </button>
      </div>

      <button class="plan-btn" :disabled="loading" @click="plan">
        {{ loading ? '正在规划...' : '开始规划' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <!-- 解析出的需求 -->
    <section v-if="requirement" class="card req-card">
      <div class="card-head">
        <h2>系统理解的需求</h2>
        <span class="src-badge" :class="requirement.source">
          {{ requirement.source === 'llm' ? 'AI 解析' : '模拟模式（本地规则）' }}
        </span>
      </div>
      <div class="req-grid">
        <div class="req-item">
          <span class="req-label">可用时间</span>
          <strong>{{ requirement.timeBudget }} 分钟</strong>
        </div>
        <div class="req-item">
          <span class="req-label">步行上限</span>
          <strong>{{ formatDistance(requirement.maxWalking) }}</strong>
        </div>
        <div class="req-item">
          <span class="req-label">步行态度</span>
          <strong>{{ toleranceLabel(requirement.walkTolerance) }}</strong>
        </div>
        <div class="req-item">
          <span class="req-label">需要休息</span>
          <strong>{{ requirement.needRest ? '是' : '否' }}</strong>
        </div>
        <div class="req-item">
          <span class="req-label">入口</span>
          <strong>{{ { 'gate-north': '北门', 'gate-east': '东门', 'gate-south': '南门', 'gate-southwest': '西南门' }[requirement.startGate] }}</strong>
        </div>
      </div>
      <ul v-if="requirement.conflicts && requirement.conflicts.length" class="conflicts">
        <li v-for="(c, i) in requirement.conflicts" :key="i">⚠ {{ c }}</li>
      </ul>
      <div class="pref-tags">
        <span class="req-label">偏好类别</span>
        <div class="tags">
          <span v-for="cat in requirement.preferences" :key="cat" class="tag">
            {{ categoryLabel(cat) }}
          </span>
        </div>
      </div>
      <p v-if="requirement.notes" class="req-notes">备注：{{ requirement.notes }}</p>
    </section>

    <!-- 规划出的路线 -->
    <section v-if="route" class="card route-card">
      <div class="route-header">
        <h2>推荐路线</h2>
        <span class="badge" :class="{ ok: route.feasible, bad: !route.feasible }">
          {{ route.feasible ? '可行' : '超预算' }}
        </span>
      </div>

      <div class="route-stats">
        <div class="stat">
          <span class="stat-label">总时间</span>
          <strong>{{ route.totalMin }} 分钟</strong>
        </div>
        <div class="stat">
          <span class="stat-label">步行距离</span>
          <strong>{{ formatDistance(route.totalDistance) }}</strong>
        </div>
        <div class="stat">
          <span class="stat-label">景点数</span>
          <strong>{{ route.stops.filter(s => !s.isRest).length }} 个</strong>
        </div>
        <div class="stat">
          <span class="stat-label">兴趣得分</span>
          <strong>{{ route.metrics.totalInterest }}</strong>
        </div>
        <div class="stat">
          <span class="stat-label">偏好命中</span>
          <strong>{{ route.metrics.prefHits }} 个</strong>
        </div>
        <div class="stat">
          <span class="stat-label">时间预算</span>
          <strong>{{ route.timeBudget }} 分钟</strong>
        </div>
      </div>

      <!-- 地图路线：把规划出的步道画在园内地图上 -->
      <div v-if="routePoints.length" class="map-box">
        <ParkMap :route="routePoints" :pois="stopPois" />
      </div>
      <ol class="stops">
        <li
          v-for="(plan, idx) in plans"
          :key="plan.id"
          class="stop"
          :class="{ selected: selectedPlanId === plan.id }"
          @click="selectPlan(plan.id)"
        >
          <span class="stop-num">{{ idx + 1 }}</span>
          <div class="stop-info">
            <strong>方案{{ idx + 1 }}</strong>
            <span class="stop-cat">{{ planStopsText(plan) }}</span>
          </div>
          <div class="stop-meta">
            <span>时间{{ plan.totalMin }}分钟</span>
            <span>距离{{ formatDistance(plan.totalDistance) }}</span>
          </div>
          <button class="stop-go" @click.stop="showPlanDetail(plan)">详情</button>
        </li>
      </ol>

      <p v-if="route.exit" class="exit-info">
        → 从{{ route.exit.name }}离开（步行{{ route.exit.walkMin }}分钟）
      </p>

      <div v-if="route.advice && route.advice.length" class="advice" :class="{ bad: !route.feasible }">
        <p class="advice-title">{{ route.feasible ? '小提示' : '这条路线不太合适，建议调整' }}</p>
        <ul>
          <li v-for="(a, i) in route.advice" :key="i">{{ a }}</li>
        </ul>
      </div>

      <button class="navigate-btn" :disabled="!selectedPlanId" @click="goNavigate">
        开始导航
      </button>
    </section>
  </main>
</template>

<style scoped>
.smart-route {
  padding: 0 0 40px;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(10px + var(--safe-top)) 16px 8px;
}
.back {
  font-size: var(--fs-xl);
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}
.header h1 {
  margin: 0;
  font-size: var(--fs-lg);
  color: var(--primary);
  font-weight: 800;
}
.input-section {
  padding: 8px 16px;
  display: grid;
  gap: 10px;
}
.hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-2);
}
.input-box {
  width: 100%;
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  font-size: var(--fs-base);
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}
.examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.example {
  text-align: left;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: var(--fs-xs);
  color: var(--ink-2);
  cursor: pointer;
}
.example:hover { background: var(--surface-3); }
.plan-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: var(--fs-base);
  font-weight: 700;
  cursor: pointer;
}
.plan-btn:disabled {
  opacity: 0.5;
}
.error {
  color: #c0392b;
  font-size: var(--fs-sm);
  margin: 0;
}
.card {
  margin: 8px 16px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.req-card h2,
.route-card h2 {
  margin: 0 0 12px;
  font-size: var(--fs-md);
  color: var(--primary);
}
.req-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}
.req-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.req-label {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}
.req-item strong {
  font-size: var(--fs-base);
}
.pref-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag {
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: var(--fs-xs);
  font-weight: 600;
}
.req-notes {
  margin: 8px 0 0;
  font-size: var(--fs-xs);
  color: var(--ink-3);
}
/* 需求卡片头部：标题 + 解析来源徽章 */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.card-head h2 {
  margin: 0;
}
.src-badge {
  flex: none;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: var(--fs-xs);
  font-weight: 700;
  background: #e8f5e9;
  color: #2e7d32;
}
.src-badge.rule {
  background: #fff4e5;
  color: #b26a00;
}
/* 需求冲突提示 */
.conflicts {
  margin: 10px 0 0;
  padding: 8px 12px;
  list-style: none;
  background: #fff4e5;
  border-radius: 10px;
}
.conflicts li {
  font-size: var(--fs-xs);
  color: #b26a00;
  font-weight: 600;
  line-height: 1.5;
}
/* 可行性建议 */
.advice {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #eef7ee;
}
.advice.bad {
  background: #fbe9e7;
}
.advice-title {
  margin: 0 0 6px;
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--ink-2, #333);
}
.advice ul {
  margin: 0;
  padding-left: 18px;
}
.advice li {
  font-size: var(--fs-xs);
  line-height: 1.6;
  color: var(--ink-2, #333);
}
/* 地图路线容器：给地图组件一个确定高度（组件内部按 100% 撑满） */
.map-box {
  height: 300px;
  margin-bottom: 14px;
  border-radius: 12px;
  overflow: hidden;
  background: #d4ddd0;
}
.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.badge {
  border-radius: 12px;
  padding: 2px 10px;
  font-size: var(--fs-xs);
  font-weight: 700;
}
.badge.ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge.bad {
  background: #fbe9e7;
  color: #c62828;
}
.route-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 8px 10px;
}
.stat-label {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}
.stat strong {
  font-size: var(--fs-base);
}
.stops {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: grid;
  gap: 8px;
}
.stop {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
}
.stop.selected {
  background: #f0f0f0;
}
.stop-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-xs);
  font-weight: 700;
  flex-shrink: 0;
}
.stop-info {
  flex: 1;
  min-width: 0;
}
.stop-info strong {
  font-size: var(--fs-sm);
  display: block;
}
.stop-cat {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}
.stop-rest {
  font-size: var(--fs-xs);
  color: #2e7d32;
  margin-left: 4px;
}
.stop-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fs-xs);
  color: var(--ink-3);
  text-align: right;
}
.stop-go {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: var(--fs-xs);
  color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}
.exit-info {
  margin: 0 0 10px;
  font-size: var(--fs-sm);
  color: var(--ink-2);
}
.warn {
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #fff3e0;
  border-radius: 8px;
  font-size: var(--fs-xs);
  color: #e65100;
}
.navigate-btn {
  width: 100%;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px;
  font-size: var(--fs-base);
  font-weight: 700;
  cursor: pointer;
}
/* 未选中方案时：浅绿色、不可点击；选中后恢复主色 */
.navigate-btn:disabled {
  background: #a5d6a7;
  cursor: not-allowed;
}
</style>
