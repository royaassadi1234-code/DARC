from __future__ import annotations

import json
import time
from pathlib import Path

import easyocr
import fitz


SOURCE = Path("pdf-output/DD2Mahshid.PDF")
TARGET = Path("dd2mahshid-ocr-selected.json")
IMAGE_DIR = Path("ocr-output/dd2mahshid")

# Persian translation PDF covers DD 41-90. These pages target the Druz-bearing
# chapters that are not covered by dd 1.pdf: 41, 47, 63, 74, 76, and 90.
SELECTED_PAGES = [1, 6, 7, 8, 9, 18, 19, 20, 26, 27, 28, 29, 38, 39, 40, 41, 42]


def render_page(document: fitz.Document, page_number: int, scale: float = 1.5) -> Path:
    page = document[page_number - 1]
    matrix = fitz.Matrix(scale, scale).prerotate(270)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    image_path = IMAGE_DIR / f"dd2mahshid-page-{page_number:03}.png"
    pixmap.save(image_path)
    return image_path


def main() -> None:
    document = fitz.open(SOURCE)
    reader = easyocr.Reader(["fa"], gpu=False, verbose=False)
    entries = []

    for page_number in SELECTED_PAGES:
        started = time.time()
        image_path = render_page(document, page_number)
        lines = reader.readtext(str(image_path), detail=0, paragraph=True, batch_size=8)
        text = "\n".join(line.strip() for line in lines if line.strip())
        entries.append({
            "pdfPage": page_number,
            "image": str(image_path).replace("\\", "/"),
            "text": text,
            "seconds": round(time.time() - started, 1),
        })
        print(f"OCR page {page_number}: {len(text)} chars in {entries[-1]['seconds']}s")

    TARGET.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TARGET} with {len(entries)} OCR pages.")


if __name__ == "__main__":
    main()
