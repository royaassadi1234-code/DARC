const THEME_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" }
];

const themeState = {
  texts: [],
  themes: [],
  selectedThemeId: "",
  keywords: "",
  wholeWord: true,
  caseSensitive: false,
  contextSize: 2,
  pages: {}
};

const themeSelectEl = document.querySelector("#theme-select");
const keywordEl = document.querySelector("#theme-keywords");
const wholeWordEl = document.querySelector("#theme-whole-word");
const caseSensitiveEl = document.querySelector("#theme-case-sensitive");
const contextEl = document.querySelector("#theme-context");
const statusEl = document.querySelector("#theme-status");
const overviewEl = document.querySelector("#theme-overview");
const comparisonEl = document.querySelector("#theme-comparison");

const THEME_PAGE_SIZE = 5;
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

initThemes();

async function initThemes() {
  bindThemeEvents();

  try {
    const [themes, texts] = await Promise.all([
      loadThemes(),
      Promise.all(THEME_TEXTS.map(loadText))
    ]);

    themeState.themes = themes;
    themeState.texts = texts;
    themeState.selectedThemeId = themes[0]?.id || "";
    populateThemeSelect();
    syncKeywordInput();
    renderThemes();
  } catch (error) {
    statusEl.textContent = "Theme loading failed";
    comparisonEl.innerHTML = `<div class="empty-state">The theme comparison data could not be loaded.</div>`;
    console.error(error);
  }
}

function bindThemeEvents() {
  themeSelectEl.addEventListener("change", () => {
    themeState.selectedThemeId = themeSelectEl.value;
    syncKeywordInput();
    resetPages();
    renderThemes();
  });

  keywordEl.addEventListener("input", () => {
    themeState.keywords = keywordEl.value.trim();
    resetPages();
    renderThemes();
  });

  wholeWordEl.addEventListener("change", () => {
    themeState.wholeWord = wholeWordEl.checked;
    resetPages();
    renderThemes();
  });

  caseSensitiveEl.addEventListener("change", () => {
    themeState.caseSensitive = caseSensitiveEl.checked;
    resetPages();
    renderThemes();
  });

  contextEl.addEventListener("change", () => {
    themeState.contextSize = Number(contextEl.value);
    resetPages();
    renderThemes();
  });

  comparisonEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-page]");
    if (!button) {
      return;
    }

    themeState.pages[button.dataset.textId] = Number(button.dataset.themePage);
    renderThemes();
  });
}

async function loadThemes() {
  const response = await fetch("themes-data.json");
  if (!response.ok) {
    throw new Error("Could not load themes-data.json");
  }
  return response.json();
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

function populateThemeSelect() {
  themeSelectEl.innerHTML = themeState.themes
    .map((theme) => `<option value="${escapeHtml(theme.id)}">${escapeHtml(theme.label)}</option>`)
    .join("");
  themeSelectEl.value = themeState.selectedThemeId;
}

function syncKeywordInput() {
  const theme = getSelectedTheme();
  themeState.keywords = (theme?.keywords || []).join(", ");
  keywordEl.value = themeState.keywords;
}

function renderThemes() {
  const theme = getSelectedTheme();
  if (!theme) {
    statusEl.textContent = "No themes";
    overviewEl.innerHTML = "";
    comparisonEl.innerHTML = `<div class="empty-state">Add a theme to themes-data.json to begin.</div>`;
    return;
  }

  const terms = getKeywordTerms();
  const results = themeState.texts.map((text) => getThemeMatches(text, terms));
  const totalHits = results.reduce((sum, result) => sum + result.matches.length, 0);
  const textHits = results.filter((result) => result.matches.length > 0).length;

  statusEl.textContent = `${textHits} of ${results.length} texts | ${totalHits} passages`;
  renderThemeOverview(theme, terms, results);
  renderThemeComparison(results, terms);
}

function renderThemeOverview(theme, terms, results) {
  overviewEl.innerHTML = `
    <article class="text-card theme-description-card">
      <div class="siglum">Theme</div>
      <h2>${escapeHtml(theme.label)}</h2>
      <p class="meta">${escapeHtml(theme.description || "Keyword-assisted theme comparison")}</p>
    </article>
    <article class="text-card">
      <div class="siglum">Keywords</div>
      <h2>${terms.length.toLocaleString()}</h2>
      <p class="meta">${escapeHtml(terms.slice(0, 10).join(", "))}${terms.length > 10 ? " ..." : ""}</p>
    </article>
    ${results
      .map((result) => `
        <article class="text-card">
          <div class="siglum">${escapeHtml(result.text.siglum)}</div>
          <h2>${result.matches.length.toLocaleString()}</h2>
          <p class="meta">Suggested theme passages</p>
        </article>
      `)
      .join("")}
  `;
}

function renderThemeComparison(results, terms) {
  if (!terms.length) {
    comparisonEl.innerHTML = `<div class="empty-state">Enter one or more keywords to compare this theme.</div>`;
    return;
  }

  comparisonEl.innerHTML = results
    .map((result) => renderThemeColumn(result, terms))
    .join("");
}

function renderThemeColumn(result, terms) {
  const total = result.matches.length;
  const pageCount = Math.max(1, Math.ceil(total / THEME_PAGE_SIZE));
  const currentPage = clampPage(themeState.pages[result.text.id] || 1, pageCount);
  themeState.pages[result.text.id] = currentPage;
  const start = (currentPage - 1) * THEME_PAGE_SIZE;
  const visible = result.matches.slice(start, start + THEME_PAGE_SIZE);

  return `
    <article class="theme-column">
      <header>
        <div>
          <div class="siglum">${escapeHtml(result.text.siglum)}</div>
          <h2>${escapeHtml(result.text.title)}</h2>
        </div>
        <span class="count-pill ${total ? "hit" : "miss"}">${total}</span>
      </header>
      <div class="theme-passages">
        ${visible.length ? visible.map((match) => renderThemeHit(match, terms)).join("") : `<div class="empty-state">No suggested passages for this theme.</div>`}
      </div>
      ${total > THEME_PAGE_SIZE ? renderThemePagination(result.text.id, currentPage, pageCount) : ""}
    </article>
  `;
}

function renderThemeHit(match, terms) {
  return `
    <section class="theme-hit">
      <div class="theme-hit-meta">
        <span>${escapeHtml(match.location)}</span>
        <span>${match.score} keyword${match.score === 1 ? "" : "s"}</span>
      </div>
      <p>${highlightTheme(match.snippet, terms)}</p>
    </section>
  `;
}

function renderThemePagination(textId, currentPage, pageCount) {
  return `
    <nav class="rank-pagination result-pagination" aria-label="Theme result pages">
      ${getVisiblePages(currentPage, pageCount)
        .map((page) => page === "gap"
          ? `<span class="page-gap" aria-hidden="true">...</span>`
          : `<button
              class="page-dot ${page === currentPage ? "active" : ""}"
              type="button"
              data-text-id="${escapeHtml(textId)}"
              data-theme-page="${page}"
              aria-label="Show theme result page ${page}"
              ${page === currentPage ? `aria-current="page"` : ""}
            >${page}</button>`)
        .join("")}
    </nav>
  `;
}

function getThemeMatches(text, terms) {
  if (!terms.length) {
    return { text, matches: [] };
  }

  const matches = text.records
    .map((record, recordIndex) => {
      const ranges = findMatchRanges(record.text, terms);
      if (!ranges.length) {
        return null;
      }

      return {
        location: record.location,
        score: new Set(ranges.map((range) => range.termIndex)).size,
        snippet: makeSnippet(text.records, recordIndex, terms)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || compareLocations(a.location, b.location));

  return { text, matches };
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
  return [first, second].filter(Boolean).join(" | ");
}

function makeSnippet(records, recordIndex, terms) {
  const text = records[recordIndex].text;
  const ranges = findMatchRanges(text, terms);
  if (ranges.length) {
    const first = ranges[0];
    const radius = 220 + themeState.contextSize * 80;
    const start = Math.max(0, first.start - radius);
    const end = Math.min(text.length, first.end + radius);
    const prefix = start > 0 ? "... " : "";
    const suffix = end < text.length ? " ..." : "";
    return `${prefix}${text.slice(start, end)}${suffix}`;
  }

  const start = Math.max(0, recordIndex - themeState.contextSize);
  const end = Math.min(records.length, recordIndex + themeState.contextSize + 1);
  return records.slice(start, end).map((record) => record.text).join(" ");
}

function highlightTheme(text, terms) {
  const ranges = findMatchRanges(text, terms);
  if (!ranges.length) {
    return escapeHtml(text);
  }

  let html = "";
  let cursor = 0;
  ranges.forEach(({ start, end }) => {
    html += escapeHtml(text.slice(cursor, start));
    html += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  });
  html += escapeHtml(text.slice(cursor));
  return html;
}

function findMatchRanges(text, terms) {
  const folded = foldText(text, themeState.caseSensitive);
  const ranges = [];

  terms.forEach((term, termIndex) => {
    const foldedTerm = foldText(term, themeState.caseSensitive).text;
    if (!foldedTerm) {
      return;
    }

    const regex = new RegExp(buildPattern([foldedTerm]), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      ranges.push({
        start: folded.map[match.index],
        end: folded.map[match.index + match[0].length - 1] + 1,
        termIndex
      });
    }
  });

  return mergeRanges(ranges);
}

function getKeywordTerms() {
  return [...new Set(themeState.keywords
    .split(/[,\n;]+/)
    .map((term) => term.trim())
    .filter(Boolean))];
}

function buildPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return themeState.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
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

function mergeRanges(ranges) {
  return ranges
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .reduce((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start < previous.end) {
        if (range.end > previous.end) {
          previous.end = range.end;
        }
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);
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

function compareLocations(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function getSelectedTheme() {
  return themeState.themes.find((theme) => theme.id === themeState.selectedThemeId);
}

function clampPage(page, pageCount) {
  return Math.min(Math.max(page, 1), pageCount);
}

function resetPages() {
  themeState.pages = {};
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
