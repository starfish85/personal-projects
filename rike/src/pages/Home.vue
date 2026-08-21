<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { checkinsOn, done, practice } from '../stores/practice'

const router = useRouter()

const guitarLine = computed(() => {
  if (done.value) return `今日已完成 · ${practice.count}/${practice.task.target}`
  if (practice.count > 0) return `今日 ${practice.count}/${practice.task.target}`
  return '还没开始'
})

const drawCount = computed(() => checkinsOn(practice.date).length)
const drawLine = computed(() =>
  drawCount.value ? `今日已打卡 · ${drawCount.value} 张` : '拍一张今天的画',
)
</script>

<template>
  <main class="page">
    <header class="head">
      <p class="brand">日课</p>
      <p class="date">{{ practice.date }}</p>
    </header>

    <p class="lead">今天要完成的两件事。都做完，日历上就是一条满的进度。</p>

    <section class="links">
      <button class="card" type="button" @click="router.push('/guitar')">
        <i class="dot guitar" />
        <div>
          <strong>练习吉他</strong>
          <span>{{ guitarLine }}</span>
        </div>
      </button>
      <button class="card" type="button" @click="router.push('/draw')">
        <i class="dot draw" />
        <div>
          <strong>画画</strong>
          <span>{{ drawLine }}</span>
        </div>
      </button>
      <button class="card" type="button" @click="router.push('/calendar')">
        <strong>练习日历</strong>
        <span>每天一条进度，颜色对应不同任务</span>
      </button>
    </section>
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(18px + var(--safe-top)) 22px calc(24px + var(--safe-bottom));
  max-width: 480px;
  margin: 0 auto;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.brand {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.42em;
  font-weight: 650;
}

.date {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.lead {
  margin: 18px 0 22px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.links {
  display: grid;
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.card strong {
  display: block;
  font-size: 16px;
}

.card span {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.dot.guitar {
  background: var(--amber);
}

.dot.draw {
  background: var(--draw);
}
</style>
