from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


SOURCE = Path("dd 1.pdf")
TARGET = Path("dd-pdf-translations.json")

TRANSLATION_HEADER = re.compile(r"T\s*R\s*A\s*N\s*S\s*L\s*A\s*T\s*I\s*O\s*N\s*:", re.IGNORECASE)
MARKER = re.compile(r"\((Int\.\s*\d+|[0-9IlS]+\s*\.\s*[0-9IlS]+[a-z]?)\s*\)")


def normalize_marker(value: str) -> str:
    value = re.sub(r"\s+", "", value)
    value = value.replace("Int.", "Int.")
    if not value.startswith("Int."):
        value = value.replace("I", "1").replace("l", "1").replace("S", "5")
    return value


def clean_text(value: str) -> str:
    value = value.replace("\u00ad\n", "")
    value = value.replace("-\n", "")
    value = value.replace("\n", " ")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"\s+QUESTION\s+\d+\s*$", "", value, flags=re.IGNORECASE)
    return value.strip()


def extract_translation_segment(page_text: str) -> str:
    match = TRANSLATION_HEADER.search(page_text)
    if not match:
        return ""
    return page_text[match.end():]


def extract_translations() -> dict[str, dict[str, object]]:
    reader = PdfReader(str(SOURCE))
    entries: dict[str, dict[str, object]] = {}
    current_key = ""

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        segment = extract_translation_segment(text)
        if not segment:
            continue

        matches = list(MARKER.finditer(segment))
        if current_key and matches:
            continuation = clean_text(segment[:matches[0].start()])
            if continuation:
                entries[current_key]["translation"] = f"{entries[current_key]['translation']} {continuation}".strip()
        elif current_key and not matches:
            continuation = clean_text(segment)
            if continuation:
                entries[current_key]["translation"] = f"{entries[current_key]['translation']} {continuation}".strip()

        for index, match in enumerate(matches):
            key = normalize_marker(match.group(1))
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(segment)
            passage = clean_text(segment[start:end])
            if not passage:
                current_key = key
                continue

            if key in entries:
                entries[key]["translation"] = f"{entries[key]['translation']} {passage}".strip()
                entries[key]["pdfPages"].append(page_index)
            else:
                entries[key] = {
                    "location": key,
                    "translation": passage,
                    "pdfPages": [page_index],
                }
            current_key = key

    for entry in entries.values():
        entry["pdfPages"] = sorted(set(entry["pdfPages"]))

    return entries


def main() -> None:
    entries = extract_translations()
    TARGET.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TARGET} with {len(entries)} translation passages.")


if __name__ == "__main__":
    main()
