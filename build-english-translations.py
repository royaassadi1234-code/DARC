from __future__ import annotations

import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\u00ad\n", "")
    text = text.replace("\u00ad", "")
    text = re.sub(r"([A-Za-z])-[\r\n]+([A-Za-z])", r"\1\2", text)
    text = re.sub(r"\s+", " ", text)
    text = text.replace(" .", ".").replace(" ,", ",")
    return text.strip()


def dd_source_ids() -> set[str]:
    ids: set[str] = set()
    for line in (ROOT / "Dd.txt").read_text(encoding="utf-8").splitlines():
        match = re.match(r"^(\d+)\.(\d+)\t", line)
        if match:
            chapter, paragraph = match.groups()
            ids.add(f"{int(chapter)}.{int(paragraph)}")
    return ids


def wz_source_ids() -> set[str]:
    ids: set[str] = set()
    for line in (ROOT / "WZ.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        columns = line.split("\t")
        if len(columns) >= 2:
            ids.add(re.sub(r"^[A-Za-z]+\s+", "", columns[1].strip()))
    return ids


def normalize_dd_marker(marker: str) -> str | None:
    marker = marker.strip()
    intro = re.match(r"Int\.\s*([0-9]+)", marker, flags=re.I)
    if intro:
        return f"0.{int(intro.group(1))}"
    intro_ocr = re.match(r"Int\.\s*([0-9OIlS]+)", marker, flags=re.I)
    if intro_ocr:
        number = normalize_ocr_number(intro_ocr.group(1))
        return f"0.{int(number)}"
    marker = normalize_ocr_number(marker)
    regular = re.match(r"([0-9]+)\s*[\.,\\:]\s*([0-9]+)", marker)
    if regular:
        chapter, paragraph = regular.groups()
        return f"{int(chapter)}.{int(paragraph)}"
    return None


def normalize_ocr_number(value: str) -> str:
    return (
        value.replace("O", "0")
        .replace("o", "0")
        .replace("I", "1")
        .replace("l", "1")
        .replace("S", "5")
        .replace("s", "5")
    )


def dd_translation_segments() -> list[str]:
    root = ET.parse(ROOT / "pdf.xml").getroot()
    segments: list[str] = []
    translation_marker = re.compile(
        r"TR\s*AN\s*S\s*L\s*A\s*T\s*I(?:O|Q)N\s*:?\s*(?:INTRO\s*D(?:U|O)CTION|QUESTION)?[^()\n]*",
        flags=re.I,
    )
    for page in root.findall(".//page"):
        page_text = "\n".join((p.text or "") for p in page.findall(".//p"))
        match = translation_marker.search(page_text)
        if match:
            segments.append(page_text[match.end() :])
            continue
        fallback = re.search(
            r"\((?:Int\.\s*[0-9OIlS]+|[0-9OIlS]+\s*[\.,\\:]\s*[0-9OIlS]+)\)\s+"
            r"(?:The|If|As|And|Also|For|In|To|Because|When|At|It|This|He|One|These|Firstly|Secondly|Moreover|After|Then|Since|But)\b",
            page_text,
        )
        if fallback and fallback.start() > len(page_text) * 0.35:
            segments.append(page_text[fallback.start() :])
    return segments


def build_dd_translation() -> dict[str, str]:
    allowed_ids = dd_source_ids()
    marker = re.compile(r"\(((?:Int\.\s*[0-9OIlS]+)|(?:[0-9OIlS]+\s*[\.,\\:]\s*[0-9OIlS]+))\)", flags=re.I)
    records: dict[str, str] = {}
    current_id: str | None = None

    for segment in dd_translation_segments():
        segment = re.sub(r"\bQUESTION\s+[0-9A-Z]+\b", " ", segment, flags=re.I)
        matches = list(marker.finditer(segment))
        if not matches:
            if current_id:
                records[current_id] = clean_text(f"{records[current_id]} {segment}")
            continue

        prefix = segment[: matches[0].start()]
        if current_id and clean_text(prefix):
            records[current_id] = clean_text(f"{records[current_id]} {prefix}")

        for index, match in enumerate(matches):
            record_id = normalize_dd_marker(match.group(1))
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(segment)
            body = clean_text(segment[start:end])
            if not record_id or record_id not in allowed_ids or not body:
                continue
            records[record_id] = clean_text(f"{records.get(record_id, '')} {body}")
            current_id = record_id

    return records


def roman_to_int(value: str) -> int:
    value = value.upper()
    numerals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}
    total = 0
    previous = 0
    for char in reversed(value):
        number = numerals.get(char, 0)
        if number < previous:
            total -= number
        else:
            total += number
            previous = number
    return total


def parse_chapter_number(label: str) -> int | None:
    label = label.strip().upper()
    if label.isdigit():
        return int(label)
    if re.fullmatch(r"[IVXLCDM]+", label):
        return roman_to_int(label)
    return None


def build_wz_translation() -> dict[str, str]:
    allowed_ids = wz_source_ids()
    paragraphs = [p.text.strip() for p in Document(ROOT / "wz.docx").paragraphs if p.text.strip()]
    start = next((i for i, p in enumerate(paragraphs) if re.match(r"TRANSLATION:\s*CHAPTER\s+1\b", p, re.I)), 0)
    records: dict[str, str] = {}
    chapter = 0
    current_id: str | None = None

    preface_id = 1
    for raw in paragraphs[start:]:
        text = clean_text(raw)
        if not text:
            continue
        if re.match(r"^TRANSLATION:\s*CHAPTERS?\s+", text, re.I):
            continue
        heading = re.match(r"^CHAPTERS?\s+([0-9IVXLCDM]+)\b", text, re.I)
        if heading:
            parsed = parse_chapter_number(heading.group(1))
            if parsed is not None:
                chapter = parsed
                current_id = None
            continue
        if re.fullmatch(r"[0-9]+", text):
            continue
        if re.match(r"^(?:On|The)\b", text) and current_id is None:
            continue

        parts = list(re.finditer(r"\(([0-9]+)\)", text))
        if chapter == 0 and not parts:
            record_id = f"0.{preface_id}"
            if record_id in allowed_ids:
                records[record_id] = text
                current_id = record_id
                preface_id += 1
            continue
        if not parts:
            if current_id:
                records[current_id] = clean_text(f"{records[current_id]} {text}")
            continue

        prefix = text[: parts[0].start()]
        if current_id and prefix:
            records[current_id] = clean_text(f"{records[current_id]} {prefix}")

        for index, match in enumerate(parts):
            number = int(match.group(1))
            record_id = f"{chapter}.{number}"
            body_start = match.end()
            body_end = parts[index + 1].start() if index + 1 < len(parts) else len(text)
            body = clean_text(text[body_start:body_end])
            if record_id in allowed_ids and body:
                records[record_id] = clean_text(f"{records.get(record_id, '')} {body}")
                current_id = record_id

    return records


def write_records(path: Path, records: dict[str, str]) -> None:
    def sort_key(item: tuple[str, str]) -> tuple[int, int, str]:
        match = re.match(r"^(\d+)\.(\d+)", item[0])
        if match:
            return (int(match.group(1)), int(match.group(2)), item[0])
        return (10_000, 10_000, item[0])

    lines = [f"{location}\t{text}" for location, text in sorted(records.items(), key=sort_key)]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    dd_records = build_dd_translation()
    wz_records = build_wz_translation()
    write_records(ROOT / "DD-en.txt", dd_records)
    write_records(ROOT / "WZ-en.txt", wz_records)
    print(f"DD aligned records: {len(dd_records)}")
    print(f"WZ aligned records: {len(wz_records)}")


if __name__ == "__main__":
    main()
