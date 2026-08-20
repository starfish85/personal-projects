#!/usr/bin/env python3
"""从规划图提取除红色轮廓外的彩色路网，写出 src/data/roads.js"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/maps/park.jpg"
OUT = ROOT / "src/data/roads.js"


def is_red(r, g, b):
    return r >= 150 and g <= 95 and b <= 95 and r >= g + 65 and r >= b + 65


def is_route(r, g, b):
    if is_red(r, g, b):
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    sat = 0 if mx == 0 else (mx - mn) / mx
    if sat < 0.22 or (r + g + b) / 3 > 232:
        return False
    # 图上的紫/洋红主路
    mag = r >= 140 and b >= 110 and g <= 140 and (r - g) >= 40 and (b - g) >= 12
    mag2 = r >= 110 and b >= 100 and 35 <= g <= 120 and (r - g) >= 28 and (b - g) >= 18
    # 橙色、褐色小路
    ora = r >= 150 and 65 <= g <= 170 and b <= 100 and (r - g) >= 22 and (r - b) >= 48
    # 少量黄线，排除成片黄底
    yel = r >= 190 and g >= 155 and b <= 85 and (r - b) >= 110 and sat >= 0.4
    return mag or mag2 or ora or yel


def dilate(grid, times=1):
    h, w = len(grid), len(grid[0])
    cur = grid
    for _ in range(times):
        nxt = [row[:] for row in cur]
        for y in range(h):
            for x in range(w):
                if not cur[y][x]:
                    continue
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            nxt[ny][nx] = 1
        cur = nxt
    return cur


def components(grid):
    h, w = len(grid), len(grid[0])
    seen = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if not grid[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for dx, dy in (
                    (1, 0),
                    (-1, 0),
                    (0, 1),
                    (0, -1),
                    (1, 1),
                    (1, -1),
                    (-1, 1),
                    (-1, -1),
                ):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and grid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            comps.append(cells)
    return comps


def drop_blobs(grid, max_area):
    for cells in components(grid):
        if len(cells) > max_area:
            for x, y in cells:
                grid[y][x] = 0
    return grid


def neighbors8(grid, x, y):
    h, w = len(grid), len(grid[0])
    pts = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                pts.append(grid[ny][nx])
            else:
                pts.append(0)
    # p2 top, clockwise
    return [pts[1], pts[2], pts[4], pts[7], pts[6], pts[5], pts[3], pts[0]]


def zhang_suen(grid):
    h, w = len(grid), len(grid[0])
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            mark = []
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if not grid[y][x]:
                        continue
                    n = neighbors8(grid, x, y)
                    b = sum(1 for v in n if v)
                    if b < 2 or b > 6:
                        continue
                    a = 0
                    for i in range(8):
                        if n[i] == 0 and n[(i + 1) % 8] == 1:
                            a += 1
                    if a != 1:
                        continue
                    if step == 0:
                        if n[0] * n[2] * n[4] != 0:
                            continue
                        if n[2] * n[4] * n[6] != 0:
                            continue
                    else:
                        if n[0] * n[2] * n[6] != 0:
                            continue
                        if n[0] * n[4] * n[6] != 0:
                            continue
                    mark.append((x, y))
            if mark:
                changed = True
                for x, y in mark:
                    grid[y][x] = 0
    return grid


def bridge(grid, maxd=10):
    h, w = len(grid), len(grid[0])
    changed = True
    while changed:
        changed = False
        comps = sorted(components(grid), key=len, reverse=True)
        if len(comps) <= 1:
            break
        main = comps[0]
        best = None
        for other in comps[1:]:
            if len(other) < 6:
                continue
            bd = 10**9
            pair = None
            for ax, ay in other[::2]:
                for bx, by in main[::3]:
                    d = abs(ax - bx) + abs(ay - by)
                    if d < bd:
                        bd = d
                        pair = ((ax, ay), (bx, by))
            if pair and bd <= maxd and (best is None or bd < best[0]):
                best = (bd, pair)
        if not best:
            break
        (ax, ay), (bx, by) = best[1]
        steps = max(abs(bx - ax), abs(by - ay), 1)
        for i in range(steps + 1):
            x = ax + round((bx - ax) * i / steps)
            y = ay + round((by - ay) * i / steps)
            if 0 <= x < w and 0 <= y < h:
                grid[y][x] = 1
        changed = True
    return grid


def main():
    src = Image.open(SRC).convert("RGB")
    W, H = 500, 399
    im = src.resize((W, H), Image.BILINEAR)
    px = im.load()
    walk = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            walk[y][x] = 1 if is_route(*px[x, y]) else 0
    walk = drop_blobs(walk, 800)
    walk = dilate(walk, 1)

    GW, GH = W // 2, H // 2
    grid = [[0] * GW for _ in range(GH)]
    for y in range(GH):
        for x in range(GW):
            if (
                walk[2 * y][2 * x]
                or walk[2 * y][min(2 * x + 1, W - 1)]
                or walk[min(2 * y + 1, H - 1)][2 * x]
                or walk[min(2 * y + 1, H - 1)][min(2 * x + 1, W - 1)]
            ):
                grid[y][x] = 1
    grid = bridge(grid, 12)
    grid = zhang_suen(grid)
    grid = dilate(grid, 1)
    grid = bridge(grid, 10)
    comps = components(grid)
    for cells_c in comps:
        if len(cells_c) < 40:
            for x, y in cells_c:
                grid[y][x] = 0
    comps = components(grid)
    cells = [y * GW + x for y in range(GH) for x in range(GW) if grid[y][x]]
    OUT.write_text(
        "// 从图上彩色路网提取，已排除红色轮廓。\n"
        f"export const GRID_W = {GW}\n"
        f"export const GRID_H = {GH}\n"
        f"export const WALK_CELLS = [{','.join(str(c) for c in cells)}]\n"
    )
    print("components", len(comps), "top", sorted((len(c) for c in comps), reverse=True)[:6])
    print("wrote", OUT, "cells", len(cells), "grid", GW, GH)


if __name__ == "__main__":
    main()
