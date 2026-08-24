<script setup>
import { computed, reactive, ref } from 'vue'
import { getCloudConfig, setCloudConfig } from '../cloud/client'
import { cloud, fullSync, sendLogin, signOut } from '../stores/sync'
import { toast } from '../stores/ui'

const config = getCloudConfig()
const open = ref(!config && !cloud.user)
const email = ref(cloud.email)
const form = reactive({
  url: config?.url || '',
  anonKey: config?.anonKey || '',
})

const configured = computed(() => Boolean(getCloudConfig()))
const status = computed(() => {
  if (!configured.value) return '未配置'
  if (cloud.syncing) return '同步中'
  if (cloud.user) return cloud.lastAt ? `已同步 ${cloud.lastAt}` : '已登录'
  return '未登录'
})

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
  const ok = await sendLogin(email.value)
  if (ok) open.value = false
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
        <input v-model="email" class="field slim" type="email" placeholder="邮箱" />
        <button class="btn btn-primary" type="button" @click="login">发送登录链接</button>
      </template>
      <template v-else>
        <p class="mail">{{ cloud.email }}</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" :disabled="cloud.syncing" @click="fullSync">
            {{ cloud.syncing ? '同步中' : '立即同步' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="signOut">退出</button>
        </div>
      </template>
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
  font-size: var(--fs-sm);
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

.btn:disabled {
  opacity: 0.5;
}
</style>
