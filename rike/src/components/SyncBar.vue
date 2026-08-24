<script setup>
import { reactive, ref } from 'vue'
import { getCloudConfig, setCloudConfig } from '../cloud/client'
import { cloud, fullSync, sendLogin, signOut } from '../stores/sync'

const email = ref(cloud.email)
const setup = ref(!getCloudConfig())
const form = reactive({
  url: getCloudConfig()?.url || '',
  anonKey: getCloudConfig()?.anonKey || '',
})

function saveConfig() {
  if (!form.url.trim() || !form.anonKey.trim()) return
  setCloudConfig(form.url, form.anonKey)
  setup.value = false
  location.reload()
}
</script>

<template>
  <section class="sync">
    <template v-if="setup">
      <input v-model="form.url" class="field slim" type="url" placeholder="项目 URL" />
      <input v-model="form.anonKey" class="field slim" type="text" placeholder="anon public key" />
      <button class="link" type="button" @click="saveConfig">保存</button>
    </template>
    <template v-else-if="!cloud.user">
      <input v-model="email" class="field slim" type="email" placeholder="邮箱" />
      <button class="link" type="button" @click="sendLogin(email)">登录</button>
    </template>
    <template v-else>
      <span class="mail">{{ cloud.email }}</span>
      <button class="link" type="button" :disabled="cloud.syncing" @click="fullSync">
        {{ cloud.syncing ? '同步中' : '同步' }}
      </button>
      <button class="link" type="button" @click="signOut">退出</button>
    </template>
  </section>
</template>

<style scoped>
.sync {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.slim {
  flex: 1;
  min-width: 140px;
  margin: 0;
  min-height: 40px;
}

.mail {
  color: var(--muted);
  font-size: var(--fs-sm);
}

.link {
  min-height: 40px;
  color: var(--amber);
  font-weight: 650;
  font-size: var(--fs-sm);
}

.link:disabled {
  opacity: 0.5;
}
</style>
