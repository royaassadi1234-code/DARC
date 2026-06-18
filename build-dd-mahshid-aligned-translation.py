from __future__ import annotations

import json
import re
from pathlib import Path


SOURCE_TEXT = Path("Dd.txt")
ENGLISH_TRANSLATION = Path("DD-en.txt")
MAHSHID_TRANSLATION = Path("dd2mahshid-persian-translations.json")
TARGET = Path("DD-mahshid-aligned.txt")


def parse_locations(path: Path) -> list[str]:
    locations = []
    for line in path.read_text(encoding="utf-8").splitlines():
        section = re.match(r"^([0-9]+(?:\.[0-9]+[a-z]?)*)(?:\s|$)", line.strip())
        if section:
            locations.append(section.group(1))
    return locations


def parse_translation_text(path: Path) -> dict[str, str]:
    translations = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "\t" not in line:
            continue
        location, text = line.split("\t", 1)
        location = location.strip()
        if location and text.strip():
            translations[location] = text.strip()
    return translations


def location_sort_key(location: str) -> list[object]:
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", location)]


def split_mahshid_by_location(source_locations: set[str]) -> dict[str, str]:
    data = json.loads(MAHSHID_TRANSLATION.read_text(encoding="utf-8"))
    aligned: dict[str, list[str]] = {}

    for chapter in sorted(data, key=lambda value: int(value)):
        text = str(data[chapter].get("text", "")).strip()
        if not text:
            continue

        marker_re = re.compile(rf"(?<!\d)({re.escape(chapter)}\.\d+[a-z]?)(?!\d)")
        markers = [
            match
            for match in marker_re.finditer(text)
            if match.group(1) in source_locations
        ]

        default_location = f"{chapter}.1"
        if default_location in source_locations:
            first_start = markers[0].start() if markers else len(text)
            preface = text[:first_start].strip()
            if preface:
                aligned.setdefault(default_location, []).append(preface)

        for index, marker in enumerate(markers):
            location = marker.group(1)
            start = marker.end()
            end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
            passage = text[start:end].strip(" \t\r\n.:،؛")
            if passage:
                aligned.setdefault(location, []).append(passage)

    return {
        location: " ".join(parts)
        for location, parts in sorted(aligned.items(), key=lambda item: location_sort_key(item[0]))
    }


def main() -> None:
    source_locations = parse_locations(SOURCE_TEXT)
    source_location_set = set(source_locations)
    english = parse_translation_text(ENGLISH_TRANSLATION)
    mahshid = split_mahshid_by_location(source_location_set)

    output_lines = []
    for location in source_locations:
        question = int(location.split(".", 1)[0]) if location.split(".", 1)[0].isdigit() else 0
        text = mahshid.get(location) if question >= 41 else english.get(location)
        if text:
            output_lines.append(f"{location}\t{text}")

    TARGET.write_text("\n".join(output_lines) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET} with {len(output_lines)} aligned translation rows.")
    print(f"Mahshid rows aligned: {len(mahshid)}")


if __name__ == "__main__":
    main()
