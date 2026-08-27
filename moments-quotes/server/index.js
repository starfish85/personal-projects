import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import OpenAI from "openai";
import {
  SCENES,
  MOODS,
  cleanScenes,
  cleanMood,
  fakeClassify,
  fakeLook,
} from "./taxonomy.js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const PORT = Number(process.env.PORT || 8787);
const HOST = "127.0.0.1";
const FAKE = process.env.FAKE_AI !== "0";
const MODEL_TIMEOUT_MS = 8000;
const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, "../web/dist");

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true, fake: FAKE }));

app.post("/api/classify", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ ok: false, error: "missing_text" }, 400);

  if (FAKE || !process.env.XAI_API_KEY) {
    return c.json(fakeClassify(text));
  }
  try {
    const raw = await classifyWithModel(text);
    return c.json(raw);
  } catch {
    return c.json({
      ok: false,
      scenes: ["其他"],
      mood: "其他",
      sceneConfident: false,
      moodConfident: false,
      suggestions: [],
    });
  }
});

app.post("/api/look", async (c) => {
  const body = await c.req.parseBody();
  const file = body.image;
  if (!file || typeof file === "string") {
    return c.json({ ok: false, error: "missing_image" }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ ok: false, error: "too_large" });
  }
  const type = file.type || "";
  if (!/^image\/(jpeg|jpg|png)$/i.test(type) && !/\.(jpe?g|png)$/i.test(file.name || "")) {
    return c.json({ ok: false, error: "unsupported" });
  }

  if (FAKE || !process.env.XAI_API_KEY) {
    return c.json(fakeLook());
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    const mime = type.startsWith("image/") ? type : "image/jpeg";
    return c.json(await lookWithModel(b64, mime));
  } catch (err) {
    const failed = err?.name === "TimeoutError" || err?.code === "TIMEOUT";
    return c.json({ ok: false, error: failed ? "timeout" : "failed" });
  }
});

async function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => {
      const e = new Error("timeout");
      e.code = "TIMEOUT";
      reject(e);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

function client() {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
  });
}

const TAXONOMY_HINT = `场景只能从这些里选（金句1～2个，图恰好1个）：${SCENES.join("、")}。
情绪只能选1个：${MOODS.join("、")}。
不确定就用「其他」。不要写新文案，只返回 JSON。`;

async function classifyWithModel(text) {
  const resp = await withTimeout(
    client().chat.completions.create({
      model: "grok-4.6",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TAXONOMY_HINT },
        {
          role: "user",
          content: `给这句金句打标，JSON 字段：scenes(数组), mood, sceneConfident(布尔), moodConfident(布尔), suggestions(最多2个词表内建议)。\n${text}`,
        },
      ],
    }),
    MODEL_TIMEOUT_MS
  );
  const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
  const scenes = cleanScenes(parsed.scenes);
  const mood = cleanMood(parsed.mood);
  const suggestions = (parsed.suggestions || [])
    .filter((s) => SCENES.includes(s) || MOODS.includes(s))
    .slice(0, 2);
  return {
    ok: true,
    scenes,
    mood,
    sceneConfident: scenes[0] !== "其他",
    moodConfident: mood !== "其他",
    suggestions,
  };
}

async function lookWithModel(b64, mime) {
  const resp = await withTimeout(
    client().chat.completions.create({
      model: "grok-4.6",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TAXONOMY_HINT + "图只出1个场景字段 scene（字符串）和1个 mood。不要写文案。" },
        {
          role: "user",
          content: [
            { type: "text", text: "看这张图，返回 JSON：scene, mood。" },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
    MODEL_TIMEOUT_MS
  );
  const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
  const scenes = cleanScenes([parsed.scene]);
  return {
    ok: true,
    scene: scenes[0] || "其他",
    mood: cleanMood(parsed.mood),
  };
}

if (existsSync(join(DIST, "index.html"))) {
  app.use("/*", serveStatic({ root: DIST }));
  app.notFound((c) => {
    if (c.req.path.startsWith("/api")) {
      return c.json({ ok: false, error: "not_found" }, 404);
    }
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    return c.html(html);
  });
}

serve(
  {
    fetch: app.fetch,
    hostname: HOST,
    port: PORT,
    createServer,
  },
  (info) => {
    const mode = existsSync(join(DIST, "index.html")) ? "页面+接口" : "仅接口";
    console.log(`片语 ${mode}  http://${info.address}:${info.port}  FAKE_AI=${FAKE ? "1" : "0"}`);
  }
);
