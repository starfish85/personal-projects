import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { applyBackup, parseBackup } from "./backup.js";
import { listQuotes } from "./quotes.js";
import { classifyFromDictionary } from "./dictionary.js";

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

test("parseBackup rejects other apps and broken json", () => {
  assert.equal(parseBackup("{").ok, false);
  assert.equal(parseBackup(JSON.stringify({ app: "rike", quotes: [] })).ok, false);
  assert.equal(parseBackup(JSON.stringify({ app: "pianyu" })).ok, false);
});

test("applyBackup appends and skips existing text", () => {
  mem["pianyu.quotes.v1"] = JSON.stringify({
    version: 1,
    quotes: [{ id: "local", text: "本地已有", scenes: ["其他"], mood: "其他", createdAt: 1 }],
  });
  const parsed = parseBackup(
    JSON.stringify({
      app: "pianyu",
      quotes: {
        version: 1,
        quotes: [
          { id: "local", text: "备份新句", scenes: ["旅行"], mood: "松弛治愈", createdAt: 2 },
          { id: "dup", text: "本地已有", scenes: ["美食"], mood: "幽默俏皮", createdAt: 3 },
        ],
      },
      dict: { scenes: { 旅行: { 海边: 1 } }, moods: {} },
    }),
  );
  assert.equal(parsed.ok, true);
  const result = applyBackup(parsed);
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 1);
  const texts = listQuotes().map((q) => q.text).sort();
  assert.deepEqual(texts, ["备份新句", "本地已有"]);
  assert.equal(listQuotes().find((q) => q.text === "本地已有").mood, "其他");
  assert.ok(classifyFromDictionary("去海边").scenes.includes("旅行"));
});
