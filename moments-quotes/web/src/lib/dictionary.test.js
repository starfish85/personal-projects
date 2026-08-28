import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { extractKeywords, learnFromCorrection, classifyFromDictionary, mergeDict } from "./dictionary.js";

const mem = {};
beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
  };
});

test("extracts chinese bigrams", () => {
  const words = extractKeywords("先吃饭，再想人生");
  assert.ok(words.includes("吃饭") || words.includes("人生"));
});

test("learned keywords classify later sentences", () => {
  learnFromCorrection("今晚路灯把夜色摊开", { addScenes: ["夜色城市"], addMood: "孤独丧" });
  const hit = classifyFromDictionary("路灯还亮着");
  assert.equal(hit.sceneHit, true);
  assert.ok(hit.scenes.includes("夜色城市"));
});

test("does not learn 其他", () => {
  learnFromCorrection("随便一句", { addScenes: ["其他"], addMood: "其他" });
  const hit = classifyFromDictionary("随便一句也好");
  assert.equal(hit.sceneHit, false);
  assert.equal(hit.moodHit, false);
});

test("mergeDict adds weights without wiping local words", () => {
  learnFromCorrection("今晚路灯把夜色摊开", { addScenes: ["夜色城市"], addMood: "孤独丧" });
  mergeDict({
    scenes: { 夜色城市: { 路灯: 2, 江风: 1 } },
    moods: { 松弛治愈: { 慢走: 1 } },
  });
  const night = classifyFromDictionary("路灯还亮着");
  assert.ok(night.scenes.includes("夜色城市"));
  const rest = classifyFromDictionary("慢走就好");
  assert.equal(rest.mood, "松弛治愈");
});
