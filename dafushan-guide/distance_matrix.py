import json
import sys
from pathlib import Path
from data_loader import load_pois, load_graph
from astar import astar, snap_to_road
from geo_utils import grid_to_lat_lng, haversine

sys.stdout.reconfigure(encoding="utf-8")

DATA_DIR = Path(__file__).parent.parent / "data"


def _path_distance(path, gw, gh):
    points = [grid_to_lat_lng(x, y, gw, gh) for (x, y) in path]
    dist = 0.0
    for j in range(1, len(points)):
        dist += haversine(points[j - 1], points[j])
    return round(dist)


def build_distance_matrix(only_attractions=True):
    pois = load_pois()
    gw, gh, cells = load_graph()

    if only_attractions:
        candidates = [p for p in pois if p["type"] in ["attraction", "exit"]]
    else:
        candidates = pois

    poi_cells = {}
    for p in candidates:
        snapped = snap_to_road(p, gw, gh, cells)
        if snapped and snapped.get("cell"):
            poi_cells[p["id"]] = snapped["cell"]

    print(f"成功吸附到路网的景点: {len(poi_cells)} / {len(candidates)}", flush=True)

    matrix = {}
    ids = list(poi_cells.keys())

    for i, a_id in enumerate(ids):
        matrix[a_id] = {}
        for b_id in ids:
            if a_id == b_id:
                continue
            path = astar(poi_cells[a_id], poi_cells[b_id], gw, gh, cells)
            matrix[a_id][b_id] = _path_distance(path, gw, gh) if path else None
        if (i + 1) % 10 == 0:
            print(f"已完成 {i + 1} / {len(ids)}", flush=True)

    return matrix, poi_cells

if __name__ == "__main__":
    matrix, poi_cells = build_distance_matrix(only_attractions=True)

    out_path = DATA_DIR / "distance_matrix.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(matrix, f, ensure_ascii=False, indent=2)

    print("\n示例距离:")
    print(f"南门 → 聚秀湖: {matrix.get('gate-south', {}).get('juxiu')} 米")
    print(f"南门 → 百花园: {matrix.get('gate-south', {}).get('baihua')} 米")
    print(f"南门 → 烽火台: {matrix.get('gate-south', {}).get('fenghuotai')} 米")
    print(f"matrix 的键: {list(matrix.keys())[:10]}")
    print(f"gate-south 在不在: {'gate-south' in matrix}")
    print(f"gate-south 的子键: {list(matrix.get('gate-south', {}).keys())[:5]}")

    total = sum(len(v) for v in matrix.values())
    reachable = sum(1 for v in matrix.values() for d in v.values() if d is not None)
    print(f"\n总计算: {total} 对, 可达: {reachable}, 不可达: {total - reachable}")

    asym=0
    for a in matrix:
        for b in matrix[a]:
            if matrix[a][b] is not None and matrix[b].get(a) is not None and matrix[a][b] != matrix[b][a]:
                if abs(matrix[a][b] - matrix[b][a]) > 5:
                    asym += 1
    print(f"不对称的距离对: {asym}")