const FREQUENCY_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dādestān ī Dēnīg", file: "Dd.txt" },
  { id: "wz", siglum: "WZ", title: "Wizīdagīhā ī Zādspram", file: "WZ.txt" }
];

const frequencyState = {
  texts: [],
  limit: 10,
  filter: "",
  hideStopwords: true
};

const frequencyStatusEl = document.querySelector("#frequency-status");
const frequencyFilterEl = document.querySelector("#frequency-filter");
const frequencyLimitEl = document.querySelector("#frequency-limit");
const frequencyStopwordsEl = document.querySelector("#frequency-stopwords");
const frequencySummaryEl = document.querySelector("#frequency-summary");
const frequencyChartEl = document.querySelector("#frequency-chart");
const frequencyDialogEl = document.querySelector("#frequency-dialog");

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
  "a", "abar", "an", "andar", "az", "be", "bud", "ce", "ceg", "cegon", "ciyon",
  "dar", "ed", "eg", "est", "ham", "han", "hast", "i", "ka", "ke", "ku", "ne",
  "o", "pad", "pas", "ra", "s", "u", "ud"
]);

const PIE_COLORS = [
  "#245c73",
  "#267052",
  "#a83b3b",
  "#7a3ea3",
  "#9a5a15",
  "#2d6870",
  "#526476",
  "#5d7f3f",
  "#9b4b5c",
  "#4d5ca3"
];

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
    renderFrequency();
  });

  frequencyLimitEl.addEventListener("change", () => {
    frequencyState.limit = Number(frequencyLimitEl.value);
    renderFrequency();
  });

  frequencyStopwordsEl.addEventListener("change", () => {
    frequencyState.hideStopwords = frequencyStopwordsEl.checked;
    renderFrequency();
  });

  frequencyChartEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-word-key]");
    if (!button) {
      return;
    }

    openFrequencyDialog(button.dataset.textId, button.dataset.wordKey);
  });

  frequencyDialogEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-frequency]")) {
      closeFrequencyDialog();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !frequencyDialogEl.hidden) {
      closeFrequencyDialog();
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
      if (!item.locations.includes(record.location)) {
        item.locations.push(record.location);
      }
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

  renderFrequencySummary(rankedByText);
  renderFrequencyChart(rankedByText);
}

function getRankedWords(text) {
  const filter = normalizeWord(frequencyState.filter);

  return [...text.wordStats.values()]
    .filter((item) => {
      if (frequencyState.hideStopwords && COMMON_WORDS.has(item.key)) {
        return false;
      }
      return !filter || item.key.includes(filter) || foldText(item.label).toLowerCase().includes(filter);
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, frequencyState.limit);
}

function renderFrequencySummary(rankedByText) {
  frequencySummaryEl.innerHTML = rankedByText.map(({ text, ranked }) => {
    const uniqueWords = [...text.wordStats.keys()]
      .filter((key) => !frequencyState.hideStopwords || !COMMON_WORDS.has(key)).length;
    const topTotal = ranked.reduce((sum, item) => sum + item.total, 0);
    return `
      <article class="text-card frequency-stat-card">
        <div class="siglum">${escapeHtml(text.siglum)}</div>
        <h2>${topTotal.toLocaleString()}</h2>
        <p class="meta">tokens in the displayed frequency chart from ${uniqueWords.toLocaleString()} counted word types</p>
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
      ${ranked.length ? renderPiePanel(text, ranked) : `<div class="empty-state">No words match the current filter.</div>`}
    </article>
  `).join("");
}

function renderPiePanel(text, ranked) {
  return `
    <div class="frequency-pie-layout">
      <div class="frequency-pie" style="${buildPieStyle(ranked)}" aria-label="${escapeHtml(text.siglum)} word frequency pie chart"></div>
      <div class="frequency-bars">
        ${ranked.map((item, index) => renderFrequencyRow(text, item, index)).join("")}
      </div>
    </div>
  `;
}

function buildPieStyle(ranked) {
  const total = ranked.reduce((sum, item) => sum + item.total, 0);
  let cursor = 0;
  const stops = ranked.map((item, index) => {
    const start = cursor;
    cursor += total ? (item.total / total) * 100 : 0;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    return `${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `background: conic-gradient(${stops.join(", ")});`;
}

function renderFrequencyRow(text, item, index) {
  return `
    <button class="frequency-row" type="button" data-text-id="${escapeHtml(text.id)}" data-word-key="${escapeHtml(item.key)}">
      <span class="frequency-swatch" style="background: ${PIE_COLORS[index % PIE_COLORS.length]}"></span>
      <span class="frequency-word">${escapeHtml(item.label)}</span>
      <span class="frequency-count">${item.total.toLocaleString()}</span>
    </button>
  `;
}

function openFrequencyDialog(textId, wordKey) {
  const text = frequencyState.texts.find((item) => item.id === textId);
  const word = text?.wordStats.get(wordKey);
  if (!text || !word) {
    return;
  }

  const locations = word.locations.slice(0, 120);
  frequencyDialogEl.innerHTML = `
    <div class="frequency-dialog-backdrop" data-close-frequency></div>
    <section class="frequency-dialog-panel">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(text.siglum)} locations</p>
          <h2 id="frequency-dialog-title">${escapeHtml(word.label)} (${word.total.toLocaleString()})</h2>
        </div>
        <button class="copy-tool-button" type="button" data-close-frequency>Close</button>
      </header>
      <div class="frequency-location-list">
        ${locations.map((location) => `
          <span class="frequency-location-chip">${escapeHtml(location)}</span>
        `).join("")}
        ${word.locations.length > locations.length ? `
          <p class="meta frequency-more">Showing first ${locations.length.toLocaleString()} of ${word.locations.length.toLocaleString()} locations.</p>
        ` : ""}
      </div>
    </section>
  `;
  frequencyDialogEl.hidden = false;
}

function closeFrequencyDialog() {
  frequencyDialogEl.hidden = true;
  frequencyDialogEl.innerHTML = "";
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
