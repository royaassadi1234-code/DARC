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
  contextSize: 2
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
    render();
  });

  variantInput.addEventListener("change", () => {
    state.variantSearch = variantInput.checked;
    render();
  });

  wholeWordInput.addEventListener("change", () => {
    state.wholeWord = wholeWordInput.checked;
    render();
  });

  caseInput.addEventListener("change", () => {
    state.caseSensitive = caseInput.checked;
    render();
  });

  contextSelect.addEventListener("change", () => {
    state.contextSize = Number(contextSelect.value);
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
    return trimmed && !trimmed.startsWith("#") && trimmed.split("\t").length >= 3;
  });

  return hasTsvRecords ? parseTsvRecords(lines) : parseSectionRecords(lines);
}

function parseTsvRecords(lines) {
  return lines
    .map((line, index) => {
      const trimmed = line.trim();
      const columns = trimmed.split("\t");
      const isComment = trimmed.startsWith("#");
      const hasTsvShape = columns.length >= 3 && !isComment;

      return {
        index,
        location: hasTsvShape ? columns.slice(0, 2).join(" · ") : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
        sourceLine: trimmed,
        searchable: hasTsvShape && trimmed.length > 0
      };
    })
    .filter((record) => record.searchable);
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
        ${total ? renderMatchList(matches, total) : `<div class="empty-state">No matches in this text.</div>`}
      </article>
    `)
    .join("");
}

function renderMatchList(matches, total) {
  const visible = matches.slice(0, 12);
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
    ${total > visible.length ? `<div class="more">${total - visible.length} more matches in this text</div>` : ""}
  `;
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
        snippet: makeSnippet(text.records, recordIndex)
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

function makeSnippet(records, recordIndex) {
  const start = Math.max(0, recordIndex - state.contextSize);
  const end = Math.min(records.length, recordIndex + state.contextSize + 1);
  return records
    .slice(start, end)
    .map((record) => record.text)
    .join(" ");
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
