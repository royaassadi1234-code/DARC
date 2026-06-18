const CHAPTER_DIAGRAM_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" }
];

const chapterDiagramState = {
  texts: [],
  query: "",
  phraseSearch: false,
  wholeWord: true,
  caseSensitive: false,
  latestSummaries: []
};

const chapterQueryEl = document.querySelector("#chapter-diagram-query");
const chapterPhraseEl = document.querySelector("#chapter-diagram-phrase");
const chapterWholeWordEl = document.querySelector("#chapter-diagram-whole-word");
const chapterCaseEl = document.querySelector("#chapter-diagram-case-sensitive");
const chapterStatusEl = document.querySelector("#chapter-diagram-status");
const chapterToolEl = document.querySelector("#chapter-diagram-tool");

const CHAPTER_TRANSLITERATION_MAP = {
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

initChapterDiagram();

async function initChapterDiagram() {
  bindChapterDiagramEvents();

  try {
    chapterDiagramState.texts = await Promise.all(CHAPTER_DIAGRAM_TEXTS.map(loadChapterDiagramText));
    chapterStatusEl.textContent = "DD, PY, and WZ ready";
    renderChapterDiagram();
  } catch (error) {
    chapterStatusEl.textContent = "Text loading failed";
    chapterToolEl.innerHTML = `<div class="empty-state">DD, PY, and WZ could not be loaded.</div>`;
    console.error(error);
  }
}

function bindChapterDiagramEvents() {
  chapterQueryEl.addEventListener("input", () => {
    chapterDiagramState.query = chapterQueryEl.value.trim();
    renderChapterDiagram();
  });

  chapterPhraseEl.addEventListener("change", () => {
    chapterDiagramState.phraseSearch = chapterPhraseEl.checked;
    renderChapterDiagram();
  });

  chapterWholeWordEl.addEventListener("change", () => {
    chapterDiagramState.wholeWord = chapterWholeWordEl.checked;
    renderChapterDiagram();
  });

  chapterCaseEl.addEventListener("change", () => {
    chapterDiagramState.caseSensitive = chapterCaseEl.checked;
    renderChapterDiagram();
  });

  chapterToolEl.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-chapter-diagram]");
    if (copyButton) {
      copyChapterDiagram(copyButton);
    }
  });
}

async function loadChapterDiagramText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  return {
    ...config,
    records: parseChapterRecords(raw)
  };
}

function renderChapterDiagram() {
  const search = createChapterSearch(chapterDiagramState.query);
  if (!search) {
    chapterDiagramState.latestSummaries = [];
    chapterStatusEl.textContent = `${chapterDiagramState.texts.length} texts ready`;
    chapterToolEl.innerHTML = `
      <article class="diagram-card">
        <header>
          <div>
            <div class="siglum">Diagram</div>
            <h2>Chapter-Based Attestation</h2>
          </div>
          <span class="count-pill">0</span>
        </header>
        <div class="empty-state">
          Search a word or phrase to see its occurrence across DD, PY, and WZ chapters.
        </div>
      </article>
    `;
    return;
  }

  const summaries = chapterDiagramState.texts.map((text) => getChapterSummary(text, search));
  chapterDiagramState.latestSummaries = summaries;
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const chaptersWithHits = summaries.reduce((sum, summary) => sum + summary.chapters.filter((chapter) => chapter.total > 0).length, 0);
  const maxCount = Math.max(1, ...summaries.flatMap((summary) => summary.chapters.map((chapter) => chapter.total)));
  chapterStatusEl.textContent = `${total.toLocaleString()} occurrences in ${chaptersWithHits.toLocaleString()} chapters`;

  chapterToolEl.innerHTML = `
    <article class="diagram-card chapter-diagram-card">
      <header>
        <div>
          <div class="siglum">Chapter diagram</div>
          <h2>Occurrence by Chapter</h2>
        </div>
        <div class="diagram-actions">
          <button class="copy-tool-button" type="button" data-copy-chapter-diagram>Copy data</button>
          <span class="count-pill">${total.toLocaleString()}</span>
        </div>
      </header>
      <div class="term-legend">
        <span><i class="legend-swatch term-1"></i>${escapeChapterHtml(search.label)}</span>
      </div>
      <section class="chapter-diagram-grid" aria-label="Chapter occurrence diagram">
        ${summaries.map((summary) => renderChapterTextPanel(summary, maxCount)).join("")}
      </section>
    </article>
  `;
}

function getChapterSummary(text, search) {
  const chapterMap = new Map();

  text.records.forEach((record) => {
    const occurrences = findChapterOccurrences(record.text, search.terms);
    if (!occurrences.length) {
      return;
    }

    const chapterKey = getChapterKey(record.location);
    const entry = chapterMap.get(chapterKey) || {
      chapter: chapterKey,
      total: 0,
      locations: new Map()
    };
    entry.total += occurrences.length;
    entry.locations.set(record.location, (entry.locations.get(record.location) || 0) + occurrences.length);
    chapterMap.set(chapterKey, entry);
  });

  const chapters = [...chapterMap.values()].sort((a, b) => compareChapterKeys(a.chapter, b.chapter));
  return {
    text,
    chapters,
    total: chapters.reduce((sum, chapter) => sum + chapter.total, 0)
  };
}

function renderChapterTextPanel(summary, maxCount) {
  return `
    <section class="diagram-result-column chapter-diagram-panel">
      <header>
        <div>
          <div class="siglum">${escapeChapterHtml(summary.text.siglum)}</div>
          <h3>${escapeChapterHtml(summary.text.title)}</h3>
        </div>
        <span class="count-pill">${summary.total.toLocaleString()}</span>
      </header>
      <div class="chapter-bar-list">
        ${summary.chapters.length
          ? summary.chapters.map((chapter) => renderChapterBar(chapter, maxCount)).join("")
          : `<div class="empty-state">No chapter occurrences.</div>`}
      </div>
    </section>
  `;
}

function renderChapterBar(chapter, maxCount) {
  const percent = maxCount ? (chapter.total / maxCount) * 100 : 0;
  const locations = [...chapter.locations.entries()]
    .map(([location, count]) => `${location} (${count})`)
    .join(", ");
  return `
    <article class="chapter-bar-row" title="${escapeChapterHtml(locations)}">
      <span class="chapter-label">Chapter ${escapeChapterHtml(chapter.chapter)}</span>
      <span class="chapter-bar-track" aria-hidden="true">
        <span class="chapter-bar-fill" style="width: ${percent.toFixed(2)}%"></span>
      </span>
      <strong>${chapter.total.toLocaleString()}</strong>
    </article>
  `;
}

function createChapterSearch(query) {
  if (!query) {
    return null;
  }

  const terms = chapterDiagramState.phraseSearch
    ? [query]
    : query.split(/[,;]+/).map((term) => term.trim()).filter(Boolean);
  if (!terms.length) {
    return null;
  }

  return {
    label: terms.join(", "),
    terms
  };
}

function findChapterOccurrences(text, terms) {
  const folded = foldChapterText(text, chapterDiagramState.caseSensitive);
  const occurrences = [];

  terms.forEach((term) => {
    const variants = getChapterSearchVariants(term);
    if (!variants.length) {
      return;
    }

    const regex = new RegExp(buildChapterPattern(variants), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      occurrences.push(match[0]);
    }
  });

  return occurrences;
}

function getChapterSearchVariants(term) {
  const folded = foldChapterText(term, chapterDiagramState.caseSensitive).text;
  if (!folded) {
    return [];
  }

  const lexicalVariants = getChapterVariantGroup(folded, getChapterLexicalVariantGroups());
  const hasLexicalVariantGroup = lexicalVariants.length > 1 || lexicalVariants[0] !== folded;
  if (isChapterPhraseTerm(folded) && !hasLexicalVariantGroup) {
    return getChapterPhraseVariants(folded);
  }
  return [...new Set(lexicalVariants)].filter(Boolean);
}

function getChapterLexicalVariantGroups() {
  return [
    ["ahreman", "ahrimen", "ahriman", "aharman", "ahremn", "ahremanag"],
    ["druz", "druj", "drux", "drug", "draoga"],
    ["ohrmazd", "ormazd", "ahura mazda", "ahuramazda", "dadar"],
    ["zadspram", "zadsparam", "zatspram", "zad-spram"],
    ["manuchihr", "manushchihr", "manuschihr", "manuscihr", "manushcihr"]
  ];
}

function getChapterPhraseVariants(term) {
  const parts = term.split(/[\s-]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return [term];
  }

  const phraseVariantGroups = [
    ["gannag", "ganag", "gannak", "ganak", "gandag"],
    ["menog", "menoy", "menok", "minog", "mainyog"]
  ];
  const partVariants = parts.map((part) => getChapterVariantGroup(part, phraseVariantGroups));
  const phrases = new Set();

  function combine(index, current) {
    if (index === partVariants.length) {
      phrases.add(current.join(" "));
      return;
    }
    partVariants[index].forEach((variant) => combine(index + 1, [...current, variant]));
  }

  combine(0, []);
  return [...phrases];
}

function getChapterVariantGroup(term, groups) {
  return groups.find((group) => group.includes(term)) || [term];
}

function buildChapterPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(termToChapterPattern)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return chapterDiagramState.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
}

function termToChapterPattern(term) {
  return escapeChapterRegExp(term).replace(/(?:\s+|\\-|-)+/g, "[\\s-]+");
}

function isChapterPhraseTerm(term) {
  return /[\s-]/.test(term.trim());
}

function parseChapterRecords(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  const hasTsvRecords = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && isChapterTsvRecord(trimmed);
  });
  return hasTsvRecords ? parseChapterTsvRecords(lines) : parseChapterSectionRecords(lines);
}

function parseChapterTsvRecords(lines) {
  return lines
    .map((line, index) => {
      const trimmed = line.trim();
      const columns = trimmed.split("\t");
      const hasTsvShape = isChapterTsvRecord(trimmed) && !trimmed.startsWith("#");
      return {
        index,
        location: hasTsvShape ? formatChapterTsvLocation(columns) : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
        searchable: hasTsvShape && trimmed.length > 0
      };
    })
    .filter((record) => record.searchable);
}

function parseChapterSectionRecords(lines) {
  const records = [];
  let current = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const section = trimmed.match(/^([0-9]+(?:\.[0-9]+[a-z]?)?)\s+(.*)$/);
    if (section) {
      current = {
        index,
        location: section[1],
        text: section[2],
        searchable: true
      };
      records.push(current);
      return;
    }

    if (current) {
      current.text += ` ${trimmed}`;
      return;
    }

    records.push({
      index,
      location: `line ${index + 1}`,
      text: trimmed,
      searchable: true
    });
  });

  return records;
}

function isChapterTsvRecord(line) {
  const columns = line.split("\t");
  return columns.length >= 3 &&
    columns[0].trim().length > 0 &&
    columns[1].trim().length > 0 &&
    columns.slice(2).join(" ").trim().length > 0;
}

function formatChapterTsvLocation(columns) {
  const first = columns[0].trim();
  const second = columns[1].trim();
  if (/outdated|K35/i.test(first)) {
    return second.replace(/^[A-Za-z]+\s+/, "");
  }
  return second || first;
}

function getChapterKey(location) {
  const normalized = String(location || "").trim();
  if (/^line\s+\d+/i.test(normalized)) {
    return "Unnumbered";
  }
  const match = normalized.match(/([0-9]+)/);
  return match ? match[1] : "Unnumbered";
}

function compareChapterKeys(a, b) {
  const aNumber = Number(a);
  const bNumber = Number(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }
  return String(a).localeCompare(String(b));
}

function copyChapterDiagram(button) {
  const lines = [["Text", "Chapter", "Occurrences", "Locations"].join("\t")];
  chapterDiagramState.latestSummaries.forEach((summary) => {
    summary.chapters.forEach((chapter) => {
      const locations = [...chapter.locations.entries()].map(([location, count]) => `${location} (${count})`).join(", ");
      lines.push([summary.text.siglum, chapter.chapter, chapter.total, locations].join("\t"));
    });
  });

  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = "Copy data";
    }, 1400);
  });
}

function foldChapterText(value, caseSensitive = false) {
  const source = String(value || "");
  const chars = [];
  const map = [];
  for (let index = 0; index < source.length; index += 1) {
    const replacement = CHAPTER_TRANSLITERATION_MAP[source[index]] || source[index];
    const normalized = replacement.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const char of normalized) {
      chars.push(caseSensitive ? char : char.toLowerCase());
      map.push(index);
    }
  }
  return { text: chars.join(""), map };
}

function escapeChapterRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeChapterHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
