/**
 * ============================================================
 * 自然语言需求解析模块（智能路线规划的"翻译官"）
 * ============================================================
 * 职责：把用户输入的自然语言（如"我有两小时，喜欢湖景，少走路"）
 * 转换成结构化的需求 JSON，供路线规划算法使用。
 *
 * 两条解析路径（自动切换，保证"没有 API Key 也能演示"）：
 *   1. LLM 解析（首选）：复用拍照识花的 DeepSeek 配置，理解力强
 *   2. 规则解析（兜底）：无 Key / 请求失败时用关键词+数字规则解析，
 *      即答辩要求的"模拟模式"，离线可演示
 *   两条路径产出同一套字段，输出里用 source 标明是哪种。
 *
 * ── 模糊需求处理原则（创新点1）─────────────────────────────
 *   不把"少走路""想轻松"直接硬编码成一个死距离，而是：
 *     - 保留一个带弹性的软上限 maxWalking（可由算法按需微调）
 *     - 额外给出离散的 walkTolerance 档位（low/medium/high），
 *       算法据此调整"步行成本权重"，让模糊表达可计算又可解释
 *
 * 输出格式（需求 JSON）：
 * {
 *   timeBudget: 120,            // 可用时间（分钟），硬约束
 *   maxWalking: 1500,           // 步行软上限（米）
 *   walkTolerance: 'low',       // 步行容忍度：low/medium/high
 *   needRest: true,             // 中途是否需要休息点
 *   preferences: ['lake','flower'], // 偏好类别（软偏好）
 *   startGate: 'gate-south',    // 从哪个门进
 *   notes: '',                  // 其他要求
 *   conflicts: [],              // 需求之间的冲突提示
 *   source: 'llm'               // 'llm' 或 'rule'
 * }
 * ============================================================
 */

import { getVisionConfig } from './vision'
import { CATEGORIES } from '../data/pois'

// 大夫山实际可用的景点类别（LLM 提示词用，精简成 id+label，避免关键词干扰）
const CATEGORY_LIST = [
  { id: 'lake',    label: '湖景' },
  { id: 'flower',  label: '花卉' },
  { id: 'forest',  label: '森林' },
  { id: 'family',  label: '亲子' },
  { id: 'sports',  label: '运动' },
  { id: 'culture', label: '文化' },
  { id: 'nature',  label: '自然' },
  { id: 'rest',    label: '休憩' },
]

const GATES = [
  { id: 'gate-north',     label: '北门' },
  { id: 'gate-east',      label: '东门' },
  { id: 'gate-south',     label: '南门' },
  { id: 'gate-southwest', label: '西南门' },
]

const VALID_CATEGORIES = new Set(CATEGORY_LIST.map((c) => c.id))
const VALID_GATES = new Set(GATES.map((g) => g.id))

// System Prompt：给 LLM 的"人设 + 规矩"，直接决定解析准确率。
// 设计要点：限定角色、限定可选值、给出模糊词→参数的推断规则、强制只输出 JSON。
const SYSTEM_PROMPT = `你是大夫山森林公园智能导览系统的需求解析器。
用户会用自然语言描述游览需求，你需要把它解析成结构化 JSON。

可用景点类别：${CATEGORY_LIST.map((c) => `${c.id}(${c.label})`).join('、')}
可用入口门：${GATES.map((g) => `${g.id}(${g.label})`).join('、')}

解析规则：
1. timeBudget：从"两小时""半天""30分钟"等推断可用时间（分钟）。无法判断时默认 120。
2. maxWalking：从"少走路""走不动""随便走""能走"推断步行软上限（米）。
   "少走路"→800，"随便走走"→2000，"能走"→4000，未提及→3000。
   注意这是一个"软上限"，允许算法在小范围内调整，不要当成死线。
3. walkTolerance：把用户对走路的态度转成档位，只能取 "low"/"medium"/"high" 三者之一。
   "少走路/走不动/腿脚不好/轻松"→low；"随便走走/正常"→medium；"能走/多走走"→high。
4. needRest：提到"休息""歇脚""坐坐""累"则为 true，否则 false。
5. preferences：从"湖景""花""森林""亲子"等关键词匹配可用类别，至少 1 个。
   未明确偏好时默认 ['lake','flower']。
6. startGate：提到"北门""南门"等匹配，未提及默认 'gate-south'。
7. notes：保留原文中其他未被覆盖的要求（如"想去厕所多的地方"）。

严格只输出一个 JSON 对象，不要 markdown 代码块，不要解释文字。`

/**
 * 解析用户需求（对外主入口）。
 * 有 API Key 走 LLM，没有或调用失败则自动降级到规则解析（模拟模式）。
 * @param {string} userInput - 用户的自然语言输入
 * @returns {Promise<object>} - 结构化需求对象
 */
export async function parseRequirement(userInput) {
  const cfg = getVisionConfig()
  const text = String(userInput || '').trim()

  if (cfg.apiKey) {
    try {
      const raw = await callLLM(cfg, text)
      return normalizeRequirement(raw, 'llm')
    } catch (e) {
      // LLM 失败不阻塞演示：降级到规则解析，并在需求里标注原因
      const fallback = normalizeRequirement(ruleBasedParse(text), 'rule')
      fallback.notes = fallback.notes || `AI 解析失败，已改用本地规则解析（${e.message || '网络异常'}）`
      return fallback
    }
  }

  // 无 Key：直接规则解析，保证"不填 Key 也能跑通全流程"
  return normalizeRequirement(ruleBasedParse(text), 'rule')
}

/** 调用大模型解析，返回原始对象 */
async function callLLM(cfg, userInput) {
  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.1, // 需求解析要稳定，不要创意
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput },
      ],
    }),
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('API Key 不正确或已失效')
    if (res.status === 429) throw new Error('请求太频繁')
    throw new Error(`识别服务返回错误（${res.status}）`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('AI 未返回有效内容')

  // 容错：模型偶尔会在 JSON 前后加文字，截取第一个 { 到最后一个 }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('AI 返回的内容不是有效 JSON')
  return JSON.parse(text.slice(start, end + 1))
}

// ─────────────────── 规则解析（模拟模式）───────────────────

/** 中文数字 → 阿拉伯数字（覆盖常见口语表达） */
const CN_NUM = {
  一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5,
}

/**
 * 纯规则解析：不依赖任何网络与 API Key。
 * 用关键词匹配类别/态度，用数字模式抽取时间，足够覆盖常见口令，
 * 用于"模拟模式"演示与 LLM 失败兜底。
 */
export function ruleBasedParse(input) {
  const text = String(input || '')

  // ── 时间预算 ──
  let timeBudget = 120
  if (/半天/.test(text)) timeBudget = 240
  else if (/一整天|全天|一天/.test(text)) timeBudget = 480
  else if (/半小时/.test(text)) timeBudget = 30
  else {
    // "两小时""2个小时""1.5小时"
    const hourMatch = text.match(/(\d+(?:\.\d+)?|[一二两三四五六七八九十半])\s*个?\s*小时/)
    const minMatch = text.match(/(\d+)\s*(?:分钟|min)/i)
    if (hourMatch) {
      const raw = hourMatch[1]
      const h = /^\d/.test(raw) ? parseFloat(raw) : (CN_NUM[raw] ?? 1)
      timeBudget = Math.round(h * 60)
    } else if (minMatch) {
      timeBudget = parseInt(minMatch[1], 10)
    }
    // "X个半小时" 加分
    if (/半/.test(text) && hourMatch) timeBudget += 30
  }
  if (!Number.isFinite(timeBudget) || timeBudget <= 0) timeBudget = 120

  // ── 步行容忍度 / 软上限 ──
  let walkTolerance = 'medium'
  let maxWalking = 3000
  if (/少走路|走不动|腿脚|走不了|轻松|不想走|别太累/.test(text)) {
    walkTolerance = 'low'
    maxWalking = 800
  } else if (/随便|都行|无所谓/.test(text)) {
    walkTolerance = 'medium'
    maxWalking = 2000
  } else if (/能走|多走|不怕走|体力好/.test(text)) {
    walkTolerance = 'high'
    maxWalking = 4000
  }

  // ── 是否需要休息 ──
  const needRest = /休息|歇|坐坐|坐坐|累了|腿软|补水/.test(text)

  // ── 偏好类别：用 CATEGORIES 的关键词做匹配 ──
  const preferences = []
  for (const [id, meta] of Object.entries(CATEGORIES)) {
    if (id === 'rest') continue
    if (meta.keywords.some((k) => text.includes(k))) preferences.push(id)
  }
  // 额外口语词补充
  if (/自然风光|风景/.test(text) && !preferences.includes('nature')) preferences.push('nature')

  // ── 入口门 ──
  let startGate = 'gate-south'
  if (/北门/.test(text)) startGate = 'gate-north'
  else if (/东门/.test(text)) startGate = 'gate-east'
  else if (/西南门/.test(text)) startGate = 'gate-southwest'
  else if (/南门/.test(text)) startGate = 'gate-south'

  return {
    timeBudget,
    maxWalking,
    walkTolerance,
    needRest,
    preferences,
    startGate,
    notes: '',
  }
}

// ─────────────────── 规范化与校验 ───────────────────

/**
 * 对解析结果做校验和补全——即使字段缺失或类型错误，
 * 算法层拿到的也一定是结构完整、取值合法的需求对象。
 * @param {object} raw - LLM 或规则解析的原始结果
 * @param {'llm'|'rule'} source - 解析来源
 */
function normalizeRequirement(raw, source = 'llm') {
  const timeBudget = Number(raw.timeBudget)
  const maxWalking = Number(raw.maxWalking)

  // preferences：过滤非法类别；为空时给默认值
  let preferences = []
  if (Array.isArray(raw.preferences)) {
    preferences = raw.preferences.filter(
      (p) => typeof p === 'string' && VALID_CATEGORIES.has(p)
    )
  }
  if (preferences.length === 0) preferences = ['lake', 'flower']

  // walkTolerance：非法值按 maxWalking 反推一个合理档位
  const wt = raw.walkTolerance
  let walkTolerance = ['low', 'medium', 'high'].includes(wt) ? wt : null
  const finalMaxWalking = Number.isFinite(maxWalking) && maxWalking > 0
    ? Math.min(maxWalking, 10000)
    : 3000
  if (!walkTolerance) {
    walkTolerance = finalMaxWalking <= 1200 ? 'low' : finalMaxWalking <= 2200 ? 'medium' : 'high'
  }

  const req = {
    timeBudget: Number.isFinite(timeBudget) && timeBudget > 0
      ? Math.min(timeBudget, 600) // 上限 10 小时
      : 120,
    maxWalking: finalMaxWalking,
    walkTolerance,
    needRest: Boolean(raw.needRest),
    preferences,
    startGate: VALID_GATES.has(raw.startGate) ? raw.startGate : 'gate-south',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    source,
  }
  // 冲突检测：需求之间互相打架时给出提示（创新点3：向用户澄清）
  req.conflicts = detectConflicts(req)
  return req
}

/**
 * 需求冲突检测——发现"条件很难同时满足"的情况，提前提示用户。
 * 这些不是错误，而是让系统能解释"为什么给不出理想路线"。
 */
function detectConflicts(req) {
  const conflicts = []
  if (req.timeBudget <= 60 && req.needRest) {
    conflicts.push('时间只有约 1 小时但仍要求中途休息，可能来不及安排休息点')
  }
  if (req.timeBudget <= 90 && req.preferences.length >= 3) {
    conflicts.push('时间较短但偏好类别较多，难以全部兼顾')
  }
  if (req.walkTolerance === 'low' && req.timeBudget >= 240) {
    conflicts.push('希望少走路但要游览较长时间，实际可去景点会比较少')
  }
  return conflicts
}
