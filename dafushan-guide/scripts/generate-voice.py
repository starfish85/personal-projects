#!/usr/bin/env python3
"""按简介全文生成景点语音（读完才结束）。"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY_JS = ROOT / "src/data/copy.js"
POIS_JS = ROOT / "src/data/pois.js"
OUT_DIR = ROOT / "public/audio/poi"
VOICE = "Tingting"
RATE = "170"


def facility_intro(name: str, typ: str) -> str:
    if typ == "toilet":
        return (
            f"{name}。园内主要活动区都配了公厕，部分靠近出入口的还规划了无障碍设施。"
            "请按标识进出，地面潮湿时扶好。具体开放、是否有人值守以现场为准。"
        )
    if typ == "food":
        return (
            f"{name}。南门、北门和部分湖区、花园附近规划了餐饮点，方便走累了吃饭喝水。"
            "营业时间和菜品以当天档口为准，也可自带水和点心。"
        )
    return f"{name}。请按现场标识使用。"


def parse_copy() -> dict[str, str]:
    text = COPY_JS.read_text(encoding="utf-8")
    found: dict[str, str] = {}
    for match in re.finditer(
        r"(?:'([^']+)'|([A-Za-z0-9-]+)):\s*\{\s*intro:\s*\n\s*'((?:\\'|[^'])*)'",
        text,
    ):
        key = match.group(1) or match.group(2)
        intro = match.group(3).replace("\\'", "'")
        found[key] = intro
    return found


def parse_spots() -> list[tuple[str, str, str]]:
    text = POIS_JS.read_text(encoding="utf-8")
    return re.findall(r"spot\('([^']+)',\s*'([^']+)',\s*'([^']+)'", text)


def synth(text: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        aiff = Path(tmp) / "clip.aiff"
        subprocess.run(
            ["say", "-v", VOICE, "-r", RATE, "-o", str(aiff), text],
            check=True,
        )
        subprocess.run(
            [
                "afconvert",
                "-f",
                "m4af",
                "-d",
                "aac",
                "-b",
                "48000",
                str(aiff),
                str(dest),
            ],
            check=True,
        )


def main() -> int:
    copy = parse_copy()
    spots = parse_spots()
    if not spots:
        print("no spots parsed", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    missing = []
    for poi_id, name, typ in spots:
        text = copy.get(poi_id) or facility_intro(name, typ)
        if not text.strip():
            missing.append(poi_id)
            continue
        dest = OUT_DIR / f"{poi_id}.m4a"
        print(f"say {poi_id} ({len(text)}字) -> {dest.name}")
        synth(text, dest)
    for old in OUT_DIR.glob("*.wav"):
        old.unlink()
        print("removed", old.name)
    print(f"done {len(spots)} clips, missing {missing}")
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
