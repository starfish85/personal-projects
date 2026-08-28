import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { appendQuotes, charLen, listQuotes, normalizeText } from "./quotes.js";

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

test("normalizeText strips ends", () => {
  assert.equal(normalizeText("  你好  \n"), "你好");
});

test("charLen counts unicode", () => {
  assert.equal(charLen("人间烟火气"), 5);
});

test("appendQuotes adds new sentences and skips duplicates", () => {
  appendQuotes([{ id: "a", text: "先有一句" }]);
  const result = appendQuotes([
    { id: "a", text: "另一句不同的" },
    { id: "b", text: "  先有一句  " },
    { id: "c", text: "第三句" },
  ]);
  assert.equal(result.added, 2);
  assert.equal(result.skipped, 1);
  const texts = listQuotes().map((q) => q.text).sort();
  assert.deepEqual(texts, ["另一句不同的", "先有一句", "第三句"].sort());
  assert.equal(new Set(listQuotes().map((q) => q.id)).size, 3);
});
