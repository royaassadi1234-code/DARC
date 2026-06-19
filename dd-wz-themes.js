const THEMATIC_TEXTS = {
  dd: { siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt", englishFile: "DD-en.txt" },
  wz: { siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt", englishFile: "WZ-en.txt" }
};

const PHRASE_STOP_WORDS = new Set([
  "i", "u", "ud", "az", "pad", "o", "andar", "abag", "abaz", "an", "ke", "ku",
  "ce", "ka", "be", "ne", "ham", "iz", "ra", "ray", "xwes", "en", "ed", "to",
  "ta", "om", "im", "is", "es", "us", "s",
  "a", "the", "of", "and", "in", "to"
]);

const THEMATIC_TABLE = [
  { theme: "Human Purpose and Exaltation", dd: "1-6", wz: "29-30" },
  { theme: "The Nature of Good and Evil", dd: "4-5", wz: "1-3" },
  { theme: "Ahriman and Cosmic Opposition", dd: "18, 26, 34-36", wz: "1-3, 8, 12" },
  { theme: "The Advent and Function of Religion", dd: "40-41, 47", wz: "4, 24-28" },
  { theme: "Zoroaster and Divine Revelation", dd: "-", wz: "5-25" },
  { theme: "The Structure of Religion", dd: "44-47", wz: "24-28" },
  { theme: "The Soul After Death", dd: "18-24", wz: "31" },
  { theme: "Judgment, Merit, and Sin", dd: "7-15", wz: "29-31" },
  { theme: "The Chinwad Bridge", dd: "20", wz: "31" },
  { theme: "Heaven and Hell", dd: "18-20, 25-26, 30-33", wz: "31" },
  { theme: "The Three Nights After Death", dd: "23-24, 27", wz: "31" },
  { theme: "Vision of Ohrmazd and Ahriman", dd: "18", wz: "31" },
  { theme: "The Soul's Encounter with Its Deeds", dd: "23-24", wz: "31" },
  { theme: "Rituals for the Dead", dd: "27, 54, 79-88", wz: "31" },
  { theme: "The Corpse and Funerary Practice", dd: "14-17", wz: "31" },
  { theme: "Priests and Religious Authority", dd: "42-47, 65, 82-87", wz: "27" },
  { theme: "Apostasy and Religious Identity", dd: "40-41", wz: "24-28" },
  { theme: "Ethics and Virtue", dd: "37-41", wz: "13-19, 26-27" },
  { theme: "Social Order and Governance", dd: "44-52", wz: "32" },
  { theme: "Inheritance and Family Law", dd: "53-64", wz: "18, 55-61" },
  { theme: "Creation of Humanity", dd: "63-64", wz: "29-30" },
  { theme: "Cosmology", dd: "66-70, 90-92", wz: "1-4, 34-35" },
  { theme: "Fate and Free Will", dd: "70", wz: "1-4" },
  { theme: "Resurrection (Ristaxez)", dd: "34-36", wz: "34-35" },
  { theme: "The Final Renovation (Frashgird)", dd: "35-36", wz: "34-35" },
  { theme: "The Role of the Amesha Spentas", dd: "21, 23, 35-36", wz: "23, 35" },
  { theme: "The Sevenfold Cosmic Order", dd: "35-36", wz: "23, 35" },
  { theme: "Natural Phenomena", dd: "66-70, 90-92", wz: "-" },
  { theme: "Sexual Ethics and Purity", dd: "71-78", wz: "18" }
];

const thematicState = {
  texts: {},
  selectedThemeIndex: 0,
  filter: "",
  titleMenuOpen: false,
  showTranslation: true,
  showEmpty: true
};

const filterEl = document.querySelector("#thematic-filter");
const titleMenuEl = document.querySelector("#thematic-title-menu");
const showTranslationEl = document.querySelector("#thematic-show-translation");
const showEmptyEl = document.querySelector("#thematic-show-empty");
const prevEl = document.querySelector("#thematic-prev");
const nextEl = document.querySelector("#thematic-next");
const pageStatusEl = document.querySelector("#thematic-page-status");
const statusEl = document.querySelector("#thematic-reader-status");
const gridEl = document.querySelector("#thematic-reader-grid");

initThematicReader();

async function initThematicReader() {
  try {
    thematicState.texts = {
      dd: await loadThematicText(THEMATIC_TEXTS.dd),
      wz: await loadThematicText(THEMATIC_TEXTS.wz)
    };
    bindControls();
    renderThematicReader();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Thematic reader failed";
    gridEl.innerHTML = `<div class="empty-state">The DD-WZ thematic reader could not load the text files.</div>`;
  }
}

async function loadThematicText(config) {
  const [raw, englishRaw] = await Promise.all([
    fetchText(config.file),
    fetchOptionalText(config.englishFile)
  ]);
  const records = parseRecords(raw);
  const englishRecords = englishRaw ? parseRecords(englishRaw) : [];
  const englishByLocation = new Map(englishRecords.map((record) => [baseLocation(record.location), record.text]));
  return { ...config, records, englishByLocation };
}

function bindControls() {
  filterEl.addEventListener("focus", () => {
    thematicState.titleMenuOpen = true;
    renderThemeTitleMenu();
  });
  filterEl.addEventListener("click", () => {
    thematicState.titleMenuOpen = true;
    renderThemeTitleMenu();
  });
  filterEl.addEventListener("input", () => {
    thematicState.filter = filterEl.value;
    thematicState.titleMenuOpen = true;
    renderThemeTitleMenu();
    renderThematicReader();
  });
  showTranslationEl.addEventListener("change", () => {
    thematicState.showTranslation = showTranslationEl.checked;
    renderThematicReader();
  });
  showEmptyEl.addEventListener("change", () => {
    thematicState.showEmpty = showEmptyEl.checked;
    renderThematicReader();
  });
  prevEl.addEventListener("click", () => {
    selectTheme(Math.max(0, thematicState.selectedThemeIndex - 1));
  });
  nextEl.addEventListener("click", () => {
    selectTheme(Math.min(THEMATIC_TABLE.length - 1, thematicState.selectedThemeIndex + 1));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".thematic-search-wrap")) {
      thematicState.titleMenuOpen = false;
      renderThemeTitleMenu();
    }
  });
}

function renderThematicReader() {
  const card = buildThemeCard(THEMATIC_TABLE[thematicState.selectedThemeIndex], thematicState.selectedThemeIndex);
  const totalVisible = card.ddPassages.length + card.wzPassages.length;

  statusEl.textContent = `Theme ${card.index + 1} of ${THEMATIC_TABLE.length} | ${totalVisible.toLocaleString()} passages`;
  gridEl.innerHTML = renderThemeCard(card);
  pageStatusEl.textContent = `Theme ${card.index + 1} of ${THEMATIC_TABLE.length}`;
  prevEl.disabled = card.index === 0;
  nextEl.disabled = card.index === THEMATIC_TABLE.length - 1;
  renderThemeTitleMenu();
}

function recordsForTheme(textId, rangeSpec) {
  const chapters = parseChapterSpec(rangeSpec);
  if (!chapters.size) {
    return [];
  }
  const text = thematicState.texts[textId];
  return text.records.filter((record) => chapters.has(chapterNumber(record.location)));
}

function buildThemeCard(theme, index) {
  const titleMatch = matchesQuery(`${theme.theme} ${theme.dd} ${theme.wz}`);
  const ddRecords = recordsForTheme("dd", theme.dd);
  const wzRecords = recordsForTheme("wz", theme.wz);
  const ddPassages = titleMatch ? ddRecords : filterThemeRecords(ddRecords);
  const wzPassages = titleMatch ? wzRecords : filterThemeRecords(wzRecords);
  const phraseMatches = findSharedPhrases(ddPassages, wzPassages);

  return {
    index,
    theme,
    ddPassages,
    wzPassages,
    phraseMatches,
    ddMissing: missingChapters("dd", theme.dd),
    wzMissing: missingChapters("wz", theme.wz)
  };
}

function renderThemeTitleMenu() {
  if (!thematicState.titleMenuOpen) {
    titleMenuEl.hidden = true;
    return;
  }

  const terms = tokenizeQuery(thematicState.filter);
  const rows = THEMATIC_TABLE
    .map((theme, index) => ({ theme, index }))
    .filter(({ theme, index }) => {
      if (!terms.length) {
        return true;
      }
      return matchesQuery(`${index + 1} ${theme.theme} ${theme.dd} ${theme.wz}`);
    });

  titleMenuEl.hidden = false;
  titleMenuEl.innerHTML = rows.length ? rows.map(({ theme, index }) => `
    <button class="thematic-title-option${index === thematicState.selectedThemeIndex ? " active" : ""}" type="button" data-theme-index="${index}">
      <span>Theme ${index + 1}</span>
      <strong>${escapeHtml(theme.theme)}</strong>
      <small>DD ${escapeHtml(theme.dd)} | WZ ${escapeHtml(theme.wz)}</small>
    </button>
  `).join("") : `<div class="empty-state">No theme titles match this search.</div>`;

  titleMenuEl.querySelectorAll("[data-theme-index]").forEach((button) => {
    button.addEventListener("click", () => {
      selectTheme(Number(button.dataset.themeIndex));
      thematicState.titleMenuOpen = false;
      renderThemeTitleMenu();
    });
  });
}

function selectTheme(index) {
  thematicState.selectedThemeIndex = Math.min(Math.max(0, index), THEMATIC_TABLE.length - 1);
  filterEl.value = "";
  thematicState.filter = "";
  renderThematicReader();
}

function filterThemeRecords(records) {
  const terms = tokenizeQuery(thematicState.filter);
  if (!terms.length) {
    return records;
  }
  return records.filter((record) => {
    const haystack = normalizeSearchText(`${record.location} ${record.text}`);
    return terms.every((term) => haystack.includes(term));
  });
}

function matchesQuery(value) {
  const terms = tokenizeQuery(thematicState.filter);
  if (!terms.length) {
    return true;
  }
  const haystack = normalizeSearchText(value);
  return terms.every((term) => haystack.includes(term));
}

function missingChapters(textId, rangeSpec) {
  const requested = parseChapterSpec(rangeSpec);
  if (!requested.size) {
    return [];
  }
  const available = new Set(thematicState.texts[textId].records.map((record) => chapterNumber(record.location)));
  return [...requested].filter((chapter) => !available.has(chapter)).sort((a, b) => a - b);
}

function renderThemeCard(card) {
  const { theme, index, ddPassages, wzPassages, phraseMatches, ddMissing, wzMissing } = card;
  return `
    <article class="thematic-reader-card">
      <header class="thematic-reader-card-header">
        <div>
          <div class="siglum">Theme ${index + 1}</div>
          <h2>${escapeHtml(theme.theme)}</h2>
          <p class="meta">DD chapters ${escapeHtml(theme.dd)} beside WZ chapters ${escapeHtml(theme.wz)}</p>
        </div>
        <div class="thematic-reader-counts">
          <span class="count-pill hit">DD ${ddPassages.length.toLocaleString()}</span>
          <span class="count-pill hit">WZ ${wzPassages.length.toLocaleString()}</span>
          <span class="count-pill hit">Matches ${phraseMatches.phrases.size.toLocaleString()}</span>
        </div>
      </header>
      <div class="thematic-reader-pair">
        ${renderThematicColumn("DD", THEMATIC_TEXTS.dd.title, theme.dd, ddPassages, ddMissing, phraseMatches)}
        ${renderThematicColumn("WZ", THEMATIC_TEXTS.wz.title, theme.wz, wzPassages, wzMissing, phraseMatches)}
      </div>
    </article>
  `;
}

function renderThematicColumn(siglum, title, rangeSpec, passages, missing, phraseMatches) {
  const textId = siglum.toLowerCase();
  const body = passages.length ? passages.map((record) => renderPassage(textId, record, phraseMatches)).join("") : "";
  const empty = thematicState.showEmpty ? `<div class="empty-state">No passages found for ${escapeHtml(siglum)} chapters ${escapeHtml(rangeSpec)}.</div>` : "";
  const missingNote = missing.length ? `<p class="thematic-reader-warning">Requested chapter(s) not present in the loaded ${escapeHtml(siglum)} text: ${escapeHtml(missing.join(", "))}</p>` : "";

  return `
    <article class="theme-column thematic-reader-column">
      <header>
        <div>
          <div class="siglum">${escapeHtml(siglum)}</div>
          <h2>${escapeHtml(title)}</h2>
          <p class="meta">Thematic chapters: ${escapeHtml(rangeSpec)}</p>
        </div>
        <span class="count-pill hit">${passages.length.toLocaleString()}</span>
      </header>
      ${missingNote}
      <div class="thematic-reader-passages">
        ${body || empty}
      </div>
    </article>
  `;
}

function renderPassage(textId, record, phraseMatches) {
  const text = thematicState.texts[textId];
  const english = text.englishByLocation.get(baseLocation(record.location)) || "";
  return `
    <article class="thematic-reader-passage">
      <div class="theme-hit-meta"><span>${escapeHtml(record.location)}</span></div>
      <p>${highlightText(record.text, phraseMatches)}</p>
      ${thematicState.showTranslation ? `
        <details class="thematic-reader-translation" ${thematicState.filter ? "open" : ""}>
          <summary>English translation</summary>
          <p>${english ? highlight(english) : "English translation will be added later."}</p>
        </details>
      ` : ""}
    </article>
  `;
}

async function fetchText(file) {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not load ${file}`);
  }
  return response.text();
}

async function fetchOptionalText(file) {
  try {
    const response = await fetch(file);
    return response.ok ? response.text() : "";
  } catch {
    return "";
  }
}

function parseChapterSpec(spec) {
  const chapters = new Set();
  String(spec).split(",").forEach((part) => {
    const clean = part.trim();
    if (!clean || clean === "-" || clean === "—") {
      return;
    }
    const range = clean.match(/^(\d+)\s*-\s*(\d+)/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let chapter = Math.min(start, end); chapter <= Math.max(start, end); chapter += 1) {
        chapters.add(chapter);
      }
      return;
    }
    const single = clean.match(/^(\d+)/);
    if (single) {
      chapters.add(Number(single[1]));
    }
  });
  return chapters;
}

function chapterNumber(location) {
  const match = String(location).match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
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
      current = { index, location: section[1], text: section[2], searchable: true };
      records.push(current);
      return;
    }
    if (current) {
      current.text += ` ${trimmed}`;
      return;
    }
    records.push({ index, location: `line ${index + 1}`, text: trimmed, searchable: true });
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

function baseLocation(location) {
  return String(location).trim().replace(/[a-z]+$/i, "");
}

function tokenizeQuery(query) {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function normalizeSearchText(value) {
  return String(value).toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function findSharedPhrases(ddPassages, wzPassages) {
  const ddPhrases = collectPhrases(ddPassages);
  const wzPhrases = collectPhrases(wzPassages);
  const shared = [...ddPhrases.keys()]
    .filter((phrase) => wzPhrases.has(phrase))
    .sort((a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length)
    .slice(0, 140);

  const phrases = new Set(shared);
  const lengths = [...new Set(shared.map((phrase) => phrase.split(" ").length))].sort((a, b) => b - a);
  return { phrases, lengths };
}

function collectPhrases(passages) {
  const phrases = new Map();
  passages.forEach((record) => {
    const tokens = tokenizeWords(record.text).map((token) => token.normalized).filter(Boolean);
    for (let size = 5; size >= 2; size -= 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const slice = tokens.slice(index, index + size);
        if (!isUsefulPhrase(slice)) {
          continue;
        }
        const phrase = slice.join(" ");
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }
  });
  return phrases;
}

function isUsefulPhrase(tokens) {
  const contentTokens = tokens.filter((token) => !PHRASE_STOP_WORDS.has(token) && token.length > 1);
  if (contentTokens.length < Math.min(2, tokens.length)) {
    return false;
  }
  return contentTokens.some((token) => token.length > 3 || /[āēīōūšč]/i.test(token));
}

function tokenizeWords(value) {
  const matches = String(value).matchAll(/[\p{L}\p{M}\p{N}=._-]+/gu);
  return [...matches].map((match) => ({
    index: match.index,
    text: match[0],
    end: match.index + match[0].length,
    normalized: normalizeToken(match[0])
  }));
}

function normalizeToken(value) {
  return normalizeSearchText(value)
    .replace(/^[=._-]+|[=._-]+$/g, "")
    .replace(/[^a-z0-9āēīōūščγδθǰ]+/gi, "");
}

function highlightText(value, phraseMatches) {
  const tokens = tokenizeWords(value);
  if (!tokens.length) {
    return highlight(value);
  }

  const ranges = [];
  const usedTokenIndexes = new Set();
  const lengths = phraseMatches?.lengths || [];
  const phrases = phraseMatches?.phrases || new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (usedTokenIndexes.has(index)) {
      continue;
    }
    for (const size of lengths) {
      if (index + size > tokens.length) {
        continue;
      }
      const tokenIndexes = Array.from({ length: size }, (_, offset) => index + offset);
      if (tokenIndexes.some((tokenIndex) => usedTokenIndexes.has(tokenIndex))) {
        continue;
      }
      const phrase = tokenIndexes.map((tokenIndex) => tokens[tokenIndex].normalized).join(" ");
      if (!phrases.has(phrase)) {
        continue;
      }
      tokenIndexes.forEach((tokenIndex) => usedTokenIndexes.add(tokenIndex));
      ranges.push({ start: tokens[index].index, end: tokens[index + size - 1].end });
      break;
    }
  }

  if (!ranges.length) {
    return highlight(value);
  }

  let output = "";
  let cursor = 0;
  ranges.sort((a, b) => a.start - b.start).forEach((range) => {
    output += highlight(value.slice(cursor, range.start));
    output += `<mark class="phrase-match">${highlight(value.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  });
  output += highlight(value.slice(cursor));
  return output;
}

function highlight(value) {
  const terms = tokenizeQuery(thematicState.filter);
  let output = escapeHtml(value);
  terms.forEach((term) => {
    if (!term) {
      return;
    }
    const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
    output = output.replace(pattern, "<mark>$1</mark>");
  });
  return output;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
