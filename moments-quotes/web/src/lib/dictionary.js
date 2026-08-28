const KEY = "pianyu.dict.v1";
const STOP = new Set("的了是在有和我就都也与及这那不一吗呢啊吧着过得地么你他她它们又还把被让给到从对而或".split(""));

function emptyDict() {
  return { version: 1, scenes: {}, moods: {} };
}

export function loadDict() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDict();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.scenes !== "object") return emptyDict();
    return { version: 1, scenes: parsed.scenes || {}, moods: parsed.moods || {} };
  } catch {
    return emptyDict();
  }
}

function saveDict(dict) {
  localStorage.setItem(KEY, JSON.stringify(dict));
}

function mergeBag(target, source) {
  if (!source || typeof source !== "object") return;
  for (const [word, weight] of Object.entries(source)) {
    const n = Number(weight);
    if (!word || !Number.isFinite(n) || n === 0) continue;
    bump(target, word, n);
  }
}

export function mergeDict(incoming) {
  if (!incoming || typeof incoming !== "object") return;
  const dict = loadDict();
  for (const [label, bag] of Object.entries(incoming.scenes || {})) {
    if (!label) continue;
    dict.scenes[label] ||= {};
    mergeBag(dict.scenes[label], bag);
  }
  for (const [label, bag] of Object.entries(incoming.moods || {})) {
    if (!label) continue;
    dict.moods[label] ||= {};
    mergeBag(dict.moods[label], bag);
  }
  saveDict(dict);
}

export function extractKeywords(text) {
  const t = String(text || "").replace(/\s+/g, "");
  const found = [];
  const seen = new Set();
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= t.length - n; i++) {
      const gram = t.slice(i, i + n);
      if (![...gram].every((ch) => /[\u4e00-\u9fff]/.test(ch))) continue;
      if ([...gram].every((ch) => STOP.has(ch))) continue;
      if (seen.has(gram)) continue;
      seen.add(gram);
      found.push(gram);
      if (found.length >= 8) return found;
    }
  }
  return found;
}

function bump(bag, word, delta) {
  const next = (bag[word] || 0) + delta;
  if (next <= 0) delete bag[word];
  else bag[word] = next;
}

export function learnFromCorrection(text, { addScenes = [], addMood, removeScenes = [], removeMood } = {}) {
  const words = extractKeywords(text);
  if (!words.length) return;
  const dict = loadDict();
  for (const scene of addScenes) {
    if (!scene || scene === "其他") continue;
    dict.scenes[scene] ||= {};
    for (const w of words) bump(dict.scenes[scene], w, 1);
  }
  if (addMood && addMood !== "其他") {
    dict.moods[addMood] ||= {};
    for (const w of words) bump(dict.moods[addMood], w, 1);
  }
  for (const scene of removeScenes) {
    if (!dict.scenes[scene]) continue;
    for (const w of words) bump(dict.scenes[scene], w, -1);
  }
  if (removeMood && dict.moods[removeMood]) {
    for (const w of words) bump(dict.moods[removeMood], w, -1);
  }
  saveDict(dict);
}

function scoreBag(bag, text) {
  if (!bag) return 0;
  let score = 0;
  for (const [word, weight] of Object.entries(bag)) {
    if (word && text.includes(word)) score += weight;
  }
  return score;
}

export function classifyFromDictionary(text) {
  const t = String(text || "");
  const dict = loadDict();
  const sceneScores = Object.entries(dict.scenes).map(([label, bag]) => [label, scoreBag(bag, t)]);
  const moodScores = Object.entries(dict.moods).map(([label, bag]) => [label, scoreBag(bag, t)]);
  sceneScores.sort((a, b) => b[1] - a[1]);
  moodScores.sort((a, b) => b[1] - a[1]);
  const scenes = sceneScores.filter(([, s]) => s >= 1).slice(0, 2).map(([label]) => label);
  const mood = moodScores[0]?.[1] >= 1 ? moodScores[0][0] : null;
  return {
    sceneHit: scenes.length > 0,
    moodHit: Boolean(mood),
    scenes: scenes.length ? scenes : ["其他"],
    mood: mood || "其他",
  };
}
