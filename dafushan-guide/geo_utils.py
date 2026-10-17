import math

MAP_BOUNDS = {
    "south": 22.935968,
    "north": 22.969383,
    "west": 113.285833,
    "east": 113.325694,
}


def xy_to_lat_lng(x, y):
    """归一化坐标 (0-1) → 经纬度"""
    lat = MAP_BOUNDS["north"] - y * (MAP_BOUNDS["north"] - MAP_BOUNDS["south"])
    lng = MAP_BOUNDS["west"] + x * (MAP_BOUNDS["east"] - MAP_BOUNDS["west"])
    return {"lat": lat, "lng": lng}


def lat_lng_to_xy(point):
    """经纬度 → 归一化坐标 (0-1)"""
    x = (point["lng"] - MAP_BOUNDS["west"]) / (MAP_BOUNDS["east"] - MAP_BOUNDS["west"])
    y = (MAP_BOUNDS["north"] - point["lat"]) / (MAP_BOUNDS["north"] - MAP_BOUNDS["south"])
    return {"x": x, "y": y}


def grid_to_lat_lng(gx, gy, grid_w, grid_h):
    """网格坐标 → 经纬度"""
    return xy_to_lat_lng(gx / (grid_w - 1), gy / (grid_h - 1))


def lat_lng_to_grid_xy(point, grid_w, grid_h):
    """经纬度 → 网格浮点坐标"""
    xy = lat_lng_to_xy(point)
    return xy["x"] * (grid_w - 1), xy["y"] * (grid_h - 1)


def haversine(a, b):
    """计算两点间的地球表面距离（米）"""
    R = 6371000
    to_rad = math.radians
    d_lat = to_rad(b["lat"] - a["lat"])
    d_lng = to_rad(b["lng"] - a["lng"])
    lat1 = to_rad(a["lat"])
    lat2 = to_rad(b["lat"])
    h = (math.sin(d_lat / 2) ** 2
         + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2)
    return 2 * R * math.asin(min(1, math.sqrt(h)))