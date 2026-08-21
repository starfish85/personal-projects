const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_EDGE = 2560
const THUMB_EDGE = 360

export class ImageError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function drawToBlob(bitmap, maxEdge, quality, mime = 'image/jpeg') {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new ImageError('ENCODE', '图片处理失败'))
        else resolve({ blob, width, height })
      },
      mime,
      quality,
    )
  })
}

export async function compressImage(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageError('TOO_LARGE', '有一张图超过 20MB，已跳过')
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageError('UNSUPPORTED', '请换成 jpg 或 png')
  }

  try {
    const full = await drawToBlob(bitmap, MAX_EDGE, 0.86)
    const thumb = await drawToBlob(bitmap, THUMB_EDGE, 0.72)
    return {
      blob: full.blob,
      thumbBlob: thumb.blob,
      width: full.width,
      height: full.height,
      mime: 'image/jpeg',
      name: file.name || 'image.jpg',
    }
  } finally {
    bitmap.close?.()
  }
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const comma = text.indexOf(',')
      resolve(comma >= 0 ? text.slice(comma + 1) : text)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(b64, mime) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime || 'application/octet-stream' })
}
