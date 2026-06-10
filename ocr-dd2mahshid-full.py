from __future__ import annotations

import json
import time
from pathlib import Path

import easyocr
import fitz


SOURCE = Path("pdf-output/DD2Mahshid.PDF")
TARGET = Path("dd2mahshid-ocr-all.json")
IMAGE_DIR = Path("ocr-output/dd2mahshid")


def load_existing() -> dict[int, dict[str, object]]:
    existing: dict[int, dict[str, object]] = {}
    for source in [TARGET, Path("dd2mahshid-ocr-selected.json")]:
      if not source.exists():
          continue
      for entry in json.loads(source.read_text(encoding="utf-8")):
          existing[int(entry["pdfPage"])] = entry
    return existing


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
    existing = load_existing()
    reader = easyocr.Reader(["fa"], gpu=False, verbose=False)

    def save_checkpoint() -> None:
        entries = [existing[page] for page in sorted(existing)]
        TARGET.write_text(
            json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    for page_number in range(1, document.page_count + 1):
        if page_number in existing and existing[page_number].get("text"):
            print(f"Skip page {page_number}: already OCRed")
            continue

        started = time.time()
        image_path = render_page(document, page_number)
        lines = reader.readtext(str(image_path), detail=0, paragraph=True, batch_size=8)
        text = "\n".join(line.strip() for line in lines if line.strip())
        existing[page_number] = {
            "pdfPage": page_number,
            "image": str(image_path).replace("\\", "/"),
            "text": text,
            "seconds": round(time.time() - started, 1),
        }
        print(f"OCR page {page_number}: {len(text)} chars in {existing[page_number]['seconds']}s")
        save_checkpoint()

    save_checkpoint()
    print(f"Wrote {TARGET} with {len(existing)} OCR pages.")


if __name__ == "__main__":
    main()
