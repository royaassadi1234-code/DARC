from __future__ import annotations

import json
import re
from pathlib import Path


DD_TEXT = Path("Dd.txt")
COMMENTS_JSON = Path("dd-comment-highlights.json")
PDF_TRANSLATIONS_JSON = Path("dd-pdf-translations.json")
TARGET = Path("druz-concept-annotations.json")

DRUZ_VARIANTS = [
    "druz",
    "druj",
    "drug",
    "drux",
    "druzān",
    "druzan",
    "druzīh",
    "druzih",
    "druxtārīh",
    "druxtarih",
    "druzaskān",
    "druzaskan",
]

KNOWN_OPPOSITIONS = [
    "yazdān",
    "weh-Dēn ī Mazdēsnān",
    "ahlāyīh rāh",
    "ahlāyīh",
    "rāstīh",
    "Ohrmazd",
    "dādār",
    "wehīh",
    "rōšn",
]

KNOWN_THEMES = [
    "Fraškerd",
    "rist-āxēz",
    "resurrection",
    "hell",
    "dōšox",
    "body",
    "tan",
    "death",
    "marg",
    "religion",
    "dēn",
    "cosmic war",
    "kōxšišn",
]

KNOWN_VERBS = [
    "kōxšišn",
    "kōxšīdār",
    "spōz",
    "wān",
    "agārēnīdār",
    "nihānēnīdārīh",
    "zanišn",
    "drōzišn",
    "frēb",
    "wišōbišn",
    "paywāzēd",
]

KNOWN_ADJECTIVES = [
    "purr-wattarīh",
    "tamīg-gōhr",
    "frēbāg-gōhrag",
    "ganāg",
    "duš-āgāh",
    "margēnāg",
    "kēnēnāg",
    "purr-kēn",
    "wišōbāg",
    "wanīgar",
]


def fold_text(value: str) -> str:
    replacements = str.maketrans({
        "ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u",
        "š": "s", "č": "c", "ǰ": "j", "γ": "g", "θ": "t",
        "Ā": "a", "Ē": "e", "Ī": "i", "Ō": "o", "Ū": "u",
        "Š": "s", "Č": "c",
    })
    return value.translate(replacements).lower()


def parse_records(raw: str) -> list[dict[str, str]]:
    records = []
    current = None
    section_pattern = re.compile(r"^([0-9]+(?:\.[0-9]+[a-z]?)?)\s+(.+)$")

    for index, line in enumerate(raw.splitlines()):
        trimmed = line.strip()
        if not trimmed:
            continue

        section = section_pattern.match(trimmed)
        if section:
            current = {
                "index": index,
                "location": section.group(1),
                "text": section.group(2),
            }
            records.append(current)
            continue

        if current:
            current["text"] += f" {trimmed}"
        else:
            current = {
                "index": index,
                "location": f"line {index + 1}",
                "text": trimmed,
            }
            records.append(current)

    return records


def base_location(location: str) -> str:
    return re.sub(r"[a-z]+$", "", str(location).strip())


def variant_ranges(text: str) -> list[tuple[int, int]]:
    folded = fold_text(text)
    ranges = []
    boundary = r"[\w=-]"

    for variant in DRUZ_VARIANTS:
        pattern = re.compile(rf"(?<!{boundary}){re.escape(fold_text(variant))}(?!{boundary})")
        for match in pattern.finditer(folded):
            ranges.append((match.start(), match.end()))

    return merge_ranges(ranges)


def merge_ranges(ranges: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def matched_words(text: str) -> list[str]:
    return sorted({text[start:end] for start, end in variant_ranges(text)}, key=str.lower)


def load_comments() -> dict[str, list[dict[str, object]]]:
    if not COMMENTS_JSON.exists():
        return {}

    comments = json.loads(COMMENTS_JSON.read_text(encoding="utf-8"))
    by_location: dict[str, list[dict[str, object]]] = {}
    for comment in comments:
        location = str(comment.get("location", "")).strip()
        by_location.setdefault(location, []).append(comment)
    return by_location


def load_pdf_translations() -> dict[str, dict[str, object]]:
    if not PDF_TRANSLATIONS_JSON.exists():
        return {}

    return json.loads(PDF_TRANSLATIONS_JSON.read_text(encoding="utf-8"))


def matching_comments(location: str, comments_by_location: dict[str, list[dict[str, object]]]) -> list[dict[str, object]]:
    comments = []
    comments.extend(comments_by_location.get(location, []))
    if location != base_location(location):
        comments.extend(comments_by_location.get(base_location(location), []))
    return comments


def matching_pdf_translation(location: str, pdf_translations: dict[str, dict[str, object]]) -> str:
    base = base_location(location)
    candidates = [location, base]
    if base.startswith("0."):
        candidates.append(f"Int.{base.split('.', 1)[1]}")

    for candidate in candidates:
        translation = pdf_translations.get(candidate)
        if translation:
            return str(translation.get("translation", ""))
    return ""


def source_paragraph_with_location(location: str, text: str) -> str:
    display_location = f"dd{location}"
    if text.startswith(display_location):
        return text
    return f"{display_location} {text}"


def combined_comment_text(comments: list[dict[str, object]]) -> str:
    parts = []
    for comment in comments:
        parts.extend([
            str(comment.get("title", "")),
            str(comment.get("englishComment", "")),
            str(comment.get("translationPassage", "")),
            " ".join(str(word) for word in comment.get("highlightedWords", [])),
        ])
    return " ".join(part for part in parts if part.strip())


def terms_present(text: str, terms: list[str]) -> list[str]:
    folded = fold_text(text)
    return [term for term in terms if fold_text(term) in folded]


def infer_meaning(text: str, comments: list[dict[str, object]]) -> str:
    folded = fold_text(f"{text} {combined_comment_text(comments)}")
    if any(term in folded for term in ["ahriman", "ahreman", "gannag", "gannay", "menog", "menoy"]):
        return "Ahreman"
    if any(term in folded for term in ["demon", "demons", "dewan", "dēwān", "druzan", "druzān"]):
        return "Demon / demonic being"
    if any(term in folded for term in ["deceit", "falsehood", "lie", "deceived", "freb"]):
        return "Falsehood / deceit"
    return ["Ahreman", "The corporeal wickedness"]


def infer_realm(text: str, comments: list[dict[str, object]]) -> str | None:
    folded = fold_text(f"{text} {combined_comment_text(comments)}")
    realms = []
    if any(term in folded for term in ["getiy", "gētīy", "material", "body", "tan"]):
        realms.append("gētīy")
    if any(term in folded for term in ["menog", "mēnōy", "spiritual", "soul", "ruwan"]):
        realms.append("mēnōy")
    if any(term in folded for term in ["hell", "dosox", "dōšox"]):
        realms.append("dōšox")
    return " / ".join(realms) if realms else None


def infer_metaphors(text: str, comments: list[dict[str, object]]) -> list[str]:
    combined = f"{text} {combined_comment_text(comments)}"
    candidates = []
    if "army" in combined.lower() or fold_text("spāh") in fold_text(combined):
        candidates.append("army / warfare")
    if "weapon" in combined.lower() or fold_text("abzār") in fold_text(combined):
        candidates.append("weapon / armor")
    if "dark" in combined.lower() or fold_text("tār") in fold_text(combined):
        candidates.append("darkness")
    return candidates


def build_entry(
    record: dict[str, str],
    comments: list[dict[str, object]],
    pdf_translations: dict[str, dict[str, object]],
) -> dict[str, object]:
    combined = f"{record['text']} {combined_comment_text(comments)}"
    location = record["location"]
    entry = {
        "sourceParagraph": source_paragraph_with_location(location, record["text"]),
        "translation": matching_pdf_translation(location, pdf_translations),
        "id": f"dd{location}",
        "location": f"dd{location}",
        "text": "DD",
        "concept": "druz",
        "mainWord": "druz",
        "matchedWords": matched_words(record["text"]),
        "meaning": infer_meaning(record["text"], comments),
        "actionsUsedWithIt": terms_present(combined, KNOWN_VERBS),
        "adjectivesDescriptions": terms_present(combined, KNOWN_ADJECTIVES),
        "metaphors": infer_metaphors(record["text"], comments),
        "oppositions": terms_present(combined, KNOWN_OPPOSITIONS),
        "realm": infer_realm(record["text"], comments),
        "theme": [],
        "relatedTheme": terms_present(combined, KNOWN_THEMES),
        "reviewStatus": "machine draft",
        "reviewNote": "",
    }

    if location == "0.5a":
        entry.update({
            "meaning": ["Ahreman", "The corporeal wickedness"],
            "actionsUsedWithIt": ["kōxšišn"],
            "adjectivesDescriptions": [],
            "metaphors": [],
            "oppositions": ["yazdān", "weh-Dēn ī Mazdēsnān", "ahlāyīh rāh"],
            "realm": "gētīy",
            "relatedTheme": ["Fraškerd"],
            "reviewStatus": "user seed",
        })

    return entry


def main() -> None:
    records = parse_records(DD_TEXT.read_text(encoding="utf-8"))
    comments_by_location = load_comments()
    pdf_translations = load_pdf_translations()
    entries = []

    for record in records:
        if not matched_words(record["text"]):
            continue
        comments = matching_comments(record["location"], comments_by_location)
        entries.append(build_entry(record, comments, pdf_translations))

    TARGET.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {TARGET} with {len(entries)} entries.")


if __name__ == "__main__":
    main()
