const CHAPTER_DIAGRAM_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" }
];

const DD_CHAPTER_TITLES = {
  "1": "The Superiority of the Righteous",
  "2": "Human Purpose in Creation",
  "3": "The Cause of Human Exaltation",
  "4": "Suffering, Evil, and Divine Justice",
  "5": "Why the Good Suffer More",
  "6": "Human Duty in the Material World",
  "7": "Posthumous Merit and Judgment",
  "8": "Merit from Personal and Others' Offerings",
  "9": "The Growth of Merit During Life",
  "10": "Postmortem Increase of Merit",
  "11": "Merit and the Removal of Sin",
  "12": "Reward and Punishment After Death",
  "13": "The Reckoning of Sins and Merits",
  "14": "Death Agony and Expiation of Sin",
  "15": "The Soul and the Fate of the Corpse",
  "16": "The Purpose of Exposure Burial",
  "17": "The Value of Exposure to Birds",
  "18": "Vision of Ohrmazd and Ahriman",
  "19": "The Destination of Souls",
  "20": "The Chinwad Bridge and the Afterlife Path",
  "21": "Cosmic Mourning for the Righteous",
  "22": "The Departure of the Vital Spirit",
  "23": "The Righteous Soul During Three Nights",
  "24": "The Wicked Soul During Three Nights",
  "25": "The Nature of Heaven",
  "26": "The Nature of Hell",
  "27": "The Purpose of the Three-Night Ceremony",
  "28": "Restrictions on Sros Rituals",
  "29": "The Three Sacred Bread Consecrations",
  "30": "The Righteous Soul's Journey to Heaven",
  "31": "The Wicked Soul's Journey to Hell",
  "32": "The Location of Hell",
  "33": "The Paths to Heaven and Hell",
  "34": "Depopulation and Resurrection",
  "35": "Agents of the Renovation",
  "36": "Resurrection and the Renewed World",
  "37": "The Measure of Saving Merit",
  "38": "The Purpose of the Sacred Girdle",
  "39": "Merit of the Sacred Garments",
  "40": "Apostasy and Religious Fidelity",
  "41": "Saving Others from Apostasy",
  "42": "Viewing the Fire During Consecration",
  "43": "Payment of Non-local Priests",
  "44": "Duties of Teacher and Pupil",
  "45": "Priests and Secular Occupations",
  "46": "Priestly Authority and Learning",
  "47": "The Proper Performance of Worship",
  "48": "Hoarding Grain for Profit",
  "49": "Selling Wine to Non-Believers",
  "50": "Wine Consumption and Religious Law",
  "51": "Contracts and Market Fluctuations",
  "52": "Trade with Non-Zoroastrians",
  "53": "Inheritance and Testamentary Rights",
  "54": "Responsibility for Sidos Ceremonies",
  "55": "Sturih and Family Guardianship",
  "56": "Eligibility for Sturih",
  "57": "Types of Sturih and Guardianship",
  "58": "Property Requirements for Sturih",
  "59": "The Sin of Failing to Appoint a Stur",
  "60": "Merit and Demerit of Guardianship",
  "61": "Laws of Inheritance",
  "62": "Property Rights over Non-Believers",
  "63": "The Origin of Humankind",
  "64": "The Primordial Seed of Humanity",
  "65": "Priestly Fees and Competition",
  "66": "The Nature of the Rainbow",
  "67": "The Phases of the Moon",
  "68": "The Cause of Eclipses",
  "69": "The Cause of Earthquakes",
  "70": "Fate, Action, and Lunar Influence",
  "71": "The Sin of Sodomy",
  "72": "The Stench of Sodomy",
  "73": "The Holy Immortals and Ritual Pollution",
  "74": "Resurrection of the Sodomite",
  "75": "Killing a Sodomite: Merit or Crime",
  "76": "The Gravity of Sodomy",
  "77": "Adultery and Its Punishment",
  "78": "Omitting the Grace Before Drinking",
  "79": "Neglecting Religious Ceremonies",
  "80": "The Purpose of the Zindag Ruwan Ceremony",
  "81": "Unperformed Religious Services",
  "82": "Priestly Obligations in Ritual Service",
  "83": "Proper Gifts for Religious Ceremonies",
  "84": "Benefits of Increasing Ritual Gifts",
  "85": "Harm of Reducing Ritual Gifts",
  "86": "Merit of Ritual Donations",
  "87": "Reduced-Cost Ritual Performance",
  "88": "Delegating Religious Donations",
  "89": "The Immortals Before Mazdaism",
  "90": "The Nature of the Sky",
  "91": "The Greatest Waters and Rivers",
  "92": "Tistar, Clouds, and Rainfall"
};

const WZ_CHAPTER_TITLES = {
  "1": "The Mixed State of Good and Evil",
  "2": "Ahriman's Assault on Creation",
  "3": "The Resistance to Ahriman's Corruption",
  "4": "The Advent of Religion",
  "5": "Zoroaster's Pre-Birth Glory",
  "6": "The Conception of Zoroaster",
  "7": "Zoroaster's Divine Lineage",
  "8": "Attempts to Kill Zoroaster",
  "9": "The Enemies of Zoroaster",
  "10": "Trials and Signs of Prophecy",
  "11": "Conflict with His Parents",
  "12": "Opposition from the Wicked",
  "13": "The Pursuit of Justice",
  "14": "Patient Compassion",
  "15": "Generosity and Virtue",
  "16": "Renunciation and Justice",
  "17": "Compassion for All Creatures",
  "18": "Marriage and Purity of Lineage",
  "19": "Wisdom Through Humility",
  "20": "The Age of Thirty",
  "21": "The Divine Encounter",
  "22": "Zoroaster's Questions",
  "23": "The Seven Interviews",
  "24": "The Completion of Religion",
  "25": "The Manifestation of Zoroaster's Goodness",
  "26": "The Three Fundamental Laws",
  "27": "Priestly Virtues and Religious Counsel",
  "28": "The Structure of Religion",
  "29": "Body, Life, and Soul",
  "30": "The Composition of Humanity",
  "31": "The Soul's Encounter After Death",
  "32": "The Four Professions and Bad Government",
  "33": "Frasostar the Righteous",
  "34": "The Renovation of the World",
  "35": "The Sevenfold Renovation"
};

const chapterDiagramState = {
  texts: [],
  query: "",
  multipleWords: true,
  phraseSearch: false,
  wholeWord: true,
  caseSensitive: false,
  selectedChapter: null,
  latestSummaries: []
};

const chapterQueryEl = document.querySelector("#chapter-diagram-query");
const chapterMultipleEl = document.querySelector("#chapter-diagram-multiple");
const chapterPhraseEl = document.querySelector("#chapter-diagram-phrase");
const chapterWholeWordEl = document.querySelector("#chapter-diagram-whole-word");
const chapterCaseEl = document.querySelector("#chapter-diagram-case-sensitive");
const chapterStatusEl = document.querySelector("#chapter-diagram-status");
const chapterToolEl = document.querySelector("#chapter-diagram-tool");

const CHAPTER_TRANSLITERATION_MAP = {
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

initChapterDiagram();

async function initChapterDiagram() {
  bindChapterDiagramEvents();

  try {
    chapterDiagramState.texts = await Promise.all(CHAPTER_DIAGRAM_TEXTS.map(loadChapterDiagramText));
    chapterStatusEl.textContent = "DD, PY, and WZ ready";
    renderChapterDiagram();
  } catch (error) {
    chapterStatusEl.textContent = "Text loading failed";
    chapterToolEl.innerHTML = `<div class="empty-state">DD, PY, and WZ could not be loaded.</div>`;
    console.error(error);
  }
}

function bindChapterDiagramEvents() {
  chapterQueryEl.addEventListener("input", () => {
    chapterDiagramState.query = chapterQueryEl.value.trim();
    closeChapterDetails();
    renderChapterDiagram();
  });

  chapterMultipleEl.addEventListener("change", () => {
    chapterDiagramState.multipleWords = chapterMultipleEl.checked;
    closeChapterDetails();
    updateChapterSearchModeControls();
    renderChapterDiagram();
  });

  chapterPhraseEl.addEventListener("change", () => {
    chapterDiagramState.phraseSearch = chapterPhraseEl.checked;
    closeChapterDetails();
    updateChapterSearchModeControls();
    renderChapterDiagram();
  });

  chapterWholeWordEl.addEventListener("change", () => {
    chapterDiagramState.wholeWord = chapterWholeWordEl.checked;
    closeChapterDetails();
    renderChapterDiagram();
  });

  chapterCaseEl.addEventListener("change", () => {
    chapterDiagramState.caseSensitive = chapterCaseEl.checked;
    closeChapterDetails();
    renderChapterDiagram();
  });

  chapterToolEl.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-chapter-diagram]");
    if (copyButton) {
      copyChapterDiagram(copyButton);
      return;
    }

    const chapterRow = event.target.closest("[data-chapter-text-id][data-chapter-key]");
    if (chapterRow) {
      toggleChapterDetails(chapterRow.dataset.chapterTextId, chapterRow.dataset.chapterKey);
    }
  });

  updateChapterSearchModeControls();
}

function updateChapterSearchModeControls() {
  if (chapterDiagramState.phraseSearch && chapterDiagramState.multipleWords) {
    chapterDiagramState.multipleWords = false;
    chapterMultipleEl.checked = false;
  }
  chapterMultipleEl.disabled = chapterDiagramState.phraseSearch;
}

async function loadChapterDiagramText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  return {
    ...config,
    records: parseChapterRecords(raw)
  };
}

function renderChapterDiagram() {
  const search = createChapterSearch(chapterDiagramState.query);
  if (!search) {
    chapterDiagramState.latestSummaries = [];
    chapterStatusEl.textContent = `${chapterDiagramState.texts.length} texts ready`;
    chapterToolEl.innerHTML = `
      <article class="diagram-card">
        <header>
          <div>
            <div class="siglum">Diagram</div>
            <h2>Chapter-Based Attestation</h2>
          </div>
          <span class="count-pill">0</span>
        </header>
        <div class="empty-state">
          Search a word or phrase to see its occurrence across DD, PY, and WZ chapters.
        </div>
      </article>
    `;
    return;
  }

  const summaries = chapterDiagramState.texts.map((text) => getChapterSummary(text, search));
  chapterDiagramState.latestSummaries = summaries;
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const chaptersWithHits = summaries.reduce((sum, summary) => sum + summary.chapters.filter((chapter) => chapter.total > 0).length, 0);
  const maxCount = Math.max(1, ...summaries.flatMap((summary) => summary.chapters.map((chapter) => chapter.total)));
  chapterStatusEl.textContent = `${total.toLocaleString()} occurrences in ${chaptersWithHits.toLocaleString()} chapters`;

  chapterToolEl.innerHTML = `
    <article class="diagram-card chapter-diagram-card">
      <header>
        <div>
          <div class="siglum">Chapter diagram</div>
          <h2>Occurrence by Chapter</h2>
        </div>
        <div class="diagram-actions">
          <button class="copy-tool-button" type="button" data-copy-chapter-diagram>Copy data</button>
          <span class="count-pill">${total.toLocaleString()}</span>
        </div>
      </header>
      <div class="term-legend">
        <span><i class="legend-swatch term-1"></i>${escapeChapterHtml(search.label)}</span>
      </div>
      <section class="chapter-diagram-grid" aria-label="Chapter occurrence diagram">
        ${summaries.map((summary) => renderChapterTextPanel(summary, maxCount)).join("")}
      </section>
    </article>
  `;
}

function getChapterSummary(text, search) {
  const chapterMap = new Map();

  text.records.forEach((record) => {
    const occurrences = findChapterOccurrences(record.text, search.terms);
    if (!occurrences.length) {
      return;
    }

    const chapterKey = getChapterKey(record.location);
    const entry = chapterMap.get(chapterKey) || {
      chapter: chapterKey,
      total: 0,
      locations: new Map()
    };
    entry.total += occurrences.length;
    entry.locations.set(record.location, (entry.locations.get(record.location) || 0) + occurrences.length);
    chapterMap.set(chapterKey, entry);
  });

  const chapters = [...chapterMap.values()].sort((a, b) => compareChapterKeys(a.chapter, b.chapter));
  return {
    text,
    chapters,
    total: chapters.reduce((sum, chapter) => sum + chapter.total, 0)
  };
}

function renderChapterTextPanel(summary, maxCount) {
  return `
    <section class="diagram-result-column chapter-diagram-panel">
      <header>
        <div>
          <div class="siglum">${escapeChapterHtml(summary.text.siglum)}</div>
          <h3>${escapeChapterHtml(summary.text.title)}</h3>
        </div>
        <span class="count-pill">${summary.total.toLocaleString()}</span>
      </header>
      <div class="chapter-bar-list">
        ${summary.chapters.length
          ? summary.chapters.map((chapter) => renderChapterBar(summary.text, chapter, maxCount)).join("")
          : `<div class="empty-state">No chapter occurrences.</div>`}
      </div>
    </section>
  `;
}

function renderChapterBar(text, chapter, maxCount) {
  const percent = maxCount ? (chapter.total / maxCount) * 100 : 0;
  const chapterTitle = getChapterTitle(text, chapter.chapter);
  const selected = chapterDiagramState.selectedChapter?.textId === text.id &&
    chapterDiagramState.selectedChapter?.chapter === String(chapter.chapter);
  const locations = [...chapter.locations.entries()]
    .map(([location, count]) => `${location} (${count})`)
    .join(", ");
  return `
    <article class="chapter-bar-row ${selected ? "active" : ""}" tabindex="0" data-chapter-text-id="${escapeChapterHtml(text.id)}" data-chapter-key="${escapeChapterHtml(chapter.chapter)}">
      <span class="chapter-label">Chapter ${escapeChapterHtml(chapter.chapter)}</span>
      <span class="chapter-bar-track" aria-hidden="true">
        <span class="chapter-bar-fill" style="width: ${percent.toFixed(2)}%"></span>
      </span>
      <strong>${chapter.total.toLocaleString()}</strong>
      ${chapterTitle ? `<span class="chapter-hover-title">${escapeChapterHtml(chapterTitle)}</span>` : ""}
      ${selected ? renderChapterDetails(chapter.total, locations) : ""}
    </article>
  `;
}

function renderChapterDetails(total, locations) {
  return `
    <div class="chapter-detail-panel">
      <h4>${total.toLocaleString()} occurrence${total === 1 ? "" : "s"}</h4>
      <p>${escapeChapterHtml(locations || "No locations listed")}</p>
    </div>
  `;
}

function toggleChapterDetails(textId, chapter) {
  const current = chapterDiagramState.selectedChapter;
  chapterDiagramState.selectedChapter = current?.textId === textId && current?.chapter === chapter
    ? null
    : { textId, chapter };
  renderChapterDiagram();
}

function closeChapterDetails() {
  chapterDiagramState.selectedChapter = null;
}

function getChapterTitle(text, chapter) {
  const chapterKey = normalizeChapterTitleKey(chapter);
  if (text.id === "dd") {
    return DD_CHAPTER_TITLES[chapterKey] || "";
  }
  if (text.id === "wz") {
    return WZ_CHAPTER_TITLES[chapterKey] || "";
  }
  return "";
}

function normalizeChapterTitleKey(chapter) {
  const value = String(chapter || "").trim();
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : value;
}

function createChapterSearch(query) {
  if (!query) {
    return null;
  }

  const terms = chapterDiagramState.phraseSearch
    ? [query]
    : chapterDiagramState.multipleWords
      ? parseChapterSearchTerms(query)
      : [query];
  if (!terms.length) {
    return null;
  }

  return {
    label: terms.join(", "),
    terms
  };
}

function parseChapterSearchTerms(query) {
  const terms = [];
  const pattern = /"([^"]+)"|'([^']+)'|[^,\s;]+/g;
  let match;
  while ((match = pattern.exec(query || "")) !== null) {
    const term = (match[1] || match[2] || match[0]).trim();
    if (term) {
      terms.push(term);
    }
  }
  return terms;
}

function findChapterOccurrences(text, terms) {
  const folded = foldChapterText(text, chapterDiagramState.caseSensitive);
  const occurrences = [];

  terms.forEach((term) => {
    const variants = getChapterSearchVariants(term);
    if (!variants.length) {
      return;
    }

    const regex = new RegExp(buildChapterPattern(variants), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      occurrences.push(match[0]);
    }
  });

  return occurrences;
}

function getChapterSearchVariants(term) {
  const folded = foldChapterText(term, chapterDiagramState.caseSensitive).text;
  if (!folded) {
    return [];
  }

  const lexicalVariants = getChapterVariantGroup(folded, getChapterLexicalVariantGroups());
  const hasLexicalVariantGroup = lexicalVariants.length > 1 || lexicalVariants[0] !== folded;
  if (isChapterPhraseTerm(folded) && !hasLexicalVariantGroup) {
    return getChapterPhraseVariants(folded);
  }
  return [...new Set(lexicalVariants)].filter(Boolean);
}

function getChapterLexicalVariantGroups() {
  return [
    ["ahreman", "ahrimen", "ahriman", "aharman", "ahremn", "ahremanag"],
    ["druz", "druj", "drux", "drug", "draoga"],
    ["ohrmazd", "ormazd", "ahura mazda", "ahuramazda", "dadar"],
    ["zadspram", "zadsparam", "zatspram", "zad-spram"],
    ["manuchihr", "manushchihr", "manuschihr", "manuscihr", "manushcihr"]
  ];
}

function getChapterPhraseVariants(term) {
  const parts = term.split(/[\s-]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return [term];
  }

  const phraseVariantGroups = [
    ["gannag", "ganag", "gannak", "ganak", "gandag"],
    ["menog", "menoy", "menok", "minog", "mainyog"]
  ];
  const partVariants = parts.map((part) => getChapterVariantGroup(part, phraseVariantGroups));
  const phrases = new Set();

  function combine(index, current) {
    if (index === partVariants.length) {
      phrases.add(current.join(" "));
      return;
    }
    partVariants[index].forEach((variant) => combine(index + 1, [...current, variant]));
  }

  combine(0, []);
  return [...phrases];
}

function getChapterVariantGroup(term, groups) {
  return groups.find((group) => group.includes(term)) || [term];
}

function buildChapterPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(termToChapterPattern)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return chapterDiagramState.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
}

function termToChapterPattern(term) {
  return escapeChapterRegExp(term).replace(/(?:\s+|\\-|-)+/g, "[\\s-]+");
}

function isChapterPhraseTerm(term) {
  return /[\s-]/.test(term.trim());
}

function parseChapterRecords(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  const hasTsvRecords = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && isChapterTsvRecord(trimmed);
  });
  return hasTsvRecords ? parseChapterTsvRecords(lines) : parseChapterSectionRecords(lines);
}

function parseChapterTsvRecords(lines) {
  return lines
    .map((line, index) => {
      const trimmed = line.trim();
      const columns = trimmed.split("\t");
      const hasTsvShape = isChapterTsvRecord(trimmed) && !trimmed.startsWith("#");
      return {
        index,
        location: hasTsvShape ? formatChapterTsvLocation(columns) : "",
        text: hasTsvShape ? columns.slice(2).join(" ") : trimmed,
        searchable: hasTsvShape && trimmed.length > 0
      };
    })
    .filter((record) => record.searchable);
}

function parseChapterSectionRecords(lines) {
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

function isChapterTsvRecord(line) {
  const columns = line.split("\t");
  return columns.length >= 3 &&
    columns[0].trim().length > 0 &&
    columns[1].trim().length > 0 &&
    columns.slice(2).join(" ").trim().length > 0;
}

function formatChapterTsvLocation(columns) {
  const first = columns[0].trim();
  const second = columns[1].trim();
  if (/outdated|K35/i.test(first)) {
    return second.replace(/^[A-Za-z]+\s+/, "");
  }
  return second || first;
}

function getChapterKey(location) {
  const normalized = String(location || "").trim();
  if (/^line\s+\d+/i.test(normalized)) {
    return "Unnumbered";
  }
  const match = normalized.match(/([0-9]+)/);
  return match ? match[1] : "Unnumbered";
}

function compareChapterKeys(a, b) {
  const aNumber = Number(a);
  const bNumber = Number(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }
  return String(a).localeCompare(String(b));
}

function copyChapterDiagram(button) {
  const lines = [["Text", "Chapter", "Occurrences", "Locations"].join("\t")];
  chapterDiagramState.latestSummaries.forEach((summary) => {
    summary.chapters.forEach((chapter) => {
      const locations = [...chapter.locations.entries()].map(([location, count]) => `${location} (${count})`).join(", ");
      lines.push([summary.text.siglum, chapter.chapter, chapter.total, locations].join("\t"));
    });
  });

  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = "Copy data";
    }, 1400);
  });
}

function foldChapterText(value, caseSensitive = false) {
  const source = String(value || "");
  const chars = [];
  const map = [];
  for (let index = 0; index < source.length; index += 1) {
    const replacement = CHAPTER_TRANSLITERATION_MAP[source[index]] || source[index];
    const normalized = replacement.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const char of normalized) {
      chars.push(caseSensitive ? char : char.toLowerCase());
      map.push(index);
    }
  }
  return { text: chars.join(""), map };
}

function escapeChapterRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeChapterHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
