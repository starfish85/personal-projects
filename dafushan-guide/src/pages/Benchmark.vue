<script setup>
/**
 * 算法实验对比页（答辩用，不进入底部导航，只能通过 #/benchmark 访问）
 * 一键跑 10 组测试需求 × 4 种算法，展示明细表与汇总对比。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { runBenchmarkAsync, ALGO_LABELS, TEST_CASES } from '../utils/experiment'

const router = useRouter()
const loading = ref(false)
const result = ref(null)
const elapsed = ref(0)
const progress = ref(0)

const algoOrder = ['multi', 'oldgreedy', 'nearest', 'interest']

async function run() {
  loading.value = true
  result.value = null
  progress.value = 0
  // 让浏览器先把 loading 状态画出来，再跑计算量较大的实验
  await new Promise((r) => setTimeout(r, 50))
  const t0 = performance.now()
  // 分块异步执行，避免长时间冻结主线程
  result.value = await runBenchmarkAsync((done) => {
    progress.value = done
  })
  elapsed.value = Math.round(performance.now() - t0)
  loading.value = false
}

const pct = (v) => `${(v * 100).toFixed(0)}%`
const signed = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
</script>

<template>
  <main class="page bench">
    <header class="header">
      <button class="back" @click="router.push({ name: 'home' })">←</button>
      <h1>算法实验对比</h1>
    </header>

    <section class="intro">
      <p>
        用 {{ TEST_CASES.length }} 组不同偏好的测试需求，分别运行本方法（多目标优化）
        与三种基线算法，统计兴趣得分、步行成本、耗时与约束满足情况。
      </p>
      <button class="run-btn" :disabled="loading" @click="run">
        {{ loading ? `计算中… ${progress}/${TEST_CASES.length}` : '运行实验' }}
      </button>
      <p v-if="loading" class="tip">需要跑较多路径搜索，约需数十秒，请稍候…</p>
      <p v-if="elapsed" class="tip">本次计算耗时 {{ elapsed }} ms</p>
    </section>

    <template v-if="result">
      <!-- 汇总对比表 -->
      <section class="card">
        <h2>汇总对比（10 组平均）</h2>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>算法</th>
                <th>兴趣得分↑</th>
                <th>步行(分钟)↓</th>
                <th>步行(米)↓</th>
                <th>偏好命中↑</th>
                <th>目标函数↑</th>
                <th>可行率</th>
                <th>休息满足</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in algoOrder" :key="key" :class="{ ours: key === 'multi' }">
                <td class="name">{{ ALGO_LABELS[key] }}</td>
                <td>{{ result.summary[key].avgInterest }}</td>
                <td>{{ result.summary[key].avgWalkMin }}</td>
                <td>{{ result.summary[key].avgDistance }}</td>
                <td>{{ result.summary[key].avgPrefHits }}</td>
                <td>{{ result.summary[key].avgUtility }}</td>
                <td>{{ pct(result.summary[key].feasibleRate) }}</td>
                <td>{{ pct(result.summary[key].restRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="note">↑ 越高越好，↓ 越低越好。目标函数见 routePlanner.js 的目标函数定义。</p>
      </section>

      <!-- 相对最近邻基线的改进 -->
      <section class="card">
        <h2>相对「最近邻基线」的改进</h2>
        <ul class="impr">
          <li>兴趣得分：<strong>{{ signed(result.improvement.interest) }}</strong></li>
          <li>步行时间：<strong>{{ signed(result.improvement.walkMin) }}</strong>（正数=更省）</li>
          <li>目标函数值：<strong>{{ signed(result.improvement.utility) }}</strong></li>
        </ul>
      </section>

      <!-- 明细表 -->
      <section class="card">
        <h2>分用例明细</h2>
        <div class="scroll">
          <table class="detail">
            <thead>
              <tr>
                <th>用例</th>
                <th>算法</th>
                <th>兴趣</th>
                <th>步行分</th>
                <th>米</th>
                <th>偏好</th>
                <th>景点</th>
                <th>可行</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in result.rows" :key="i" :class="{ ours: r.algo === 'multi' }">
                <td class="name">{{ r.caseId }}</td>
                <td class="name">{{ ALGO_LABELS[r.algo] }}</td>
                <td>{{ r.interest }}</td>
                <td>{{ r.walkMin }}</td>
                <td>{{ r.distance }}</td>
                <td>{{ r.prefHits }}</td>
                <td>{{ r.stops }}</td>
                <td>{{ r.feasible ? '✓' : '✗' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.bench {
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
.intro {
  padding: 8px 16px;
}
.intro p {
  margin: 0 0 10px;
  font-size: var(--fs-sm);
  color: var(--ink-2, #333);
  line-height: 1.6;
}
.run-btn {
  width: 100%;
  min-height: var(--tap-main);
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: var(--fs-md);
  font-weight: 800;
  border: none;
  cursor: pointer;
}
.run-btn:disabled { opacity: 0.6; }
.tip {
  margin: 8px 0 0 !important;
  font-size: var(--fs-xs) !important;
  color: var(--ink-3, #666);
}
.card {
  margin: 10px 16px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.card h2 {
  margin: 0 0 12px;
  font-size: var(--fs-md);
  color: var(--primary);
}
.scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--fs-xs);
}
th, td {
  padding: 8px 10px;
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid #eee;
}
th {
  background: var(--surface-2, #f6faf5);
  color: var(--ink-2, #333);
  font-weight: 800;
}
td.name { text-align: left; font-weight: 700; }
tr.ours td {
  background: #eef7ee;
  font-weight: 700;
}
.note {
  margin: 10px 0 0;
  font-size: var(--fs-xs);
  color: var(--ink-3, #666);
  line-height: 1.5;
}
.impr {
  margin: 0;
  padding-left: 18px;
}
.impr li {
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink-2, #333);
}
</style>
