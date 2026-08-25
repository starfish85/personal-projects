#!/usr/bin/env python3
"""按简介全文生成景点语音（读完才结束）。

默认生成中文。英文：python3 scripts/generate-voice.py --lang en
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY_JS = ROOT / "src/data/copy.js"
POIS_JS = ROOT / "src/data/pois.js"
AUDIO_DIR = ROOT / "public/audio"

ZH_VOICE = "Tingting"
EN_VOICE = "Samantha"
ZH_RATE = "170"
EN_RATE = "165"

EN_NAMES = {
    "wc-north": "North Gate restroom",
    "wc-cuijing": "Cuijing Lake restroom",
    "wc-hetang": "Lotus Pond restroom",
    "wc-danche": "Bike Station restroom",
    "wc-siji": "Four-Season Cedar restroom",
    "wc-wugan": "Five Senses Garden restroom",
    "wc-junzi": "Junzi Garden restroom",
    "wc-qinxiang": "Qinxiang Garden restroom",
    "wc-qinxiang2": "Qinxiang Garden restroom",
    "wc-kepu": "Nature Trail restroom",
    "wc-huatian": "Flower Field restroom",
    "wc-yuchang": "Forest Bath restroom",
    "wc-weitang": "Fishing Garden restroom",
    "wc-zhiwu": "Botanical Garden restroom",
    "wc-zijing": "Bauhinia restroom",
    "wc-yingyue": "Moonlight Lotus Pond restroom",
    "wc-conglin": "Jungle Adventure restroom",
    "wc-shanlin": "Cedar Boardwalk restroom",
    "wc-lansheng": "Scenic Trail restroom",
    "wc-juxiu": "Juxiu Lake restroom",
    "wc-juxiutai": "Juxiu Terrace restroom",
    "wc-bandao": "Peninsula restroom",
    "wc-kongque": "Peacock Garden restroom",
    "wc-huxin": "Lake Pavilion restroom",
    "wc-fengshan": "Fengshan Hall restroom",
    "wc-south": "South Gate restroom",
    "wc-southwest": "Southwest Gate restroom",
    "food-north": "North Gate snacks",
    "food-qinxiang": "Qinxiang Garden snacks",
    "food-zuomei": "Zuomei Lake snacks",
    "food-huatian": "Flower Field snacks",
    "food-baihua": "Hundred-Flower Garden snacks",
    "food-caizhai": "Picking Garden snacks",
    "food-south": "South Gate snacks",
}

NAV_EN = [
    ("nav-plan", "Planning your route."),
    ("nav-soon", "You are approaching your destination."),
    ("nav-arrived", "You have arrived."),
    ("nav-left", "Turn left."),
    ("nav-right", "Turn right."),
    ("nav-uturn", "Make a U-turn."),
    ("nav-forward", "Continue straight ahead."),
]


def facility_intro_zh(name: str, typ: str) -> str:
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


def facility_intro_en(name: str, typ: str) -> str:
    if typ == "toilet":
        return (
            f"{name}. Public toilets are located throughout the main visitor areas. "
            "Some near the gates are planned to be accessible. Please follow the signs. "
            "Watch your step if the floor is wet. Opening hours and staffing may vary."
        )
    if typ == "food":
        return (
            f"{name}. Snack spots are planned near the South Gate, North Gate, "
            "and some lakes and gardens. Hours and menus depend on the stall that day. "
            "You may also bring your own water and snacks."
        )
    return f"{name}. Please follow the signs on site."


def parse_copy_field(field: str) -> dict[str, str]:
    text = COPY_JS.read_text(encoding="utf-8")
    start = text.find("export const COPY")
    end = text.find("export function facilityIntro")
    block = text[start:end] if start >= 0 and end > start else text
    found: dict[str, str] = {}
    for match in re.finditer(
        r"(?:'([^']+)'|([A-Za-z0-9-]+)):\s*\{([^}]*)\}",
        block,
        flags=re.S,
    ):
        key = match.group(1) or match.group(2)
        body = match.group(3)
        item = re.search(rf"{field}:\s*\n\s*'((?:\\'|[^'])*)'", body)
        if item:
            found[key] = item.group(1).replace("\\'", "'")
    return found


def parse_spots() -> list[tuple[str, str, str]]:
    text = POIS_JS.read_text(encoding="utf-8")
    return re.findall(r"spot\('([^']+)',\s*'([^']+)',\s*'([^']+)'", text)


def say_to_aiff(text: str, aiff: Path, voice: str, rate: str) -> None:
    subprocess.run(
        ["say", "-v", voice, "-r", rate, "-o", str(aiff), text],
        check=True,
    )


def synth_m4a(text: str, dest: Path, voice: str, rate: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        aiff = Path(tmp) / "clip.aiff"
        say_to_aiff(text, aiff, voice, rate)
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


def synth_wav(text: str, dest: Path, voice: str, rate: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        aiff = Path(tmp) / "clip.aiff"
        say_to_aiff(text, aiff, voice, rate)
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16", str(aiff), str(dest)],
            check=True,
        )


def generate_zh() -> int:
    copy = parse_copy_field("intro")
    spots = parse_spots()
    if not spots:
        print("no spots parsed", file=sys.stderr)
        return 1
    out_dir = AUDIO_DIR / "poi"
    out_dir.mkdir(parents=True, exist_ok=True)
    missing = []
    for poi_id, name, typ in spots:
        text = copy.get(poi_id) or facility_intro_zh(name, typ)
        if not text.strip():
            missing.append(poi_id)
            continue
        dest = out_dir / f"{poi_id}.m4a"
        print(f"say {poi_id} ({len(text)}字) -> {dest.name}")
        synth_m4a(text, dest, ZH_VOICE, ZH_RATE)
    for old in out_dir.glob("*.wav"):
        old.unlink()
        print("removed", old.name)
    print(f"done {len(spots)} clips, missing {missing}")
    return 0 if not missing else 1


def generate_en() -> int:
    copy = parse_copy_field("introEn")
    spots = parse_spots()
    if not spots:
        print("no spots parsed", file=sys.stderr)
        return 1
    out_dir = AUDIO_DIR / "en" / "poi"
    out_dir.mkdir(parents=True, exist_ok=True)
    missing = []
    for poi_id, name, typ in spots:
        if poi_id in copy:
            text = copy[poi_id]
        else:
            text = facility_intro_en(EN_NAMES.get(poi_id, name), typ)
        if not text.strip():
            missing.append(poi_id)
            continue
        dest = out_dir / f"{poi_id}.m4a"
        print(f"say-en {poi_id} ({len(text)} chars) -> en/poi/{dest.name}")
        synth_m4a(text, dest, EN_VOICE, EN_RATE)
    nav_dir = AUDIO_DIR / "en"
    for clip, phrase in NAV_EN:
        dest = nav_dir / f"{clip}.wav"
        print(f"say-en {clip} -> en/{dest.name}")
        synth_wav(phrase, dest, EN_VOICE, EN_RATE)
    print(f"done {len(spots)} poi + {len(NAV_EN)} nav, missing introEn {missing}")
    return 0 if not missing else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", choices=("zh", "en"), default="zh")
    args = parser.parse_args()
    if args.lang == "en":
        return generate_en()
    return generate_zh()


if __name__ == "__main__":
    raise SystemExit(main())
