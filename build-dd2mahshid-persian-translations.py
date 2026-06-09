from __future__ import annotations

import json
from pathlib import Path


OCR_SOURCE = Path("dd2mahshid-ocr-selected.json")
TARGET = Path("dd2mahshid-persian-translations.json")

CHAPTER_PAGES = {
    "41": [1],
    "47": [6, 7, 8, 9],
    "63": [19],
    "74": [26],
    "76": [27, 28, 29],
    "90": [38, 39],
    "92": [40, 41, 42],
}


def main() -> None:
    ocr_pages = {
        str(entry["pdfPage"]): entry
        for entry in json.loads(OCR_SOURCE.read_text(encoding="utf-8"))
    }
    translations = {}

    for chapter, pages in CHAPTER_PAGES.items():
        page_entries = [ocr_pages[str(page)] for page in pages if str(page) in ocr_pages]
        text = "\n\n".join(entry["text"] for entry in page_entries if entry.get("text"))
        translations[chapter] = {
            "chapter": chapter,
            "source": "DD2Mahshid.PDF OCR",
            "sourcePdf": "pdf-output/DD2Mahshid.PDF",
            "ocrNote": "OCR text from scanned Persian translation; review against page image before citation.",
            "pdfPages": pages,
            "text": text,
        }

    TARGET.write_text(
        json.dumps(translations, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TARGET} with {len(translations)} chapter translations.")


if __name__ == "__main__":
    main()
