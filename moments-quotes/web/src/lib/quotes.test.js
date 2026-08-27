import { test } from "node:test";
import assert from "node:assert/strict";
import { charLen, normalizeText } from "./quotes.js";

test("normalizeText strips ends", () => {
  assert.equal(normalizeText("  你好  \n"), "你好");
});

test("charLen counts unicode", () => {
  assert.equal(charLen("人间烟火气"), 5);
});
