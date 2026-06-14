const FREQUENCY_TEXTS = [
  { id: "dd", siglum: "DD", title: "D\u0101dest\u0101n \u012b D\u0113n\u012bg", file: "Dd.txt" },
  { id: "wz", siglum: "WZ", title: "Wiz\u012bdag\u012bh\u0101 \u012b Z\u0101dspram", file: "WZ.txt" }
];

const PERSONAL_COMMON_STORAGE_KEY = "darcPersonalCommonWords";

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

const BASE_COMMON_WORDS = new Set([
  "a", "abar", "an", "andar", "az", "be", "bud", "ce", "ceg", "cegon", "ciyon",
  "dar", "ed", "eg", "est", "ham", "han", "hast", "i", "ka", "ke", "ku", "ne",
  "o", "pad", "pas", "ra", "s", "u", "ud"
]);

const frequencyState = {
  texts: [],
  pageSize: 25,
  filter: "",
  hideStopwords: true,
  selected: null,
  pages: {},
  personalCommonWords: loadPersonalCommonWords()
};

const frequencyStatusEl = document.querySelector("#frequency-status");
const frequencyFilterEl = document.querySelector("#frequency-filter");
const frequencyLimitEl = document.querySelector("#frequency-limit");
const frequencyStopwordsEl = document.querySelector("#frequency-stopwords");
const personalCommonInputEl = document.querySelector("#frequency-common-input");
const personalCommonAddEl = document.querySelector("#frequency-common-add");
const personalCommonListEl = document.querySelector("#frequency-common-list");
const frequencySummaryEl = document.querySelector("#frequency-summary");
const frequencyChartEl = document.querySelector("#frequency-chart");

initFrequency();

async function initFrequency() {
  bindFrequencyEvents();

  try {
    frequencyState.texts = await Promise.all(FREQUENCY_TEXTS.map(loadFrequencyText));
    frequencyStatusEl.textContent = "DD and WZ ready";
    renderFrequency();
  } catch (error) {
    frequencyStatusEl.textContent = "Text loading failed";
    frequencyChartEl.innerHTML = `<div class="empty-state">DD and WZ could not be loaded.</div>`;
    console.error(error);
  }
}

function bindFrequencyEvents() {
  frequencyFilterEl.addEventListener("input", () => {
    frequencyState.filter = frequencyFilterEl.value.trim();
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequency();
  });

  frequencyLimitEl.addEventListener("change", () => {
    frequencyState.pageSize = Number(frequencyLimitEl.value);
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequency();
  });

  frequencyStopwordsEl.addEventListener("change", () => {
    frequencyState.hideStopwords = frequencyStopwordsEl.checked;
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequency();
  });

  personalCommonAddEl.addEventListener("click", () => {
    addPersonalCommonWord(personalCommonInputEl.value);
  });

  personalCommonInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPersonalCommonWord(personalCommonInputEl.value);
    }
  });

  personalCommonListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-common-key]");
    if (!button) {
      return;
    }
    removePersonalCommonWord(button.dataset.removeCommonKey);
  });

  frequencyChartEl.addEventListener("click", (event) => {
    const commonButton = event.target.closest("[data-common-key]");
    if (commonButton) {
      addPersonalCommonWord(commonButton.dataset.commonKey);
      return;
    }

    const pageButton = event.target.closest("[data-frequency-page]");
    if (pageButton) {
      frequencyState.pages[pageButton.dataset.textId] = Number(pageButton.dataset.frequencyPage);
      clearSelectedWord();
      renderFrequency();
      return;
    }

    const closeButton = event.target.closest("[data-close-locations]");
    if (closeButton) {
      clearSelectedWord();
      renderFrequency();
      return;
    }

    const button = event.target.closest("[data-word-key]");
    if (!button) {
      return;
    }

    frequencyState.selected = {
      textId: button.dataset.textId,
      wordKey: button.dataset.wordKey
    };
    renderFrequency();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && frequencyState.selected) {
      clearSelectedWord();
      renderFrequency();
    }
  });
}

async function loadFrequencyText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  const records = parseRecords(raw);
  const wordStats = buildWordStats(records);
  return {
    ...config,
    raw,
    records,
    wordStats,
    wordCount: [...wordStats.values()].reduce((sum, item) => sum + item.total, 0)
  };
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
      const isComment = trimmed.startsWith("#");
      const hasTsvShape = isTsvRecord(trimmed) && !isComment;

      return {
        index,
        location: hasTsvShape ? formatTsvLocation(columns) : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
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
  return [first, second].filter(Boolean).join(" - ");
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

function buildWordStats(records) {
  const stats = new Map();

  records.forEach((record) => {
    for (const token of getTokens(record.text)) {
      const key = normalizeWord(token);
      if (!isCountableWord(key)) {
        continue;
      }

      if (!stats.has(key)) {
        stats.set(key, {
          key,
          label: token,
          total: 0,
          locations: []
        });
      }

      const item = stats.get(key);
      item.total += 1;
      item.locations.push(record.location);
    }
  });

  return stats;
}

function getTokens(text) {
  return String(text).match(/[\p{L}\p{M}\p{N}=_.:-]+/gu) || [];
}

function normalizeWord(word) {
  const folded = foldText(word).toLowerCase();
  return folded.replace(/^[=_.:-]+|[=_.:-]+$/g, "");
}

function isCountableWord(key) {
  return key.length > 0 && /[\p{L}\p{M}]/u.test(key);
}

function renderFrequency() {
  const rankedByText = frequencyState.texts.map((text) => ({
    text,
    ranked: getRankedWords(text)
  }));
  const pageDataByText = getFrequencyPageData(rankedByText);
  const visibleSharedWordKeys = getVisibleSharedWordKeys(pageDataByText);

  renderPersonalCommonWords();
  renderFrequencySummary(rankedByText);
  renderFrequencyChart(rankedByText, pageDataByText, visibleSharedWordKeys);
}

function getRankedWords(text) {
  const filter = normalizeWord(frequencyState.filter);

  return [...text.wordStats.values()]
    .filter((item) => {
      if (frequencyState.hideStopwords && isCommonWord(item.key)) {
        return false;
      }
      return !filter || item.key.includes(filter) || foldText(item.label).toLowerCase().includes(filter);
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function renderPersonalCommonWords() {
  const words = [...frequencyState.personalCommonWords].sort((a, b) => a.localeCompare(b));
  personalCommonListEl.innerHTML = words.length
    ? words.map((word) => `
      <button class="frequency-common-chip" type="button" data-remove-common-key="${escapeHtml(word)}" title="Remove from personal common words">
        <span>${escapeHtml(word)}</span>
        <strong aria-hidden="true">x</strong>
      </button>
    `).join("")
    : `<span class="frequency-common-empty">No personal common words marked yet.</span>`;
}

function renderFrequencySummary(rankedByText) {
  frequencySummaryEl.innerHTML = rankedByText.map(({ text, ranked }) => {
    const listedTotal = ranked.reduce((sum, item) => sum + item.total, 0);
    return `
      <article class="text-card frequency-stat-card">
        <div class="siglum">${escapeHtml(text.siglum)}</div>
        <h2>${ranked.length.toLocaleString()}</h2>
        <p class="meta">word types across ${listedTotal.toLocaleString()} listed tokens</p>
      </article>
    `;
  }).join("");
}

function renderFrequencyChart(rankedByText, pageDataByText, visibleSharedWordKeys) {
  frequencyChartEl.innerHTML = rankedByText.map(({ text, ranked }) => `
    <article class="diagram-card frequency-panel">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.title)}</p>
          <h2>${escapeHtml(text.siglum)} Word Frequency</h2>
        </div>
      </header>
      ${ranked.length ? renderFrequencyList(text, ranked, pageDataByText.get(text.id), visibleSharedWordKeys) : `<div class="empty-state">No words match the current filter.</div>`}
    </article>
  `).join("");
}

function renderFrequencyList(text, ranked, pageData, visibleSharedWordKeys) {
  const max = Math.max(...ranked.map((item) => item.total), 1);
  return `
    <div class="frequency-list">
      ${pageData.visible.map((item, index) => renderFrequencyItem(text, item, pageData.start + index, max, visibleSharedWordKeys)).join("")}
    </div>
    ${pageData.pageCount > 1 ? renderFrequencyPagination(text, pageData.currentPage, pageData.pageCount, ranked.length) : ""}
  `;
}

function renderFrequencyItem(text, item, index, max, visibleSharedWordKeys) {
  const selected = frequencyState.selected?.textId === text.id && frequencyState.selected?.wordKey === item.key;
  const shared = visibleSharedWordKeys.has(item.key);
  const percent = (item.total / max) * 100;
  return `
    <div class="frequency-item ${selected ? "active" : ""} ${shared ? "shared" : ""}">
      <button class="frequency-row" type="button" data-text-id="${escapeHtml(text.id)}" data-word-key="${escapeHtml(item.key)}">
        <span class="frequency-rank">${index + 1}</span>
        <span class="frequency-word">${escapeHtml(item.label)}</span>
        <span class="frequency-count">${item.total.toLocaleString()}</span>
        <span class="frequency-mini-bar" aria-hidden="true"><span style="width: ${percent.toFixed(2)}%"></span></span>
      </button>
      <button class="frequency-common-button" type="button" data-common-key="${escapeHtml(item.key)}">Mark common</button>
      ${selected ? renderLocationPopover(text, item) : ""}
    </div>
  `;
}

function renderLocationPopover(text, word) {
  const locationText = `${word.label}: ${word.locations.join(", ")}`;
  return `
    <aside class="frequency-location-popover">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.siglum)} locations</p>
          <h3>${escapeHtml(word.label)} (${word.total.toLocaleString()})</h3>
        </div>
        <button class="clear-button" type="button" data-close-locations>Close</button>
      </header>
      <p class="frequency-location-text">${escapeHtml(locationText)}</p>
    </aside>
  `;
}

function addPersonalCommonWord(value) {
  const key = normalizeWord(value);
  if (!key) {
    return;
  }

  frequencyState.personalCommonWords.add(key);
  savePersonalCommonWords();
  personalCommonInputEl.value = "";
  if (frequencyState.selected?.wordKey === key) {
    clearSelectedWord();
  }
  renderFrequency();
}

function removePersonalCommonWord(key) {
  frequencyState.personalCommonWords.delete(key);
  savePersonalCommonWords();
  renderFrequency();
}

function isCommonWord(key) {
  return BASE_COMMON_WORDS.has(key) || frequencyState.personalCommonWords.has(key);
}

function clearSelectedWord() {
  frequencyState.selected = null;
}

function resetFrequencyPages() {
  frequencyState.pages = {};
}

function getFrequencyPageData(rankedByText) {
  const pageDataByText = new Map();
  rankedByText.forEach(({ text, ranked }) => {
    const pageCount = Math.max(1, Math.ceil(ranked.length / frequencyState.pageSize));
    const currentPage = clampPage(frequencyState.pages[text.id] || 1, pageCount);
    frequencyState.pages[text.id] = currentPage;
    const start = (currentPage - 1) * frequencyState.pageSize;
    pageDataByText.set(text.id, {
      currentPage,
      pageCount,
      start,
      visible: ranked.slice(start, start + frequencyState.pageSize)
    });
  });
  return pageDataByText;
}

function getVisibleSharedWordKeys(pageDataByText) {
  const visibleWordSets = [...pageDataByText.values()].map((pageData) =>
    new Set(pageData.visible.map((item) => item.key))
  );
  if (visibleWordSets.length < 2) {
    return new Set();
  }

  const [first, ...rest] = visibleWordSets;
  return new Set([...first].filter((key) => rest.every((wordSet) => wordSet.has(key))));
}

function renderFrequencyPagination(text, currentPage, pageCount, totalRows) {
  const start = (currentPage - 1) * frequencyState.pageSize + 1;
  const end = Math.min(currentPage * frequencyState.pageSize, totalRows);
  return `
    <nav class="rank-pagination frequency-pagination" aria-label="${escapeHtml(text.siglum)} word frequency pages">
      <span class="frequency-page-range">${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}</span>
      ${getVisiblePages(currentPage, pageCount)
        .map((page) => page === "gap"
          ? `<span class="page-gap" aria-hidden="true">...</span>`
          : `<button
              class="page-dot ${page === currentPage ? "active" : ""}"
              type="button"
              data-text-id="${escapeHtml(text.id)}"
              data-frequency-page="${page}"
              aria-label="Show ${escapeHtml(text.siglum)} frequency page ${page}"
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

function loadPersonalCommonWords() {
  try {
    const value = window.localStorage?.getItem(PERSONAL_COMMON_STORAGE_KEY);
    const words = value ? JSON.parse(value) : [];
    return new Set(Array.isArray(words) ? words.map(normalizeWord).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function savePersonalCommonWords() {
  try {
    window.localStorage?.setItem(
      PERSONAL_COMMON_STORAGE_KEY,
      JSON.stringify([...frequencyState.personalCommonWords].sort((a, b) => a.localeCompare(b)))
    );
  } catch {
    // Ignore storage failures; the in-memory set still works for this page session.
  }
}

function foldText(value) {
  return String(value)
    .replace(/[\u0100-\u01FF]/g, (char) => TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, ""))
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
