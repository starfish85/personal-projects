<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePanZoom } from '../composables/usePanZoom'
import { createAnnotationLayer } from '../composables/useAnnotation'

const props = defineProps({
  src: { type: String, default: '' },
  naturalWidth: { type: Number, default: 1 },
  naturalHeight: { type: Number, default: 1 },
  strokes: { type: Array, default: () => [] },
  mode: { type: String, default: 'pen' },
  ink: { type: String, default: 'finger' },
  color: { type: String, default: '#1c1410' },
  width: { type: Number, default: 0.007 },
  annotatable: { type: Boolean, default: true },
})

const emit = defineEmits(['commit-stroke', 'tap', 'pen', 'gesture'])

const viewport = ref(null)
const canvasRef = ref(null)
const {
  scale,
  tx,
  ty,
  baseW,
  baseH,
  fit,
  zoomBy,
  beginPan,
  movePan,
  endPan,
  beginPinch,
  movePinch,
  endPinch,
  viewToNorm,
} = usePanZoom()

const layer = createAnnotationLayer()
const pointers = new Map()
let drawing = false
let drawId = null
let tap = null
let multiTap = null
let ignoreUntilEmpty = false
const touchOpts = { passive: false }

function toView(event) {
  const r = viewport.value.getBoundingClientRect()
  return { x: event.clientX - r.left, y: event.clientY - r.top }
}

function ofType(type) {
  return [...pointers.values()].filter((p) => p.type === type)
}

function canDraw() {
  return props.annotatable && (props.mode === 'pen' || props.mode === 'eraser')
}

function pencilMode() {
  return props.ink === 'pencil'
}

function strokeWidth(event) {
  const pressure = typeof event.pressure === 'number' && event.pressure > 0 ? event.pressure : 0.55
  return props.width * (0.45 + 0.9 * pressure)
}

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const w = Math.max(1, Math.round(props.naturalWidth))
  const h = Math.max(1, Math.round(props.naturalHeight))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  layer.size(w, h)
  layer.rebuild(props.strokes)
  layer.blit(canvas)
}

function fitNow() {
  const el = viewport.value
  if (!el) return
  fit(el.clientWidth, el.clientHeight, props.naturalWidth, props.naturalHeight)
  setupCanvas()
}

function cancelDraw() {
  if (!drawing) return
  layer.cancel()
  drawing = false
  drawId = null
  if (canvasRef.value) layer.blit(canvasRef.value)
}

function startDraw(view, event, pointerId) {
  drawing = true
  drawId = pointerId
  layer.begin({
    tool: props.mode === 'eraser' ? 'eraser' : 'pen',
    color: props.color,
    width: strokeWidth(event),
    points: [viewToNorm(view.x, view.y)],
  })
  if (canvasRef.value) layer.blit(canvasRef.value)
}

function moveDraw(view) {
  layer.add(viewToNorm(view.x, view.y))
  if (canvasRef.value) layer.blit(canvasRef.value)
}

function finishDraw() {
  if (!drawing) return null
  const stroke = layer.end()
  drawing = false
  drawId = null
  if (canvasRef.value) layer.blit(canvasRef.value)
  return stroke
}

function shouldInk(type) {
  if (!canDraw()) return false
  if (pencilMode()) return type === 'pen' || type === 'mouse'
  return true
}

function startPinchFrom(list) {
  if (list.length < 2) return
  cancelDraw()
  endPan()
  ignoreUntilEmpty = true
  if (tap) tap.pinched = true
  if (!multiTap) {
    multiTap = {
      count: list.length,
      at: Date.now(),
      moved: false,
      points: list.map((p) => ({ x: p.x, y: p.y })),
    }
  } else {
    multiTap.count = Math.max(multiTap.count, list.length)
  }
  beginPinch(list[0].x, list[0].y, list[1].x, list[1].y)
}

function updateMultiTap(list) {
  if (!multiTap) return
  multiTap.count = Math.max(multiTap.count, list.length)
  for (let i = 0; i < Math.min(list.length, multiTap.points.length); i += 1) {
    if (Math.hypot(list[i].x - multiTap.points[i].x, list[i].y - multiTap.points[i].y) > 16) {
      multiTap.moved = true
    }
  }
}

function onPointerDown(event) {
  if (!viewport.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const view = toView(event)

  if (event.pointerType === 'pen') emit('pen')

  if (pencilMode() && event.pointerType === 'touch' && ofType('pen').length) {
    return
  }

  pointers.set(event.pointerId, {
    id: event.pointerId,
    type: event.pointerType,
    x: view.x,
    y: view.y,
  })

  if (pointers.size === 1) {
    tap = { x: view.x, y: view.y, at: Date.now(), moved: false, pinched: false }
  }

  const fingers = ofType('touch')
  const zoomList = pencilMode() ? fingers : [...pointers.values()]

  if (zoomList.length >= 2) {
    startPinchFrom(zoomList)
    return
  }

  if (ignoreUntilEmpty) return

  if (shouldInk(event.pointerType)) {
    startDraw(view, event, event.pointerId)
  } else {
    beginPan(view.x, view.y)
  }
}

function onPointerMove(event) {
  const rec = pointers.get(event.pointerId)
  if (!rec) return
  const view = toView(event)
  rec.x = view.x
  rec.y = view.y
  if (tap && Math.hypot(view.x - tap.x, view.y - tap.y) > 10) tap.moved = true

  const fingers = ofType('touch')
  const zoomList = pencilMode() ? fingers : [...pointers.values()]
  if (zoomList.length >= 2) {
    updateMultiTap(zoomList)
    movePinch(zoomList[0].x, zoomList[0].y, zoomList[1].x, zoomList[1].y)
    return
  }

  if (ignoreUntilEmpty) return
  if (drawing && event.pointerId === drawId) {
    moveDraw(view)
    return
  }
  if (!drawing) movePan(view.x, view.y)
}

function onPointerUp(event) {
  if (!pointers.has(event.pointerId)) return
  pointers.delete(event.pointerId)

  const fingers = ofType('touch')
  const zoomList = pencilMode() ? fingers : [...pointers.values()]
  if (zoomList.length >= 2) {
    startPinchFrom(zoomList)
    return
  }

  if (zoomList.length === 1) {
    endPinch()
    if (event.pointerId === drawId) cancelDraw()
    endPan()
    ignoreUntilEmpty = true
    return
  }

  const wasDrawing = drawing && event.pointerId === drawId
  let stroke = null
  if (wasDrawing) stroke = finishDraw()
  else if (pointers.size === 0) cancelDraw()
  if (stroke) emit('commit-stroke', stroke)
  endPinch()
  endPan()

  if (pointers.size === 0) {
    const isMultiTap =
      multiTap &&
      multiTap.count >= 2 &&
      !multiTap.moved &&
      Date.now() - multiTap.at < 360
    const isTap =
      tap &&
      !tap.moved &&
      !tap.pinched &&
      !wasDrawing &&
      Date.now() - tap.at < 450
    tap = null
    const gesture = multiTap?.count
    multiTap = null
    ignoreUntilEmpty = false
    if (isMultiTap) {
      emit('gesture', gesture >= 3 ? 'redo' : 'undo')
      return
    }
    if (isTap) emit('tap')
  }
}

function onWheel(event) {
  event.preventDefault()
  const view = toView(event)
  zoomBy(event.deltaY < 0 ? 1.08 : 1 / 1.08, view.x, view.y)
}

function swallow(event) {
  event.preventDefault()
}

function zoom(factor) {
  const el = viewport.value
  if (!el) return
  zoomBy(factor, el.clientWidth / 2, el.clientHeight / 2)
}

function onOrientation() {
  fitNow()
}

onMounted(() => {
  fitNow()
  const el = viewport.value
  if (!el) return
  el.addEventListener('wheel', onWheel, touchOpts)
  el.addEventListener('touchmove', swallow, touchOpts)
  el.addEventListener('gesturestart', swallow, touchOpts)
  el.addEventListener('gesturechange', swallow, touchOpts)
  window.addEventListener('orientationchange', onOrientation)
})

onBeforeUnmount(() => {
  const el = viewport.value
  el?.removeEventListener('wheel', onWheel)
  el?.removeEventListener('touchmove', swallow)
  el?.removeEventListener('gesturestart', swallow)
  el?.removeEventListener('gesturechange', swallow)
  window.removeEventListener('orientationchange', onOrientation)
})

watch(
  () => [props.src, props.naturalWidth, props.naturalHeight],
  () => fitNow(),
)

watch(
  () => props.strokes,
  () => {
    if (!canvasRef.value) return
    layer.rebuild(props.strokes)
    layer.blit(canvasRef.value)
  },
  { deep: true },
)

defineExpose({ zoom, fitNow })
</script>

<template>
  <div
    ref="viewport"
    class="viewport"
    :class="{ draw: annotatable && (mode === 'pen' || mode === 'eraser') }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div
      class="stage"
      :style="{
        width: baseW + 'px',
        height: baseH + 'px',
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      }"
    >
      <img v-if="src" class="page" :src="src" :alt="annotatable ? '曲谱' : '笔记'" draggable="false" />
      <canvas v-if="annotatable" ref="canvasRef" class="ink" />
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  background: #0e0c0a;
  cursor: grab;
}

.viewport.draw {
  cursor: crosshair;
}

.stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  will-change: transform;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.page,
.ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.page {
  background: #fff;
  object-fit: fill;
}
</style>
