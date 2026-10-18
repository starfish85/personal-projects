/**
 * ============================================================
 * 路线规划算法（多目标优化版）——智能路线的"大脑"
 * ============================================================
 * 三层结构：
 *   1. A* 寻路（复用 paths.js）  → 两点间真实步行距离 / 分钟数
 *   2. 多目标贪心选点            → 在硬约束内最大化目标函数
 *   3. 2-opt 顺序优化            → 景点集合不变，缩短总步行距离
 *
 * ── 目标函数（最大化）────────────────────────────────────────
 *   U = Σ(景点兴趣分) + w_pref × 偏好命中数
 *       − w_walk × 总步行分钟数
 *       − w_rest × (需要休息却未安排休息点的惩罚)
 *
 *   各项含义：
 *     Σ兴趣分          正向收益：去到的景点本身有多少价值
 *     w_pref × 命中数   正向收益：满足用户偏好的额外奖励
 *     w_walk × 步行分钟 负向成本：走路是有代价的（疲累），权重随用户态度变化
 *     w_rest 惩罚       负向成本：用户说了要休息却没安排，扣分
 *
 * ── 约束 ───────────────────────────────────────────────────
 *   硬约束（必须满足）：总时间 ≤ 预算；总步行距离 ≤ 上限；needRest 时必须排休息点
 *   软偏好（尽量满足）：偏好类别加权，不强制
 *
 * ── 与纯最短路径（Dijkstra）的区别（答辩要能讲清）────────────
 *   Dijkstra 只回答"从 A 到 B 怎么走最近"，它不判断"B 值不值得去"。
 *   "有限时间内游览哪些景点、按什么顺序、怎么兼顾兴趣与体力"是另一个问题，
 *   本算法用带约束的多目标选择 + 顺序优化来解决。
 * ============================================================
 */

import { POIS, getPoi } from '../data/pois'
import { haversine, walkMinutes } from './geo'
import { buildRoute } from '../data/paths'

// ── 距离缓存 ────────────────────────────────────────────────
// buildRoute 内部是 A* 网格寻路，单次调用有开销。
// 贪心选点会反复计算"当前位置 → 各候选景点"，2-opt 又会反复算"景点→景点"，
// 同一对点常被重复求解。用 Map 按 "起.id→终.id" 缓存，一次规划内不重复寻路。
function makeWalker() {
  const memo = new Map()
  /**
   * 计算 A→B 的步行距离（米）和步行时间（分钟）。
   * 优先走路网（A*），极端角落路网不连通时降级为直线 × 1.3（园内步道弯曲系数）。
   */
  return function walkBetween(a, b) {
    const key = `${a.id}→${b.id}`
    const hit = memo.get(key)
    if (hit) return hit

    const route = buildRoute(a, b.id)
    let result
    if (route && route.distance > 0) {
      result = { distance: route.distance, walkMin: walkMinutes(route.distance) }
    } else {
      // 降级：路网没连通，用直线大圆距离 × 1.3 近似
      const straight = haversine(a, b) * 1.3
      result = { distance: straight, walkMin: walkMinutes(straight) }
    }
    memo.set(key, result)
    return result
  }
}

/**
 * 从需求推导目标函数权重。
 * 这是"模糊需求 → 可计算参数"的关键一步：
 *   用户说"少走路"不是直接变成硬性距离上限，而是提高走路的成本权重 w_walk，
 *   让算法在优化时更"心疼"走路，从而自然减少景点数、选近的点。
 */
function deriveWeights(req) {
  const mw = Number(req.maxWalking) || 3000
  let walkWeight
  if (mw <= 1200) walkWeight = 1.0        // 明显"少走路"：走路很贵
  else if (mw <= 2200) walkWeight = 0.7   // 偏少走路
  else walkWeight = 0.4                   // 能走 / 随便走：走路便宜，鼓励多看
  return {
    walkWeight,
    prefBonus: 3,                     // 命中一个偏好类别的奖励分
    restWeight: req.needRest ? 5 : 0, // 未安排休息点的惩罚分
  }
}

/**
 * 各基线策略的"性价比"定义——实验对比用。
 * 它们与主算法共用同一套硬约束和汇总逻辑，只在"怎么打分"上退化：
 *   multi    主算法：收益 / (w_walk × 步行 + 停留)，多目标 + 顺序优化
 *   nearest  最近邻：只图近，完全不看景点兴趣（1 / 步行）
 *   interest 纯兴趣：只挑兴趣分高的，不管走多远
 *   oldgreedy 上一版：收益 / (步行 + 停留)，无步行权重、无顺序优化、休息固定插在第3个之后
 */
function makeStrategy(kind, weights) {
  if (kind === 'nearest') {
    return {
      optimizeOrder: false, adaptiveRest: false, fixedRestAt: null,
      ratio: (c, walk, stay) => 1 / (walk.walkMin + stay + 0.01),
    }
  }
  if (kind === 'interest') {
    return {
      optimizeOrder: false, adaptiveRest: false, fixedRestAt: null,
      ratio: (c) => c.benefit,
    }
  }
  if (kind === 'oldgreedy') {
    return {
      optimizeOrder: false, adaptiveRest: false, fixedRestAt: 3,
      ratio: (c, walk, stay) => c.benefit / (walk.walkMin + stay),
    }
  }
  // 主算法：多目标加权
  return {
    optimizeOrder: true, adaptiveRest: true, fixedRestAt: null,
    ratio: (c, walk, stay) => c.benefit / (weights.walkWeight * walk.walkMin + stay),
  }
}

/**
 * 核心规划流程：选点 → 排序 → 休息 → 出口 → 汇总 → 校验。
 * planRoute 和 planBaseline 都走这里，只是传入的策略不同。
 */
function planCore(req, kind) {
  const { timeBudget, maxWalking, needRest, preferences, startGate } = req
  const gate = getPoi(startGate) || getPoi('gate-south')
  const weights = deriveWeights(req)
  const walkBetween = makeWalker()
  const strategy = makeStrategy(kind, weights)

  // ── 第 1 步：候选景点 + 收益分 ──
  // 只选真正有游览价值的：type=attraction 且标注了类别与兴趣分
  const candidates = POIS.filter(
    (p) => p.type === 'attraction' && p.category && p.interestScore
  ).map((p) => {
    const prefHit = preferences.includes(p.category)
    return {
      ...p,
      prefHit,
      // benefit = 兴趣分 + 偏好奖励，是目标函数里的"收益"项
      benefit: p.interestScore + (prefHit ? weights.prefBonus : 0),
    }
  })

  // ── 第 2 步：贪心选点（在硬约束内取性价比最高的）──
  const seq = []                        // 选出的景点序列
  const visited = new Set([startGate])  // 防止重复
  let current = gate
  let remainingTime = timeBudget
  let walkedDistance = 0

  while (remainingTime > 0 && seq.length < candidates.length) {
    let best = null
    for (const c of candidates) {
      if (visited.has(c.id)) continue
      const walk = walkBetween(current, c)
      const stay = c.recommendMin || 10
      const need = walk.walkMin + stay // 硬约束按真实时间算，不含权重

      // 硬约束：时间够 + 步行不超上限
      if (need > remainingTime) continue
      if (walkedDistance + walk.distance > maxWalking) continue

      const ratio = strategy.ratio(c, walk, stay)
      if (!best || ratio > best.ratio) best = { c, walk, stay, need, ratio }
    }
    if (!best) break // 没有景点还能塞进预算 → 结束

    seq.push(best.c)
    visited.add(best.c.id)
    walkedDistance += best.walk.distance
    remainingTime -= best.need
    current = best.c
  }

  // ── 第 3 步：2-opt 顺序优化（只对主算法开启）──
  // 集合不变，只调整访问顺序，目标是最小化景点间总步行距离。
  // 这是"选得好"之上的"排得好"，也是相对基线的一个可量化改进点。
  let ordered = seq
  if (strategy.optimizeOrder) {
    ordered = optimizeOrder(seq, gate, walkBetween)
  }

  // ── 第 4 步：休息点安置 ──
  const withRest = insertRest(
    ordered, req, strategy, gate, walkBetween, buildExitGates(startGate)
  )

  // ── 第 5 步：出口门（挑离最后位置最近的，不走回头路）──
  const lastPoint = withRest.length ? withRest[withRest.length - 1] : gate
  let exitGate = null
  let exitBest = null
  for (const g of buildExitGates(startGate)) {
    const w = walkBetween(lastPoint, g)
    if (!exitBest || w.distance < exitBest.w.distance) exitBest = { g, w }
  }
  exitGate = exitBest ? exitBest.g : null

  // ── 第 6 步：汇总指标（逐段步行 + 停留累计）──
  const summary = summarize(withRest, gate, exitGate, walkBetween)

  // ── 第 7 步：目标函数值 + 可行性 + 建议 ──
  const totalInterest = summary.stops.reduce((s, x) => s + x.interestScore, 0)
  const prefHits = summary.stops.filter((x) => x.prefHit && !x.isRest).length
  const restPenalty = req.needRest && !summary.stops.some((x) => x.isRest)
    ? weights.restWeight
    : 0
  const utility =
    totalInterest + weights.prefBonus * prefHits
    - weights.walkWeight * summary.totalWalkMin
    - restPenalty

  const feasible =
    summary.totalMin <= timeBudget && summary.totalDistance <= maxWalking
// 路线传输数据
  const route = {
    kind,
    stops: summary.stops,
    exit: exitGate
      ? {
          id: exitGate.id,
          name: exitGate.name,
          walkDistance: summary.exitWalk.distance,
          walkMin: summary.exitWalk.walkMin,
        }
      : null,
    totalDistance: summary.totalDistance,
    totalWalkMin: summary.totalWalkMin,
    totalStopTime: summary.totalStopTime,
    totalMin: summary.totalMin,
    feasible,
    // 指标（实验对比 & 前端展示）
    metrics: { totalInterest, prefHits, utility },
    objective: {
      interest: totalInterest,
      prefReward: weights.prefBonus * prefHits,
      walkCost: weights.walkWeight * summary.totalWalkMin,
      restPenalty,
      weights,
    },
    // 约束违反与改进建议（创新点3：不可行时给反馈，而不是只报"失败"）
    violations: buildViolations(summary, req),
    advice: buildAdvice(summary, req, prefHits),
    timeBudget,
    maxWalking,
    preferences,
  }
  return route
}

/** 规划主入口：多目标优化算法 */
export function planRoute(req) {
  return planCore(req, 'multi')
}

/**
 * 基线算法（实验对比用）。
 * @param {object} req - 需求对象
 * @param {'nearest'|'interest'|'oldgreedy'} mode - 基线类型
 */
export function planBaseline(req, mode = 'nearest') {
  return planCore(req, mode)
}

// ─────────────────────────── 内部工具 ───────────────────────────

/** 可选出口门（排除入口门） */
function buildExitGates(startGate) {
  return ['gate-north', 'gate-east', 'gate-south', 'gate-southwest']
    .map((id) => getPoi(id))
    .filter((g) => g && g.id !== startGate)
}

/**
 * 2-opt 顺序优化：固定起点，反复尝试"反转子序列"，
 * 只要反转后总步行距离变小就接受，直到无法再改进。
 * 景点数量少（≤8），O(n²) 完全够用。
 * 注：目标里只算景点间接续距离，出口门在排序后再选，不影响排序。
 */
function optimizeOrder(seq, gate, walkBetween) {
  if (seq.length < 3) return seq

  const pathCost = (list) => {
    let total = 0
    let prev = gate
    for (const p of list) {
      total += walkBetween(prev, p).distance
      prev = p
    }
    return total
  }

  let best = seq.slice()
  let bestCost = pathCost(best)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = best.slice()
        const mid = cand.slice(i, j + 1).reverse()
        cand.splice(i, mid.length, ...mid)
        const cost = pathCost(cand)
        if (cost < bestCost - 1e-6) {
          best = cand
          bestCost = cost
          improved = true
        }
      }
    }
  }
  return best
}

/**
 * 插入休息点。
 *   主算法：自适应——累计步行达到总步行的约一半时插入（贴合"走累了要歇"）
 *   旧贪心：固定插在第 3 个景点之后（作为基线保留，便于对比改进）
 * 时间不够就放弃插入，并在建议里提示。
 */
function insertRest(seq, req, strategy, gate, walkBetween, exitGates) {
  if (!req.needRest || seq.length === 0) return seq

  const restPoi = () =>
    POIS.find((p) => p.category === 'rest' && !seq.some((s) => s.id === p.id))

  if (strategy.fixedRestAt) {
    // 旧策略：固定位置
    const idx = Math.min(strategy.fixedRestAt, seq.length)
    const rest = restPoi()
    if (!rest) return seq
    const before = seq[idx - 1] || gate
    const walk = walkBetween(before, rest)
    const nextPoi = seq[idx]
    const after = nextPoi ? walkBetween(rest, nextPoi) : null
    // 粗略判断时间是否够（插入会带来额外绕行）
    const extra = walk.walkMin + 5 + (after ? after.walkMin : 0) - (nextPoi ? walkBetween(before, nextPoi).walkMin : 0)
    if (extra > req.timeBudget) return seq
    const out = seq.slice()
    out.splice(idx, 0, { ...rest, isRest: true, recommendMin: 5 })
    return out
  }

  // 主算法：自适应位置——走到总步行一半时歇脚
  let cum = 0
  let total = 0
  let prev = gate
  for (const p of seq) {
    total += walkBetween(prev, p).walkMin
    prev = p
  }
  const halfPoint = total / 2
  let insertAt = seq.length - 1 // 默认插在最后一个之前
  prev = gate
  for (let i = 0; i < seq.length; i++) {
    cum += walkBetween(prev, seq[i]).walkMin
    prev = seq[i]
    if (cum >= halfPoint) {
      insertAt = Math.max(1, i)
      break
    }
  }

  const rest = restPoi()
  if (!rest) return seq
  const before = seq[insertAt - 1] || gate
  const nextPoi = seq[insertAt]
  const walkToRest = walkBetween(before, rest)
  const restToNext = nextPoi ? walkBetween(rest, nextPoi) : null
  const detour =
    walkToRest.walkMin + 5
    + (restToNext ? restToNext.walkMin : 0)
    - (nextPoi ? walkBetween(before, nextPoi).walkMin : 0)
  // 绕行代价过大就放弃
  if (detour > req.timeBudget * 0.5) return seq

  const out = seq.slice()
  out.splice(insertAt, 0, { ...rest, isRest: true, recommendMin: 5 })
  return out
}

/** 逐段汇总：把景点序列 + 起终点换算成可展示的距离/时间指标 */
// 单个景点传输数据
function summarize(seq, gate, exitGate, walkBetween) {
  const stops = []
  let prev = gate
  let totalDistance = 0
  for (const p of seq) {
    const w = walkBetween(prev, p)
    totalDistance += w.distance
    stops.push({
      id: p.id,
      name: p.name,
      category: p.category,
      interestScore: p.isRest ? 0 : p.interestScore || 0,
      prefHit: !!p.prefHit,
      recommendMin: p.recommendMin || (p.isRest ? 5 : 10),
      walkDistance: w.distance,
      walkMin: w.walkMin,
      isRest: !!p.isRest,
      lat: p.lat,
      lng: p.lng,
    })
    prev = p
  }
  const exitWalk = exitGate ? walkBetween(prev, exitGate) : { distance: 0, walkMin: 0 }
  totalDistance += exitWalk.distance
  const totalWalkMin = walkMinutes(totalDistance)
  const totalStopTime = stops.reduce((s, x) => s + x.recommendMin, 0)
  return {
    stops,
    exitWalk,
    totalDistance,
    totalWalkMin,
    totalStopTime,
    totalMin: totalWalkMin + totalStopTime,
  }
}

/** 约束违反明细（供实验统计与前端展示） */
function buildViolations(summary, req) {
  const list = []
  if (summary.totalMin > req.timeBudget) {
    list.push({ type: 'time', amount: summary.totalMin - req.timeBudget, unit: '分钟' })
  }
  if (summary.totalDistance > req.maxWalking) {
    list.push({ type: 'walk', amount: summary.totalDistance - req.maxWalking, unit: '米' })
  }
  if (req.needRest && !summary.stops.some((s) => s.isRest)) {
    list.push({ type: 'rest', amount: 1, unit: '个休息点' })
  }
  return list
}

/** 面向用户的改进建议（不只是一句"超预算"） */
function buildAdvice(summary, req, prefHits) {
  const advice = []
  const overTime = summary.totalMin - req.timeBudget
  if (overTime > 0) {
    advice.push(
      `时间超出约 ${Math.round(overTime)} 分钟。可以把可用时间放宽到 ${Math.ceil(summary.totalMin / 10) * 10} 分钟，或减少 1 个景点。`
    )
  }
  const overWalk = summary.totalDistance - req.maxWalking
  if (overWalk > 0) {
    advice.push(
      `步行超出约 ${Math.round(overWalk)} 米。可以把步行上限放宽到 ${Math.ceil(summary.totalDistance / 100) * 100} 米，或选少一点的景点。`
    )
  }
  if (prefHits === 0 && req.preferences.length) {
    advice.push('附近暂时没有您偏好的类别，已按其他高性价比景点为您推荐。')
  }
  if (req.needRest && !summary.stops.some((s) => s.isRest)) {
    advice.push('时间较紧，这次没能安排休息点，建议把游览时间放长一些。')
  }
  if (summary.stops.length === 0) {
    advice.push('按当前条件没有找到合适的景点，可以增加时间或放宽步行距离后再试。')
  }
  return advice
}


//参考planner.py 修改函数算法,每条路线不重复
 // 1) Jaccard 相似度：两条路线的景点集合有多像（0 完全不同 ~ 1 完全一样）
  function jaccard(a, b) {
    const sa = new Set(a)
    const sb = new Set(b)
    if (!sa.size || !sb.size) return 0
    let both = 0
    for (const x of sa) if (sb.has(x)) both++
    return both / (sa.size + sb.size - both)
  }

  // 2) 帕累托支配：a 在「得分↑ 时间↓ 距离↓」上全面不差于 b，且至少一项更好
  function dominates(a, b, eps = 1e-9) {
    const worse =
      a.score + eps < b.score ||
      a.minutes - eps > b.minutes ||
      a.meters - eps > b.meters
    if (worse) return false
    return (
      a.score > b.score + eps ||
      a.minutes < b.minutes - eps ||
      a.meters < b.meters - eps
    )
  }

  // 3) 帕累托过滤：按「终点 + 景点集合」分组，组内去掉被支配的候选
  function paretoFilter(states) {
    const groups = new Map()
    for (const s of states) {
      const key = `${s.stops[s.stops.length - 1]}|${[...s.stops].sort().join(',')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(s)
    }
    const out = []
    for (const group of groups.values()) {
      for (const cand of group) {
        const dominated = group.some((other) => other !== cand && dominates(other, cand))
        if (!dominated) out.push(cand)
      }
    }
    return out
  }

  // 4) MMR：在帕累托前沿里挑 k 条「得分高且彼此不重复」的路线
  function mmrDiversity(candidates, k = 3, lambda = 0.5) {
    if (!candidates.length) return []
    const sorted = [...candidates].sort((a, b) => b.score - a.score)
    const chosen = [sorted[0]]              // 得分最高的先进结果
    while (chosen.length < k && chosen.length < sorted.length) {
      let best = null, bestMmr = -Infinity
      for (const c of sorted) {
        if (chosen.includes(c)) continue
        const sim = Math.max(...chosen.map((prev) => jaccard(c.stops, prev.stops)))
        if (sim > 0.7) continue            // 跟已选的太像，跳过
        const mmr = c.score - lambda * sim
        if (mmr > bestMmr) { best = c; bestMmr = mmr }
      }
      if (best) chosen.push(best)
      else break
    }
    return chosen
  }

   function toCandidate(route) {
    return {
      route,
      stops: route.stops.filter((s) => !s.isRest).map((s) => s.id),
      score: route.metrics.totalInterest,
      minutes: route.totalMin,
      meters: route.totalDistance,
    }
  }
  const pool = [
    planCore(req, 'multi'),
    planCore(req, 'oldgreedy'),
    planCore(req, 'nearest'),
    planCore(req, 'interest'),
  ].filter(Boolean)

   export function planRoutes(req, k = 3) {
    const pool = generatePool(req)                 // 第二步的候选池
    const candidates = pool.map(toCandidate)       // 转成 { stops, score, minutes, meters }
    const frontier = paretoFilter(candidates)      // 帕累托过滤
    const picks = mmrDiversity(frontier, k, 0.5)   // 挑 k 条多样化
    return picks.map((p) => p.route)               // 返回 k 条完整 route
  }