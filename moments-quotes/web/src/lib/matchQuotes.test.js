import { test } from "node:test";
import assert from "node:assert/strict";
import { matchQuotes } from "./matchQuotes.js";

const q = (id, scenes, mood, createdAt) => ({
  id,
  text: id,
  scenes,
  mood,
  createdAt,
});

const quotes = [
  q("a", ["夜色城市"], "松弛治愈", 3),
  q("b", ["夜色城市"], "孤独丧", 2),
  q("c", ["美食"], "松弛治愈", 1),
  q("d", ["旅行"], "热血励志", 0),
];

test("high when both axes hit", () => {
  const r = matchQuotes(quotes, { scene: "夜色城市", mood: "松弛治愈" });
  assert.equal(r.level, "high");
  assert.equal(r.recommended[0].id, "a");
  assert.ok(r.related.length >= 1);
});

test("mid when only scene hits", () => {
  const r = matchQuotes(quotes, { scene: "旅行", mood: "松弛治愈" });
  assert.equal(r.level, "mid");
});

test("low and all quotes when look failed", () => {
  const r = matchQuotes(quotes, { failed: true });
  assert.equal(r.level, "low");
  assert.equal(r.related.length, 4);
});

test("empty library", () => {
  const r = matchQuotes([], { scene: "美食", mood: "幽默俏皮" });
  assert.equal(r.related.length, 0);
});
