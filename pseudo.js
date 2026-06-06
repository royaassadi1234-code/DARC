const pageConfig = document.body.dataset;
const DATA_URL = pageConfig.dataUrl || "pseudo-data.json";
const SOURCE_KEY = pageConfig.sourceKey || "Dd";
const TARGET_KEY = pageConfig.targetKey || "PY";
const THIRD_KEY = pageConfig.thirdKey || "";
const SOURCE_LABEL = pageConfig.sourceLabel || "DD";
const TARGET_LABEL = pageConfig.targetLabel || "PY";
const THIRD_LABEL = pageConfig.thirdLabel || "";
const PAGE_SIZE = 5;
const IS_PHRASE_PAGE = DATA_URL.includes("phrases");
const DICTIONARY_URL = "mpcd-workspace-dictionary.json";
const ENGLISH_TRANSLATION_FILES = {
  DD: "DD-en.txt",
  PY: "PY-en.txt",
  WZ: "WZ-en.txt",
  NM: "NM-en.txt"
};

const pseudoState = {
  all: [],
  filtered: [],
  dictionary: new Map(),
  englishTranslations: new Map(),
  expanded: new Set(),
  query: "",
  tier: "",
  sort: "rank",
  currentPage: 1
};

const queryEl = document.querySelector("#pseudo-query");
const tierEl = document.querySelector("#tier-filter");
const sortEl = document.querySelector("#sort-mode");
const statusEl = document.querySelector("#pseudo-status");
const summaryEl = document.querySelector("#pseudo-summary");
const galleryEl = document.querySelector("#pseudo-gallery");
const expandAllEl = document.querySelector("#expand-all");
const collapseAllEl = document.querySelector("#collapse-all");
const TRANSLITERATION_MAP = {
  "\u0100": "A",
  "\u0101": "a",
  "\u0112": "E",
  "\u0113": "e",
  "\u012A": "I",
  "\u012B": "i",
  "\u014C": "O",
  "\u014D": "o",
  "\u016A": "U",
  "\u016B": "u",
  "\u010C": "C",
  "\u010D": "c",
  "\u0160": "S",
  "\u0161": "s",
  "\u01F0": "j",
  "\u01E6": "G",
  "\u01E7": "g"
};
const HIGHLIGHT_CLASS_COUNT = 6;

initPseudo();

async function initPseudo() {
  bindPseudoEvents();

  try {
    const [response, dictionary, englishTranslations] = await Promise.all([
      fetch(DATA_URL),
      loadDictionary(),
      loadEnglishTranslations()
    ]);
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }

    const data = await response.json();
    pseudoState.all = data.map(normalizeRecord);
    pseudoState.dictionary = dictionary;
    pseudoState.englishTranslations = englishTranslations;
    populateTierFilter();
    applyFilters();
  } catch (error) {
    statusEl.textContent = "Data loading failed";
    galleryEl.innerHTML = `<div class="empty-state">The pseudo-dynamic data could not be loaded.</div>`;
    console.error(error);
  }
}

async function loadEnglishTranslations() {
  const entries = await Promise.all(Object.entries(ENGLISH_TRANSLATION_FILES).map(async ([siglum, file]) => {
    const raw = await fetchOptionalText(file);
    return [siglum, parseEnglishRecords(raw)];
  }));
  return new Map(entries);
}

async function fetchOptionalText(file) {
  try {
    const response = await fetch(file);
    return response.ok ? response.text() : "";
  } catch {
    return "";
  }
}

function parseEnglishRecords(raw) {
  const records = new Map();
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const section = trimmed.match(/^([0-9]+(?:\.[0-9]+[a-z]?)?)\s+(.*)$/);
    if (section) {
      records.set(section[1], section[2]);
    }
  });
  return records;
}

async function loadDictionary() {
  try {
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) {
      return new Map();
    }

    const data = await response.json();
    return new Map((data.entries || []).flatMap((entry) => {
      const meanings = (entry.meanings || []).filter(Boolean);
      if (!entry.word || !meanings.length) {
        return [];
      }
      const keys = getDictionaryKeys(entry.word);
      return keys.map((key) => [key, meanings]);
    }));
  } catch (error) {
    console.warn("Dictionary glosses unavailable", error);
    return new Map();
  }
}

function bindPseudoEvents() {
  queryEl.addEventListener("input", () => {
    pseudoState.query = queryEl.value.trim();
    pseudoState.currentPage = 1;
    applyFilters();
  });

  tierEl.addEventListener("change", () => {
    pseudoState.tier = tierEl.value;
    pseudoState.currentPage = 1;
    applyFilters();
  });

  sortEl.addEventListener("change", () => {
    pseudoState.sort = sortEl.value;
    pseudoState.currentPage = 1;
    applyFilters();
  });

  expandAllEl.addEventListener("click", () => {
    getVisibleRecords().forEach((record) => pseudoState.expanded.add(record.id));
    renderPseudo();
  });

  collapseAllEl.addEventListener("click", () => {
    pseudoState.expanded.clear();
    renderPseudo();
  });
}

function normalizeRecord(raw, index) {
  const sentenceRangeKey = findKey(raw, `${TARGET_KEY} Sentence Range`, "Sentence Range");
  const sourcePreviewKey = findKey(raw, `${SOURCE_KEY} Paragraph Preview`, `${SOURCE_LABEL} Paragraph Preview`);
  const targetPreviewKey = findKey(raw, `${TARGET_KEY} Paragraph Preview`, `${TARGET_LABEL} Paragraph Preview`);
  const thirdPreviewKey = THIRD_KEY ? findKey(raw, `${THIRD_KEY} Paragraph Preview`, `${THIRD_LABEL} Paragraph Preview`) : "";

  return {
    id: `match-${index + 1}`,
    rank: Number(raw["Candidate Rank"]) || index + 1,
    tier: raw["Match Tier"] || "unclassified",
    score: Number(raw["Match Score"]) || 0,
    cosine: raw["IDF Cosine"] || "N/A",
    sharedCount: Number(raw["Shared Distinct Words"]) || 0,
    sharedWords: raw["Shared Words"] || "N/A",
    sourcePreview: raw[sourcePreviewKey] || "N/A",
    targetPreview: raw[targetPreviewKey] || "N/A",
    thirdPreview: thirdPreviewKey ? raw[thirdPreviewKey] || "" : "",
    targetRange: raw[sentenceRangeKey] || "N/A",
    targetChapterStanza: raw[`${TARGET_KEY} Chapter/Stanza`] || "",
    targetChapter: raw[`${TARGET_KEY} Chapter`] || "",
    targetStanza: raw[`${TARGET_KEY} Stanza`] || "",
    targetXmlSection: raw[`${TARGET_KEY} XML Section`] || ""
  };
}

function findKey(record, preferred, fallback) {
  return Object.keys(record).find((key) => key === preferred || key.includes(preferred)) ||
    Object.keys(record).find((key) => key.includes(fallback)) ||
    preferred;
}

function populateTierFilter() {
  const tiers = [...new Set(pseudoState.all.map((record) => record.tier))].sort();
  tiers.forEach((tier) => {
    const option = document.createElement("option");
    option.value = tier;
    option.textContent = titleCase(tier);
    tierEl.appendChild(option);
  });
}

function applyFilters() {
  const terms = getQueryTerms();
  pseudoState.filtered = pseudoState.all
    .filter((record) => !pseudoState.tier || record.tier === pseudoState.tier)
    .filter((record) => !terms.length || terms.some((term) => searchableText(record).includes(term)))
    .sort(sortRecords);

  renderPseudo();
}

function sortRecords(a, b) {
  if (pseudoState.sort === "score") {
    return b.score - a.score || a.rank - b.rank;
  }

  if (pseudoState.sort === "shared") {
    return b.sharedCount - a.sharedCount || b.score - a.score;
  }

  return a.rank - b.rank;
}

function renderPseudo() {
  const pageCount = getPageCount();
  if (pseudoState.currentPage > pageCount) {
    pseudoState.currentPage = pageCount;
  }

  const visible = getVisibleRecords();
  const totalScore = pseudoState.filtered.reduce((sum, record) => sum + record.score, 0);
  const averageScore = pseudoState.filtered.length ? totalScore / pseudoState.filtered.length : 0;
  const pageStart = pseudoState.filtered.length ? (pseudoState.currentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(pseudoState.currentPage * PAGE_SIZE, pseudoState.filtered.length);

  statusEl.textContent = `${pseudoState.filtered.length} of ${pseudoState.all.length} matches`;
  summaryEl.innerHTML = `
    <article class="text-card">
      <div class="siglum">Matches</div>
      <h2>${pseudoState.filtered.length.toLocaleString()}</h2>
      <p class="meta">Filtered candidate alignments</p>
    </article>
    <article class="text-card">
      <div class="siglum">Average score</div>
      <h2>${averageScore.toFixed(4)}</h2>
      <p class="meta">Within the current result set</p>
    </article>
    <article class="text-card">
      <div class="siglum">Page</div>
      <h2>${pseudoState.currentPage.toLocaleString()}</h2>
      <p class="meta">Showing ranks ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()}</p>
    </article>
  `;

  if (!visible.length) {
    galleryEl.innerHTML = `<div class="empty-state">No matches found for this search.</div>`;
    return;
  }

  galleryEl.innerHTML = `
    ${visible.map(renderCard).join("")}
    ${renderPagination(pageCount)}
  `;

  galleryEl.querySelectorAll("[data-card-id]").forEach((button) => {
    button.addEventListener("click", () => toggleCard(button.dataset.cardId));
  });

  galleryEl.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      pseudoState.currentPage = Number(button.dataset.page);
      renderPseudo();
    });
  });
}

function getVisibleRecords() {
  const start = (pseudoState.currentPage - 1) * PAGE_SIZE;
  return pseudoState.filtered.slice(start, start + PAGE_SIZE);
}

function getPageCount() {
  return Math.max(1, Math.ceil(pseudoState.filtered.length / PAGE_SIZE));
}

function renderPagination(pageCount) {
  if (pageCount <= 1) {
    return "";
  }

  const current = pseudoState.currentPage;
  const pages = getPaginationPages(pageCount, current);
  return `
    <nav class="rank-pagination" aria-label="Rank pages">
      ${pages.map((page) => page === "gap"
        ? `<span class="page-gap" aria-hidden="true">...</span>`
        : `<button class="page-dot ${page === current ? "active" : ""}" type="button" data-page="${page}" aria-label="Go to rank page ${page}">${page}</button>`
      ).join("")}
    </nav>
  `;
}

function getPaginationPages(pageCount, current) {
  const pages = new Set([1, pageCount, current, current - 1, current + 1]);
  const ordered = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return ordered.flatMap((page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) {
      return ["gap", page];
    }
    return [page];
  });
}

function renderCard(record) {
  const expanded = pseudoState.expanded.has(record.id);
  return `
    <article class="pseudo-card ${expanded ? "expanded" : ""}">
      <button class="pseudo-card-header" type="button" data-card-id="${record.id}">
        <span>
          <span class="siglum">Rank ${record.rank}</span>
          <strong>${highlight(record.sharedWords)}</strong>
        </span>
        <span class="pseudo-card-meta">${titleCase(record.tier)} | ${record.score.toFixed(4)}</span>
      </button>
      <div class="pseudo-card-body">
        <section>
          <h2>${escapeHtml(SOURCE_LABEL)} Paragraph Preview</h2>
          ${renderPreviewBlock(record.sourcePreview, record, SOURCE_LABEL)}
        </section>
        <section>
          <h2>${escapeHtml(TARGET_LABEL)} Paragraph Preview</h2>
          ${renderPreviewBlock(record.targetPreview, record, TARGET_LABEL)}
        </section>
        ${record.thirdPreview ? `
          <section>
            <h2>${escapeHtml(THIRD_LABEL)} Paragraph Preview</h2>
            ${renderPreviewBlock(record.thirdPreview, record, THIRD_LABEL)}
          </section>
        ` : ""}
      </div>
    </article>
  `;
}

function toggleCard(id) {
  if (pseudoState.expanded.has(id)) {
    pseudoState.expanded.delete(id);
  } else {
    pseudoState.expanded.add(id);
  }

  renderPseudo();
}

function searchableText(record) {
  return foldText([
    record.sharedWords,
    record.sourcePreview,
    record.targetPreview,
    record.thirdPreview,
    record.targetRange,
    record.targetChapterStanza,
    record.targetXmlSection,
    record.tier,
    String(record.rank),
    String(record.score)
  ].join(" ")).text;
}

function highlight(value) {
  return highlightTerms(value, getQueryTerms(), { plain: IS_PHRASE_PAGE });
}

function renderPreviewBlock(value, record, label) {
  const terms = [
    ...getPhraseTerms(record),
    ...getQueryTerms()
  ];
  return `
    <p>${highlightTerms(value, terms, { plain: IS_PHRASE_PAGE, annotate: true })}</p>
    ${renderTranslationActions(value, getEnglishTranslationForPreview(label, record))}
  `;
}

function getEnglishTranslationForPreview(label, record) {
  const siglum = normalizeSiglum(label);
  const location = siglum === "WZ" ? record.targetChapterStanza : "";
  return location ? pseudoState.englishTranslations.get(siglum)?.get(location) || "" : "";
}

function normalizeSiglum(label) {
  return String(label || "").trim().toUpperCase().replace(/^DD$/, "DD").replace(/^DAD?$/, "DD");
}

function highlightPreview(value, record) {
  const terms = [
    ...getPhraseTerms(record),
    ...getQueryTerms()
  ];
  return highlightTerms(value, terms, { plain: IS_PHRASE_PAGE });
}

function highlightTerms(value, terms, options = {}) {
  if (options.annotate) {
    return annotateText(value, terms, options);
  }

  if (!terms.length) {
    return escapeHtml(value);
  }

  const ranges = findMatchRanges(value, terms);
  if (!ranges.length) {
    return escapeHtml(value);
  }

  let html = "";
  let cursor = 0;
  ranges.forEach(({ start, end, termIndex }) => {
    html += escapeHtml(String(value).slice(cursor, start));
    const matchedText = escapeHtml(String(value).slice(start, end));
    html += options.plain
      ? `<strong class="plain-match">${matchedText}</strong>`
      : `<mark class="term-${(termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${matchedText}</mark>`;
    cursor = end;
  });
  html += escapeHtml(String(value).slice(cursor));
  return html;
}

function annotateText(value, terms, options = {}) {
  const text = String(value);
  const ranges = terms.length ? findMatchRanges(text, terms) : [];
  const wordPattern = /[\p{L}\p{M}\p{N}=_-]+/gu;
  let html = "";
  let cursor = 0;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    html += highlightPlainSegment(text.slice(cursor, match.index), ranges, cursor, options);
    const token = match[0];
    const tokenStart = match.index;
    const tokenEnd = tokenStart + token.length;
    const tokenHtml = highlightPlainSegment(token, ranges, tokenStart, options);
    const meanings = getMeanings(token);
    html += meanings.length
      ? `<span class="dict-word" title="${escapeHtml(meanings.join("; "))}">${tokenHtml}</span>`
      : tokenHtml;
    cursor = tokenEnd;
  }

  html += highlightPlainSegment(text.slice(cursor), ranges, cursor, options);
  return html;
}

function renderTranslationActions(value, englishText = "") {
  return `
    <div class="translation-actions">
      <details class="eng-trans">
        <summary>Eng. Transl.</summary>
        <p>${englishText ? escapeHtml(englishText) : "English translation will be added later."}</p>
      </details>
      <details class="pers-trans">
        <summary>Pers. Trans.</summary>
        <p dir="rtl" lang="fa">${escapeHtml(toArabicTranscription(value))}</p>
      </details>
    </div>
  `;
}

function toArabicTranscription(value) {
  const parts = String(value).split(/(\s+|[.,;:!?()[\]{}<>]+)/u);
  let output = "";

  parts.forEach((part) => {
    if (/[\p{L}\p{M}\p{N}=_-]/u.test(part)) {
      if (isStandaloneEzafe(part)) {
        output = output.replace(/\s+$/u, "") + "ِ";
        return;
      }
      output += transliterateWord(part);
      return;
    }

    output += part;
  });

  return output;
}

function transliterateWord(word) {
  const prefix = word.match(/^[=_.:-]+/)?.[0] || "";
  const suffix = word.match(/[=_.:-]+$/)?.[0] || "";
  let body = word.replace(/^[=_.:-]+|[=_.:-]+$/g, "").toLocaleLowerCase();
  if (!body) {
    return word;
  }
  if (body === "ud") {
    return `${prefix}و${suffix}`;
  }
  if (body === "pad") {
    return `${prefix}به${suffix}`;
  }
  if (body === "čē" || body === "ce") {
    return `${prefix}چه${suffix}`;
  }
  const finalLongE = body.endsWith("ē");
  if (finalLongE) {
    body = body.slice(0, -1);
  }
  const initialA = body.startsWith("a");
  if (initialA) {
    body = body.slice(1);
  }
  const initialE = body.startsWith("e");
  if (initialE) {
    body = body.slice(1);
  }

  const replacements = [
    ["xw", "خو"], ["kh", "خ"], ["ch", "چ"], ["sh", "ش"], ["zh", "ژ"],
    ["θ", "ث"], ["γ", "غ"], ["δ", "ذ"], ["š", "ش"], ["č", "چ"], ["ǰ", "ج"],
    ["ā", "ا"], ["ē", "ێ"], ["ī", "ی"], ["ō", "و"], ["ū", "و"]
  ];
  replacements.forEach(([from, to]) => {
    body = body.replaceAll(from, to);
  });

  const chars = {
    a: "َ", e: "ِ", i: "ِ", o: "ُ", u: "ُ",
    b: "ب", p: "پ", t: "ت", j: "ج", c: "چ", d: "د", f: "ف",
    g: "گ", h: "ه", k: "ک", l: "ل", m: "م", n: "ن", r: "ر",
    s: "س", w: "و", v: "و", x: "خ", y: "ی", z: "ز", q: "ق"
  };

  const transcribed = `${initialA ? "ا" : ""}${initialE ? "ای" : ""}${Array.from(body).map((char) => chars[char] || char).join("")}${finalLongE ? "ه" : ""}`;
  return `${prefix}${transcribed}${suffix}`;
}

function isStandaloneEzafe(value) {
  const clean = String(value).replace(/^[=_.:-]+|[=_.:-]+$/g, "").toLocaleLowerCase();
  return clean === "ī" || clean === "i";
}

function highlightPlainSegment(segment, ranges, offset, options = {}) {
  if (!ranges.length || !segment) {
    return escapeHtml(segment);
  }

  let html = "";
  let cursor = 0;
  const segmentEnd = offset + segment.length;
  ranges
    .filter((range) => range.start < segmentEnd && range.end > offset)
    .forEach((range) => {
      const start = Math.max(0, range.start - offset);
      const end = Math.min(segment.length, range.end - offset);
      if (start < cursor) {
        return;
      }
      html += escapeHtml(segment.slice(cursor, start));
      const matchedText = escapeHtml(segment.slice(start, end));
      html += options.plain
        ? `<strong class="plain-match">${matchedText}</strong>`
        : `<mark class="term-${(range.termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${matchedText}</mark>`;
      cursor = end;
    });
  html += escapeHtml(segment.slice(cursor));
  return html;
}

function getMeanings(token) {
  for (const key of getDictionaryKeys(token)) {
    const meanings = pseudoState.dictionary.get(key);
    if (meanings?.length) {
      return meanings;
    }
  }
  return [];
}

function getDictionaryKeys(value) {
  const raw = String(value).trim();
  const trimmed = raw.replace(/^[=_.:;,[\](){}<>]+|[=_.:;,[\](){}<>]+$/g, "");
  const seeds = [raw, trimmed, foldText(raw).text, foldText(trimmed).text]
    .map((key) => key.toLowerCase())
    .filter(Boolean);
  const variants = new Set(seeds);

  seeds.forEach((key) => {
    [
      key.replace(/^=+/, ""),
      key.replace(/^u-/, ""),
      key.replace(/^i-/, ""),
      key.replace(/^pad-/, ""),
      key.replace(/^az-/, ""),
      key.replace(/^o-/, ""),
      key.replace(/^ud-/, ""),
      key.replace(/-(iz|is|im|it|san|man|tan)$/, "")
    ].forEach((variant) => {
      const clean = variant.replace(/^[=_.:-]+|[=_.:-]+$/g, "");
      if (clean) {
        variants.add(clean);
      }
    });
  });

  return [...variants];
}

function getPhraseTerms(record) {
  if (!IS_PHRASE_PAGE || !record.sharedWords || record.sharedWords === "N/A") {
    return [];
  }

  const phrase = foldText(record.sharedWords.trim()).text;
  return phrase ? [phrase] : [];
}

function getQueryTerms() {
  return [...new Set(pseudoState.query.split(/[,\s;]+/)
    .map((term) => foldText(term.trim()).text)
    .filter(Boolean))];
}

function buildPattern(terms) {
  return terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
}

function findMatchRanges(value, terms) {
  const folded = foldText(value);
  const matches = [];

  terms.forEach((term, termIndex) => {
    if (!term) {
      return;
    }

    const regex = new RegExp(buildPattern([term]), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      matches.push({
        start: folded.map[match.index],
        end: folded.map[match.index + match[0].length - 1] + 1,
        termIndex
      });
    }
  });

  return mergeRanges(matches);
}

function mergeRanges(matches) {
  return matches
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .reduce((ranges, match) => {
      const previous = ranges[ranges.length - 1];
      if (previous && match.start < previous.end) {
        if (match.end > previous.end) {
          previous.end = match.end;
        }
      } else {
        ranges.push({ ...match });
      }
      return ranges;
    }, []);
}

function foldText(value) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const folded = (TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, "")).toLocaleLowerCase();
    Array.from(folded).forEach((foldedChar) => {
      text += foldedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
