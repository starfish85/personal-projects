export function paintStroke(ctx, stroke, width, height) {
  if (!stroke.points?.length) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.5, stroke.width * Math.min(width, height))
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
  }
  ctx.beginPath()
  const first = stroke.points[0]
  ctx.moveTo(first.x * width, first.y * height)
  if (stroke.points.length === 1) {
    ctx.lineTo(first.x * width + 0.01, first.y * height)
  } else {
    for (let i = 1; i < stroke.points.length; i += 1) {
      const p = stroke.points[i]
      ctx.lineTo(p.x * width, p.y * height)
    }
  }
  ctx.stroke()
  ctx.restore()
}

export function replayStrokes(ctx, strokes, width, height) {
  ctx.clearRect(0, 0, width, height)
  for (const stroke of strokes) paintStroke(ctx, stroke, width, height)
}

export function createAnnotationLayer() {
  const committed = document.createElement('canvas')
  let live = null

  function size(width, height) {
    if (committed.width === width && committed.height === height) return
    committed.width = width
    committed.height = height
  }

  function rebuild(strokes) {
    const ctx = committed.getContext('2d')
    replayStrokes(ctx, strokes, committed.width, committed.height)
  }

  function begin(stroke) {
    live = { ...stroke, points: [...stroke.points] }
  }

  function add(point) {
    if (!live) return
    const last = live.points[live.points.length - 1]
    if (last && Math.abs(last.x - point.x) < 0.0005 && Math.abs(last.y - point.y) < 0.0005) {
      return
    }
    live.points.push(point)
  }

  function end() {
    const stroke = live
    live = null
    if (!stroke || !stroke.points.length) return null
    paintStroke(committed.getContext('2d'), stroke, committed.width, committed.height)
    return stroke
  }

  function cancel() {
    live = null
  }

  function blit(target) {
    const ctx = target.getContext('2d')
    ctx.clearRect(0, 0, target.width, target.height)
    ctx.drawImage(committed, 0, 0)
    if (live) paintStroke(ctx, live, target.width, target.height)
  }

  return { size, rebuild, begin, add, end, cancel, blit }
}
