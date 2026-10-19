<script setup>
/**
 * 拍照识花页面
 * 状态机很简单，只有三种界面状态，由两个变量组合决定：
 *   photoUrl 为空          → 引导页（拍照/相册两个大按钮）
 *   photoUrl 有值且无结果  → 预览页（照片 + "开始辨认"按钮）
 *   result 有值            → 结果页（花名 + 讲解 + 朗读按钮）
 * loading 是叠加状态：识别中时按钮变成转圈并禁用，防止重复点击。
 */
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { app, showToast } from '../stores/app'
import {
  fileToDataUrl,
  getVisionConfig,
  hasVisionKey,
  recognizePlant,
  saveVisionConfig,
} from '../utils/vision'
import { speakText, stopSpeak, ttsSupported } from '../utils/speech'

const router = useRouter()
// 这两个 ref 指向模板里隐藏的 <input type="file">，
// 想用系统相机/相册时，用代码"戳"它一下弹出系统选择器
const cameraInput = ref(null)
const albumInput = ref(null)

const photoUrl = ref('') // 压缩后的照片（data URL），空字符串 = 还没拍照
const loading = ref(false) // 是否正在等 AI 返回
const result = ref(null) // 识别结果对象，null = 还没识别
const showSettings = ref(false) // 是否显示 API Key 设置面板
const speaking = ref(false) // 是否正在朗读（决定按钮显示"听讲解"还是"停止"）

const cfg = ref(getVisionConfig())
// localStorage 不是响应式数据，不能用 computed（会一直缓存旧值），
// 需用 ref 并在保存后手动同步——这是之前"填了 Key 无法辨认"bug 的修复点
const keyReady = ref(hasVisionKey())

// 点击按钮 → 触发隐藏 input 的 click → 系统弹出相机/相册
function openCamera() {
  cameraInput.value?.click()
}
function openAlbum() {
  albumInput.value?.click()
}

/**
 * 用户选好照片后的回调（拍照和相册共用这个函数）。
 * event.target.value = '' 是个重要细节：清空 input 的选中记录，
 * 否则用户重拍"同一个文件"时不会触发 change 事件。
 */
async function onPick(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    return
  }
  try {
    photoUrl.value = await fileToDataUrl(file) // 压缩 + 转 data URL
    result.value = null // 换了新照片，清掉上一张的识别结果
  } catch (e) {
    showToast(e.message || '图片处理失败')
  }
}

/** 重拍：回到引导页，并停掉可能正在进行的朗读 */
function clearPhoto() {
  stopSpeak()
  speaking.value = false
  photoUrl.value = ''
  result.value = null
}

/**
 * 核心交互：点"开始辨认"。
 * 流程：前置校验 → 调 API → 展示结果 → 自动朗读（如果开了语音）。
 * finally 保证无论成败都会关闭 loading，按钮不会卡在转圈状态。
 */
async function recognize() {
  if (!photoUrl.value || loading.value) return // 防重复点击
  if (!keyReady.value) {
    showSettings.value = true // 没填 Key 就直接弹设置面板，减少用户找入口的成本
    showToast('请先填写一次 API Key（免费）')
    return
  }
  stopSpeak()
  speaking.value = false
  loading.value = true
  try {
    const data = await recognizePlant(photoUrl.value)
    result.value = data
    // 识别成功后如果用户开了语音，直接自动朗读一遍（适老化设计：能听就不逼着看）
    if (app.voiceEnabled) {
      const text = data.plant ? `${data.name}。${data.intro}` : data.answer
      if (speakText(text)) speaking.value = true
    }
  } catch (e) {
    // Key 相关的错误自动弹设置面板，其余错误只弹提示
    if (e.code === 'AUTH' || e.code === 'NO_KEY') {
      showSettings.value = true
    }
    showToast(e.message || '识别失败，请重试')
  } finally {
    loading.value = false
  }
}

/** 朗读/停止 的开关按钮 */
function toggleSpeak() {
  if (!result.value) return
  if (speaking.value) {
    stopSpeak()
    speaking.value = false
  } else {
    const text = result.value.plant
      ? `${result.value.name}。${result.value.intro}`
      : result.value.answer
    if (speakText(text)) speaking.value = true
    else showToast('当前浏览器不支持语音朗读')
  }
}

function openSettings() {
  cfg.value = getVisionConfig() // 每次打开都重新读，防止显示旧值
  showSettings.value = true
}

function saveSettings() {
  saveVisionConfig(cfg.value)
  keyReady.value = hasVisionKey() // 手动同步响应式状态（配合上面第 26 行的注释）
  showSettings.value = false
  showToast('已保存到本机')
}

// 离开页面时停止朗读，否则声音会"跟"到下一个页面
onBeforeUnmount(() => {
  stopSpeak()
})
</script>

<template>
  <main class="page recognize">
    <header class="page-head">
      <button class="icon-btn" aria-label="返回" @click="router.push({ name: 'home' })">←</button>
      <h1>拍照识花</h1>
      <button class="icon-btn" aria-label="设置" @click="openSettings">⚙</button>
    </header>

    <section class="pad">
      <!-- 未拍照：引导区 -->
      <template v-if="!photoUrl">
        <article class="card intro">
          <span class="flower-mark">花</span>
          <p class="intro-text">
            拍下眼前的<strong>花、叶子或树木</strong>，AI 帮您辨认名字，还能像导游一样讲给您听。
          </p>
          <p v-if="!keyReady" class="key-hint">首次使用需填写一次免费 API Key，点右上角 ⚙ 设置</p>
        </article>

        <button class="primary-btn shoot" @click="openCamera">
          <span class="btn-ico">📷</span> 拍照识别
        </button>
        <button class="ghost-btn album" @click="openAlbum">从相册选择照片</button>

        <p class="tip">小提示：尽量把花朵或叶片拍清楚，背景简单一些更容易认对。</p>
      </template>

      <!-- 已拍照：预览 + 结果 -->
      <template v-else>
        <article class="card preview-card">
          <img :src="photoUrl" alt="待识别的植物照片" />
        </article>

        <button v-if="!loading && !result" class="primary-btn" @click="recognize">
          开始辨认
        </button>
        <button v-if="loading" class="primary-btn" disabled>
          <span class="spinner" aria-hidden="true"></span> AI 正在辨认…
        </button>
        <button class="ghost-btn retake" @click="clearPhoto">重拍一张</button>

        <!-- 识别成功 -->
        <article v-if="result && result.plant" class="card result">
          <div class="result-head">
            <h2>{{ result.name }}</h2>
            <span class="conf" :class="result.confidence">
              {{ result.confidence === 'high' ? '辨认较有把握' : '仅供参考' }}
            </span>
          </div>
          <p v-if="result.family" class="family">{{ result.family }}</p>
          <p class="intro-words">{{ result.intro }}</p>
          <p v-if="result.tips" class="tips">💡 {{ result.tips }}</p>
          <button
            v-if="ttsSupported()"
            class="ghost-btn listen"
            @click="toggleSpeak"
          >
            {{ speaking ? '■ 停止朗读' : '🔊 听讲解' }}
          </button>
        </article>

        <!-- 不是植物 -->
        <article v-if="result && !result.plant" class="card result">
          <p class="not-plant">{{ result.answer }}</p>
        </article>
      </template>
    </section>

    <!-- 隐藏的文件选择器：拍照 / 相册 -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      @change="onPick"
    />
    <input
      ref="albumInput"
      type="file"
      accept="image/*"
      hidden
      @change="onPick"
    />

    <!-- API Key 设置面板 -->
    <div v-if="showSettings" class="sheet-mask" @click.self="showSettings = false">
      <div class="card sheet" role="dialog" aria-label="识别服务设置">
        <h2>识别服务设置</h2>
        <label class="field">
          <span>API Key</span>
          <input
            v-model="cfg.apiKey"
            type="password"
            placeholder="粘贴 DeepSeek 的 API Key"
            autocomplete="off"
          />
        </label>
        <details class="adv">
          <summary>高级：接口地址与模型（一般不用改）</summary>
          <label class="field">
            <span>接口地址</span>
            <input v-model="cfg.endpoint" type="url" placeholder="接口地址" />
          </label>
          <label class="field">
            <span>模型</span>
            <input v-model="cfg.model" type="text" placeholder="模型名" />
          </label>
        </details>
        <p class="howto">
          Key 获取：用电脑或手机浏览器打开
          <strong>platform.deepseek.com</strong>，注册后在「API keys」里创建并复制，粘贴到上面。
          Key 只保存在您自己的手机上。
        </p>
        <button class="primary-btn" @click="saveSettings">保存</button>
        <button class="ghost-btn cancel" @click="showSettings = false">取消</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pad {
  padding: 4px 16px 12px;
  display: grid;
  gap: 12px;
}
.intro {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.flower-mark {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fde8ef;
  color: #c2255c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
}
.intro-text {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.6;
}
.key-hint {
  margin: 0;
  font-size: var(--fs-xs);
  color: #b54708;
  background: #fffaeb;
  border-radius: 12px;
  padding: 8px 12px;
  font-weight: 700;
}
.shoot {
  gap: 8px;
}
.btn-ico {
  font-size: 1.1em;
}
.album {
  width: 100%;
}
.tip {
  margin: 0;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--muted);
  line-height: 1.6;
}
.preview-card {
  overflow: hidden;
  padding: 6px;
}
.preview-card img {
  width: 100%;
  max-height: 46vh;
  object-fit: contain;
  border-radius: 16px;
  background: #0e1f12;
}
.retake {
  width: 100%;
}
.result {
  padding: 18px;
  display: grid;
  gap: 8px;
}
.result-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.result-head h2 {
  margin: 0;
  font-size: var(--fs-xl);
  color: var(--primary);
}
.conf {
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.conf.high {
  background: #e4f4e2;
  color: var(--primary);
}
.conf.medium,
.conf.low {
  background: #fffaeb;
  color: #b54708;
}
.family {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-sm);
}
.intro-words {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.7;
}
.tips {
  margin: 4px 0 0;
  font-size: var(--fs-sm);
  color: var(--muted);
  line-height: 1.6;
}
.listen {
  width: 100%;
  margin-top: 6px;
}
.not-plant {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.7;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.sheet-mask {
  position: absolute;
  inset: 0;
  background: rgba(10, 26, 14, 0.45);
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: 480px;
  border-radius: 24px 24px 0 0;
  padding: 20px 18px calc(16px + var(--safe-bottom));
  display: grid;
  gap: 12px;
}
.sheet h2 {
  margin: 0;
  font-size: var(--fs-lg);
  color: var(--primary);
}
.field {
  display: grid;
  gap: 6px;
  font-size: var(--fs-sm);
  font-weight: 700;
}
.field input {
  min-height: var(--tap);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
  font-weight: 400;
}
.field input:focus {
  outline: none;
  border-color: var(--primary);
}
.adv summary {
  font-size: var(--fs-xs);
  color: var(--muted);
  font-weight: 700;
  padding: 4px 0;
}
.adv .field {
  margin-top: 8px;
}
.howto {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--muted);
  line-height: 1.7;
}
.cancel {
  width: 100%;
}
</style>
