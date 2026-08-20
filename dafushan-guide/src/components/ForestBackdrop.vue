<script setup>
const VARIANTS = ['drift', 'sweep', 'blow-r', 'blow-l', 'tumble', 'flutter']
const COLORS = ['#1a6b34', '#2f7a3d', '#3d8b4a', '#6aa56a', '#4a8f52']

function rand(min, max) {
  return min + Math.random() * (max - min)
}

const leaves = Array.from({ length: 11 }, (_, i) => {
  const kind = VARIANTS[i % VARIANTS.length]
  return {
    kind,
    x: `${rand(4, 90).toFixed(1)}%`,
    y: `${rand(-14, -5).toFixed(1)}%`,
    s: rand(13, 23),
    delay: `${(-rand(0, 18)).toFixed(1)}s`,
    duration: `${rand(15, 23).toFixed(1)}s`,
    opacity: rand(0.26, 0.44),
    color: COLORS[i % COLORS.length],
  }
})
</script>

<template>
  <div class="forest" aria-hidden="true">
    <div class="wash a" />
    <div class="wash b" />
    <div class="wash c" />
    <span
      v-for="(leaf, i) in leaves"
      :key="i"
      class="leaf"
      :style="{
        left: leaf.x,
        top: leaf.y,
        width: leaf.s + 'px',
        height: leaf.s * 1.35 + 'px',
        opacity: leaf.opacity,
        background: leaf.color,
        animation: `daofu-${leaf.kind} ${leaf.duration} linear ${leaf.delay} infinite`,
      }"
    />
  </div>
</template>

<style scoped>
.forest {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
  background: #d6ead0;
}
.wash {
  position: absolute;
  inset: -45%;
}
.wash.a {
  background:
    radial-gradient(ellipse 90% 75% at 16% 20%, #c5e0b0 0%, transparent 58%),
    radial-gradient(ellipse 80% 70% at 82% 16%, #8fbf76 0%, transparent 60%),
    radial-gradient(ellipse 95% 80% at 48% 78%, #dcecc8 0%, transparent 62%),
    radial-gradient(ellipse 72% 64% at 6% 82%, #a8cb92 0%, transparent 58%);
  animation: drift-a 26s ease-in-out infinite alternate;
}
.wash.b {
  background:
    radial-gradient(ellipse 88% 76% at 86% 64%, #7eb56e 0%, transparent 58%),
    radial-gradient(ellipse 82% 70% at 26% 50%, #e3f2d4 0%, transparent 56%),
    radial-gradient(ellipse 74% 66% at 64% 6%, #b7d6a0 0%, transparent 60%),
    radial-gradient(ellipse 92% 78% at 10% 34%, #6fa86a 0%, transparent 62%);
  animation: drift-b 32s ease-in-out infinite alternate;
}
.wash.c {
  background:
    radial-gradient(ellipse 96% 82% at 54% 42%, #cfe8c0 0%, transparent 60%),
    radial-gradient(ellipse 70% 62% at 92% 90%, #d8edc6 0%, transparent 56%),
    radial-gradient(ellipse 78% 68% at 4% 6%, #9ecb86 0%, transparent 58%);
  animation: drift-c 22s ease-in-out infinite alternate;
}
.leaf {
  position: absolute;
  border-radius: 2px 70% 2px 70%;
  transform-origin: 60% 40%;
}

@keyframes drift-a {
  from {
    transform: translate3d(-4%, -3%, 0);
  }
  to {
    transform: translate3d(6%, 5%, 0);
  }
}
@keyframes drift-b {
  from {
    transform: translate3d(5%, 4%, 0);
  }
  to {
    transform: translate3d(-6%, -3%, 0);
  }
}
@keyframes drift-c {
  from {
    transform: translate3d(-3%, 5%, 0);
  }
  to {
    transform: translate3d(4%, -5%, 0);
  }
}
</style>

<style>
/* 左右飘、翻转，但高度一直往下，中间不停。 */
@keyframes daofu-drift {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  18% {
    transform: translate3d(72px, 16vh, 0) rotate(55deg);
  }
  36% {
    transform: translate3d(-46px, 36vh, 0) rotate(118deg);
  }
  55% {
    transform: translate3d(84px, 58vh, 0) rotate(188deg);
  }
  76% {
    transform: translate3d(-34px, 86vh, 0) rotate(258deg);
  }
  100% {
    transform: translate3d(38px, 122vh, 0) rotate(340deg);
  }
}

@keyframes daofu-sweep {
  0% {
    transform: translate3d(0, 0, 0) rotate(-16deg);
  }
  20% {
    transform: translate3d(-68px, 22vh, 0) rotate(42deg);
  }
  40% {
    transform: translate3d(36px, 46vh, 0) rotate(18deg);
  }
  62% {
    transform: translate3d(92px, 74vh, 0) rotate(-28deg);
  }
  82% {
    transform: translate3d(-28px, 98vh, 0) rotate(96deg);
  }
  100% {
    transform: translate3d(46px, 124vh, 0) rotate(210deg);
  }
}

@keyframes daofu-blow-r {
  0% {
    transform: translate3d(0, 0, 0) rotate(-20deg);
  }
  24% {
    transform: translate3d(20vw, 20vh, 0) rotate(38deg);
  }
  48% {
    transform: translate3d(8vw, 48vh, 0) rotate(86deg);
  }
  72% {
    transform: translate3d(30vw, 78vh, 0) rotate(148deg);
  }
  100% {
    transform: translate3d(16vw, 124vh, 0) rotate(220deg);
  }
}

@keyframes daofu-blow-l {
  0% {
    transform: translate3d(0, 0, 0) rotate(18deg);
  }
  24% {
    transform: translate3d(-18vw, 22vh, 0) rotate(-44deg);
  }
  48% {
    transform: translate3d(-6vw, 50vh, 0) rotate(16deg);
  }
  72% {
    transform: translate3d(-26vw, 80vh, 0) rotate(-96deg);
  }
  100% {
    transform: translate3d(-12vw, 124vh, 0) rotate(-168deg);
  }
}

@keyframes daofu-tumble {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  16% {
    transform: translate3d(42px, 14vh, 0) rotate(90deg);
  }
  32% {
    transform: translate3d(-74px, 32vh, 0) rotate(180deg);
  }
  48% {
    transform: translate3d(58px, 50vh, 0) rotate(270deg);
  }
  66% {
    transform: translate3d(-48px, 74vh, 0) rotate(360deg);
  }
  84% {
    transform: translate3d(62px, 98vh, 0) rotate(450deg);
  }
  100% {
    transform: translate3d(-22px, 126vh, 0) rotate(540deg);
  }
}

@keyframes daofu-flutter {
  0% {
    transform: translate3d(0, 0, 0) rotate(8deg);
  }
  16% {
    transform: translate3d(48px, 18vh, 0) rotate(-22deg);
  }
  32% {
    transform: translate3d(-36px, 38vh, 0) rotate(28deg);
  }
  50% {
    transform: translate3d(78px, 60vh, 0) rotate(108deg);
  }
  68% {
    transform: translate3d(-52px, 82vh, 0) rotate(172deg);
  }
  86% {
    transform: translate3d(28px, 104vh, 0) rotate(236deg);
  }
  100% {
    transform: translate3d(-16px, 124vh, 0) rotate(290deg);
  }
}
</style>
