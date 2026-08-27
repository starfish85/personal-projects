import { fakeClassify } from "./clientAi.js";

async function tryApi(url, options) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function classifyText(text) {
  const remote = await tryApi("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (remote) return remote;
  return fakeClassify(text);
}

export async function lookImage(file, { timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = new FormData();
    body.append("image", file, file.name || "photo.jpg");
    const remote = await tryApi("/api/look", { method: "POST", body, signal: ctrl.signal });
    if (remote) return remote;
    return { ok: false, error: "failed" };
  } catch {
    return { ok: false, error: "failed" };
  } finally {
    clearTimeout(timer);
  }
}
