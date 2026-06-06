const TEXTS = [
  {
    id: "dd",
    siglum: "DD",
    title: "Dādestān ī Dēnīg I",
    file: "Dd.txt",
    language: "Middle Persian",
    translation: null,
    themes: []
  },
  {
    id: "py",
    siglum: "PY",
    title: "Pahlavi Yasna",
    file: "PY-Pt4.txt",
    language: "Middle Persian",
    translation: null,
    themes: []
  },
  {
    id: "wz",
    siglum: "WZ",
    title: "Wizīdagīhā ī Zādspram",
    file: "WZ.txt",
    language: "Middle Persian",
    translation: null,
    themes: []
  },
  {
    id: "nm",
    siglum: "NM",
    title: "Namagiha ī Manuščihr",
    file: "NM.txt",
    language: "Middle Persian",
    translation: null,
    themes: []
  }
];

const state = {
  texts: [],
  dictionary: new Map(),
  query: "",
  variantSearch: true,
  wholeWord: true,
  caseSensitive: false,
  contextSize: 2,
  resultPages: {}
};

const queryInput = document.querySelector("#query");
const variantInput = document.querySelector("#variant-search");
const wholeWordInput = document.querySelector("#whole-word");
const caseInput = document.querySelector("#case-sensitive");
const contextSelect = document.querySelector("#context-size");
const statusEl = document.querySelector("#load-status");
const overviewEl = document.querySelector("#overview");
const resultsEl = document.querySelector("#results");
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
const RESULTS_PER_PAGE = 12;
const DICTIONARY_URL = "mpcd-workspace-dictionary.json";

init();

async function init() {
  bindEvents();

  try {
    const [texts, dictionary] = await Promise.all([
      Promise.all(TEXTS.map(loadText)),
      loadDictionary()
    ]);
    state.texts = texts;
    state.dictionary = dictionary;
    statusEl.textContent = `${state.texts.length} texts ready`;
    render();
  } catch (error) {
    statusEl.textContent = "Text loading failed";
    resultsEl.innerHTML = `
      <div class="empty-state">
        The text files could not be loaded. Open this folder through a local server and keep the four .txt files beside index.html.
      </div>
    `;
    console.error(error);
  }
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
      return getDictionaryKeys(entry.word).map((key) => [key, meanings]);
    }));
  } catch (error) {
    console.warn("Dictionary glosses unavailable", error);
    return new Map();
  }
}

function bindEvents() {
  queryInput.addEventListener("input", () => {
    state.query = queryInput.value.trim();
    resetResultPages();
    render();
  });

  variantInput.addEventListener("change", () => {
    state.variantSearch = variantInput.checked;
    resetResultPages();
    render();
  });

  wholeWordInput.addEventListener("change", () => {
    state.wholeWord = wholeWordInput.checked;
    resetResultPages();
    render();
  });

  caseInput.addEventListener("change", () => {
    state.caseSensitive = caseInput.checked;
    resetResultPages();
    render();
  });

  contextSelect.addEventListener("change", () => {
    state.contextSize = Number(contextSelect.value);
    resetResultPages();
    render();
  });

  resultsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-result-page]");
    if (!button) {
      return;
    }

    state.resultPages[button.dataset.textId] = Number(button.dataset.resultPage);
    render();
  });
}

async function loadText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  const records = parseRecords(raw);

  return {
    ...config,
    raw,
    records,
    wordCount: countWords(raw)
  };
}

function parseRecords(raw) {
  // Records are intentionally plain objects so translations or theme tags can be joined here later.
  const lines = raw.split(/\r?\n/);
  const hasTsvRecords = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && isTsvRecord(trimmed);
  });

  return hasTsvRecords ? parseTsvRecords(lines) : parseSectionRecords(lines);
}

function parseTsvRecords(lines) {
  return lines
    .map((line, index) => {
      const trimmed = line.trim();
      const columns = trimmed.split("\t");
      const isComment = trimmed.startsWith("#");
      const hasTsvShape = isTsvRecord(trimmed) && !isComment;

      return {
        index,
        location: hasTsvShape ? formatTsvLocation(columns) : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
        sourceLine: trimmed,
        searchable: hasTsvShape && trimmed.length > 0
      };
    })
    .filter((record) => record.searchable);
}

function isTsvRecord(line) {
  const columns = line.split("\t");
  return columns.length >= 3 &&
    columns[0].trim().length > 0 &&
    columns[1].trim().length > 0 &&
    columns.slice(2).join(" ").trim().length > 0;
}

function formatTsvLocation(columns) {
  const first = columns[0].trim();
  const second = columns[1].trim();
  if (/outdated|K35/i.test(first)) {
    return second.replace(/^[A-Za-z]+\s+/, "");
  }
  return [first, second].filter(Boolean).join(" · ");
}

function parseSectionRecords(lines) {
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
        sourceLine: trimmed,
        searchable: true
      };
      records.push(current);
      return;
    }

    if (current) {
      current.text += ` ${trimmed}`;
      current.sourceLine += ` ${trimmed}`;
      return;
    }

    records.push({
      index,
      location: `line ${index + 1}`,
      text: trimmed,
      sourceLine: trimmed,
      searchable: true
    });
  });

  return records;
}

function render() {
  const search = createSearch(state.query);
  const summaries = state.texts.map((text) => getMatches(text, search));

  renderOverview(summaries, search);
  renderResults(summaries, search);
}

function renderOverview(summaries, search) {
  overviewEl.innerHTML = summaries
    .map(({ text, total }) => `
      <article class="text-card">
        <header>
          <div>
            <div class="siglum">${escapeHtml(text.siglum)}</div>
            <h2>${escapeHtml(text.title)}</h2>
          </div>
          <span class="count-pill ${search ? (total ? "hit" : "miss") : ""}">${search ? total : "..."}</span>
        </header>
        <p class="meta">${text.records.length.toLocaleString()} searchable lines · ${text.wordCount.toLocaleString()} words</p>
      </article>
    `)
    .join("");
}

function renderResults(summaries, search) {
  if (!search) {
    statusEl.textContent = `${state.texts.length} texts ready`;
    resultsEl.innerHTML = `
      <div class="empty-state">
        Enter a word to compare all four texts at once. Plain letters also match diacritics, so dewan finds dēwān.
      </div>
    `;
    return;
  }

  const containing = summaries.filter((summary) => summary.total > 0).length;
  const totalHits = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const variantLabel = search.terms.length > 1 ? ` · ${search.terms.length} terms` : "";
  statusEl.textContent = `${containing} of ${summaries.length} texts · ${totalHits} hits${variantLabel}`;

  resultsEl.innerHTML = summaries
    .map(({ text, matches, total }) => `
      <article class="result-card">
        <header>
          <div>
            <div class="siglum">${escapeHtml(text.siglum)}</div>
            <h2>${escapeHtml(text.title)}</h2>
          </div>
          <span class="count-pill ${total ? "hit" : "miss"}">${total}</span>
        </header>
        ${total ? renderMatchList(text.id, matches, total) : `<div class="empty-state">No matches in this text.</div>`}
      </article>
    `)
    .join("");
}

function renderMatchList(textId, matches, total) {
  const pageCount = Math.ceil(total / RESULTS_PER_PAGE);
  const currentPage = clampPage(state.resultPages[textId] || 1, pageCount);
  state.resultPages[textId] = currentPage;
  const start = (currentPage - 1) * RESULTS_PER_PAGE;
  const visible = matches.slice(start, start + RESULTS_PER_PAGE);

  return `
    <div class="matches">
      ${visible
        .map((match) => `
          <section class="match">
            <div class="location">${escapeHtml(match.location)}</div>
            <div>
              <p class="snippet">${highlight(match.snippet, { annotate: true })}</p>
              <p class="dictionary-translation">${renderDictionaryTranslation(match.snippet)}</p>
            </div>
          </section>
        `)
        .join("")}
    </div>
    ${pageCount > 1 ? renderResultPagination(textId, currentPage, pageCount) : ""}
  `;
}

function renderResultPagination(textId, currentPage, pageCount) {
  return `
    <nav class="rank-pagination result-pagination" aria-label="Result pages">
      ${getVisiblePages(currentPage, pageCount)
        .map((page) => page === "gap"
          ? `<span class="page-gap" aria-hidden="true">...</span>`
          : `<button
              class="page-dot ${page === currentPage ? "active" : ""}"
              type="button"
              data-text-id="${escapeHtml(textId)}"
              data-result-page="${page}"
              aria-label="Show result page ${page}"
              ${page === currentPage ? `aria-current="page"` : ""}
            >${page}</button>`)
        .join("")}
    </nav>
  `;
}

function getVisiblePages(currentPage, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
  const ordered = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return ordered.flatMap((page, index) => {
    if (index === 0 || page === ordered[index - 1] + 1) {
      return [page];
    }
    return ["gap", page];
  });
}

function clampPage(page, pageCount) {
  return Math.min(Math.max(page, 1), pageCount);
}

function resetResultPages() {
  state.resultPages = {};
}

function getMatches(text, search) {
  if (!search) {
    return { text, matches: [], total: 0 };
  }

  const matches = [];

  text.records.forEach((record, recordIndex) => {
    const target = foldText(record.text, state.caseSensitive).text;
    const found = search.regex.test(target);
    search.regex.lastIndex = 0;

    if (found) {
      matches.push({
        location: record.location,
        snippet: makeSnippet(text.records, recordIndex, search)
      });
    }
  });

  return { text, matches, total: matches.length };
}

function createSearch(query) {
  if (!query) {
    return null;
  }

  const terms = getSearchTerms(query);
  if (!terms.length) {
    return null;
  }

  const normalizedTerms = terms.map((term) => foldText(term, state.caseSensitive).text);
  const pattern = buildPattern(normalizedTerms);
  return {
    terms,
    regex: new RegExp(pattern, "gu")
  };
}

function getSearchTerms(query) {
  const terms = state.variantSearch ? query.split(/[,\s;]+/) : [query];
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

function buildPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return state.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
}

function makeSnippet(records, recordIndex, search) {
  const focused = makeFocusedSnippet(records[recordIndex].text, search);
  if (focused) {
    return focused;
  }

  const start = Math.max(0, recordIndex - state.contextSize);
  const end = Math.min(records.length, recordIndex + state.contextSize + 1);
  return records
    .slice(start, end)
    .map((record) => record.text)
    .join(" ");
}

function makeFocusedSnippet(text, search) {
  const ranges = findMatchRanges(text, search.terms);
  if (!ranges.length) {
    return "";
  }

  const first = ranges[0];
  const radius = 240 + state.contextSize * 80;
  const start = Math.max(0, first.start - radius);
  const end = Math.min(text.length, first.end + radius);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function highlight(text, options = {}) {
  const search = createSearch(state.query);
  if (options.annotate) {
    return annotateText(text, search?.terms || []);
  }

  if (!search) {
    return escapeHtml(text);
  }

  const ranges = findMatchRanges(text, search.terms);
  if (!ranges.length) {
    return escapeHtml(text);
  }

  let html = "";
  let cursor = 0;
  ranges.forEach(({ start, end, termIndex }) => {
    html += escapeHtml(text.slice(cursor, start));
    html += `<mark class="term-${(termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  });
  html += escapeHtml(text.slice(cursor));
  return html;
}

function annotateText(value, terms = []) {
  const text = String(value);
  const ranges = terms.length ? findMatchRanges(text, terms) : [];
  const wordPattern = /[\p{L}\p{M}\p{N}=_-]+/gu;
  let html = "";
  let cursor = 0;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    html += highlightSegment(text.slice(cursor, match.index), ranges, cursor);
    const token = match[0];
    const tokenStart = match.index;
    const tokenEnd = tokenStart + token.length;
    const tokenHtml = highlightSegment(token, ranges, tokenStart);
    const meanings = getMeanings(token);
    html += meanings.length
      ? `<span class="dict-word" title="${escapeHtml(meanings.join("; "))}">${tokenHtml}</span>`
      : tokenHtml;
    cursor = tokenEnd;
  }

  html += highlightSegment(text.slice(cursor), ranges, cursor);
  return html;
}

function highlightSegment(segment, ranges, offset) {
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
      html += `<mark class="term-${(range.termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${escapeHtml(segment.slice(start, end))}</mark>`;
      cursor = end;
    });
  html += escapeHtml(segment.slice(cursor));
  return html;
}

function renderDictionaryTranslation(value) {
  const glosses = getWordTokens(value)
    .map((token) => {
      const meanings = getMeanings(token);
      return meanings.length ? meanings.slice(0, 2).join("/") : "...";
    })
    .filter(Boolean);

  return glosses.length
    ? `<span>English dictionary gloss:</span> ${glosses.map(escapeHtml).join(" ")}`
    : `<span>English dictionary gloss:</span> unavailable`;
}

function getWordTokens(value) {
  return String(value).match(/[\p{L}\p{M}\p{N}=_-]+/gu) || [];
}

function getMeanings(token) {
  for (const key of getDictionaryKeys(token)) {
    const meanings = state.dictionary.get(key);
    if (meanings?.length) {
      return meanings;
    }
  }
  return [];
}

function getDictionaryKeys(value) {
  const raw = String(value).trim();
  const trimmed = raw.replace(/^[=_.:;,[\](){}<>]+|[=_.:;,[\](){}<>]+$/g, "");
  return [...new Set([
    raw,
    trimmed,
    foldText(raw).text,
    foldText(trimmed).text
  ].map((key) => key.toLowerCase()).filter(Boolean))];
}

function findMatchRanges(text, terms) {
  const folded = foldText(text, state.caseSensitive);
  const matches = [];

  terms.forEach((term, termIndex) => {
    const foldedTerm = foldText(term, state.caseSensitive).text;
    if (!foldedTerm) {
      return;
    }

    const regex = new RegExp(buildPattern([foldedTerm]), "gu");
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

function foldText(value, caseSensitive = false) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const folded = TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, "");
    const normalized = caseSensitive ? folded : folded.toLocaleLowerCase();
    Array.from(normalized).forEach((foldedChar) => {
      text += foldedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function countWords(raw) {
  return (raw.match(/[\p{L}\p{M}\p{N}_=-]+/gu) || []).length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
