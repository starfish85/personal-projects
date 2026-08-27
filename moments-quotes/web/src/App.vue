<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { SCENES, MOODS } from "./lib/taxonomy.js";
import {
  addQuote,
  applyClassify,
  listQuotes,
  removeQuote,
  updateQuote,
} from "./lib/quotes.js";
import { classifyText, lookImage } from "./lib/api.js";
import { prepareImage } from "./lib/image.js";
import { matchQuotes } from "./lib/matchQuotes.js";
import { classifyFromDictionary, learnFromCorrection } from "./lib/dictionary.js";

const page = ref("home");
const homePane = ref("cover");
const fromPane = ref("cover");
const quotes = ref([]);
const draft = ref("");
const saveLock = ref(false);
const toastMsg = ref("");
const toastOn = ref(false);
let toastTimer = 0;

const filterScene = ref("全部");
const filterMood = ref("全部");
const classifying = ref({});
const suggestions = ref({});

const editing = ref(null);
const confirmDel = ref(false);

const match = ref({
  fileName: "",
  thumb: "",
  loading: false,
  failMsg: "",
  result: null,
  seq: 0,
});

const draftLen = computed(() => [...draft.value].length);
const saveDisabled = computed(() => !draft.value.trim() || draftLen.value > 500);

const visibleQuotes = computed(() => {
  return quotes.value.filter((q) => {
    const sOk = filterScene.value === "全部" || q.scenes.includes(filterScene.value);
    const mOk = filterMood.value === "全部" || q.mood === filterMood.value;
    return sOk && mOk;
  });
});

function refresh() {
  quotes.value = listQuotes();
}

function toast(msg) {
  toastMsg.value = msg;
  toastOn.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastOn.value = false;
  }, 2000);
}

function setHome(pane) {
  homePane.value = pane;
  if (pane === "write") nextTick(() => document.getElementById("draft")?.focus());
}

function goMatch() {
  fromPane.value = homePane.value === "list" ? "list" : "cover";
  page.value = "match";
}

function goHome() {
  page.value = "home";
  homePane.value = fromPane.value;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制，去微信粘贴就行");
  } catch {
    toast("长按句子自己复制");
  }
}

async function saveDraft() {
  if (saveLock.value || saveDisabled.value) return;
  saveLock.value = true;
  const res = addQuote(draft.value);
  if (!res.ok) {
    saveLock.value = false;
    if (res.error === "empty") toast("先写一句");
    else if (res.error === "too_long") toast("最多 500 字");
    else if (res.error === "duplicate") toast("库里已有这句");
    return;
  }
  draft.value = "";
  refresh();
  toast("记下了，确认一下分类");
  setHome("list");
  nextTick(() => document.getElementById("lib-list")?.scrollTo({ top: 0 }));
  classifying.value = { ...classifying.value, [res.quote.id]: true };
  const learned = classifyFromDictionary(res.quote.text);
  if (learned.sceneHit && learned.moodHit) {
    applyClassify(res.quote.id, { scenes: learned.scenes, mood: learned.mood });
  } else {
    try {
      const tagged = await classifyText(res.quote.text);
      const fallback = tagged.ok === false ? { scenes: ["其他"], mood: "其他" } : tagged;
      applyClassify(res.quote.id, {
        scenes: learned.sceneHit ? learned.scenes : fallback.scenes,
        mood: learned.moodHit ? learned.mood : fallback.mood,
      });
      if (!learned.sceneHit && tagged.ok && tagged.suggestions?.length) {
        suggestions.value = { ...suggestions.value, [res.quote.id]: tagged.suggestions };
      }
    } catch {
      applyClassify(res.quote.id, {
        scenes: learned.sceneHit ? learned.scenes : ["其他"],
        mood: learned.moodHit ? learned.mood : "其他",
      });
    }
  }
  const nextC = { ...classifying.value };
  delete nextC[res.quote.id];
  classifying.value = nextC;
  refresh();
  saveLock.value = false;
}

function suggestAxis(value) {
  const sceneOnly = SCENES.includes(value) && !MOODS.includes(value);
  const moodOnly = MOODS.includes(value) && !SCENES.includes(value);
  if (sceneOnly) return "scene";
  if (moodOnly) return "mood";
  return null;
}

function pendingSuggest(q) {
  const all = suggestions.value[q.id] || [];
  return all.filter((s) => {
    const axis = suggestAxis(s);
    if (axis === "scene") return !q.sceneUserSet;
    if (axis === "mood") return !q.moodUserSet;
    return false;
  });
}

function adoptSuggest(id, value) {
  const q = quotes.value.find((x) => x.id === id);
  if (!q) return;
  const axis = suggestAxis(value);
  if (!axis) return;
  const patch = {};
  if (axis === "scene") {
    patch.scenes = [value];
    patch.sceneUserSet = true;
  } else {
    patch.mood = value;
    patch.moodUserSet = true;
  }
  updateQuote(id, patch);
  const left = (suggestions.value[id] || []).filter((s) => s !== value);
  const next = { ...suggestions.value, [id]: left };
  if (!left.length) delete next[id];
  suggestions.value = next;
  refresh();
  const now = quotes.value.find((x) => x.id === id);
  if (now?.sceneUserSet && now?.moodUserSet) {
    learnFromCorrection(now.text, {
      addScenes: now.scenes,
      addMood: now.mood,
      removeScenes: q.scenes,
      removeMood: q.mood,
    });
    const cleared = { ...suggestions.value };
    delete cleared[id];
    suggestions.value = cleared;
  }
}

function openEdit(id) {
  const q = quotes.value.find((x) => x.id === id);
  if (!q) return;
  editing.value = { ...q, scenes: [...q.scenes] };
  confirmDel.value = false;
}

function toggleScene(s) {
  const e = editing.value;
  if (!e) return;
  if (s === "其他") {
    e.scenes = ["其他"];
    return;
  }
  let next = e.scenes.filter((x) => x !== "其他");
  if (next.includes(s)) next = next.filter((x) => x !== s);
  else if (next.length < 2) next = [...next, s];
  else next = [next[1], s];
  e.scenes = next.length ? next : ["其他"];
}

function saveEdit() {
  const text = editing.value.text.trim();
  if (!text) {
    toast("先写一句");
    return;
  }
  if ([...text].length > 500) {
    toast("最多 500 字");
    return;
  }
  const orig = quotes.value.find((x) => x.id === editing.value.id);
  const sceneChanged = orig.scenes.join() !== editing.value.scenes.join();
  const moodChanged = orig.mood !== editing.value.mood;
  if (sceneChanged || moodChanged) {
    learnFromCorrection(text, {
      addScenes: sceneChanged ? editing.value.scenes : [],
      addMood: moodChanged ? editing.value.mood : undefined,
      removeScenes: sceneChanged ? orig.scenes : [],
      removeMood: moodChanged ? orig.mood : undefined,
    });
  }
  updateQuote(editing.value.id, {
    text,
    scenes: editing.value.scenes,
    mood: editing.value.mood,
    sceneUserSet: sceneChanged ? true : orig.sceneUserSet,
    moodUserSet: moodChanged ? true : orig.moodUserSet,
  });
  editing.value = null;
  refresh();
}

function doDelete() {
  removeQuote(editing.value.id);
  editing.value = null;
  confirmDel.value = false;
  refresh();
}

let swipeY = null;
let swipeMoved = 0;
function eventY(e) {
  if (e.touches?.[0]) return e.touches[0].clientY;
  if (e.changedTouches?.[0]) return e.changedTouches[0].clientY;
  return e.clientY;
}
function onCoverDown(e) {
  swipeY = eventY(e);
  swipeMoved = 0;
}
function onCoverMove(e) {
  if (swipeY == null) return;
  const dy = eventY(e) - swipeY;
  swipeMoved = Math.max(swipeMoved, Math.abs(dy));
  if (Math.abs(dy) > 8 && e.cancelable) e.preventDefault();
}
function onCoverUp(e) {
  if (swipeY == null) return;
  const dy = eventY(e) - swipeY;
  swipeY = null;
  if (dy < -36) setHome("list");
}
function onSunClick() {
  if (swipeMoved > 24) return;
  setHome("write");
}
function onCoverWheel(e) {
  if (e.deltaY > 24) setHome("list");
}
function onListDown(e) {
  if (editing.value) return;
  swipeY = eventY(e);
  swipeMoved = 0;
}
function onListMove(e) {
  if (editing.value || swipeY == null) return;
  swipeMoved = Math.max(swipeMoved, Math.abs(eventY(e) - swipeY));
}
function onListUp(e) {
  if (editing.value) return;
  if (swipeY == null) return;
  const dy = eventY(e) - swipeY;
  swipeY = null;
  const list = document.getElementById("lib-list");
  if (list && list.scrollTop <= 0 && dy > 48) setHome("cover");
  swipeY = null;
}

async function onPickFile(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = "";
  if (!file) return;
  const seq = ++match.value.seq;
  const prepared = await prepareImage(file);
  if (seq !== match.value.seq) return;
  if (!prepared.ok) {
    match.value.failMsg = prepared.error === "too_large" ? "图片太大了，换一张试试。" : "这张图看不了，换一张 jpg 或 png 试试。";
    match.value.loading = false;
    match.value.result = matchQuotes(quotes.value, { failed: true });
    return;
  }
  match.value.thumb = URL.createObjectURL(prepared.file);
  match.value.loading = true;
  match.value.failMsg = "";
  match.value.result = null;
  try {
    const looked = await lookImage(prepared.file);
    if (seq !== match.value.seq) return;
    match.value.loading = false;
    if (!looked.ok) {
      match.value.failMsg = looked.error === "unsupported" ? "这张图看不了，换一张 jpg 或 png 试试。" : "这次没看清，下面先按分类给你看。";
      match.value.result = matchQuotes(quotes.value, { failed: true });
      return;
    }
    match.value.result = matchQuotes(quotes.value, { scene: looked.scene, mood: looked.mood });
  } catch {
    if (seq !== match.value.seq) return;
    match.value.loading = false;
    match.value.failMsg = "这次没看清，下面先按分类给你看。";
    match.value.result = matchQuotes(quotes.value, { failed: true });
  }
}

onMounted(refresh);
</script>

<template>
  <div class="app" :class="page === 'home' ? 'is-' + homePane : ''">
    <header v-if="page === 'match'" class="topbar">
      <button class="back" type="button" @click="goHome">← 返回</button>
      <h1>按图配文</h1>
      <span class="spacer"></span>
    </header>

    <div v-show="page === 'home'" class="home-stack">
      <div
        class="cover"
        @pointerdown="onCoverDown"
        @pointermove="onCoverMove"
        @pointerup="onCoverUp"
        @touchstart.passive="onCoverDown"
        @touchmove="onCoverMove"
        @touchend="onCoverUp"
        @wheel.passive="onCoverWheel"
      >
        <div class="sun-field" aria-hidden="true">
          <span class="sun-ray"></span>
          <span class="sun-ray r2"></span>
          <span class="sun-ray r3"></span>
          <span class="sun-ray r4"></span>
        </div>
        <button class="sun" type="button" aria-label="记下一句" @click="onSunClick"></button>
        <button class="cover-match" type="button" @click="goMatch">按图配文</button>
        <button class="cover-open-list" type="button" aria-label="查看句子" @click="setHome('list')">
          <span class="chev"></span>
        </button>
      </div>

      <div class="write-pane">
        <div class="write-glow">
          <textarea id="draft" v-model="draft" maxlength="500" placeholder="把想发的那句话贴在这里"></textarea>
          <div class="write-actions">
            <button class="btn btn-text" type="button" @click="setHome('cover')">收起</button>
            <button class="btn btn-primary" type="button" :disabled="saveDisabled" @click="saveDraft">保存</button>
          </div>
        </div>
      </div>

      <div
        class="list-pane"
        @pointerdown="onListDown"
        @pointermove="onListMove"
        @pointerup="onListUp"
        @touchstart.passive="onListDown"
        @touchend="onListUp"
      >
        <div class="list-handle" @click="setHome('cover')">下滑回到太阳</div>
        <div v-if="quotes.length" class="filters">
          <select v-model="filterScene">
            <option value="全部">场景 全部</option>
            <option v-for="s in SCENES" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="filterMood">
            <option value="全部">情绪 全部</option>
            <option v-for="m in MOODS" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div id="lib-list" class="list">
          <div v-if="!quotes.length" class="empty">还没有金句。<br />下滑回到太阳，点一下记下。</div>
          <div v-else-if="!visibleQuotes.length" class="empty">
            这个分类下还没有句子。<br />
            <button class="btn btn-text" type="button" @click="filterScene = '全部'; filterMood = '全部'">换成全部</button>
          </div>
          <div v-for="q in visibleQuotes" :key="q.id" class="card" @click="openEdit(q.id)">
            <p class="card-quote clamp">{{ q.text }}</p>
            <div class="card-foot">
              <div class="tags">
                <span v-if="classifying[q.id]" class="tag wait">分类中…</span>
                <template v-else>
                  <span v-for="s in q.scenes" :key="s" class="tag">{{ s }}</span>
                  <span class="tag">{{ q.mood }}</span>
                </template>
              </div>
              <button class="btn btn-text" type="button" @click.stop="copyText(q.text)">复制</button>
            </div>
            <div v-if="pendingSuggest(q).length" class="suggest">
              <button
                v-for="s in pendingSuggest(q)"
                :key="s"
                class="chip"
                type="button"
                @click.stop="adoptSuggest(q.id, s)"
              >
                建议：{{ s }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section v-if="page === 'match'" class="match-page">
      <div class="match-body">
        <template v-if="!quotes.length">
          <div class="empty">
            库是空的，现在配不出句子。<br />
            <button class="btn btn-primary" type="button" style="margin-top: 12px" @click="fromPane = 'cover'; goHome(); setHome('write')">
              返回记一句
            </button>
          </div>
        </template>
        <template v-else>
          <label v-if="!match.thumb" class="upload">
            <strong>上传一张朋友圈图</strong>
            <span>从自己的句子里配</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden @change="onPickFile" />
          </label>
          <div v-else class="thumb-row">
            <div class="thumb" :style="match.thumb ? { backgroundImage: `url(${match.thumb})`, backgroundSize: 'cover' } : {}"></div>
            <div>
              <div>{{ match.loading ? "正在看图找句子…" : match.failMsg || "从这张图里找句子" }}</div>
              <label class="btn btn-text">
                换一张
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden @change="onPickFile" />
              </label>
            </div>
          </div>
          <template v-if="match.loading">
            <div class="sk"></div>
            <div class="sk"></div>
          </template>
          <template v-else-if="match.result">
            <div v-if="match.failMsg" class="banner-in">{{ match.failMsg }}</div>
            <h2 class="block">{{ match.result.title }}</h2>
            <div v-for="q in match.result.recommended" :key="'r-' + q.id" class="rec">
              <div class="card">
                <p class="card-quote">{{ q.text }}</p>
              </div>
              <button class="btn btn-primary copy-btn" type="button" @click="copyText(q.text)">复制</button>
            </div>
            <h2 class="block">相关分类里的全部文案</h2>
            <div v-for="q in match.result.related" :key="'l-' + q.id" class="rec">
              <div class="card">
                <p class="card-quote">{{ q.text }}</p>
              </div>
              <button class="btn btn-primary copy-btn" type="button" @click="copyText(q.text)">复制</button>
            </div>
          </template>
        </template>
      </div>
    </section>

    <button v-if="page === 'home' && !editing" class="fab" type="button" @click="goMatch">按图配文</button>
    <div class="toast" :class="{ show: toastOn }">{{ toastMsg }}</div>

    <div
      v-if="editing"
      class="overlay"
      @pointerdown.stop
      @pointerup.stop
      @click.self="editing = null"
    >
      <div v-if="confirmDel" class="confirm">
        <p>删除这句？删除后配图时不会再出现。</p>
        <div class="row">
          <button class="btn btn-danger" type="button" @click="doDelete">删除</button>
          <button class="btn btn-primary" type="button" @click="confirmDel = false">取消</button>
        </div>
      </div>
      <div v-else class="sheet" @click.stop>
        <h3>编辑金句</h3>
        <textarea v-model="editing.text" maxlength="500" rows="4"></textarea>
        <div class="counter">{{ [...editing.text].length }}/500</div>
        <div style="font-size: 13px; margin-bottom: 6px; color: var(--muted)">场景（1～2 个）</div>
        <div class="chip-set">
          <button
            v-for="s in SCENES"
            :key="s"
            type="button"
            class="pick"
            :class="{ on: editing.scenes.includes(s) }"
            @pointerdown.stop
            @click.stop="toggleScene(s)"
          >
            {{ s }}
          </button>
        </div>
        <div style="font-size: 13px; margin-bottom: 6px; color: var(--muted)">情绪（选 1 个）</div>
        <div class="chip-set">
          <button
            v-for="m in MOODS"
            :key="m"
            type="button"
            class="pick"
            :class="{ on: editing.mood === m }"
            @pointerdown.stop
            @click.stop="editing.mood = m"
          >
            {{ m }}
          </button>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-danger" type="button" @click="confirmDel = true">删除</button>
          <button class="btn btn-primary" type="button" @click="saveEdit">保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>
