const KEY = "pianyu.quotes.v1";

function emptyState() {
  return { version: 1, quotes: [] };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.quotes)) {
      console.warn("片语：本地库损坏，已当作空库");
      return emptyState();
    }
    return { version: 1, quotes: parsed.quotes };
  } catch {
    console.warn("片语：本地库损坏，已当作空库");
    return emptyState();
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function charLen(text) {
  return [...text].length;
}

export function normalizeText(text) {
  return String(text || "").replace(/^\s+|\s+$/g, "");
}

export function listQuotes() {
  return loadStore().quotes.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function newQuoteId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asQuote(raw, id) {
  const now = Date.now();
  const scenes = Array.isArray(raw?.scenes) ? raw.scenes.filter((s) => typeof s === "string" && s) : [];
  return {
    id,
    text: normalizeText(raw?.text),
    scenes: scenes.length ? scenes : ["其他"],
    mood: typeof raw?.mood === "string" && raw.mood ? raw.mood : "其他",
    sceneUserSet: Boolean(raw?.sceneUserSet),
    moodUserSet: Boolean(raw?.moodUserSet),
    createdAt: Number(raw?.createdAt) || now,
    updatedAt: Number(raw?.updatedAt) || now,
    useCount: Number(raw?.useCount) || 0,
    lastUsedAt: raw?.lastUsedAt ?? null,
  };
}

export function addQuote(text) {
  const normalized = normalizeText(text);
  if (!normalized) return { ok: false, error: "empty" };
  if (charLen(normalized) > 500) return { ok: false, error: "too_long" };
  const store = loadStore();
  if (store.quotes.some((q) => normalizeText(q.text) === normalized)) {
    return { ok: false, error: "duplicate" };
  }
  const now = Date.now();
  const quote = asQuote(
    {
      text: normalized,
      scenes: ["其他"],
      mood: "其他",
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      lastUsedAt: null,
    },
    newQuoteId(),
  );
  store.quotes.unshift(quote);
  writeStore(store);
  return { ok: true, quote };
}

export function appendQuotes(incoming) {
  const list = Array.isArray(incoming) ? incoming : [];
  const store = loadStore();
  const texts = new Set(store.quotes.map((q) => normalizeText(q.text)));
  const ids = new Set(store.quotes.map((q) => q.id));
  let added = 0;
  let skipped = 0;
  for (const raw of list) {
    const text = normalizeText(raw?.text);
    if (!text || charLen(text) > 500) {
      skipped += 1;
      continue;
    }
    if (texts.has(text)) {
      skipped += 1;
      continue;
    }
    let id = String(raw?.id || "").trim() || newQuoteId();
    if (ids.has(id)) id = newQuoteId();
    const quote = asQuote({ ...raw, text }, id);
    store.quotes.push(quote);
    texts.add(text);
    ids.add(id);
    added += 1;
  }
  if (added) writeStore(store);
  return { added, skipped };
}

export function updateQuote(id, patch) {
  const store = loadStore();
  const quote = store.quotes.find((q) => q.id === id);
  if (!quote) return { ok: false, error: "missing" };
  Object.assign(quote, patch, { updatedAt: Date.now() });
  writeStore(store);
  return { ok: true, quote };
}

export function removeQuote(id) {
  const store = loadStore();
  store.quotes = store.quotes.filter((q) => q.id !== id);
  writeStore(store);
  return { ok: true };
}

export function applyClassify(id, result) {
  const store = loadStore();
  const quote = store.quotes.find((q) => q.id === id);
  if (!quote) return { ok: false };
  if (!quote.sceneUserSet) {
    quote.scenes = Array.isArray(result.scenes) && result.scenes.length ? result.scenes : ["其他"];
  }
  if (!quote.moodUserSet) {
    quote.mood = result.mood || "其他";
  }
  quote.updatedAt = Date.now();
  writeStore(store);
  return { ok: true, quote };
}

export function markUsed(id) {
  const store = loadStore();
  const quote = store.quotes.find((q) => q.id === id);
  if (!quote) return;
  quote.useCount = (quote.useCount || 0) + 1;
  quote.lastUsedAt = Date.now();
  writeStore(store);
}
