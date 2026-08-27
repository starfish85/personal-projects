export async function prepareImage(file) {
  if (!file) return { ok: false, error: "unsupported" };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "too_large" };

  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return { ok: false, error: "unsupported" };
    const jpeg = new File([blob], "photo.jpg", { type: "image/jpeg" });
    return { ok: true, file: jpeg };
  } catch {
    if (/jpeg|jpg|png/i.test(file.type) && file.size <= 10 * 1024 * 1024) {
      return { ok: true, file };
    }
    return { ok: false, error: "unsupported" };
  }
}
