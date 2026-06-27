const TRANS_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt", englishFile: "DD-en.txt", persianTranslationFile: "dd2mahshid-persian-translations.json" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt", englishFile: "PY-en.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt", englishFile: "WZ-en.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt", englishFile: "NM-en.txt" }
];

const transState = {
  texts: [],
  selectedTextId: "dd",
  searchByText: {},
  currentPage: 1,
  pageSize: 24,
  targetLocation: ""
};

const queryEl = document.querySelector("#trans-query");
const clearEl = document.querySelector("#trans-clear");
const statusEl = document.querySelector("#trans-status");
const readerEl = document.querySelector("#trans-reader");
const paginationTopEl = document.querySelector("#trans-pagination-top");
const paginationBottomEl = document.querySelector("#trans-pagination-bottom");
const TRANS_SEARCH_DEBOUNCE_MS = 300;
let transSearchRenderTimer = null;

initTrans();

async function initTrans() {
  try {
    transState.selectedTextId = getTextIdFromUrl();
    transState.targetLocation = getLocationFromUrl();
    transState.texts = await Promise.all(TRANS_TEXTS.map(loadTextBundle));
    bindTransEvents();
    syncQueryInput();
    renderReader();
  } catch (error) {
    statusEl.textContent = "Text loading failed";
    readerEl.innerHTML = `<div class="empty-state">The texts could not be loaded.</div>`;
    console.error(error);
  }
}

function bindTransEvents() {
  queryEl.addEventListener("input", () => {
    clearTargetLocation();
    transState.searchByText[transState.selectedTextId] = queryEl.value;
    transState.currentPage = 1;
    scheduleTransSearchRender();
  });

  clearEl.addEventListener("click", () => {
    clearTargetLocation();
    queryEl.value = "";
    transState.searchByText[transState.selectedTextId] = "";
    transState.currentPage = 1;
    renderReaderImmediately();
    queryEl.focus();
  });

  window.addEventListener("popstate", () => {
    transState.selectedTextId = getTextIdFromUrl();
    transState.targetLocation = getLocationFromUrl();
    transState.currentPage = 1;
    syncQueryInput();
    renderReaderImmediately();
  });
}

function scheduleTransSearchRender() {
  window.clearTimeout(transSearchRenderTimer);
  transSearchRenderTimer = window.setTimeout(() => {
    transSearchRenderTimer = null;
    renderReader();
  }, TRANS_SEARCH_DEBOUNCE_MS);
}

function renderReaderImmediately() {
  window.clearTimeout(transSearchRenderTimer);
  transSearchRenderTimer = null;
  renderReader();
}

function getTextIdFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("text");
  return TRANS_TEXTS.some((text) => text.id === requested) ? requested : "dd";
}

function getLocationFromUrl() {
  return new URLSearchParams(window.location.search).get("location") || "";
}

function clearTargetLocation() {
  transState.targetLocation = "";
}

function syncQueryInput() {
  queryEl.value = transState.searchByText[transState.selectedTextId] || "";
  const text = TRANS_TEXTS.find((item) => item.id === transState.selectedTextId);
  queryEl.placeholder = text ? `Search ${text.siglum}` : "Search this text";
}

async function loadTextBundle(config) {
  const [mainRaw, englishRaw, persianTranslations] = await Promise.all([
    fetchRequiredText(config.file),
    fetchOptionalText(config.englishFile),
    fetchOptionalJson(config.persianTranslationFile)
  ]);

  const records = parseRecords(mainRaw);
  const englishRecords = englishRaw ? parseRecords(englishRaw) : [];
  const englishByLocation = new Map(englishRecords.map((record) => [record.location, record.text]));

  return {
    ...config,
    records,
    englishByLocation,
    persianTranslations
  };
}

async function fetchRequiredText(file) {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not load ${file}`);
  }
  return response.text();
}

async function fetchOptionalText(file) {
  if (!file) {
    return "";
  }
  try {
    const response = await fetch(file);
    return response.ok ? response.text() : "";
  } catch {
    return "";
  }
}

async function fetchOptionalJson(file) {
  if (!file) {
    return {};
  }
  try {
    const response = await fetch(file);
    return response.ok ? response.json() : {};
  } catch {
    return {};
  }
}

function renderReader() {
  const text = transState.texts.find((item) => item.id === transState.selectedTextId) || transState.texts[0];
  if (!text) {
    return;
  }

  const query = transState.searchByText[text.id] || "";
  const filteredRecords = filterRecords(text, query);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / transState.pageSize));

  if (transState.targetLocation) {
    const targetIndex = filteredRecords.findIndex((record) => isSameLocation(record.location, transState.targetLocation));
    if (targetIndex >= 0) {
      transState.currentPage = Math.floor(targetIndex / transState.pageSize) + 1;
    }
  }

  transState.currentPage = Math.min(Math.max(1, transState.currentPage), pageCount);
  const pageStart = (transState.currentPage - 1) * transState.pageSize;
  const pageRecords = filteredRecords.slice(pageStart, pageStart + transState.pageSize);
  const rangeStart = filteredRecords.length ? pageStart + 1 : 0;
  const rangeEnd = pageStart + pageRecords.length;

  statusEl.textContent = `${text.siglum} | ${filteredRecords.length.toLocaleString()} of ${text.records.length.toLocaleString()} paragraphs`;
  readerEl.innerHTML = `
    <article class="trans-heading">
      <div>
        <div class="siglum">${escapeHtml(text.siglum)}</div>
        <h2>${escapeHtml(text.title)}</h2>
        <p>${query ? `Search results for "${escapeHtml(query)}"` : `Page ${transState.currentPage.toLocaleString()} of ${pageCount.toLocaleString()}`}</p>
      </div>
      <span class="count-pill hit">${rangeStart.toLocaleString()}-${rangeEnd.toLocaleString()}</span>
    </article>
    ${pageRecords.length ? `
      <div class="trans-list">
        ${pageRecords.map((record) => renderTransParagraph(
          record,
          text.englishByLocation.get(record.location),
          getPersianTranslation(text, record.location),
          query,
          transState.targetLocation
        )).join("")}
      </div>
    ` : `<div class="empty-state">No paragraphs found in ${escapeHtml(text.siglum)}.</div>`}
  `;
  renderPagination(pageCount);
  updateActiveTransLinks(text.id);
  scrollToTargetLocation();
}

function filterRecords(text, query) {
  const terms = tokenizeQuery(query);
  if (!terms.length) {
    return text.records;
  }

  return text.records.filter((record) => {
    const haystack = normalizeSearchText([
      record.location,
      record.text,
      text.englishByLocation.get(record.location) || ""
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function tokenizeQuery(query) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function normalizeSearchText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ēə]/gi, "e")
    .replace(/[āå]/gi, "a")
    .replace(/[īı]/gi, "i")
    .replace(/[ō]/gi, "o")
    .replace(/[ū]/gi, "u")
    .replace(/[š]/gi, "s")
    .replace(/[č]/gi, "c")
    .replace(/[ǰ]/gi, "j")
    .replace(/[γ]/gi, "g")
    .replace(/[θ]/gi, "t")
    .toLocaleLowerCase();
}

function normalizeSearchTextWithMap(value) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const normalized = normalizeSearchText(char);
    Array.from(normalized).forEach((normalizedChar) => {
      text += normalizedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function highlightSearchTerms(value, query) {
  const terms = tokenizeQuery(query);
  if (!terms.length) {
    return escapeHtml(value);
  }

  const folded = normalizeSearchTextWithMap(value);
  const ranges = [];

  terms.forEach((term) => {
    let cursor = 0;
    while (term && cursor < folded.text.length) {
      const index = folded.text.indexOf(term, cursor);
      if (index === -1) {
        break;
      }
      ranges.push({
        start: folded.map[index],
        end: folded.map[index + term.length - 1] + 1
      });
      cursor = index + Math.max(1, term.length);
    }
  });

  const merged = mergeHighlightRanges(ranges);
  if (!merged.length) {
    return escapeHtml(value);
  }

  let html = "";
  let cursor = 0;
  const text = String(value);
  merged.forEach((range) => {
    html += escapeHtml(text.slice(cursor, range.start));
    html += `<strong class="trans-search-hit">${escapeHtml(text.slice(range.start, range.end))}</strong>`;
    cursor = range.end;
  });
  html += escapeHtml(text.slice(cursor));
  return html;
}

function mergeHighlightRanges(ranges) {
  return ranges
    .filter((range) => Number.isInteger(range.start) && Number.isInteger(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);
}

function renderPagination(pageCount) {
  const markup = pageCount > 1 ? buildPaginationMarkup(pageCount) : "";
  paginationTopEl.innerHTML = markup;
  paginationBottomEl.innerHTML = markup;
  [paginationTopEl, paginationBottomEl].forEach((container) => {
    container.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        clearTargetLocation();
        transState.currentPage = Number(button.dataset.page);
        renderReaderImmediately();
        readerEl.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
}

function buildPaginationMarkup(pageCount) {
  const pages = getVisiblePages(pageCount);
  return pages.map((page) => {
    if (page === "...") {
      return `<span class="page-gap">...</span>`;
    }
    const isActive = page === transState.currentPage;
    return `<button class="page-dot${isActive ? " active" : ""}" type="button" data-page="${page}" aria-label="Page ${page}"${isActive ? ' aria-current="page"' : ""}>${page}</button>`;
  }).join("");
}

function getVisiblePages(pageCount) {
  if (pageCount <= 12) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, 2, pageCount - 1, pageCount]);
  for (let page = transState.currentPage - 2; page <= transState.currentPage + 2; page += 1) {
    if (page > 0 && page <= pageCount) {
      pages.add(page);
    }
  }

  return Array.from(pages)
    .sort((a, b) => a - b)
    .reduce((items, page, index, sorted) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        items.push("...");
      }
      items.push(page);
      return items;
    }, []);
}

function updateActiveTransLinks(textId) {
  document.querySelectorAll('.nav-menu-list a[href^="trans.html?text="]').forEach((link) => {
    const id = new URL(link.href).searchParams.get("text");
    link.classList.toggle("active", id === textId);
  });
}

function getPersianTranslation(text, location) {
  const chapter = baseLocation(location).split(".", 1)[0];
  return text.persianTranslations?.[chapter] || null;
}

function baseLocation(location) {
  return String(location).trim().replace(/[a-z]+$/i, "");
}

function isSameLocation(a, b) {
  return String(a || "").trim() === String(b || "").trim();
}

function scrollToTargetLocation() {
  if (!transState.targetLocation) {
    return;
  }

  window.requestAnimationFrame(() => {
    const target = [...readerEl.querySelectorAll("[data-trans-location]")]
      .find((card) => isSameLocation(card.dataset.transLocation, transState.targetLocation));
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function renderTransParagraph(record, englishText = "", persianTranslation = null, query = "", targetLocation = "") {
  const isTarget = targetLocation && isSameLocation(record.location, targetLocation);
  const highlightedTranscription = highlightSearchTerms(record.text, query);
  const highlightedEnglish = englishText
    ? highlightSearchTerms(englishText, query)
    : "English translation will be added later.";
  return `
    <article class="trans-card trans-book-spread${isTarget ? " trans-card-target" : ""}" data-trans-location="${escapeHtml(record.location)}">
      <details class="trans-page trans-page-transcription">
        <summary class="trans-page-bar">
          <span>Transcription</span>
          <strong>${escapeHtml(record.location)}</strong>
        </summary>
        <div class="trans-page-body">
          <p>${highlightedTranscription}</p>
          <details class="trans-inline-option persian-transcription">
            <summary>Persian transcription</summary>
            <p dir="rtl" lang="fa">${escapeHtml(toArabicTranscription(record.text))}</p>
          </details>
          ${persianTranslation ? `
            <details class="trans-inline-option persian-translation">
              <summary>Persian translation (OCR)</summary>
              <p dir="rtl" lang="fa">${escapeHtml(persianTranslation.text || "")}</p>
              <p class="translation-source-note" dir="ltr">
                ${escapeHtml(persianTranslation.source || "DD2Mahshid.PDF OCR")}
                ${persianTranslation.pdfPages?.length ? ` | PDF page(s): ${escapeHtml(persianTranslation.pdfPages.join(", "))}` : ""}
              </p>
            </details>
          ` : ""}
        </div>
      </details>
      <details class="trans-page trans-page-translation">
        <summary class="trans-page-bar">
          <span>English translation</span>
          <strong>${escapeHtml(record.location)}</strong>
        </summary>
        <div class="trans-page-body">
          <p>${highlightedEnglish}</p>
        </div>
      </details>
    </article>
  `;
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

function toArabicTranscription(value) {
  const parts = String(value).split(/(\s+|[.,;:!?()[\]{}<>]+)/u);
  let output = "";

  parts.forEach((part) => {
    if (/[\p{L}\p{M}\p{N}=_-]/u.test(part)) {
      if (isStandaloneEzafe(part)) {
        output = output.replace(/\s+$/u, "") + "ِ";
        return;
      }
      output += transliterateWord(part);
      return;
    }

    output += part;
  });

  return output;
}

function transliterateWord(word) {
  const prefix = word.match(/^[=_.:-]+/)?.[0] || "";
  const suffix = word.match(/[=_.:-]+$/)?.[0] || "";
  let body = word.replace(/^[=_.:-]+|[=_.:-]+$/g, "").toLocaleLowerCase();
  if (!body) {
    return word;
  }
  if (body === "ud") {
    return `${prefix}و${suffix}`;
  }
  if (body === "pad") {
    return `${prefix}به${suffix}`;
  }
  if (body === "čē" || body === "ce") {
    return `${prefix}چه${suffix}`;
  }
  const finalLongE = body.endsWith("ē");
  if (finalLongE) {
    body = body.slice(0, -1);
  }
  const initialA = body.startsWith("a");
  if (initialA) {
    body = body.slice(1);
  }
  const initialE = body.startsWith("e");
  if (initialE) {
    body = body.slice(1);
  }

  const replacements = [
    ["xw", "خو"], ["kh", "خ"], ["ch", "چ"], ["sh", "ش"], ["zh", "ژ"],
    ["θ", "ث"], ["γ", "غ"], ["δ", "ذ"], ["š", "ش"], ["č", "چ"], ["ǰ", "ج"],
    ["ā", "ا"], ["ē", "ێ"], ["ī", "ی"], ["ō", "و"], ["ū", "و"]
  ];
  replacements.forEach(([from, to]) => {
    body = body.replaceAll(from, to);
  });

  const chars = {
    a: "َ", e: "ِ", i: "ِ", o: "ُ", u: "ُ",
    b: "ب", p: "پ", t: "ت", j: "ج", c: "چ", d: "د", f: "ف",
    g: "گ", h: "ه", k: "ک", l: "ل", m: "م", n: "ن", r: "ر",
    s: "س", w: "و", v: "و", x: "خ", y: "ی", z: "ز", q: "ق"
  };

  const transcribed = `${initialA ? "ا" : ""}${initialE ? "ای" : ""}${Array.from(body).map((char) => chars[char] || char).join("")}${finalLongE ? "ه" : ""}`;
  return `${prefix}${transcribed}${suffix}`;
}

function isStandaloneEzafe(value) {
  const clean = String(value).replace(/^[=_.:-]+|[=_.:-]+$/g, "").toLocaleLowerCase();
  return clean === "ī" || clean === "i";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
