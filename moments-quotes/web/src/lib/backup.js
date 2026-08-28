import { appendQuotes, loadStore } from "./quotes.js";
import { loadDict, mergeDict } from "./dictionary.js";

export function backupFileName(exportedAt = new Date().toISOString()) {
  return `片语-备份-${String(exportedAt).slice(0, 10)}.json`;
}

export function exportBackup() {
  return {
    app: "pianyu",
    version: 1,
    exportedAt: new Date().toISOString(),
    quotes: loadStore(),
    dict: loadDict(),
  };
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!data || data.app !== "pianyu") return { ok: false, error: "not_pianyu" };
  const quotes = Array.isArray(data.quotes?.quotes)
    ? data.quotes.quotes
    : Array.isArray(data.quotes)
      ? data.quotes
      : null;
  if (!quotes) return { ok: false, error: "invalid" };
  const dict =
    data.dict && typeof data.dict === "object"
      ? data.dict
      : { version: 1, scenes: {}, moods: {} };
  return { ok: true, quotes, dict };
}

export function applyBackup(parsed) {
  const result = appendQuotes(parsed.quotes);
  mergeDict(parsed.dict);
  return result;
}

function isWeChat() {
  return /MicroMessenger/i.test(navigator.userAgent || "");
}

export async function downloadBackup(data) {
  const json = JSON.stringify(data);
  const file = new File([json], backupFileName(data.exportedAt), { type: "application/json" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "片语备份" });
      return { ok: true, via: "share" };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, error: "abort" };
    }
  }
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, via: "download", wechat: isWeChat() };
  } catch {
    return { ok: false, error: "download", wechat: isWeChat() };
  }
}
