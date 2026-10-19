/**
 * ============================================================
 * 多模态视觉识别模块（拍照识花的"大脑"）
 * ============================================================
 * 职责：把照片发给多模态大模型，拿回结构化的识别结果。
 *
 * 技术选型：DeepSeek deepseek-flash（V4.1 Flash，原生支持图片理解），
 * 接口格式遵循 OpenAI 兼容协议（行业事实标准，换厂商只需改地址和模型名）。
 *
 * 安全说明：API Key 只保存在用户自己手机的 localStorage 里，
 * 请求从浏览器直连 DeepSeek 服务器，不经过任何第三方。
 * 将来若要对公众开放，把 endpoint 换成自己的云函数地址即可，其余代码不用动。
 * ============================================================
 */

// localStorage 里存配置的键名（相当于浏览器里的一张"小纸条"）。
// 带 v2 后缀：v1 时代默认厂商是智谱，换 DeepSeek 后旧配置里的地址/模型/Key
// 都已失效，用新键名让老用户自动落到新默认值，重新填一次 Key 即可。
const CFG_KEY = 'dafushan-vision-config-v2'

// 默认配置：接口地址 + 模型名（用户可在设置面板里覆盖）
export const VISION_DEFAULT = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-flash',
}

/**
 * 读取配置：localStorage 里的用户配置 覆盖在 默认配置 之上。
 * { ...a, ...b } 是"展开运算符"：b 里有的字段会替换 a 的同名字段。
 * try/catch 兜底：如果存的内容损坏（不是合法 JSON），就当没存过。
 */
export function getVisionConfig() {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) return { ...VISION_DEFAULT, ...JSON.parse(raw) }
  } catch {
    /* 数据损坏时静默降级到默认配置 */
  }
  return { ...VISION_DEFAULT, apiKey: '' }
}

/**
 * 保存配置到 localStorage。
 * JSON.stringify：localStorage 只能存字符串，对象要先序列化。
 * trim()：去掉首尾空格——复制粘贴 Key 时常带空格，这是鉴权失败的常见原因。
 */
export function saveVisionConfig(cfg) {
  localStorage.setItem(
    CFG_KEY,
    JSON.stringify({
      endpoint: cfg.endpoint || VISION_DEFAULT.endpoint,
      model: cfg.model || VISION_DEFAULT.model,
      apiKey: (cfg.apiKey || '').trim(),
    }),
  )
}

/** 是否已填 Key（!! 把字符串转成布尔值：空字符串 → false） */
export function hasVisionKey() {
  return !!getVisionConfig().apiKey
}

/**
 * 把用户选的图片文件压缩并转成 data URL。
 *
 * 为什么要压缩：手机照片动辄 5-10MB，直接上传又慢又费流量，
 * 而且模型看图根本不需要那么高分辨率，长边 1024px 足够。
 *
 * data URL 是什么：把图片二进制编码成一串 "data:image/jpeg;base64,..." 文本，
 * 这样就能直接塞进 JSON 请求体里发给 API。
 *
 * 流程（三步都是异步的，所以整体包成一个 Promise）：
 *   FileReader 读文件 → Image 解码图片 → canvas 缩放重绘 → 导出 jpeg
 */
export function fileToDataUrl(file, maxEdge = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    // 第 1 步：FileReader 把文件读成 data URL 字符串
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败，请换一张试试'))
    reader.onload = () => {
      // 第 2 步：用 Image 解码，拿到真实的宽和高
      const img = new Image()
      img.onerror = () => reject(new Error('图片无法打开，请换一张试试'))
      img.onload = () => {
        let { width, height } = img
        // 只有超过 maxEdge 才等比缩小（小的图保持原样）
        if (width > maxEdge || height > maxEdge) {
          const scale = maxEdge / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        // 第 3 步：canvas 相当于一块内存里的画布，把图按新尺寸重绘
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // 导出为 jpeg 格式的 data URL，quality 0.82 是画质/体积的平衡点
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 系统提示词（System Prompt）——这是"调教"模型的关键。
 * 作用：限定模型角色（公园讲解员）、规定输出格式（严格 JSON）、
 * 约定讲解风格（老年游客、口语化、字数范围）。
 * 让模型输出 JSON 而不是自由文本，前端才能稳定地拆开显示。
 */
const SYSTEM_PROMPT = `你是广州大夫山森林公园的AI讲解员，服务的游客多为老年人和亲子家庭。
请辨认照片主体，严格只输出 JSON（不要 markdown 代码块、不要多余文字）：
- 如果主体是植物（花、草、树木）：
{"plant":true,"name":"最通用的中文名称","family":"科属，不确定就留空","intro":"给老年游客的口语化讲解，70到120字，先说怎么辨认，再讲一个有趣或有用的小知识","tips":"观赏或安全提示，一句话","confidence":"high或medium或low"}
- 如果主体不是植物：
{"plant":false,"answer":"一句温和的话，说明这看起来不像花草树木，请对方把花、叶子或整棵树拍清楚一点"}`

/**
 * 从模型回复里容错地提取 JSON。
 * 为什么要容错：模型是概率生成，偶尔会"不听话"，
 * 在 JSON 前后多输出几句客套话。所以不直接 JSON.parse 全文，
 * 而是截取第一个 { 到最后一个 } 之间的内容再解析。
 */
function parseAnswer(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  // 实在找不到 JSON，就把原文截短当"非植物"的提示语显示，保证页面不崩
  if (start === -1 || end === -1 || end <= start) {
    return { plant: false, answer: text.slice(0, 200) }
  }
  return JSON.parse(text.slice(start, end + 1))
}

/**
 * 核心函数：调用视觉模型识别植物。
 * @param {string} dataUrl 压缩后的图片 data URL
 * @returns {Promise<object>} 识别结果（两种形态见 SYSTEM_PROMPT）
 *
 * 错误处理策略：给 Error 对象挂上 code 标记错误类型，
 * 页面层根据 code 决定要不要自动弹出设置面板：
 *   NO_KEY  → 没填 Key      → 弹设置
 *   AUTH    → Key 无效      → 弹设置
 *   NETWORK → 断网/信号差   → 只提示
 *   其他    → 透传服务器原文（比如 429 限流）
 */
export async function recognizePlant(dataUrl) {
  const cfg = getVisionConfig()
  if (!cfg.apiKey) {
    const err = new Error('还没有填写 API Key')
    err.code = 'NO_KEY'
    throw err
  }

  let res
  try {
    // fetch 是浏览器自带的 HTTP 请求 API。
    // 请求体完全遵循 OpenAI 聊天补全格式：
    // messages 数组 = 对话历史，system 是设定，user 是用户输入；
    // 多模态就体现在 user 的 content 是"数组"——图片和文字可以一起给。
    res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Bearer Token 是 HTTP 鉴权的通用写法，相当于在请求头里递"门票"
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        // temperature 越低回答越稳定保守（0~1），识别任务不需要"创意"
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: '这是什么植物？请按要求只输出JSON。' },
            ],
          },
        ],
      }),
    })
  } catch {
    // fetch 只有在"网络层失败"时才抛错（断网、DNS 失败、被拦截）；
    // 服务器返回 4xx/5xx 不算抛错，走下面的 res.ok 分支
    const err = new Error('网络连不上识别服务，公园里信号弱时请走到开阔处再试')
    err.code = 'NETWORK'
    throw err
  }

  // HTTP 状态码不在 200~299 区间：鉴权失败单独处理，其余透传服务器错误原文
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error?.message || data?.message || ''
    } catch {
      /* 错误响应体不是 JSON 就算了 */
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error('API Key 不正确或已失效，请重新填写')
      err.code = 'AUTH'
      throw err
    }
    // 比如 429（限流）会带服务器原文"该模型当前访问量过大…"
    throw new Error(`识别服务返回错误（${res.status}）${detail ? '：' + detail : ''}`)
  }

  // 成功：按 OpenAI 格式取出模型回复文本。
  // ?. 是可选链：任何一层不存在就得到 undefined，不会抛错
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text.trim()) throw new Error('识别结果为空，请再拍一张清楚的照片试试')
  return parseAnswer(text)
}
