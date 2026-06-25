const FREQUENCY_TEXTS = [
  { id: "dd", siglum: "DD", title: "D\u0101dest\u0101n \u012b D\u0113n\u012bg", file: "Dd.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wiz\u012bdag\u012bh\u0101 \u012b Z\u0101dspram", file: "WZ.txt" }
];

const PERSONAL_COMMON_STORAGE_KEY = "darcPersonalCommonWords";
const PERSONAL_COMMON_BACKUP_STORAGE_KEY = "darcPersonalCommonWordsBackup";
const DEFAULT_PERSONAL_COMMON_WORDS_URL = "personal-common-words.json?v=20260620-excluded-common-words";
const BUILT_IN_PERSONAL_COMMON_WORDS = [
  "abag", "abarig", "abayed", "abaz", "agar", "amad", "amah", "an-iz",
  "and", "aniy", "anoh", "asmah", "ast", "awesan", "awis", "ayab",
  "az-is", "azabar", "azis", "bawad", "bawed", "bawend", "bedaham",
  "budan", "burd", "cahar", "caharom", "cand", "dah", "daham", "dahe",
  "dahed", "dared", "darend", "dast", "dastan", "did", "didigar", "do",
  "ec", "edon", "eg-is", "ek", "en", "estad", "ested", "ew", "ewen",
  "ewenag", "fradom", "framud", "fraron", "fraronih", "fraz", "grift",
  "guft", "had", "haft", "hamag", "hame", "harw", "harwisp", "he",
  "hend", "hom", "i-s", "is", "iz", "ka-s", "kadar", "kas", "ke-s",
  "ke-san", "kerd", "kerdan", "kird", "ku-s", "kunam", "kuned", "kunend",
  "m", "ma", "mad", "man", "nest", "nibist", "nimud", "oh", "owon",
  "oy", "pad-is", "pad-iz", "padis", "pahlom", "panj", "paydag", "pes",
  "rased", "ray", "san", "sas", "sawed", "sayed", "se", "sidigar", "t",
  "ta", "tis", "to", "u-s", "u-san", "ul", "was", "wes", "x", "xwes"
];

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

const COMPOUND_WORDS = [
  {
    label: "gannag menog",
    variants: [
      ["gannag", "menog"],
      ["gannag", "menoy"],
      ["gannagmenog"],
      ["gannagmenoy"]
    ]
  },
  {
    label: "Ahura Mazda",
    variants: [["ahura", "mazda"]]
  },
  {
    label: "dadar i Ohrmazd",
    variants: [
      ["dadar", "i", "ohrmazd"],
      ["dadar", "ohrmazd"]
    ]
  }
].map((compound) => ({
  ...compound,
  key: normalizeWord(compound.label)
}));

const COMPOUND_VARIANTS = COMPOUND_WORDS
  .flatMap((compound) => compound.variants.map((tokens) => ({ ...compound, tokens })))
  .sort((a, b) => b.tokens.length - a.tokens.length);

const FREQUENCY_VARIANT_GROUPS = [
  ["ahreman", "ahrimen", "ahriman", "aharman", "ahremn", "ahremanag"],
  ["druz", "druj", "drux", "drug", "draoga"],
  ["ohrmazd", "ormazd", "ahura mazda", "ahuramazda", "dadar"],
  ["zadspram", "zadsparam", "zatspram", "zad-spram"],
  ["manuchihr", "manushchihr", "manuschihr", "manuscihr", "manushcihr"]
].map((group) => group.map(normalizeWord));

const frequencyState = {
  texts: [],
  pageSize: 25,
  filter: "",
  multipleWords: true,
  hideStopwords: true,
  selected: null,
  pages: {},
  personalCommonWords: loadPersonalCommonWords()
};

const frequencyStatusEl = document.querySelector("#frequency-status");
const frequencyFilterEl = document.querySelector("#frequency-filter");
const frequencyLimitEl = document.querySelector("#frequency-limit");
const frequencyMultipleEl = document.querySelector("#frequency-multiple");
const frequencyStopwordsEl = document.querySelector("#frequency-stopwords");
const personalCommonInputEl = document.querySelector("#frequency-common-input");
const personalCommonAddEl = document.querySelector("#frequency-common-add");
const personalCommonExportEl = document.querySelector("#frequency-common-export");
const personalCommonListEl = document.querySelector("#frequency-common-list");
const frequencySummaryEl = document.querySelector("#frequency-summary");
const frequencyRankComparisonEl = document.querySelector("#frequency-rank-comparison");
const frequencyChartEl = document.querySelector("#frequency-chart");

const FREQUENCY_SEARCH_DEBOUNCE_MS = 300;
let frequencySearchRenderTimer = null;

initFrequency();

async function initFrequency() {
  bindFrequencyEvents();

  try {
    const [texts, defaultCommonWords] = await Promise.all([
      Promise.all(FREQUENCY_TEXTS.map(loadFrequencyText)),
      loadDefaultPersonalCommonWords()
    ]);
    mergePersonalCommonWords(defaultCommonWords);
    frequencyState.texts = texts;
    frequencyStatusEl.textContent = "DD, PY, and WZ ready";
    renderFrequency();
  } catch (error) {
    frequencyStatusEl.textContent = "Text loading failed";
    frequencyChartEl.innerHTML = `<div class="empty-state">DD, PY, and WZ could not be loaded.</div>`;
    console.error(error);
  }
}

function bindFrequencyEvents() {
  frequencyFilterEl.addEventListener("input", () => {
    frequencyState.filter = frequencyFilterEl.value.trim();
    scheduleFrequencySearchRender();
  });

  frequencyLimitEl.addEventListener("change", () => {
    frequencyState.pageSize = Number(frequencyLimitEl.value);
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequencyImmediately();
  });

  frequencyMultipleEl.addEventListener("change", () => {
    frequencyState.multipleWords = frequencyMultipleEl.checked;
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequencyImmediately();
  });

  frequencyStopwordsEl.addEventListener("change", () => {
    frequencyState.hideStopwords = frequencyStopwordsEl.checked;
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequencyImmediately();
  });

  personalCommonAddEl.addEventListener("click", () => {
    addPersonalCommonWord(personalCommonInputEl.value);
  });

  personalCommonExportEl.addEventListener("click", () => {
    copyPersonalCommonWords(personalCommonExportEl);
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
      renderFrequencyImmediately();
      return;
    }

    const closeButton = event.target.closest("[data-close-locations]");
    if (closeButton) {
      clearSelectedWord();
      renderFrequencyImmediately();
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
    renderFrequencyImmediately();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && frequencyState.selected) {
      clearSelectedWord();
      renderFrequencyImmediately();
    }
  });
}

function scheduleFrequencySearchRender() {
  window.clearTimeout(frequencySearchRenderTimer);
  frequencySearchRenderTimer = window.setTimeout(() => {
    frequencySearchRenderTimer = null;
    resetFrequencyPages();
    clearSelectedWord();
    renderFrequency();
  }, FREQUENCY_SEARCH_DEBOUNCE_MS);
}

function renderFrequencyImmediately() {
  window.clearTimeout(frequencySearchRenderTimer);
  frequencySearchRenderTimer = null;
  renderFrequency();
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
    const tokens = getTokenMatches(record.text);

    for (let index = 0; index < tokens.length; index += 1) {
      const compound = getCompoundAt(tokens, index);
      if (compound) {
        addWordStat(stats, compound.key, compound.label, record.location);
        index += compound.tokens.length - 1;
        continue;
      }

      const token = tokens[index];
      if (!isCountableWord(token.key)) {
        continue;
      }

      addWordStat(stats, token.key, token.label, record.location);
    }
  });

  return stats;
}

function getTokens(text) {
  return String(text).match(/[\p{L}\p{M}\p{N}=_.:-]+/gu) || [];
}

function getTokenMatches(text) {
  return getTokens(text).map((token) => ({
    label: token,
    key: normalizeWord(token)
  }));
}

function getCompoundAt(tokens, index) {
  return COMPOUND_VARIANTS.find((compound) =>
    compound.tokens.every((token, offset) => tokens[index + offset]?.key === token)
  ) || null;
}

function addWordStat(stats, key, label, location) {
  if (!stats.has(key)) {
    stats.set(key, {
      key,
      label,
      total: 0,
      locations: []
    });
  }

  const item = stats.get(key);
  item.total += 1;
  item.locations.push(location);
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
  renderRankComparison(rankedByText);
  renderFrequencyChart(rankedByText, pageDataByText, visibleSharedWordKeys);
}

function getRankedWords(text) {
  const searchTerms = getFrequencySearchTerms(frequencyState.filter);

  return [...text.wordStats.values()]
    .filter((item) => {
      if (frequencyState.hideStopwords && isCommonWord(item.key)) {
        return false;
      }
      return itemMatchesFrequencySearch(item, searchTerms);
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function getFrequencySearchTerms(query) {
  if (!frequencyState.multipleWords) {
    const term = normalizeWord(query || "");
    return term ? [term] : [];
  }

  const terms = [];
  const pattern = /"([^"]+)"|'([^']+)'|[^,\s;]+/g;
  let match;
  while ((match = pattern.exec(query || "")) !== null) {
    const term = normalizeWord(match[1] || match[2] || match[0]);
    if (term) {
      terms.push(term);
    }
  }
  return [...new Set(terms)];
}

function itemMatchesFrequencySearch(item, searchTerms) {
  if (!searchTerms.length) {
    return true;
  }

  const label = foldText(item.label).toLowerCase();
  return searchTerms.some((term) =>
    getFrequencySearchVariants(term).some((variant) =>
      item.key.includes(variant) || label.includes(variant)
    )
  );
}

function getFrequencySearchVariants(term) {
  const group = FREQUENCY_VARIANT_GROUPS.find((variants) => variants.includes(term));
  return group || [term];
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

function renderRankComparison(rankedByText) {
  const comparisonKey = getRankComparisonKey();
  if (!comparisonKey) {
    frequencyRankComparisonEl.innerHTML = `
      <article class="diagram-card frequency-rank-card">
        <header>
          <div>
            <p class="eyebrow">Rank comparison</p>
            <h2>Compare a Word Across DD, PY, and WZ</h2>
          </div>
        </header>
        <div class="empty-state">Type one word or variant for rank comparison, or click any word in the lists below.</div>
      </article>
    `;
    return;
  }

  const comparisonRows = getRankComparisonRows(comparisonKey);
  const foundRows = comparisonRows.filter((row) => row.item);
  const label = foundRows[0]?.item.label || comparisonKey;
  const maxRank = Math.max(1, ...comparisonRows.map((row) => row.rank || row.totalTypes || 1));

  frequencyRankComparisonEl.innerHTML = `
    <article class="diagram-card frequency-rank-card">
      <header>
        <div>
          <p class="eyebrow">Rank comparison</p>
          <h2>${escapeHtml(label)}</h2>
        </div>
        <span class="count-pill ${foundRows.length ? "hit" : "miss"}">${foundRows.length}/3</span>
      </header>
      <div class="frequency-rank-plot" aria-label="${escapeHtml(label)} rank comparison">
        <div class="frequency-rank-axis" aria-hidden="true">
          <span>Rank 1</span>
          <span>Lower rank is stronger</span>
          <span>${maxRank.toLocaleString()}+</span>
        </div>
        ${comparisonRows.map((row) => renderRankComparisonRow(row, maxRank)).join("")}
      </div>
    </article>
  `;
}

function getRankComparisonKey() {
  if (frequencyState.selected?.wordKey) {
    return frequencyState.selected.wordKey;
  }
  const searchTerms = getFrequencySearchTerms(frequencyState.filter);
  if (searchTerms.length !== 1) {
    return "";
  }
  return findFirstRankComparisonKey(searchTerms[0]);
}

function findFirstRankComparisonKey(term) {
  const variants = getFrequencySearchVariants(term);
  const allKeys = new Set(frequencyState.texts.flatMap((text) => [...text.wordStats.keys()]));
  return variants.find((variant) => allKeys.has(variant)) || variants[0] || "";
}

function getRankComparisonRows(wordKey) {
  return frequencyState.texts.map((text) => {
    const ranked = getOverallRankedWords(text);
    const itemIndex = ranked.findIndex((entry) => entry.key === wordKey);
    const item = itemIndex >= 0 ? ranked[itemIndex] : null;
    return {
      text,
      item,
      rank: item ? itemIndex + 1 : null,
      totalTypes: ranked.length,
      perThousand: item && text.wordCount ? (item.total / text.wordCount) * 1000 : 0
    };
  });
}

function getOverallRankedWords(text) {
  return [...text.wordStats.values()]
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function renderRankComparisonRow(row, maxRank) {
  const rankPosition = row.rank ? ((row.rank - 1) / Math.max(1, maxRank - 1)) * 100 : 100;
  const rankLabel = row.rank ? `#${row.rank.toLocaleString()}` : "not found";
  const countLabel = row.item ? row.item.total.toLocaleString() : "0";
  return `
    <div class="frequency-rank-compare-row ${row.item ? "" : "missing"}">
      <div class="frequency-rank-compare-meta">
        <strong>${escapeHtml(row.text.siglum)}</strong>
        <span>${rankLabel}</span>
      </div>
      <div class="frequency-rank-line" aria-hidden="true">
        <span class="frequency-rank-dot" style="left: ${rankPosition.toFixed(2)}%"></span>
      </div>
      <div class="frequency-rank-compare-counts">
        <strong>${countLabel}</strong>
        <span>${row.perThousand.toFixed(2)} / 1,000</span>
      </div>
    </div>
  `;
}

function renderFrequencyChart(rankedByText, pageDataByText, visibleSharedWordKeys) {
  frequencyChartEl.innerHTML = rankedByText.map(({ text, ranked }) => `
    <article class="diagram-card frequency-panel">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.title)}</p>
          <h2>${escapeHtml(text.siglum)} Word Based</h2>
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
  return `
    <aside class="frequency-location-popover">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.siglum)} locations</p>
          <h3>${escapeHtml(word.label)} (${word.total.toLocaleString()})</h3>
        </div>
        <button class="clear-button" type="button" data-close-locations>Close</button>
      </header>
      <p class="frequency-location-text">
        <strong>${escapeHtml(word.label)}:</strong>
        ${renderFrequencyLocationLinks(text, word.locations)}
      </p>
    </aside>
  `;
}

function renderFrequencyLocationLinks(text, locations) {
  return locations.map((location) => {
    const href = getFrequencyTransLocationHref(text, location);
    if (!href) {
      return escapeHtml(location);
    }

    return `<a class="diagram-location-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(location)}</a>`;
  }).join(", ");
}

function getFrequencyTransLocationHref(text, location) {
  if (!["dd", "py", "wz", "nm"].includes(text.id)) {
    return "";
  }

  return `trans.html?text=${encodeURIComponent(text.id)}&location=${encodeURIComponent(location)}`;
}

function addPersonalCommonWord(value) {
  const keys = parsePersonalCommonWords(value);
  if (!keys.length) {
    return;
  }

  keys.forEach((key) => frequencyState.personalCommonWords.add(key));
  savePersonalCommonWords();
  personalCommonInputEl.value = "";
  if (frequencyState.selected && keys.includes(frequencyState.selected.wordKey)) {
    clearSelectedWord();
  }
  renderFrequencyImmediately();
}

function removePersonalCommonWord(key) {
  frequencyState.personalCommonWords.delete(key);
  savePersonalCommonWords();
  renderFrequencyImmediately();
}

function isCommonWord(key) {
  return BASE_COMMON_WORDS.has(key) || frequencyState.personalCommonWords.has(key);
}

function parsePersonalCommonWords(value) {
  return [...new Set(
    String(value || "")
      .split(/[,;\n]+/)
      .map((word) => normalizeWord(word.trim()))
      .filter(Boolean)
  )];
}

async function copyPersonalCommonWords(button) {
  const original = button.textContent;
  const words = [...frequencyState.personalCommonWords].sort((a, b) => a.localeCompare(b));
  const text = words.join(", ");

  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch (error) {
    console.error("Common word copy failed", error);
    button.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    button.textContent = original;
  }, 1500);
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
    const words = [
      ...readStoredPersonalCommonWords(PERSONAL_COMMON_STORAGE_KEY),
      ...readStoredPersonalCommonWords(PERSONAL_COMMON_BACKUP_STORAGE_KEY)
    ];
    return new Set(words);
  } catch {
    return new Set();
  }
}

function readStoredPersonalCommonWords(key) {
  const value = window.localStorage?.getItem(key);
  if (!value) {
    return [];
  }

  try {
    const words = JSON.parse(value);
    return Array.isArray(words) ? words.map(normalizeWord).filter(Boolean) : [];
  } catch {
    return parsePersonalCommonWords(value);
  }
}

async function loadDefaultPersonalCommonWords() {
  const builtInWords = BUILT_IN_PERSONAL_COMMON_WORDS.map(normalizeWord).filter(Boolean);
  try {
    const response = await fetch(DEFAULT_PERSONAL_COMMON_WORDS_URL);
    if (!response.ok) {
      return builtInWords;
    }

    const data = await response.json();
    const words = Array.isArray(data) ? data : data.words;
    const fileWords = Array.isArray(words) ? words.map(normalizeWord).filter(Boolean) : [];
    return [...builtInWords, ...fileWords];
  } catch {
    return builtInWords;
  }
}

function mergePersonalCommonWords(words) {
  const before = frequencyState.personalCommonWords.size;
  words.forEach((word) => {
    const key = normalizeWord(word);
    if (key) {
      frequencyState.personalCommonWords.add(key);
    }
  });
  if (frequencyState.personalCommonWords.size !== before) {
    savePersonalCommonWords();
  }
}

function savePersonalCommonWords() {
  try {
    const value = JSON.stringify([...frequencyState.personalCommonWords].sort((a, b) => a.localeCompare(b)));
    window.localStorage?.setItem(PERSONAL_COMMON_STORAGE_KEY, value);
    window.localStorage?.setItem(PERSONAL_COMMON_BACKUP_STORAGE_KEY, value);
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
