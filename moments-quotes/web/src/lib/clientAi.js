import { SCENES, MOODS } from "./taxonomy.js";

const REAL_SCENES = SCENES.filter((s) => s !== "其他");

function cleanScenes(input) {
  const unique = [];
  for (const s of Array.isArray(input) ? input : []) {
    if (SCENES.includes(s) && !unique.includes(s)) unique.push(s);
  }
  const real = unique.filter((s) => s !== "其他").slice(0, 2);
  return real.length ? real : ["其他"];
}

export function fakeClassify(text) {
  const t = String(text || "");
  const scenes = [];
  if (/吃|饭|粥|咖啡|火锅|美食/.test(t)) scenes.push("美食");
  if (/夜|灯|月亮/.test(t)) scenes.push("夜色城市");
  if (/山|川|海|旅行|路/.test(t)) scenes.push("旅行", "风景自然");
  if (/猫|狗|宠物/.test(t)) scenes.push("宠物");
  if (/班|工作|周一/.test(t)) scenes.push("工作学习");
  const cleaned = cleanScenes(scenes);
  let mood = "松弛治愈";
  if (/笑|哈哈|再想人生/.test(t)) mood = "幽默俏皮";
  if (/你来|想你|风很轻/.test(t)) mood = "浪漫暧昧";
  if (/不适合说话|不想|丧/.test(t)) mood = "孤独丧";
  if (/加油|冲/.test(t)) mood = "热血励志";
  const confident = cleaned[0] !== "其他";
  return {
    ok: true,
    scenes: cleaned,
    mood: confident ? mood : "其他",
    sceneConfident: confident,
    moodConfident: confident,
    suggestions: confident ? [] : ["日常生活", "松弛治愈"].filter((x) => REAL_SCENES.includes(x) || MOODS.includes(x)),
  };
}
