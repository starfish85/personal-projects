import heapq
import math

from geo_utils import grid_to_lat_lng, haversine, lat_lng_to_xy

NEIGHBORS = [
    (1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
    (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414),
]

GATE_IDS = ["gate-north", "gate-east", "gate-south", "gate-southwest"]

def astar(start, goal, grid_w, grid_h, walk_cells):
    def cell_id(x, y):
        return y * grid_w + x

    if cell_id(*start) not in walk_cells:
        return None
    if cell_id(*goal) not in walk_cells:
        return None

    def heuristic(x, y):
        return math.hypot(x - goal[0], y - goal[1])

    open_heap = [(heuristic(*start), 0.0, start)]
    came_from = {}
    g_score = {start: 0.0}

    while open_heap:
        _, g, current = heapq.heappop(open_heap)

        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()
            return path

        cx, cy = current
        for dx, dy, step in NEIGHBORS:
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < grid_w and 0 <= ny < grid_h):
                continue
            if cell_id(nx, ny) not in walk_cells:
                continue
            if dx != 0 and dy != 0:
                # 对角线移动时，确保不穿过障碍
                if cell_id(cx + dx, cy) not in walk_cells or cell_id(cx, cy + dy) not in walk_cells:
                    continue

            tentative = g + step
            if tentative < g_score.get((nx, ny), float("inf")):
                came_from[(nx, ny)] = current
                g_score[(nx, ny)] = tentative
                f = tentative + heuristic(nx, ny)
                heapq.heappush(open_heap, (f, tentative, (nx, ny)))

    return None


def snap_cell(gx, gy, grid_w, grid_h, walk_cells):
    cx = max(0, min(grid_w - 1, round(gx)))
    cy = max(0, min(grid_h - 1, round(gy)))
    if (cy * grid_w + cx) in walk_cells:
        return (cx, cy)

    best = (cx, cy)
    best_d = float("inf")
    for cid in walk_cells:
        wx = cid % grid_w
        wy = cid // grid_w
        d = (wx - cx) ** 2 + (wy - cy) ** 2
        if d < best_d:
            best_d = d
            best = (wx, wy)
    return best


def snap_to_road(point, grid_w, grid_h, walk_cells):
    if point is None:
        return None

    if "x" in point and "y" in point:
        x, y = float(point["x"]), float(point["y"])
    else:
        xy = lat_lng_to_xy(point)
        x, y = xy["x"], xy["y"]

    if not (math.isfinite(x) and math.isfinite(y)):
        return None

    gx = x * (grid_w - 1)
    gy = y * (grid_h - 1)
    cx, cy = snap_cell(gx, gy, grid_w, grid_h, walk_cells)
    lat_lng = grid_to_lat_lng(cx, cy, grid_w, grid_h)
    return {"lat": lat_lng["lat"], "lng": lat_lng["lng"], "cell": (cx, cy)}


def _nearest_gate(point, poi_map):
    best = None
    best_d = float("inf")
    for gid in GATE_IDS:
        gate = poi_map.get(gid)
        if not gate:
            continue
        d = haversine(point, gate)
        if d < best_d:
            best_d = d
            best = gate
    return best

def build_route(from_point, dest_poi_id, pois, grid_w, grid_h, walk_cells):
    poi_map = {p["id"]: p for p in pois}
    dest = poi_map.get(dest_poi_id)
    if not dest:
        return None

    end = snap_to_road(dest, grid_w, grid_h, walk_cells)
    if not end:
        return None

    starts = []
    if from_point:
        starts.append(snap_to_road(from_point, grid_w, grid_h, walk_cells))

    gate = _nearest_gate(from_point or dest, poi_map)
    if gate:
        starts.append(snap_to_road(gate, grid_w, grid_h, walk_cells))

    south_gate = poi_map.get("gate-south")
    if south_gate:
        starts.append(snap_to_road(south_gate, grid_w, grid_h, walk_cells))

    cells = None
    for start in starts:
        if not start or not start.get("cell"):
            continue
        cells = astar(start["cell"], end["cell"], grid_w, grid_h, walk_cells)
        if cells and len(cells) > 0:
            break

    if not cells or len(cells) == 0:
        return None

    points = [grid_to_lat_lng(x, y, grid_w, grid_h) for (x, y) in cells]

    if from_point and haversine(from_point, points[0]) < 40:
        points.insert(0, from_point)
    if haversine(dest, points[-1]) < 40:
        points.append(dest)

    distance = 0.0
    for i in range(1, len(points)):
        distance += haversine(points[i - 1], points[i])

    return {"points": points, "distance": distance, "dest": dest, "cells": cells}