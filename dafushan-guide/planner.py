import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

WALK_SPEED = 60.0

DEFAULT_VISIT_MIN = 15

STYLE_PRESETS = {
    "休闲漫游": {"speed": 50, "visit_coef": 1.3},
    "运动拉练": {"speed": 80, "visit_coef": 0.7},
    "亲子遛娃": {"speed": 40, "visit_coef": 1.5},
    "历史打卡": {"speed": 60, "visit_coef": 1.0},
}

def load_matrix():
    with open(DATA_DIR / "distance_matrix.json", encoding="utf-8") as f:
        return json.load(f)

def load_pois():
    with open(DATA_DIR / "pois.json", encoding="utf-8") as f:
        return json.load(f)

def dominate(a,b,eps=1e-9):
    if (a["score"] + eps < b["score"] or
        a["minutes"] - eps > b["minutes"] or
        a["meters"] - eps > b["meters"]):
        return False

    return (a["score"] > b["score"] + eps or
            a["minutes"] < b["minutes"] - eps or
            a["meters"] < b["meters"] - eps)

def pareto_filter(states):
    groups = {}
    for s in states:
        last=s["stops"][-1]
        visited = frozenset(s["stops"])
        key = (last, visited)
        groups.setdefault(key, []).append(s)
    result = []
    for group in groups.values():
        frontier = []
        for candidate in group:
            dominated = any(dominate(others, candidate) for others in group if others != candidate)
            if dominated:
                continue
            frontier.append(candidate)
        result.extend(frontier)
    return result

def jaccard(a, b):
    sa,sb = set(a["stops"]), set(b["stops"])
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)

def mmr_diversity(candidates,k=3,lambda_d=0.5):
    if not candidates:
        return []
    chosen = [candidates[0]]
    while len(chosen) < k and len(chosen) < len(candidates):
        best,best_mmr = None,float("-inf")
        for c in candidates:
            if c in chosen:
                continue
            sim = max(jaccard(c, prev) for prev in chosen)
            if sim > 0.7:
                continue
            mmr = c["score"] - lambda_d * sim
            if mmr > best_mmr:
                best = c
                best_mmr = mmr
        if best:
            chosen.append(best)
    return chosen

def plan_route(start_id, time_budget_min, interests=None, style=None,
                max_distance_m=None, matrix=None,pois=None):
    if matrix is None:
        matrix = load_matrix()
    if pois is None:
        pois = load_pois()

    preset = STYLE_PRESETS.get(style, {})
    walk_speed = preset.get("speed", WALK_SPEED)
    visit_coef = preset.get("visit_coef", 1.0)

    poi_map = {p["id"]: p for p in pois}
    interests = interests or []

    candidates = [
        p for p in pois
        if p["type"] == "attraction" and p["id"] != start_id
    ]

    def score(poi):
        tags = poi.get("tags", [])
        if not interests:
            return 1.0
        matched = sum(1 for t in tags if t in interests)
        tag_score = matched / len(interests)
        return tag_score + 0.01

    BEAM_WIDTH = 20
    MAX_STEPS = 6
    all_complete = []

    beam = [{
        "stops": [start_id],
        "meters": 0,
        "minutes": 0,
        "score": 0.0,
    }]

    for step in range(MAX_STEPS):
        next_beam = []
        for state in beam:
            last = state["stops"][-1]
            for poi in candidates:
                if poi["id"] in state["stops"]:
                    continue
                d = matrix.get(last, {}).get(poi["id"])
                if d is None:
                    continue

                walk_min = d / walk_speed
                # visit_min = poi.get("recommendMin") or default_visit
                base_min = poi.get("recommendMin") or DEFAULT_VISIT_MIN
                visit_min = base_min * visit_coef
                new_minutes = state["minutes"] + walk_min + visit_min

                if new_minutes > time_budget_min:
                    continue

                new_meters = state["meters"] + d
                if max_distance_m is not None and new_meters > max_distance_m:
                    continue

                new_state = {
                    "stops": state["stops"] + [poi["id"]],
                    "meters": new_meters,
                    "minutes": new_minutes,
                    "score": state["score"] + score(poi),
                }
                next_beam.append(new_state)
                all_complete.append(new_state)

        if not next_beam:
            break

        if not all_complete:
            return []

        frontier = pareto_filter(next_beam)

        frontier.sort(key=lambda x: x["score"], reverse=True)
        n_per = max(1,BEAM_WIDTH // 3)
        beam = frontier[:n_per]
        frontier.sort(key=lambda x: x["minutes"])
        for s in frontier:
            if s not in beam:
                beam.append(s)
                if len(beam) >= 2 * n_per:
                    break
        frontier.sort(key=lambda x: x["meters"])
        for s in frontier:
            if s not in beam:
                beam.append(s)
                if len(beam) >= BEAM_WIDTH:
                    break
    if not all_complete:
        return []
    global_frontier = pareto_filter(all_complete)
    global_frontier.sort(key=lambda x: x["score"], reverse=True)
    diverse = mmr_diversity(global_frontier,k=8,lambda_d=0.5)
    return [{
        "stops": s["stops"],
        "totalMeters": s["meters"],
        "totalMinutes": round(s["minutes"]),
        "score": round(s["score"], 2),
    } for s in diverse]

if __name__ == "__main__":
    pois = load_pois()
    matrix = load_matrix()

    for style in STYLE_PRESETS:
        result = plan_route("gate-south", 180, ["自然"], style=style,
                            matrix=matrix, pois=pois)
        print(f"=== {style}（步速{STYLE_PRESETS[style]['speed']}m/min) ===")
        for rank, route in enumerate(result, 1):
            print(f"  方案{rank}: {'→'.join(
                next((x['name'] for x in pois if x['id']==pid), pid)
                for pid in route['stops'])}")
            print(f"    时间{route['totalMinutes']}分 "
                  f"距离{route['totalMeters']}m 评分{route['score']}")
        print()