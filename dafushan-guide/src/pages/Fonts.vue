<script setup>
const sample = '大夫山森林公园欢迎您'
const body = '荷花池  厕所  去这里  前方100米左转'

const options = [
  {
    id: 'system',
    name: '系统黑体',
    rec: '现在用的',
    desc: '苹果是苹方，安卓/微信多是系统黑体。不用下载，各地都稳。',
    family: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'noto-sans',
    name: '思源黑体',
    rec: '适老首选',
    desc: '笔画粗细均匀，远一点也清楚。公园导览、大字最合适。',
    family: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'misans',
    name: '小米字体',
    rec: '更亲和',
    desc: '比黑体略圆，看起来软一点，适合面向老人的界面。',
    family: '"MiSans", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'puhui',
    name: '阿里普惠体',
    rec: '正式稳重',
    desc: '政务和公共服务常用，端正、好认，偏官方感。',
    family: '"Alibaba PuHuiTi 2.0", "Alibaba PuHuiTi", "PingFang SC", sans-serif',
  },
  {
    id: 'noto-serif',
    name: '思源宋体',
    rec: '更有文化感',
    desc: '有衬线，像书和景区牌子。打印好看，屏幕上老人读起来稍累。',
    family: '"Noto Serif SC", "Songti SC", serif',
  },
  {
    id: 'wenkai',
    name: '霞鹜文楷',
    rec: '更温馨',
    desc: '手写楷体，有公园味道。标题可以，大段说明不太适合适老。',
    family: '"LXGW WenKai", "Kaiti SC", serif',
  },
]
</script>

<template>
  <main class="page no-tab fonts">
    <h1>选一个字体</h1>
    <p class="lead">
      下面是同一句话。看标题清不清楚、远一点能不能认。适老化导览更建议黑体，不要花体。
    </p>
    <article v-for="item in options" :key="item.id" class="card block">
      <header>
        <h2>{{ item.name }}</h2>
        <span>{{ item.rec }}</span>
      </header>
      <p class="desc">{{ item.desc }}</p>
      <p class="sample" :style="{ fontFamily: item.family }">{{ sample }}</p>
      <p class="body" :style="{ fontFamily: item.family }">{{ body }}</p>
    </article>
    <p class="hint">看中哪个，回我它的名字即可，例如「思源黑体」。我再换成全站字体。</p>
  </main>
</template>

<style scoped>
.fonts {
  padding: calc(var(--safe-top) + 16px) 16px 32px;
}
h1 {
  margin: 0 0 8px;
  font-size: var(--fs-xl);
  color: var(--primary);
}
.lead,
.hint {
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.5;
}
.block {
  margin: 14px 0;
  padding: 14px 16px 16px;
}
header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
h2 {
  margin: 0;
  font-size: var(--fs-lg);
}
header span {
  flex: none;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 800;
}
.desc {
  margin: 6px 0 12px;
  color: var(--muted);
  font-size: var(--fs-xs);
}
.sample {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
}
.body {
  margin: 8px 0 0;
  font-size: 20px;
}
.hint {
  margin-top: 20px;
}
</style>
