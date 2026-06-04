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
  wholeWord: true,
  caseSensitive: false,
  contextSize: 2
};

const queryInput = document.querySelector("#query");
const wholeWordInput = document.querySelector("#whole-word");
const caseInput = document.querySelector("#case-sensitive");
const contextSelect = document.querySelector("#context-size");
const statusEl = document.querySelector("#load-status");
const overviewEl = document.querySelector("#overview");
const resultsEl = document.querySelector("#results");

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
  return raw
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      const columns = trimmed.split("\t");
      const isComment = trimmed.startsWith("#");
      const hasTsvShape = columns.length >= 3 && !isComment;

      return {
        index,
        location: hasTsvShape ? columns.slice(0, 2).join(" · ") : inferLocation(trimmed, index),
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
        sourceLine: trimmed,
        searchable: !isComment && trimmed.length > 0
      };
    })
    .filter((record) => record.searchable);
}

function inferLocation(line, index) {
  const match = line.match(/^([0-9]+(?:\.[0-9]+[a-z]?)?)/);
  return match ? match[1] : `line ${index + 1}`;
}

function render() {
  const search = createSearch(state.query);
  const summaries = state.texts.map((text) => getMatches(text, search));

  renderOverview(summaries);
  renderResults(summaries);
}

function renderOverview(summaries) {
  overviewEl.innerHTML = summaries
    .map(({ text, total }) => `
      <article class="text-card">
        <header>
          <div>
            <div class="siglum">${escapeHtml(text.siglum)}</div>
            <h2>${escapeHtml(text.title)}</h2>
          </div>
          <span class="count-pill ${state.query ? (total ? "hit" : "miss") : ""}">${state.query ? total : "..."}</span>
        </header>
        <p class="meta">${text.records.length.toLocaleString()} searchable lines · ${text.wordCount.toLocaleString()} words</p>
      </article>
    `)
    .join("");
}

function renderResults(summaries) {
  if (!state.query) {
    statusEl.textContent = `${state.texts.length} texts ready`;
    resultsEl.innerHTML = `
      <div class="empty-state">
        Enter a word to compare all four texts at once.
      </div>
    `;
    return;
  }

  const containing = summaries.filter((summary) => summary.total > 0).length;
  const totalHits = summaries.reduce((sum, summary) => sum + summary.total, 0);
  statusEl.textContent = `${containing} of ${summaries.length} texts · ${totalHits} hits`;

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
            <p class="snippet">${highlight(escapeHtml(match.snippet), state.query)}</p>
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
    const target = state.caseSensitive ? record.text : record.text.toLocaleLowerCase();
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

  const escaped = escapeRegExp(state.caseSensitive ? query : query.toLocaleLowerCase());
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  const pattern = state.wholeWord ? `(?<!${boundary})${escaped}(?!${boundary})` : escaped;
  return {
    regex: new RegExp(pattern, "gu")
  };
}

function makeSnippet(records, recordIndex) {
  const start = Math.max(0, recordIndex - state.contextSize);
  const end = Math.min(records.length, recordIndex + state.contextSize + 1);
  return records
    .slice(start, end)
    .map((record) => record.text)
    .join(" ");
}

function highlight(safeText, query) {
  const escaped = escapeRegExp(escapeHtml(query));
  const flags = state.caseSensitive ? "gu" : "giu";
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  const pattern = state.wholeWord ? `(?<!${boundary})${escaped}(?!${boundary})` : escaped;
  return safeText.replace(new RegExp(pattern, flags), (match) => `<mark>${match}</mark>`);
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
