<script setup>
import { computed, reactive, ref } from 'vue'
import { getCloudConfig, setCloudConfig } from '../cloud/client'
import { currentPushOn, enablePush, pushSupported } from '../cloud/push'
import { cloud, fullSync, sendLogin, signOut, verifyLoginCode } from '../stores/sync'
import { confirmDialog, toast } from '../stores/ui'
import { backupFileName, exportAndDownload, importBackup } from '../utils/backup'

const importRef = ref(null)
const backupBusy = ref(false)

const config = getCloudConfig()
const open = ref(!config && !cloud.user)
const email = ref(cloud.email)
const otp = ref('')
const sent = ref(false)
const loginBusy = ref(false)
const form = reactive({
  url: config?.url || '',
  anonKey: config?.anonKey || '',
})

const configured = computed(() => Boolean(getCloudConfig()))
const status = computed(() => {
  if (!configured.value) return '未配置'
  if (cloud.syncing) return cloud.assetNote || '同步中'
  if (cloud.assetNote) return cloud.assetNote
  if (cloud.user) return cloud.lastAt ? `已同步 ${cloud.lastAt}` : '已登录'
  return '未登录'
})

const pushLabel = computed(() => {
  if (cloud.push === 'on') return '到点提醒已开'
  if (!pushSupported()) return '这台设备不能网页推送'
  return '打开到点提醒'
})

async function turnOnPush() {
  const ok = await enablePush(cloud.user)
  cloud.push = await currentPushOn()
  if (ok) cloud.push = 'on'
}

function saveConfig() {
  if (!form.url.trim() || !form.anonKey.trim()) {
    toast('先填项目 URL 和 anon key')
    return
  }
  setCloudConfig(form.url, form.anonKey)
  toast('云项目已保存')
  location.reload()
}

async function login() {
  if (loginBusy.value) return
  loginBusy.value = true
  try {
    const ok = await sendLogin(email.value)
    if (ok) {
      sent.value = true
      open.value = true
    }
  } finally {
    loginBusy.value = false
  }
}

async function confirmCode() {
  if (loginBusy.value) return
  loginBusy.value = true
  try {
    await verifyLoginCode(email.value, otp.value)
  } finally {
    loginBusy.value = false
  }
}

async function doExport() {
  if (backupBusy.value) return
  backupBusy.value = true
  try {
    const data = await exportAndDownload()
    toast(`已导出 ${backupFileName(data)}`)
  } catch {
    toast('导出失败')
  } finally {
    backupBusy.value = false
  }
}

async function askImport() {
  if (backupBusy.value) return
  const ok = await confirmDialog({
    title: '导入备份？',
    copy: '会覆盖本机现有的遍数、图片、标注和笔记。',
    ok: '导入',
    danger: true,
  })
  if (ok) importRef.value?.click()
}

async function onImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  backupBusy.value = true
  try {
    await importBackup(file)
    toast('备份已导入')
  } catch (error) {
    toast(error.message || '导入失败')
  } finally {
    backupBusy.value = false
  }
}
</script>

<template>
  <section class="sync">
    <button type="button" class="summary" @click="open = !open">
      <span>
        <strong>云同步</strong>
        <em>{{ cloud.error || status }}</em>
      </span>
      <i :class="{ on: open }" />
    </button>

    <div v-if="open" class="panel">
      <template v-if="!configured">
        <input v-model="form.url" class="field slim" type="url" placeholder="Supabase 项目 URL" />
        <input v-model="form.anonKey" class="field slim" type="text" placeholder="anon public key" />
        <button class="btn btn-primary" type="button" @click="saveConfig">保存云项目</button>
      </template>
      <template v-else-if="!cloud.user">
        <input v-model="email" class="field slim" type="email" placeholder="邮箱" autocomplete="email" />
        <button class="btn btn-primary" type="button" :disabled="loginBusy" @click="login">
          {{ loginBusy && !sent ? '发送中' : '发送验证码' }}
        </button>
        <template v-if="sent">
          <input
            v-model="otp"
            class="field slim"
            type="text"
            inputmode="numeric"
            maxlength="8"
            placeholder="邮件里的 6 位数字"
            @keyup.enter="confirmCode"
          />
          <button class="btn btn-primary" type="button" :disabled="loginBusy" @click="confirmCode">
            {{ loginBusy ? '登录中' : '确认登录' }}
          </button>
          <p class="hint">
            回到这个页面填验证码。用微信点邮件链接通常会失败，因为换了一个浏览器。
          </p>
        </template>
      </template>
      <template v-else>
        <p class="mail">{{ cloud.email }}</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" :disabled="cloud.syncing" @click="fullSync">
            {{ cloud.syncing ? '同步中' : '立即同步' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="signOut">退出</button>
        </div>
        <button
          class="btn btn-ghost push-btn"
          type="button"
          :disabled="cloud.push === 'on' || !pushSupported()"
          @click="turnOnPush"
        >
          {{ pushLabel }}
        </button>
      </template>
      <p class="hint">
        登录后曲谱、打卡图、日记图会传到云端，换手机登录再同步即可。两台手机同一天都加遍数时取较大值，不会相加。
        到点提醒：加到主屏幕后点上面的按钮；微信里网页推送一般不可用，页面开着时仍会响。
      </p>
      <div class="actions backup">
        <button class="btn btn-ghost" type="button" :disabled="backupBusy" @click="doExport">
          {{ backupBusy ? '处理中' : '导出备份' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="backupBusy" @click="askImport">
          导入备份
        </button>
      </div>
      <input ref="importRef" class="hidden" type="file" accept="application/json" @change="onImport" />
    </div>
  </section>
</template>

<style scoped>
.sync {
  margin-top: 12px;
}

.summary {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}

.summary strong,
.summary em {
  display: block;
}

.summary strong {
  font-size: 12px;
  letter-spacing: 0.12em;
  font-weight: 500;
}

.summary em {
  margin-top: 3px;
  color: var(--muted);
  font-style: normal;
  font-size: 12px;
}

.summary i {
  width: 10px;
  height: 10px;
  border-right: 2px solid var(--amber);
  border-bottom: 2px solid var(--amber);
  transform: rotate(45deg);
  transition: transform 0.16s ease;
}

.summary i.on {
  transform: rotate(225deg);
}

.panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: var(--bg-elev);
}

.slim {
  margin: 0;
}

.mail {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.actions.backup {
  grid-template-columns: 1fr 1fr;
}

.push-btn {
  width: 100%;
}

.hint {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.hidden {
  display: none;
}

.btn:disabled {
  opacity: 0.5;
}
</style>
