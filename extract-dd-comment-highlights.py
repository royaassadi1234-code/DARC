from __future__ import annotations

import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile


SOURCE = Path("pdf-output/dd-comments-aligned-with-english.docx")
TARGET = Path("dd-comment-highlights.json")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def cell_text(cell: ET.Element) -> str:
    paragraphs = []
    for paragraph in cell.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def repair_text(value: str) -> str:
    try:
        return value.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return value


def repair_list(values: list[str]) -> list[str]:
    return [repair_text(value) for value in values]


def extract_rows() -> list[dict[str, str]]:
    with ZipFile(SOURCE) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    rows = []
    table_rows = root.findall(".//w:tbl/w:tr", NS)
    for row in table_rows[1:]:
        cells = [cell_text(cell) for cell in row.findall("./w:tc", NS)]
        if len(cells) != 7:
            continue

        location, page, words, passage, persian_comment, english_comment, title = cells
        rows.append({
            "location": repair_text(location),
            "pdfPage": repair_text(page),
            "highlightedWords": repair_list([word.strip() for word in words.split(";") if word.strip()]),
            "translationPassage": repair_text(passage),
            "persianComment": repair_text(persian_comment),
            "englishComment": repair_text(english_comment),
            "title": repair_text(title)
        })

    return rows


def main() -> None:
    TARGET.write_text(
        json.dumps(extract_rows(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )


if __name__ == "__main__":
    main()
