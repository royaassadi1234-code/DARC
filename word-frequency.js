const FREQUENCY_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" }
];

const frequencyState = {
  texts: [],
  scope: "combined",
  limit: 25,
  filter: "",
  hideStopwords: true,
  selectedKey: ""
};

const frequencyStatusEl = document.querySelector("#frequency-status");
const frequencyFilterEl = document.querySelector("#frequency-filter");
const frequencyTextEl = document.querySelector("#frequency-text");
const frequencyLimitEl = document.querySelector("#frequency-limit");
const frequencyStopwordsEl = document.querySelector("#frequency-stopwords");
const frequencySummaryEl = document.querySelector("#frequency-summary");
const frequencyChartEl = document.querySelector("#frequency-chart");
const frequencyLocationsEl = document.querySelector("#frequency-locations");

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

const COMMON_WORDS = new Set([
  "a", "an", "andar", "az", "be", "ce", "ceg", "cegon", "dahibed", "dar", "ed",
  "eg", "eran", "est", "estan", "ham", "han", "hast", "i", "ka", "ke", "ku",
  "men", "ne", "o", "pad", "pas", "ra", "u", "ud", "was", "xwes", "zan"
]);

initFrequency();

async function initFrequency() {
  bindFrequencyEvents();

  try {
    frequencyState.texts = await Promise.all(FREQUENCY_TEXTS.map(loadFrequencyText));
    frequencyStatusEl.textContent = `${frequencyState.texts.length} texts ready`;
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
    frequencyState.selectedKey = "";
    renderFrequency();
  });

  frequencyTextEl.addEventListener("change", () => {
    frequencyState.scope = frequencyTextEl.value;
    frequencyState.selectedKey = "";
    renderFrequency();
  });

  frequencyLimitEl.addEventListener("change", () => {
    frequencyState.limit = Number(frequencyLimitEl.value);
    renderFrequency();
  });

  frequencyStopwordsEl.addEventListener("change", () => {
    frequencyState.hideStopwords = frequencyStopwordsEl.checked;
    frequencyState.selectedKey = "";
    renderFrequency();
  });

  frequencyChartEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-word-key]");
    if (!button) {
      return;
    }

    frequencyState.selectedKey = button.dataset.wordKey;
    renderFrequency();
  });
}

async function loadFrequencyText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  const records = parseRecords(raw);
  const wordStats = buildWordStats(records, config.id);
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

function buildWordStats(records, textId) {
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
          byText: { dd: 0, wz: 0 },
          locations: []
        });
      }

      const item = stats.get(key);
      item.total += 1;
      item.byText[textId] += 1;
      item.locations.push({
        textId,
        location: record.location,
        passage: record.text,
        token
      });
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
  return key.length > 1 && /[\p{L}\p{M}]/u.test(key);
}

function renderFrequency() {
  const ranked = getRankedWords();
  const selected = getSelectedWord(ranked);

  renderFrequencySummary(ranked);
  renderFrequencyChart(ranked);
  renderFrequencyLocations(selected || ranked[0]);
}

function getRankedWords() {
  const combined = new Map();
  const activeTexts = getActiveTexts();
  const filter = normalizeWord(frequencyState.filter);

  activeTexts.forEach((text) => {
    text.wordStats.forEach((item, key) => {
      if (frequencyState.hideStopwords && COMMON_WORDS.has(key)) {
        return;
      }

      if (filter && !key.includes(filter) && !foldText(item.label).toLowerCase().includes(filter)) {
        return;
      }

      if (!combined.has(key)) {
        combined.set(key, {
          key,
          label: item.label,
          total: 0,
          byText: { dd: 0, wz: 0 },
          locations: []
        });
      }

      const target = combined.get(key);
      target.total += item.total;
      target.byText.dd += item.byText.dd;
      target.byText.wz += item.byText.wz;
      target.locations.push(...item.locations);
    });
  });

  return [...combined.values()]
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, frequencyState.limit);
}

function getActiveTexts() {
  return frequencyState.scope === "combined"
    ? frequencyState.texts
    : frequencyState.texts.filter((text) => text.id === frequencyState.scope);
}

function getSelectedWord(ranked) {
  if (!frequencyState.selectedKey) {
    return null;
  }
  return ranked.find((item) => item.key === frequencyState.selectedKey) || null;
}

function renderFrequencySummary(ranked) {
  const activeTexts = getActiveTexts();
  const totalWords = activeTexts.reduce((sum, text) => sum + text.wordCount, 0);
  const uniqueWords = new Set();
  activeTexts.forEach((text) => {
    text.wordStats.forEach((item, key) => {
      if (!frequencyState.hideStopwords || !COMMON_WORDS.has(key)) {
        uniqueWords.add(key);
      }
    });
  });

  frequencySummaryEl.innerHTML = `
    <article class="text-card frequency-stat-card">
      <div class="siglum">${escapeHtml(getScopeLabel())}</div>
      <h2>${totalWords.toLocaleString()}</h2>
      <p class="meta">counted word tokens</p>
    </article>
    <article class="text-card frequency-stat-card">
      <div class="siglum">Types</div>
      <h2>${uniqueWords.size.toLocaleString()}</h2>
      <p class="meta">unique words${frequencyState.hideStopwords ? ", excluding common words" : ""}</p>
    </article>
    <article class="text-card frequency-stat-card">
      <div class="siglum">Shown</div>
      <h2>${ranked.length.toLocaleString()}</h2>
      <p class="meta">ranked rows</p>
    </article>
  `;
}

function renderFrequencyChart(ranked) {
  if (!ranked.length) {
    frequencyChartEl.innerHTML = `<div class="empty-state">No words match the current filter.</div>`;
    return;
  }

  const max = Math.max(...ranked.map((item) => item.total));
  frequencyChartEl.innerHTML = `
    <article class="diagram-card frequency-panel">
      <header>
        <div>
          <p class="eyebrow">Frequency</p>
          <h2>Most Frequent Words</h2>
        </div>
      </header>
      <div class="frequency-bars">
        ${ranked.map((item, index) => renderFrequencyRow(item, index, max)).join("")}
      </div>
    </article>
  `;
}

function renderFrequencyRow(item, index, max) {
  const width = max ? (item.total / max) * 100 : 0;
  const active = item.key === frequencyState.selectedKey || (!frequencyState.selectedKey && index === 0);
  return `
    <button class="frequency-row ${active ? "active" : ""}" type="button" data-word-key="${escapeHtml(item.key)}">
      <span class="frequency-rank">${index + 1}</span>
      <span class="frequency-word">${escapeHtml(item.label)}</span>
      <span class="frequency-bar-track">
        <span class="frequency-bar-fill" style="width: ${width.toFixed(2)}%"></span>
      </span>
      <span class="frequency-count">${item.total.toLocaleString()}</span>
      <span class="frequency-split">
        <span>DD ${item.byText.dd.toLocaleString()}</span>
        <span>WZ ${item.byText.wz.toLocaleString()}</span>
      </span>
    </button>
  `;
}

function renderFrequencyLocations(item) {
  if (!item) {
    frequencyLocationsEl.innerHTML = `<div class="empty-state">Select a word to see passage locations.</div>`;
    return;
  }

  const locations = item.locations.slice(0, 80);
  frequencyLocationsEl.innerHTML = `
    <article class="diagram-card frequency-panel">
      <header>
        <div>
          <p class="eyebrow">Locations</p>
          <h2>${escapeHtml(item.label)} (${item.total.toLocaleString()})</h2>
        </div>
      </header>
      <div class="frequency-location-list">
        ${locations.map((location) => renderLocation(item, location)).join("")}
        ${item.locations.length > locations.length ? `
          <p class="meta frequency-more">Showing first ${locations.length.toLocaleString()} of ${item.locations.length.toLocaleString()} occurrences.</p>
        ` : ""}
      </div>
    </article>
  `;
}

function renderLocation(item, location) {
  const text = FREQUENCY_TEXTS.find((entry) => entry.id === location.textId);
  return `
    <section class="match frequency-location">
      <div class="location">${escapeHtml(text?.siglum || location.textId)} ${escapeHtml(location.location)}</div>
      <p class="snippet">${highlightWord(location.passage, item.key)}</p>
    </section>
  `;
}

function highlightWord(text, key) {
  let html = "";
  let cursor = 0;
  const pattern = /[\p{L}\p{M}\p{N}=_.:-]+/gu;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(cursor, match.index));
    const token = match[0];
    html += normalizeWord(token) === key
      ? `<mark>${escapeHtml(token)}</mark>`
      : escapeHtml(token);
    cursor = match.index + token.length;
  }

  html += escapeHtml(text.slice(cursor));
  return html;
}

function getScopeLabel() {
  if (frequencyState.scope === "dd") {
    return "DD";
  }
  if (frequencyState.scope === "wz") {
    return "WZ";
  }
  return "DD + WZ";
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
