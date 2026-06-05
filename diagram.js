const DIAGRAM_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" }
];

const diagramState = {
  texts: [],
  query: "",
  multipleWords: true,
  wholeWord: true,
  caseSensitive: false
};

const queryEl = document.querySelector("#diagram-query");
const multipleEl = document.querySelector("#diagram-multiple");
const wholeWordEl = document.querySelector("#diagram-whole-word");
const caseEl = document.querySelector("#diagram-case-sensitive");
const statusEl = document.querySelector("#diagram-status");
const toolEl = document.querySelector("#diagram-tool");

const HIGHLIGHT_CLASS_COUNT = 6;
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

initDiagram();

async function initDiagram() {
  bindDiagramEvents();

  try {
    diagramState.texts = await Promise.all(DIAGRAM_TEXTS.map(loadText));
    statusEl.textContent = `${diagramState.texts.length} texts ready`;
    renderDiagram();
  } catch (error) {
    statusEl.textContent = "Text loading failed";
    toolEl.innerHTML = `<div class="empty-state">The text files could not be loaded.</div>`;
    console.error(error);
  }
}

function bindDiagramEvents() {
  queryEl.addEventListener("input", () => {
    diagramState.query = queryEl.value.trim();
    renderDiagram();
  });

  multipleEl.addEventListener("change", () => {
    diagramState.multipleWords = multipleEl.checked;
    renderDiagram();
  });

  wholeWordEl.addEventListener("change", () => {
    diagramState.wholeWord = wholeWordEl.checked;
    renderDiagram();
  });

  caseEl.addEventListener("change", () => {
    diagramState.caseSensitive = caseEl.checked;
    renderDiagram();
  });
}

async function loadText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  return {
    ...config,
    raw,
    records: parseRecords(raw)
  };
}

function renderDiagram() {
  const search = createSearch(diagramState.query);
  if (!search) {
    statusEl.textContent = `${diagramState.texts.length} texts ready`;
    toolEl.innerHTML = `
      <article class="diagram-card">
        <header>
          <div>
            <div class="siglum">Diagram</div>
            <h2>Vertical Occurrence Comparison</h2>
          </div>
          <span class="count-pill">0</span>
        </header>
        <div class="empty-state">
          Search a word or several words to compare their occurrences across all four texts.
        </div>
      </article>
    `;
    return;
  }

  const summaries = diagramState.texts.map((text) => getOccurrenceSummary(text, search));
  const maxTotal = Math.max(1, ...summaries.map((summary) => summary.total));
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const textsWithHits = summaries.filter((summary) => summary.total > 0).length;
  const variantLabel = search.terms.length > 1 ? ` | ${search.terms.length} words` : "";
  statusEl.textContent = `${textsWithHits} of ${summaries.length} texts | ${total} occurrences${variantLabel}`;

  toolEl.innerHTML = `
    <article class="diagram-card diagram-standalone-card">
      <header>
        <div>
          <div class="siglum">Diagram</div>
          <h2>Occurrence Frequency by Text</h2>
        </div>
        <span class="count-pill ${total ? "hit" : "miss"}">${total}</span>
      </header>

      <div class="term-legend" aria-label="Searched word legend">
        ${search.terms.map((term, index) => `
          <span><i class="legend-swatch term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"></i>${escapeHtml(term)}</span>
        `).join("")}
      </div>

      <section class="diagram-split" aria-label="Diagram and occurrence locations">
        <div class="vertical-chart" aria-label="Occurrence frequency bars">
          ${summaries.map((summary) => renderVerticalBar(summary, maxTotal)).join("")}
        </div>
        <div class="linear-occurrences" aria-label="Linear occurrence lists">
          ${summaries.map((summary) => renderLinearOccurrences(summary, search.terms)).join("")}
        </div>
      </section>
    </article>
  `;
}

function renderVerticalBar(summary, maxTotal) {
  const height = summary.total ? Math.max(8, (summary.total / maxTotal) * 100) : 0;

  return `
    <section class="vertical-bar-group">
      <div class="vertical-bar-shell" aria-label="${escapeHtml(summary.text.siglum)} ${summary.total} occurrences">
        <div class="vertical-bar-stack" style="height: ${height.toFixed(2)}%">
          ${summary.termCounts.map((count, index) => count ? `
            <span
              class="vertical-bar-segment term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"
              style="height: ${(count / summary.total) * 100}%"
              title="${escapeHtml(summary.terms[index])}: ${count}"
            ></span>
          ` : "").join("")}
        </div>
      </div>
      <div class="vertical-bar-label">
        <strong>${escapeHtml(summary.text.siglum)}</strong>
        <span>${summary.total.toLocaleString()}</span>
      </div>
    </section>
  `;
}

function renderLinearOccurrences(summary, terms) {
  return `
    <section class="linear-occurrence-card">
      <header>
        <div>
          <div class="siglum">${escapeHtml(summary.text.siglum)}</div>
          <h2>${escapeHtml(summary.text.title)}</h2>
        </div>
        <span class="count-pill ${summary.total ? "hit" : "miss"}">${summary.total}</span>
      </header>
      <div class="linear-lines">
        ${terms.map((term, termIndex) => {
          const locations = summary.occurrences
            .filter((occurrence) => occurrence.termIndex === termIndex)
            .map((occurrence) => occurrence.location);
          return `
            <p>
              <mark class="term-${(termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${escapeHtml(term)}</mark>:
              ${locations.length ? locations.map(escapeHtml).join(", ") : "none"}
            </p>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getOccurrenceSummary(text, search) {
  const termCounts = search.terms.map(() => 0);
  const occurrences = [];

  text.records.forEach((record) => {
    findTermOccurrences(record.text, search.terms).forEach((occurrence) => {
      termCounts[occurrence.termIndex] += 1;
      occurrences.push({
        location: record.location,
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

function findTermOccurrences(text, terms) {
  const folded = foldText(text, diagramState.caseSensitive);
  const occurrences = [];

  terms.forEach((term, termIndex) => {
    const foldedTerm = foldText(term, diagramState.caseSensitive).text;
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

  return { terms };
}

function getSearchTerms(query) {
  const terms = diagramState.multipleWords ? query.split(/[,\s;]+/) : [query];
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

function buildPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return diagramState.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
}

function parseRecords(raw) {
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
      const hasTsvShape = isTsvRecord(trimmed) && !trimmed.startsWith("#");

      return {
        index,
        location: hasTsvShape ? formatTsvLocation(columns) : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
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
