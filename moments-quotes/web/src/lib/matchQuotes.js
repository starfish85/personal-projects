export function matchQuotes(quotes, imageTags) {
  const sorted = (quotes || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  if (!sorted.length) {
    return {
      level: "low",
      recommended: [],
      related: [],
      title: "库是空的，现在配不出句子。",
    };
  }

  const scene = imageTags?.scene;
  const mood = imageTags?.mood;
  const failed = imageTags?.failed;

  if (failed || !scene) {
    return {
      level: "low",
      recommended: sorted.slice(0, 3),
      related: sorted,
      title: "这张图暂时对不上分类，先从全部里面挑",
    };
  }

  const layer1 = sorted.filter((q) => q.scenes.includes(scene) && q.mood === mood);
  const layer2 = sorted.filter((q) => q.scenes.includes(scene));
  const layer3 = sorted.filter((q) => q.mood === mood);

  let level = "low";
  let related = sorted;
  if (layer1.length && scene !== "其他" && mood !== "其他") {
    level = "high";
    related = sorted.filter((q) => q.scenes.includes(scene) || q.mood === mood);
    if (!related.length) related = sorted;
  } else if (layer2.length || layer3.length) {
    level = "mid";
    related = layer2.length ? layer2 : layer3;
  }

  const recommended = [];
  const seen = new Set();
  for (const layer of [layer1, layer2, layer3, sorted]) {
    for (const q of layer) {
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      recommended.push(q);
      if (recommended.length === 3) break;
    }
    if (recommended.length === 3) break;
  }

  let title = "比较适合这张图的几句";
  if (level === "low") {
    title =
      related === sorted
        ? "这张图暂时对不上分类，先从全部里面挑"
        : "没找到特别贴的，先按分类看";
  }

  return { level, recommended, related, title };
}
