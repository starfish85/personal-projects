import { ref } from 'vue'

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function usePanZoom() {
  const scale = ref(1)
  const tx = ref(0)
  const ty = ref(0)
  const baseW = ref(1)
  const baseH = ref(1)

  let pan = null
  let pinch = null

  function viewToWorld(vx, vy) {
    return {
      x: (vx - tx.value) / scale.value,
      y: (vy - ty.value) / scale.value,
    }
  }

  function viewToNorm(vx, vy) {
    const world = viewToWorld(vx, vy)
    return {
      x: world.x / baseW.value,
      y: world.y / baseH.value,
    }
  }

  function zoomAt(vx, vy, nextScale) {
    const s = clamp(nextScale, 0.55, 8)
    const world = viewToWorld(vx, vy)
    scale.value = s
    tx.value = vx - world.x * s
    ty.value = vy - world.y * s
  }

  function fit(viewportW, viewportH, naturalW, naturalH) {
    const factor = Math.min(viewportW / naturalW, viewportH / naturalH)
    baseW.value = Math.max(1, naturalW * factor)
    baseH.value = Math.max(1, naturalH * factor)
    scale.value = 1
    tx.value = (viewportW - baseW.value) / 2
    ty.value = (viewportH - baseH.value) / 2
  }

  function beginPan(vx, vy) {
    pan = { vx, vy, tx: tx.value, ty: ty.value }
  }

  function movePan(vx, vy) {
    if (!pan) return
    tx.value = pan.tx + (vx - pan.vx)
    ty.value = pan.ty + (vy - pan.vy)
  }

  function endPan() {
    pan = null
  }

  function beginPinch(ax, ay, bx, by) {
    const dist = Math.hypot(bx - ax, by - ay)
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    pinch = {
      dist,
      scale: scale.value,
      world: viewToWorld(mx, my),
    }
    pan = null
  }

  function movePinch(ax, ay, bx, by) {
    if (!pinch) return
    const dist = Math.hypot(bx - ax, by - ay) || 1
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const s = clamp(pinch.scale * (dist / pinch.dist), 0.55, 8)
    scale.value = s
    tx.value = mx - pinch.world.x * s
    ty.value = my - pinch.world.y * s
  }

  function endPinch() {
    pinch = null
  }

  function zoomBy(factor, vx, vy) {
    zoomAt(vx, vy, scale.value * factor)
  }

  return {
    scale,
    tx,
    ty,
    baseW,
    baseH,
    fit,
    zoomAt,
    zoomBy,
    beginPan,
    movePan,
    endPan,
    beginPinch,
    movePinch,
    endPinch,
    viewToNorm,
  }
}
