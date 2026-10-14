/**
 * ============================================================
 * 算法实验与基线对比模块（答辩实验数据来源）
 * ============================================================
 * 做什么：
 *   用一组覆盖不同偏好的测试需求，分别跑"主算法（多目标）"
 *   和三种基线，统计指标，量化"我们的方法比基线好在哪"。
 *
 * 为什么不用 Python 脚本：
 *   本项目是纯前端、算法在浏览器里跑，用同一份 JS 代码做实验
 *   才能保证"实验对象 == 线上算法"，避免两套实现不一致。
 *
 * 对比对象：
 *   multi     主算法：多目标加权 + 2-opt 顺序优化 + 自适应休息
 *   oldgreedy 上一版贪心：无步行权重、无顺序优化、休息固定插在第3个后
 *   nearest   最近邻：只图近，完全不看景点兴趣（最朴素的基线）
 *   interest  纯兴趣：只挑高分景点，不管走多远
 *
 * 统计指标：
 *   interest   总兴趣得分（收益，越高越好）
 *   walkMin    总步行分钟数（成本，越低越好）
 *   min        总耗时
 *   distance   总步行距离（米）
 *   prefHits   偏好类别命中数
 *   feasible   是否在时间/步行约束内
 *   utility    目标函数值（综合收益与成本）
 * ============================================================
 */

import { planRoute, planBaseline } from './routePlanner'

/**
 * 测试需求集：覆盖"时间长短 × 步行态度 × 偏好 × 是否休息"的不同组合，
 * 尽量贴近真实游客的口语表达所解析出的结构化需求。
 */
export const TEST_CASES = [
  { id: 'T1', desc: '2小时·湖景花·少走路·休息', timeBudget: 120, maxWalking: 800,  walkTolerance: 'low',    needRest: true,  preferences: ['lake', 'flower'], startGate: 'gate-south' },
  { id: 'T2', desc: '半天·亲子花水·正常',        timeBudget: 240, maxWalking: 3000, walkTolerance: 'medium', needRest: false, preferences: ['family', 'flower'], startGate: 'gate-south' },
  { id: 'T3', desc: '1小时·森林·随便走走',       timeBudget: 60,  maxWalking: 2000, walkTolerance: 'medium', needRest: false, preferences: ['forest'], startGate: 'gate-north' },
  { id: 'T4', desc: '3小时·湖景·能走',           timeBudget: 180, maxWalking: 4000, walkTolerance: 'high',   needRest: false, preferences: ['lake'], startGate: 'gate-south' },
  { id: 'T5', desc: '45分钟·随便走走',           timeBudget: 45,  maxWalking: 2000, walkTolerance: 'medium', needRest: false, preferences: ['lake', 'flower'], startGate: 'gate-east' },
  { id: 'T6', desc: '半天·文化自然·少走路',      timeBudget: 240, maxWalking: 800,  walkTolerance: 'low',    needRest: true,  preferences: ['culture', 'nature'], startGate: 'gate-southwest' },
  { id: 'T7', desc: '2小时·多偏好·正常',         timeBudget: 120, maxWalking: 3000, walkTolerance: 'medium', needRest: false, preferences: ['lake', 'flower', 'forest'], startGate: 'gate-south' },
  { id: 'T8', desc: '90分钟·花卉·少走·休息',     timeBudget: 90,  maxWalking: 1200, walkTolerance: 'low',    needRest: true,  preferences: ['flower'], startGate: 'gate-east' },
  { id: 'T9', desc: '4小时·湖景森林·能走',       timeBudget: 240, maxWalking: 5000, walkTolerance: 'high',   needRest: false, preferences: ['lake', 'forest'], startGate: 'gate-north' },
  { id: 'T10', desc: '30分钟·湖景·紧急',         timeBudget: 30,  maxWalking: 1500, walkTolerance: 'low',    needRest: false, preferences: ['lake'], startGate: 'gate-south' },
]

const ALGOS = [
  { key: 'multi',     label: '多目标（本方法）', run: (c) => planRoute(c) },
  { key: 'oldgreedy', label: '旧贪心基线',       run: (c) => planBaseline(c, 'oldgreedy') },
  { key: 'nearest',   label: '最近邻基线',       run: (c) => planBaseline(c, 'nearest') },
  { key: 'interest',  label: '纯兴趣基线',       run: (c) => planBaseline(c, 'interest') },
]

/** 从一次规划结果里抽取用于对比的指标 */
function pickMetrics(route) {
  return {
    interest: route.metrics.totalInterest,
    walkMin: route.totalWalkMin,
    min: route.totalMin,
    distance: Math.round(route.totalDistance),
    prefHits: route.metrics.prefHits,
    stops: route.stops.filter((s) => !s.isRest).length,
    hasRest: route.stops.some((s) => s.isRest),
    feasible: route.feasible,
    violations: route.violations.length,
    utility: Math.round(route.metrics.utility * 10) / 10,
  }
}

/**
 * 跑完整实验（同步版）。
 * @returns {{rows, summary, byAlgo, counts, improvement}}
 */
export function runBenchmark() {
  const rows = []
  for (const c of TEST_CASES) {
    for (const algo of ALGOS) {
      rows.push({ caseId: c.id, caseDesc: c.desc, algo: algo.key, ...pickMetrics(algo.run(c)) })
    }
  }
  return aggregate(rows)
}

/**
 * 异步版：每个用例之间让出主线程（await 一个宏任务），
 * 避免 40 次规划连续同步执行把页面卡死（UI 无法重绘 → 看起来像卡住）。
 * @param {(done:number,total:number)=>void} onProgress - 进度回调
 */
export async function runBenchmarkAsync(onProgress) {
  const rows = []
  const total = TEST_CASES.length
  for (let i = 0; i < total; i++) {
    const c = TEST_CASES[i]
    for (const algo of ALGOS) {
      rows.push({ caseId: c.id, caseDesc: c.desc, algo: algo.key, ...pickMetrics(algo.run(c)) })
    }
    onProgress?.(i + 1, total)
    // 让出主线程：渲染一帧后再继续下一个用例
    await new Promise((r) => setTimeout(r, 0))
  }
  return aggregate(rows)
}

/** 把原始明细聚合成汇总表与改进指标 */
function aggregate(rows) {
  const byAlgo = {}
  const summary = {}
  for (const algo of ALGOS) {
    const list = rows.filter((r) => r.algo === algo.key)
    byAlgo[algo.key] = list
    summary[algo.key] = {
      label: algo.label,
      avgInterest: avg(list.map((r) => r.interest)),
      avgWalkMin: avg(list.map((r) => r.walkMin)),
      avgDistance: avg(list.map((r) => r.distance)),
      avgPrefHits: avg(list.map((r) => r.prefHits)),
      avgUtility: avg(list.map((r) => r.utility)),
      feasibleRate: list.filter((r) => r.feasible).length / list.length,
      restRate: list.filter((r) => r.hasRest).length / list.length,
    }
  }

  // 相对最近邻基线的改进（答辩"到底改善了什么"的量化答案）
  const base = summary.nearest
  const improvement = {
    interest: base.avgInterest ? (summary.multi.avgInterest - base.avgInterest) / base.avgInterest : 0,
    walkMin: base.avgWalkMin ? (base.avgWalkMin - summary.multi.avgWalkMin) / base.avgWalkMin : 0,
    utility: base.avgUtility ? (summary.multi.avgUtility - base.avgUtility) / Math.abs(base.avgUtility) : 0,
  }

  return { rows, summary, byAlgo, counts: { cases: TEST_CASES.length, algos: ALGOS.length }, improvement }
}

function avg(nums) {
  if (!nums.length) return 0
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

export const ALGO_LABELS = ALGOS.reduce((m, a) => ((m[a.key] = a.label), m), {})
