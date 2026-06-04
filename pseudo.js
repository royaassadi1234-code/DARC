const pageConfig = document.body.dataset;
const DATA_URL = pageConfig.dataUrl || "pseudo-data.json";
const SOURCE_KEY = pageConfig.sourceKey || "Dd";
const TARGET_KEY = pageConfig.targetKey || "PY";
const THIRD_KEY = pageConfig.thirdKey || "";
const SOURCE_LABEL = pageConfig.sourceLabel || "DD";
const TARGET_LABEL = pageConfig.targetLabel || "PY";
const THIRD_LABEL = pageConfig.thirdLabel || "";
const PAGE_SIZE = 40;

const pseudoState = {
  all: [],
  filtered: [],
  expanded: new Set(),
  query: "",
  tier: "",
  sort: "rank",
  visibleCount: PAGE_SIZE
};

const queryEl = document.querySelector("#pseudo-query");
const tierEl = document.querySelector("#tier-filter");
const sortEl = document.querySelector("#sort-mode");
const statusEl = document.querySelector("#pseudo-status");
const summaryEl = document.querySelector("#pseudo-summary");
const galleryEl = document.querySelector("#pseudo-gallery");
const expandAllEl = document.querySelector("#expand-all");
const collapseAllEl = document.querySelector("#collapse-all");
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
const HIGHLIGHT_CLASS_COUNT = 6;

initPseudo();

async function initPseudo() {
  bindPseudoEvents();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }

    const data = await response.json();
    pseudoState.all = data.map(normalizeRecord);
    populateTierFilter();
    applyFilters();
  } catch (error) {
    statusEl.textContent = "Data loading failed";
    galleryEl.innerHTML = `<div class="empty-state">The pseudo-dynamic data could not be loaded.</div>`;
    console.error(error);
  }
}

function bindPseudoEvents() {
  queryEl.addEventListener("input", () => {
    pseudoState.query = queryEl.value.trim();
    pseudoState.visibleCount = PAGE_SIZE;
    applyFilters();
  });

  tierEl.addEventListener("change", () => {
    pseudoState.tier = tierEl.value;
    pseudoState.visibleCount = PAGE_SIZE;
    applyFilters();
  });

  sortEl.addEventListener("change", () => {
    pseudoState.sort = sortEl.value;
    applyFilters();
  });

  expandAllEl.addEventListener("click", () => {
    pseudoState.filtered.slice(0, pseudoState.visibleCount).forEach((record) => pseudoState.expanded.add(record.id));
    renderPseudo();
  });

  collapseAllEl.addEventListener("click", () => {
    pseudoState.expanded.clear();
    renderPseudo();
  });
}

function normalizeRecord(raw, index) {
  const sentenceRangeKey = findKey(raw, `${TARGET_KEY} Sentence Range`, "Sentence Range");
  const sourcePreviewKey = findKey(raw, `${SOURCE_KEY} Paragraph Preview`, `${SOURCE_LABEL} Paragraph Preview`);
  const targetPreviewKey = findKey(raw, `${TARGET_KEY} Paragraph Preview`, `${TARGET_LABEL} Paragraph Preview`);
  const thirdPreviewKey = THIRD_KEY ? findKey(raw, `${THIRD_KEY} Paragraph Preview`, `${THIRD_LABEL} Paragraph Preview`) : "";

  return {
    id: `match-${index + 1}`,
    rank: Number(raw["Candidate Rank"]) || index + 1,
    tier: raw["Match Tier"] || "unclassified",
    score: Number(raw["Match Score"]) || 0,
    cosine: raw["IDF Cosine"] || "N/A",
    sharedCount: Number(raw["Shared Distinct Words"]) || 0,
    sharedWords: raw["Shared Words"] || "N/A",
    sourcePreview: raw[sourcePreviewKey] || "N/A",
    targetPreview: raw[targetPreviewKey] || "N/A",
    thirdPreview: thirdPreviewKey ? raw[thirdPreviewKey] || "" : "",
    targetRange: raw[sentenceRangeKey] || "N/A",
    targetChapterStanza: raw[`${TARGET_KEY} Chapter/Stanza`] || "",
    targetChapter: raw[`${TARGET_KEY} Chapter`] || "",
    targetStanza: raw[`${TARGET_KEY} Stanza`] || "",
    targetXmlSection: raw[`${TARGET_KEY} XML Section`] || ""
  };
}

function findKey(record, preferred, fallback) {
  return Object.keys(record).find((key) => key === preferred || key.includes(preferred)) ||
    Object.keys(record).find((key) => key.includes(fallback)) ||
    preferred;
}

function populateTierFilter() {
  const tiers = [...new Set(pseudoState.all.map((record) => record.tier))].sort();
  tiers.forEach((tier) => {
    const option = document.createElement("option");
    option.value = tier;
    option.textContent = titleCase(tier);
    tierEl.appendChild(option);
  });
}

function applyFilters() {
  const terms = getQueryTerms();
  pseudoState.filtered = pseudoState.all
    .filter((record) => !pseudoState.tier || record.tier === pseudoState.tier)
    .filter((record) => !terms.length || terms.some((term) => searchableText(record).includes(term)))
    .sort(sortRecords);

  renderPseudo();
}

function sortRecords(a, b) {
  if (pseudoState.sort === "score") {
    return b.score - a.score || a.rank - b.rank;
  }

  if (pseudoState.sort === "shared") {
    return b.sharedCount - a.sharedCount || b.score - a.score;
  }

  return a.rank - b.rank;
}

function renderPseudo() {
  const visible = pseudoState.filtered.slice(0, pseudoState.visibleCount);
  const totalScore = pseudoState.filtered.reduce((sum, record) => sum + record.score, 0);
  const averageScore = pseudoState.filtered.length ? totalScore / pseudoState.filtered.length : 0;

  statusEl.textContent = `${pseudoState.filtered.length} of ${pseudoState.all.length} matches`;
  summaryEl.innerHTML = `
    <article class="text-card">
      <div class="siglum">Matches</div>
      <h2>${pseudoState.filtered.length.toLocaleString()}</h2>
      <p class="meta">Filtered candidate alignments</p>
    </article>
    <article class="text-card">
      <div class="siglum">Average score</div>
      <h2>${averageScore.toFixed(4)}</h2>
      <p class="meta">Within the current result set</p>
    </article>
    <article class="text-card">
      <div class="siglum">Visible</div>
      <h2>${visible.length.toLocaleString()}</h2>
      <p class="meta">Showing ${Math.min(pseudoState.visibleCount, pseudoState.filtered.length).toLocaleString()} records</p>
    </article>
  `;

  if (!visible.length) {
    galleryEl.innerHTML = `<div class="empty-state">No matches found for this search.</div>`;
    return;
  }

  galleryEl.innerHTML = `
    ${visible.map(renderCard).join("")}
    ${pseudoState.filtered.length > visible.length ? `<button class="load-more" id="load-more" type="button">Show ${Math.min(PAGE_SIZE, pseudoState.filtered.length - visible.length)} more</button>` : ""}
  `;

  galleryEl.querySelectorAll("[data-card-id]").forEach((button) => {
    button.addEventListener("click", () => toggleCard(button.dataset.cardId));
  });

  const loadMore = galleryEl.querySelector("#load-more");
  if (loadMore) {
    loadMore.addEventListener("click", () => {
      pseudoState.visibleCount += PAGE_SIZE;
      renderPseudo();
    });
  }
}

function renderCard(record) {
  const expanded = pseudoState.expanded.has(record.id);
  return `
    <article class="pseudo-card ${expanded ? "expanded" : ""}">
      <button class="pseudo-card-header" type="button" data-card-id="${record.id}">
        <span>
          <span class="siglum">Rank ${record.rank}</span>
          <strong>${highlight(record.sharedWords)}</strong>
        </span>
        <span class="pseudo-card-meta">${titleCase(record.tier)} | ${record.score.toFixed(4)}</span>
      </button>
      <div class="pseudo-card-body">
        <section>
          <h2>${escapeHtml(SOURCE_LABEL)} Paragraph Preview</h2>
          <p>${highlight(record.sourcePreview)}</p>
        </section>
        <section>
          <h2>${escapeHtml(TARGET_LABEL)} Paragraph Preview</h2>
          <p>${highlight(record.targetPreview)}</p>
        </section>
        ${record.thirdPreview ? `
          <section>
            <h2>${escapeHtml(THIRD_LABEL)} Paragraph Preview</h2>
            <p>${highlight(record.thirdPreview)}</p>
          </section>
        ` : ""}
      </div>
    </article>
  `;
}

function toggleCard(id) {
  if (pseudoState.expanded.has(id)) {
    pseudoState.expanded.delete(id);
  } else {
    pseudoState.expanded.add(id);
  }

  renderPseudo();
}

function searchableText(record) {
  return foldText([
    record.sharedWords,
    record.sourcePreview,
    record.targetPreview,
    record.thirdPreview,
    record.targetRange,
    record.targetChapterStanza,
    record.targetXmlSection,
    record.tier,
    String(record.rank),
    String(record.score)
  ].join(" ")).text;
}

function highlight(value) {
  const terms = getQueryTerms();
  if (!terms.length) {
    return escapeHtml(value);
  }

  const ranges = findMatchRanges(value, terms);
  if (!ranges.length) {
    return escapeHtml(value);
  }

  let html = "";
  let cursor = 0;
  ranges.forEach(({ start, end, termIndex }) => {
    html += escapeHtml(String(value).slice(cursor, start));
    html += `<mark class="term-${(termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${escapeHtml(String(value).slice(start, end))}</mark>`;
    cursor = end;
  });
  html += escapeHtml(String(value).slice(cursor));
  return html;
}

function getQueryTerms() {
  return [...new Set(pseudoState.query.split(/[,\s;]+/)
    .map((term) => foldText(term.trim()).text)
    .filter(Boolean))];
}

function buildPattern(terms) {
  return terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
}

function findMatchRanges(value, terms) {
  const folded = foldText(value);
  const matches = [];

  terms.forEach((term, termIndex) => {
    if (!term) {
      return;
    }

    const regex = new RegExp(buildPattern([term]), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      matches.push({
        start: folded.map[match.index],
        end: folded.map[match.index + match[0].length - 1] + 1,
        termIndex
      });
    }
  });

  return mergeRanges(matches);
}

function mergeRanges(matches) {
  return matches
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .reduce((ranges, match) => {
      const previous = ranges[ranges.length - 1];
      if (previous && match.start < previous.end) {
        if (match.end > previous.end) {
          previous.end = match.end;
        }
      } else {
        ranges.push({ ...match });
      }
      return ranges;
    }, []);
}

function foldText(value) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const folded = (TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, "")).toLocaleLowerCase();
    Array.from(folded).forEach((foldedChar) => {
      text += foldedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
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
