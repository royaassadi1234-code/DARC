from __future__ import annotations

import json
import re
from pathlib import Path


OCR_SOURCE = Path("dd2mahshid-ocr-all.json")
TARGET = Path("dd2mahshid-persian-translations.json")

QUESTION_RE = re.compile(r"\u067e\u0631\u0633\u0634\s*([\u06f0-\u06f9\u0660-\u06690-9]+)")
STANDALONE_NUMBER_RE = re.compile(r"(?<![\w.])(\d+)(?!\w)")


def normalize_digits(value: str) -> str:
    digits = []
    for char in value:
        if "0" <= char <= "9":
            digits.append(char)
        elif "\u06f0" <= char <= "\u06f9":
            digits.append(str(ord(char) - ord("\u06f0")))
        elif "\u0660" <= char <= "\u0669":
            digits.append(str(ord(char) - ord("\u0660")))
        else:
            digits.append(char)
    return "".join(digits)


def prefix_question_numbers(chapter: str, text: str) -> str:
    text = normalize_digits(text)

    def replace(match: re.Match[str]) -> str:
        number = str(int(match.group(1)))
        before = text[: match.start()]
        if re.search(r"\u067e\u0631\u0633\u0634\s*$", before):
            return number
        return f"{chapter}.{number}"

    return STANDALONE_NUMBER_RE.sub(replace, text)


def find_page_markers(text: str) -> list[dict]:
    return [
        {
            "chapter": normalize_digits(match.group(1)).lstrip("0") or "0",
            "start": match.start(),
        }
        for match in QUESTION_RE.finditer(text)
    ]


def add_text_part(translations: dict[str, dict], chapter: str, page_number: int, text: str) -> None:
    text = text.strip()
    if not text:
        return
    translation = translations.setdefault(
        chapter,
        {
            "chapter": chapter,
            "source": "DD2Mahshid.PDF OCR",
            "sourcePdf": "pdf-output/DD2Mahshid.PDF",
            "ocrNote": "OCR text from scanned Persian translation; review against page image before citation.",
            "pdfPages": [],
            "textParts": [],
        },
    )
    if page_number not in translation["pdfPages"]:
        translation["pdfPages"].append(page_number)
    translation["textParts"].append(text)


def split_page_text(page: dict) -> list[dict]:
    text = page.get("text") or ""
    markers = find_page_markers(text)
    markers = [marker for marker in markers if marker["chapter"] != "0"]
    if not markers:
        return []

    chunks = []
    for index, marker in enumerate(markers):
        end = markers[index + 1]["start"] if index + 1 < len(markers) else len(text)
        chunk = text[marker["start"]:end].strip()
        if chunk:
            chunks.append(
                {
                    "chapter": marker["chapter"],
                    "text": chunk,
                    "pdfPage": page["pdfPage"],
                }
            )
    return chunks


def main() -> None:
    pages = json.loads(OCR_SOURCE.read_text(encoding="utf-8"))
    translations: dict[str, dict] = {}
    current_chapter = ""

    for page in pages:
        text = page.get("text") or ""
        markers = [marker for marker in find_page_markers(text) if marker["chapter"] != "0"]
        if not markers:
            if current_chapter:
                add_text_part(translations, current_chapter, page["pdfPage"], text)
            continue

        if current_chapter and markers[0]["start"] > 0:
            add_text_part(translations, current_chapter, page["pdfPage"], text[: markers[0]["start"]])

        for index, marker in enumerate(markers):
            current_chapter = marker["chapter"]
            end = markers[index + 1]["start"] if index + 1 < len(markers) else len(text)
            add_text_part(translations, current_chapter, page["pdfPage"], text[marker["start"]:end])

    output = {}
    for chapter in sorted(translations, key=lambda value: int(value)):
        entry = translations[chapter]
        output[chapter] = {
            "chapter": entry["chapter"],
            "source": entry["source"],
            "sourcePdf": entry["sourcePdf"],
            "ocrNote": entry["ocrNote"],
            "pdfPages": entry["pdfPages"],
            "text": prefix_question_numbers(chapter, "\n\n".join(entry["textParts"])),
        }

    TARGET.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TARGET} with {len(output)} detected question translations from {len(pages)} OCR pages.")


if __name__ == "__main__":
    main()
