const pageConfig = document.body.dataset;
const DATA_URL = pageConfig.dataUrl || "pseudo-data.json";
const SOURCE_KEY = pageConfig.sourceKey || "Dd";
const TARGET_KEY = pageConfig.targetKey || "PY";
const SOURCE_LABEL = pageConfig.sourceLabel || "DD";
const TARGET_LABEL = pageConfig.targetLabel || "PY";
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
    targetRange: raw[sentenceRangeKey] || "N/A"
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
  const query = pseudoState.query.toLocaleLowerCase();
  pseudoState.filtered = pseudoState.all
    .filter((record) => !pseudoState.tier || record.tier === pseudoState.tier)
    .filter((record) => !query || searchableText(record).includes(query))
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
        <dl class="detail-grid">
          <div><dt>${escapeHtml(TARGET_LABEL)} Sentence Range</dt><dd>${escapeHtml(record.targetRange)}</dd></div>
          <div><dt>IDF Cosine</dt><dd>${escapeHtml(record.cosine)}</dd></div>
          <div><dt>Shared Distinct Words</dt><dd>${record.sharedCount}</dd></div>
        </dl>
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
  return [
    record.sharedWords,
    record.sourcePreview,
    record.targetPreview,
    record.targetRange,
    record.tier,
    String(record.rank),
    String(record.score)
  ].join(" ").toLocaleLowerCase();
}

function highlight(value) {
  const safe = escapeHtml(value);
  if (!pseudoState.query) {
    return safe;
  }

  const escaped = escapeRegExp(escapeHtml(pseudoState.query));
  return safe.replace(new RegExp(escaped, "giu"), (match) => `<mark>${match}</mark>`);
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
