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
  limit: 10,
  filter: "",
  hideStopwords: true,
  selected: null,
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
    clearSelectedWord();
    renderFrequency();
  });

  frequencyLimitEl.addEventListener("change", () => {
    frequencyState.limit = Number(frequencyLimitEl.value);
    clearSelectedWord();
    renderFrequency();
  });

  frequencyStopwordsEl.addEventListener("change", () => {
    frequencyState.hideStopwords = frequencyStopwordsEl.checked;
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

  renderPersonalCommonWords();
  renderFrequencySummary(rankedByText);
  renderFrequencyChart(rankedByText);
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
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, frequencyState.limit);
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
    const uniqueWords = [...text.wordStats.keys()]
      .filter((key) => !frequencyState.hideStopwords || !isCommonWord(key)).length;
    const topTotal = ranked.reduce((sum, item) => sum + item.total, 0);
    return `
      <article class="text-card frequency-stat-card">
        <div class="siglum">${escapeHtml(text.siglum)}</div>
        <h2>${topTotal.toLocaleString()}</h2>
        <p class="meta">tokens in the displayed list from ${uniqueWords.toLocaleString()} counted word types</p>
      </article>
    `;
  }).join("");
}

function renderFrequencyChart(rankedByText) {
  frequencyChartEl.innerHTML = rankedByText.map(({ text, ranked }) => `
    <article class="diagram-card frequency-panel">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.title)}</p>
          <h2>${escapeHtml(text.siglum)} Word Frequency</h2>
        </div>
      </header>
      ${ranked.length ? renderFrequencyList(text, ranked) : `<div class="empty-state">No words match the current filter.</div>`}
    </article>
  `).join("");
}

function renderFrequencyList(text, ranked) {
  const max = Math.max(...ranked.map((item) => item.total), 1);
  return `
    <div class="frequency-list">
      ${ranked.map((item, index) => renderFrequencyItem(text, item, index, max)).join("")}
    </div>
  `;
}

function renderFrequencyItem(text, item, index, max) {
  const selected = frequencyState.selected?.textId === text.id && frequencyState.selected?.wordKey === item.key;
  const percent = (item.total / max) * 100;
  return `
    <div class="frequency-item ${selected ? "active" : ""}">
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
