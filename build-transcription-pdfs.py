from __future__ import annotations

import html
import re
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "pdf-output"
FONT_REGULAR = r"C:\Windows\Fonts\tahoma.ttf"
FONT_BOLD = r"C:\Windows\Fonts\tahomabd.ttf"

TEXTS = [
    {"siglum": "DD", "title": "Dadestan i Denig", "file": "Dd.txt"},
    {"siglum": "PY", "title": "Pahlavi Yasna", "file": "PY-Pt4.txt"},
    {"siglum": "WZ", "title": "Wizidagiha i Zadspram", "file": "WZ.txt"},
    {"siglum": "NM", "title": "Namagiha i Manuscihr", "file": "NM.txt"},
]


def parse_records(path: Path) -> list[dict[str, str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    has_tsv = any(line.strip() and not line.startswith("#") and is_tsv_record(line.strip()) for line in lines)
    return parse_tsv_records(lines) if has_tsv else parse_section_records(lines)


def is_tsv_record(line: str) -> bool:
    columns = line.split("\t")
    return len(columns) >= 3 and all(column.strip() for column in columns[:2]) and bool(" ".join(columns[2:]).strip())


def parse_tsv_records(lines: list[str]) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    for line in lines:
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or not is_tsv_record(trimmed):
            continue
        columns = trimmed.split("\t")
        records.append(
            {
                "location": format_tsv_location(columns),
                "text": " ".join(columns[2:]).strip(),
            }
        )
    return records


def parse_section_records(lines: list[str]) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for index, line in enumerate(lines):
        trimmed = line.strip()
        if not trimmed:
            continue
        section = re.match(r"^([0-9]+(?:\.[0-9]+[a-z]?)?)\s+(.*)$", trimmed)
        if section:
            current = {"location": section.group(1), "text": section.group(2)}
            records.append(current)
            continue
        if current:
            current["text"] = f"{current['text']} {trimmed}"
        else:
            records.append({"location": f"line {index + 1}", "text": trimmed})
    return records


def format_tsv_location(columns: list[str]) -> str:
    first = columns[0].strip()
    second = columns[1].strip()
    if re.search(r"outdated|K35", first, flags=re.I):
        return re.sub(r"^[A-Za-z]+\s+", "", second)
    return " | ".join(item for item in [first, second] if item)


def to_persian_transcription(value: str) -> str:
    parts = re.split(r"(\s+|[.,;:!?()[\]{}<>]+)", str(value))
    output = ""
    for part in parts:
        if not part:
            continue
        if re.search(r"[\w=_-]", part, flags=re.UNICODE):
            if is_standalone_ezafe(part):
                output = re.sub(r"\s+$", "", output) + "ِ"
                continue
            output += transliterate_word(part)
        else:
            output += part
    return output


def transliterate_word(word: str) -> str:
    prefix_match = re.match(r"^[=_.:-]+", word)
    suffix_match = re.search(r"[=_.:-]+$", word)
    prefix = prefix_match.group(0) if prefix_match else ""
    suffix = suffix_match.group(0) if suffix_match else ""
    body = re.sub(r"^[=_.:-]+|[=_.:-]+$", "", word).lower()
    if not body:
        return word
    if body == "ud":
        return f"{prefix}و{suffix}"
    if body == "pad":
        return f"{prefix}به{suffix}"
    if body in {"čē", "ce"}:
        return f"{prefix}چه{suffix}"

    final_long_e = body.endswith("ē")
    if final_long_e:
        body = body[:-1]

    initial_a = body.startswith("a")
    if initial_a:
        body = body[1:]
    initial_e = body.startswith("e")
    if initial_e:
        body = body[1:]

    replacements = [
        ("xw", "خو"),
        ("kh", "خ"),
        ("ch", "چ"),
        ("sh", "ش"),
        ("zh", "ژ"),
        ("θ", "ث"),
        ("γ", "غ"),
        ("δ", "ذ"),
        ("š", "ش"),
        ("č", "چ"),
        ("ǰ", "ج"),
        ("ā", "ا"),
        ("ē", "ێ"),
        ("ī", "ی"),
        ("ō", "و"),
        ("ū", "و"),
    ]
    for source, replacement in replacements:
        body = body.replace(source, replacement)

    chars = {
        "a": "َ",
        "e": "ِ",
        "i": "ِ",
        "o": "ُ",
        "u": "ُ",
        "b": "ب",
        "p": "پ",
        "t": "ت",
        "j": "ج",
        "c": "چ",
        "d": "د",
        "f": "ف",
        "g": "گ",
        "h": "ه",
        "k": "ک",
        "l": "ل",
        "m": "م",
        "n": "ن",
        "r": "ر",
        "s": "س",
        "w": "و",
        "v": "و",
        "x": "خ",
        "y": "ی",
        "z": "ز",
        "q": "ق",
    }
    transcribed = "".join(chars.get(char, char) for char in body)
    return f"{prefix}{'ا' if initial_a else ''}{'ای' if initial_e else ''}{transcribed}{'ه' if final_long_e else ''}{suffix}"


def is_standalone_ezafe(value: str) -> bool:
    clean = re.sub(r"^[=_.:-]+|[=_.:-]+$", "", str(value)).lower()
    return clean in {"ī", "i"}


def shape_rtl(value: str) -> str:
    reshaped = arabic_reshaper.reshape(value)
    return get_display(reshaped)


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(html.escape(text), style)


def build_pdf(config: dict[str, str]) -> Path:
    records = parse_records(ROOT / config["file"])
    filename = OUT_DIR / f"{config['siglum']}-transcription-persian.pdf"
    doc = SimpleDocTemplate(
        str(filename),
        pagesize=landscape(A4),
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=13 * mm,
        bottomMargin=13 * mm,
        title=f"{config['siglum']} transcription and Persian transcription",
        author="Roya Assadi",
    )

    styles = get_styles()
    story = [
        Paragraph(f"{config['siglum']} - {html.escape(config['title'])}", styles["Title"]),
        Paragraph("Transcription and Persian transcription", styles["Subtitle"]),
        Spacer(1, 6 * mm),
    ]

    table_rows = [
        [
            paragraph("Transc.", styles["Header"]),
            paragraph(shape_rtl("Pers. Trans."), styles["HeaderRight"]),
        ]
    ]
    for record in records:
        location = record["location"]
        transcription = f"<b>{html.escape(location)}</b><br/>{html.escape(record['text'])}"
        persian = f"{shape_rtl(location)}<br/>{shape_rtl(to_persian_transcription(record['text']))}"
        table_rows.append(
            [
                Paragraph(transcription, styles["CellLeft"]),
                Paragraph(persian, styles["CellRight"]),
            ]
        )

    table = Table(table_rows, colWidths=[132 * mm, 132 * mm], repeatRows=1, splitByRow=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e9eef2")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f3f4f")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.HexColor("#9fb0bc")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cdd6dd")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return filename


def get_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "Title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Tahoma-Bold",
            fontSize=16,
            leading=20,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1f3f4f"),
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Tahoma",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#536574"),
        ),
        "Header": ParagraphStyle(
            "Header",
            parent=base["Normal"],
            fontName="Tahoma-Bold",
            fontSize=9,
            leading=12,
            alignment=TA_LEFT,
        ),
        "HeaderRight": ParagraphStyle(
            "HeaderRight",
            parent=base["Normal"],
            fontName="Tahoma-Bold",
            fontSize=9,
            leading=12,
            alignment=TA_RIGHT,
        ),
        "CellLeft": ParagraphStyle(
            "CellLeft",
            parent=base["Normal"],
            fontName="Tahoma",
            fontSize=7.6,
            leading=10.2,
            alignment=TA_LEFT,
        ),
        "CellRight": ParagraphStyle(
            "CellRight",
            parent=base["Normal"],
            fontName="Tahoma",
            fontSize=8,
            leading=11.2,
            alignment=TA_RIGHT,
        ),
    }


def draw_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Tahoma", 7)
    canvas.setFillColor(colors.HexColor("#536574"))
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Tahoma", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("Tahoma-Bold", FONT_BOLD))


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    register_fonts()
    for config in TEXTS:
        path = build_pdf(config)
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
