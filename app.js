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
    id: "nm",
    siglum: "NM",
    title: "Namagiha ī Manuščihr",
    file: "NM.txt",
    language: "Middle Persian",
    translation: null,
    themes: []
  },
  {
    id: "py",
    siglum: "PY-Pt4",
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
  }
];

const state = {
  texts: [],
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
const occurrenceEl = document.querySelector("#occurrence-panel");
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

init();

async function init() {
  bindEvents();

  try {
    state.texts = await Promise.all(TEXTS.map(loadText));
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
  const occurrences = state.texts.map((text) => getOccurrenceSummary(text, search));

  renderOverview(summaries, search);
  renderOccurrenceDiagram(occurrences, search);
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

function renderOccurrenceDiagram(occurrences, search) {
  if (!search) {
    occurrenceEl.innerHTML = `
      <article class="diagram-card">
        <header>
          <div>
            <div class="siglum">Diagram</div>
            <h2>Occurrence Diagram</h2>
          </div>
          <span class="count-pill">0</span>
        </header>
        <div class="empty-state">
          Search a word or several words to see a diagram comparison and the chapter/stanza trail for each text.
        </div>
      </article>
    `;
    return;
  }

  const maxTotal = Math.max(1, ...occurrences.map((summary) => summary.total));
  const totalOccurrences = occurrences.reduce((sum, summary) => sum + summary.total, 0);

  occurrenceEl.innerHTML = `
    <article class="diagram-card">
      <header>
        <div>
          <div class="siglum">Diagram</div>
          <h2>Occurrence Diagram</h2>
        </div>
        <span class="count-pill ${totalOccurrences ? "hit" : "miss"}">${totalOccurrences}</span>
      </header>

      <div class="term-legend" aria-label="Searched word legend">
        ${search.terms.map((term, index) => `
          <span><i class="legend-swatch term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"></i>${escapeHtml(term)}</span>
        `).join("")}
      </div>

      <p class="diagram-note">Bars show total occurrences in each text. The lists below give every chapter/stanza or line location.</p>

      <div class="occurrence-chart" aria-label="Occurrence bars">
        ${occurrences.map((summary) => renderOccurrenceRow(summary, maxTotal)).join("")}
      </div>

      <div class="occurrence-locations" aria-label="Chapter and stanza locations">
        ${occurrences.map(renderOccurrenceLocations).join("")}
      </div>
    </article>
  `;
}

function renderOccurrenceRow(summary, maxTotal) {
  return `
    <section class="occurrence-row">
      <div class="occurrence-label">
        <strong>${escapeHtml(summary.text.siglum)}</strong>
        <span>${summary.total.toLocaleString()}</span>
      </div>
      <div class="occurrence-track" aria-label="${escapeHtml(summary.text.siglum)} occurrence count">
        <div class="occurrence-stack" style="width: ${summary.total ? Math.max(2, (summary.total / maxTotal) * 100).toFixed(2) : 0}%">
          ${summary.termCounts.map((count, index) => count ? `
            <span
              class="occurrence-segment term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"
              style="width: ${(count / summary.total) * 100}%"
              title="${escapeHtml(summary.terms[index])}: ${count}"
            ></span>
          ` : "").join("")}
        </div>
      </div>
    </section>
  `;
}

function renderOccurrenceLocations(summary) {
  return `
    <section class="occurrence-location-card">
      <header>
        <div>
          <div class="siglum">${escapeHtml(summary.text.siglum)}</div>
          <h2>${escapeHtml(summary.text.title)}</h2>
        </div>
        <span class="count-pill ${summary.total ? "hit" : "miss"}">${summary.total}</span>
      </header>
      ${summary.occurrences.length ? `
        <ol class="occurrence-list">
          ${summary.occurrences.map((occurrence) => `
            <li>
              <span class="location">${escapeHtml(occurrence.location)}</span>
              <mark class="term-${(occurrence.termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${escapeHtml(occurrence.term)}</mark>
            </li>
          `).join("")}
        </ol>
      ` : `<div class="empty-state">No occurrences in this text.</div>`}
    </section>
  `;
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
            <p class="snippet">${highlight(match.snippet)}</p>
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

function getOccurrenceSummary(text, search) {
  if (!search) {
    return {
      text,
      terms: [],
      termCounts: [],
      occurrences: [],
      total: 0
    };
  }

  const termCounts = search.terms.map(() => 0);
  const occurrences = [];

  text.records.forEach((record) => {
    findTermOccurrences(record.text, search.terms).forEach((occurrence) => {
      termCounts[occurrence.termIndex] += 1;
      occurrences.push({
        location: record.location,
        term: search.terms[occurrence.termIndex],
        termIndex: occurrence.termIndex
      });
    });
  });

  return {
    text,
    terms: search.terms,
    termCounts,
    occurrences,
    total: occurrences.length
  };
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

function findTermOccurrences(text, terms) {
  const folded = foldText(text, state.caseSensitive);
  const occurrences = [];

  terms.forEach((term, termIndex) => {
    const foldedTerm = foldText(term, state.caseSensitive).text;
    if (!foldedTerm) {
      return;
    }

    const regex = new RegExp(buildPattern([foldedTerm]), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      occurrences.push({
        start: folded.map[match.index],
        termIndex
      });
    }
  });

  return occurrences.sort((a, b) => a.start - b.start || a.termIndex - b.termIndex);
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

function highlight(text) {
  const search = createSearch(state.query);
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
