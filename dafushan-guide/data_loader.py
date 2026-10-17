import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def load_pois():
    with open(DATA_DIR / "pois.json", encoding="utf-8") as f:
        return json.load(f)

def load_graph():
    with open(DATA_DIR/"walking_graph.json", encoding="utf-8") as f:
        data = json.load(f)
    grid_w = data["GRID_W"]
    grid_h = data["GRID_H"]
    walk_cells = set(data["WALK_CELLS"])
    return grid_w, grid_h, walk_cells