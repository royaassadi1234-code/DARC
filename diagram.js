const DIAGRAM_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt" },
  { id: "gbd", siglum: "GBd", title: "Greater Bundahishn", file: "GBd.txt", parseMode: "section" },
  { id: "prdd", siglum: "PRDd", title: "Pahlavi Rivayat Accompanying the Dadestan i Denig", file: "PRDd.txt", parseMode: "section" }
];

const diagramState = {
  texts: [],
  dictionary: new Map(),
  query: "",
  multipleWords: true,
  phraseSearch: false,
  wholeWord: true,
  caseSensitive: false,
  selectedTextIds: new Set(DIAGRAM_TEXTS.map((text) => text.id)),
  latestSummaries: [],
  latestTerms: []
};

const queryEl = document.querySelector("#diagram-query");
const multipleEl = document.querySelector("#diagram-multiple");
const phraseEl = document.querySelector("#diagram-phrase");
const wholeWordEl = document.querySelector("#diagram-whole-word");
const caseEl = document.querySelector("#diagram-case-sensitive");
const textToggleEls = [...document.querySelectorAll(".diagram-text-toggle")];
const statusEl = document.querySelector("#diagram-status");
const toolEl = document.querySelector("#diagram-tool");

const HIGHLIGHT_CLASS_COUNT = 6;
const DICTIONARY_URL = "mpcd-workspace-dictionary.json";
const MAX_SEARCH_VARIANTS = 600;
const OHRMAZD_SEARCH_FAMILY = ["ohrmazd", "dadar", "dadar ohrmazd", "dadar i ohrmazd"];
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

initDiagram();

async function initDiagram() {
  bindDiagramEvents();

  try {
    const [texts, dictionary] = await Promise.all([
      Promise.all(DIAGRAM_TEXTS.map(loadText)),
      loadDictionary()
    ]);
    diagramState.texts = texts;
    diagramState.dictionary = dictionary;
    statusEl.textContent = `${diagramState.texts.length} texts ready`;
    renderDiagram();
  } catch (error) {
    statusEl.textContent = "Text loading failed";
    toolEl.innerHTML = `<div class="empty-state">The text files could not be loaded.</div>`;
    console.error(error);
  }
}

async function loadDictionary() {
  try {
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) {
      return new Map();
    }

    const data = await response.json();
    return new Map((data.entries || []).flatMap((entry) => {
      const meanings = (entry.meanings || []).filter(Boolean);
      if (!entry.word || !meanings.length) {
        return [];
      }
      return getDictionaryKeys(entry.word).map((key) => [key, meanings]);
    }));
  } catch (error) {
    console.warn("Dictionary glosses unavailable", error);
    return new Map();
  }
}

function bindDiagramEvents() {
  syncSelectedTextsFromControls();

  queryEl.addEventListener("input", () => {
    diagramState.query = queryEl.value.trim();
    renderDiagram();
  });

  multipleEl.addEventListener("change", () => {
    diagramState.multipleWords = multipleEl.checked;
    if (diagramState.multipleWords) {
      diagramState.phraseSearch = false;
      phraseEl.checked = false;
    }
    updateSearchModeControls();
    renderDiagram();
  });

  phraseEl.addEventListener("change", () => {
    diagramState.phraseSearch = phraseEl.checked;
    if (diagramState.phraseSearch) {
      diagramState.multipleWords = false;
      multipleEl.checked = false;
    }
    updateSearchModeControls();
    renderDiagram();
  });

  wholeWordEl.addEventListener("change", () => {
    diagramState.wholeWord = wholeWordEl.checked;
    renderDiagram();
  });

  caseEl.addEventListener("change", () => {
    diagramState.caseSensitive = caseEl.checked;
    renderDiagram();
  });

  toolEl.addEventListener("click", (event) => {
    const copyDiagramButton = event.target.closest("[data-copy-diagrams]");
    if (copyDiagramButton) {
      copyDiagrams(copyDiagramButton);
      return;
    }

    const openButton = event.target.closest("[data-attestation-id]");
    if (openButton) {
      openAttestationDialog(openButton.dataset.attestationId);
      return;
    }

    if (event.target.closest("[data-close-attestation]")) {
      closeAttestationDialog();
    }
  });

  textToggleEls.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const nextSelection = new Set(
        textToggleEls.filter((input) => input.checked).map((input) => input.value)
      );
      if (!nextSelection.size) {
        toggle.checked = true;
        return;
      }
      diagramState.selectedTextIds = nextSelection;
      renderDiagram();
    });
  });

  updateSearchModeControls();
}

function syncSelectedTextsFromControls() {
  const checkedIds = textToggleEls.filter((input) => input.checked).map((input) => input.value);
  if (checkedIds.length) {
    diagramState.selectedTextIds = new Set(checkedIds);
  }
}

function updateSearchModeControls() {
  multipleEl.disabled = diagramState.phraseSearch;
}

async function loadText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  return {
    ...config,
    raw,
    records: parseRecords(raw, config.parseMode)
  };
}

function renderDiagram() {
  const search = createSearch(diagramState.query);
  const selectedTexts = getSelectedTexts();
  if (!search) {
    statusEl.textContent = `${selectedTexts.length} texts selected`;
    toolEl.innerHTML = `
      <article class="diagram-card">
        <header>
          <div>
            <div class="siglum">Diagram</div>
            <h2>Vertical Attestation Comparison</h2>
          </div>
          <span class="count-pill">0</span>
        </header>
        <div class="empty-state">
          Search a word, several words, or a phrase to compare attestations across selected texts.
        </div>
      </article>
    `;
    return;
  }

  const rawSummaries = selectedTexts.map((text) => getOccurrenceSummary(text, search));
  const displayTerms = search.terms;
  const summaries = rawSummaries.map((summary) => normalizeSummaryTerms(summary, displayTerms));
  diagramState.latestSummaries = summaries;
  diagramState.latestTerms = displayTerms;
  const maxCount = Math.max(1, ...summaries.flatMap((summary) => summary.termCounts));
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const textsWithHits = summaries.filter((summary) => summary.total > 0).length;
  const variantLabel = search.terms.length > 1 ? ` | ${search.terms.length} terms` : "";
  const modeLabel = search.phraseSearch ? " | phrase" : "";
  statusEl.textContent = `${textsWithHits} of ${summaries.length} selected texts | ${total} occurrences${variantLabel}${modeLabel}`;

  toolEl.innerHTML = `
    <article class="diagram-card diagram-standalone-card">
      <header>
        <div>
          <div class="siglum">Diagram</div>
          <h2>Text-Based Attestation Frequency</h2>
        </div>
        <div class="diagram-actions">
          <button class="copy-tool-button" type="button" data-copy-diagrams>Copy diagrams</button>
          <span class="count-pill ${total ? "hit" : "miss"}">${total}</span>
        </div>
      </header>

      <div class="term-legend" aria-label="Searched word legend">
        ${diagramState.latestTerms.map((term, index) => `
          <span><i class="legend-swatch term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"></i>${renderDictionaryWord(term)}</span>
        `).join("")}
      </div>
      <p class="diagram-note">Terms: ${diagramState.latestTerms.map((term) => escapeHtml(term)).join(", ")}</p>

      <section class="diagram-result-grid" aria-label="Diagram and occurrence locations">
        ${summaries.map((summary) => renderDiagramResultColumn(summary, diagramState.latestTerms, maxCount)).join("")}
      </section>
      <div class="attestation-dialog" id="attestation-dialog" role="dialog" aria-modal="true" aria-labelledby="attestation-dialog-title" hidden></div>
    </article>
  `;
}

function getSelectedTexts() {
  return diagramState.texts.filter((text) => diagramState.selectedTextIds.has(text.id));
}

function getDisplayTerms(summaries, fallbackTerms) {
  const actualTerms = [];
  const seen = new Set();
  summaries.forEach((summary) => {
    summary.occurrences.forEach((occurrence) => {
      const label = occurrence.matchedText || fallbackTerms[occurrence.termIndex];
      const key = foldText(label, diagramState.caseSensitive).text;
      if (key && !seen.has(key)) {
        seen.add(key);
        actualTerms.push(label);
      }
    });
  });
  return actualTerms.length ? actualTerms : fallbackTerms;
}

function normalizeSummaryTerms(summary, displayTerms) {
  return {
    ...summary,
    terms: displayTerms,
    termCounts: displayTerms.map((term, termIndex) =>
      summary.occurrences.filter((occurrence) => occurrence.termIndex === termIndex).length
    )
  };
}

function renderDiagramResultColumn(summary, terms, maxCount) {
  return `
    <div class="diagram-result-column">
      ${renderVerticalBar(summary, maxCount)}
      ${renderLinearOccurrences(summary, terms)}
    </div>
  `;
}

function renderVerticalBar(summary, maxCount) {
  return `
    <section class="vertical-bar-group">
      <div class="vertical-bar-bars" aria-label="${escapeHtml(summary.text.siglum)} ${summary.total} occurrences">
        ${summary.termCounts.map((count, index) => {
          const height = count ? Math.max(7, (count / maxCount) * 100) : 0;
          return `
            <div class="vertical-bar-item">
              <div class="vertical-bar-shell">
                <span
                  class="vertical-single-bar term-${(index % HIGHLIGHT_CLASS_COUNT) + 1}"
                  style="height: ${height.toFixed(2)}%"
                  title="${escapeHtml(summary.terms[index])}: ${count}"
                  aria-label="${escapeHtml(summary.terms[index])}: ${count}"
                ></span>
              </div>
              <span class="vertical-term-label">${escapeHtml(shortenTerm(summary.terms[index]))}</span>
            </div>
          `;
        }).join("")}
      </div>
      <div class="vertical-bar-label">
        <strong>${escapeHtml(summary.text.siglum)}</strong>
        <span>${summary.total.toLocaleString()}</span>
      </div>
    </section>
  `;
}

function shortenTerm(term) {
  return term.length > 10 ? `${term.slice(0, 9)}...` : term;
}

function renderLinearOccurrences(summary, terms) {
  return `
    <button class="linear-occurrence-card" type="button" data-attestation-id="${escapeHtml(summary.text.id)}">
      <span class="linear-occurrence-counts">
        ${terms.map((term, index) => `
          <span class="linear-occurrence-term">
            <span>${escapeHtml(shortenTerm(term))}</span>
            <strong>${summary.termCounts[index].toLocaleString()}</strong>
          </span>
        `).join("")}
      </span>
      <span class="linear-occurrence-meta">
        <span>See occurrences</span>
      </span>
    </button>
  `;
}

async function copyDiagrams(button) {
  const original = button.textContent;
  const svg = buildDiagramSvg();
  const fallbackText = buildDiagramCopyText();
  if (!svg) {
    return;
  }

  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      await navigator.clipboard.write([new ClipboardItem({ "image/svg+xml": blob })]);
    } else {
      await writeClipboardText(fallbackText);
    }
    button.textContent = "Copied";
  } catch (error) {
    try {
      await writeClipboardText(fallbackText);
      button.textContent = "Copied data";
    } catch (fallbackError) {
      console.error("Diagram copy failed", error, fallbackError);
      button.textContent = "Copy failed";
    }
  }

  window.setTimeout(() => {
    button.textContent = original;
  }, 1500);
}

function buildDiagramCopyText() {
  const lines = [["Text", ...diagramState.latestTerms, "Total"].join("\t")];
  diagramState.latestSummaries.forEach((summary) => {
    lines.push([
      summary.text.siglum,
      ...summary.termCounts.map((count) => String(count)),
      String(summary.total)
    ].join("\t"));
  });
  return lines.join("\n");
}

function buildDiagramSvg() {
  const summaries = diagramState.latestSummaries;
  const terms = diagramState.latestTerms;
  if (!summaries.length || !terms.length) {
    return "";
  }

  const columnWidth = 150;
  const chartHeight = 260;
  const labelHeight = 62;
  const padding = 28;
  const width = padding * 2 + summaries.length * columnWidth;
  const height = padding * 2 + chartHeight + labelHeight;
  const maxCount = Math.max(1, ...summaries.flatMap((summary) => summary.termCounts));
  const colors = ["#b64336", "#2563a7", "#267052", "#7a3ea3", "#9a5a15", "#2d6870"];

  const bars = summaries.map((summary, summaryIndex) => {
    const x = padding + summaryIndex * columnWidth;
    const barWidth = Math.min(28, (columnWidth - 44) / Math.max(1, terms.length));
    const groupWidth = barWidth * terms.length;
    const startX = x + (columnWidth - groupWidth) / 2;
    const barNodes = summary.termCounts.map((count, termIndex) => {
      const barHeight = count ? Math.max(6, (count / maxCount) * chartHeight) : 0;
      const barX = startX + termIndex * barWidth;
      const barY = padding + chartHeight - barHeight;
      return `<rect x="${barX.toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${colors[termIndex % colors.length]}" />`;
    }).join("");
    return `
      <g>
        ${barNodes}
        <text x="${x + columnWidth / 2}" y="${padding + chartHeight + 24}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#213547">${escapeSvg(summary.text.siglum)}</text>
        <text x="${x + columnWidth / 2}" y="${padding + chartHeight + 44}" text-anchor="middle" font-family="Arial" font-size="13" fill="#5d6b78">${summary.total}</text>
      </g>
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="#8ea1b0" stroke-width="1"/>
      ${bars}
    </svg>
  `.trim();
}

function openAttestationDialog(textId) {
  const dialog = document.querySelector("#attestation-dialog");
  const summary = diagramState.latestSummaries.find((item) => item.text.id === textId);
  if (!dialog || !summary) {
    return;
  }

  dialog.innerHTML = `
    <div class="attestation-dialog-backdrop" data-close-attestation></div>
    <section class="attestation-dialog-panel">
      <header>
        <div>
          <div class="siglum">${escapeHtml(summary.text.siglum)}</div>
          <h2 id="attestation-dialog-title">${escapeHtml(summary.text.title)}</h2>
        </div>
        <button class="copy-tool-button" type="button" data-close-attestation>Close</button>
      </header>
      <div class="linear-lines">
        ${diagramState.latestTerms.map((term, termIndex) => {
          const locations = summary.occurrences
            .filter((occurrence) => occurrence.termIndex === termIndex)
            .map((occurrence) => occurrence.location);
          return `
            <p>
              <mark class="term-${(termIndex % HIGHLIGHT_CLASS_COUNT) + 1}">${renderDictionaryWord(term)}</mark>:
              ${locations.length ? renderLocationLinks(summary.text, locations) : "none"}
              <span class="term-gloss">${escapeHtml(getTermGloss(term))}</span>
            </p>
          `;
        }).join("")}
      </div>
    </section>
  `;
  dialog.hidden = false;
}

function renderLocationLinks(text, locations) {
  return locations.map((location) => renderLocationLink(text, location)).join(", ");
}

function renderLocationLink(text, location) {
  const href = getTransLocationHref(text, location);
  if (!href) {
    return escapeHtml(location);
  }

  return `<a class="diagram-location-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(location)}</a>`;
}

function getTransLocationHref(text, location) {
  if (!["dd", "py", "wz", "nm"].includes(text.id)) {
    return "";
  }

  return `trans.html?text=${encodeURIComponent(text.id)}&location=${encodeURIComponent(location)}`;
}

function closeAttestationDialog() {
  const dialog = document.querySelector("#attestation-dialog");
  if (dialog) {
    dialog.hidden = true;
    dialog.innerHTML = "";
  }
}

function getOccurrenceSummary(text, search) {
  const occurrenceMap = new Map();
  const occurrences = [];

  text.records.forEach((record, recordIndex) => {
    findTermOccurrences(record.text, search.terms).forEach((occurrence) => {
      const key = `${recordIndex}:${occurrence.termIndex}:${occurrence.start}:${occurrence.end}`;
      if (occurrenceMap.has(key)) {
        return;
      }
      occurrenceMap.set(key, true);
      occurrences.push({
        location: record.location,
        termIndex: occurrence.termIndex,
        matchedText: occurrence.matchedText
      });
    });
  });
  return {
    text,
    terms: search.terms,
    termCounts: search.terms.map((term, termIndex) =>
      occurrences.filter((occurrence) => occurrence.termIndex === termIndex).length
    ),
    occurrences,
    total: occurrences.length
  };
}

function findTermOccurrences(text, terms) {
  const folded = foldText(text, diagramState.caseSensitive);
  const occurrences = [];

  terms.forEach((term, termIndex) => {
    const variants = getSearchVariants(term);
    if (!variants.length) {
      return;
    }

    const regex = new RegExp(buildPattern(variants), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      const start = folded.map[match.index];
      const endMapIndex = Math.max(match.index, match.index + match[0].length - 1);
      const end = (folded.map[endMapIndex] ?? start) + 1;
      occurrences.push({
        start,
        end,
        termIndex,
        matchedText: text.slice(start, end)
      });
    }
  });

  return classifyOhrmazdFamilyOccurrences(occurrences, terms)
    .sort((a, b) => a.start - b.start || a.termIndex - b.termIndex);
}

function classifyOhrmazdFamilyOccurrences(occurrences, terms) {
  const familyTermIndexes = new Set();
  terms.forEach((term, termIndex) => {
    const key = foldText(term, false).text;
    if (OHRMAZD_SEARCH_FAMILY.includes(key)) {
      familyTermIndexes.add(termIndex);
    }
  });

  if (familyTermIndexes.size < OHRMAZD_SEARCH_FAMILY.length) {
    return occurrences;
  }

  return occurrences.filter((occurrence) => !occurrences.some((other) =>
    other !== occurrence &&
    familyTermIndexes.has(occurrence.termIndex) &&
    familyTermIndexes.has(other.termIndex) &&
    other.start <= occurrence.start &&
    other.end >= occurrence.end &&
    other.end - other.start > occurrence.end - occurrence.start
  ));
}

function getSearchVariants(term) {
  const folded = foldText(term, diagramState.caseSensitive).text;
  if (!folded) {
    return [];
  }

  if (isPhraseTerm(folded)) {
    return getPhraseVariants(folded);
  }

  return getLexicalVariants(folded);
}

function sameDisplayTerm(a, b) {
  return foldText(a || "", diagramState.caseSensitive).text === foldText(b || "", diagramState.caseSensitive).text;
}

function getLexicalVariants(term) {
  return uniqueVariantList([
    ...getVariantGroup(term, getLexicalVariantGroups()),
    ...getGeneratedTermVariants(term)
  ]);
}

function getLexicalVariantGroups() {
  return [
    ["ahreman", "ahrimen", "ahriman", "aharman", "ahremn", "ahremanag"],
    ["druz", "druj", "drux", "drug", "draoga"],
    ["gannag", "ganag", "gannak", "ganak", "gandag", "gannay"],
    ["menog", "menoy", "menok", "minog", "mainyog"],
    ["ohrmazd", "ormazd", "ahura mazda", "ahuramazda"],
    ["zadspram", "zadsparam", "zatspram", "zad-spram"],
    ["manuchihr", "manushchihr", "manuschihr", "manuscihr", "manushcihr"]
  ];
}

function getPhraseVariants(term) {
  const parts = term
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return getLexicalVariants(term);
  }

  const partVariants = parts.map(getLexicalVariants);
  const phrases = new Set();

  function combine(index, current) {
    if (phrases.size >= MAX_SEARCH_VARIANTS) {
      return;
    }
    if (index === partVariants.length) {
      phrases.add(current.join(" "));
      phrases.add(current.join(""));
      phrases.add(current.join("-"));
      phrases.add(current.join("_"));
      return;
    }

    partVariants[index].forEach((variant) => combine(index + 1, [...current, variant]));
  }

  combine(0, []);
  return uniqueVariantList([...phrases]);
}

function getVariantGroup(term, groups) {
  return groups.find((group) => group.includes(term)) || [term];
}

function getGeneratedTermVariants(term) {
  const clean = String(term || "").replace(/^[=_.:-]+|[=_.:-]+$/g, "");
  if (!clean) {
    return [];
  }

  const variants = new Set(getDictionaryKeys(clean).map((key) => foldText(key, diagramState.caseSensitive).text));
  const prefixPatterns = [
    /^u-/,
    /^i-/,
    /^pad-/,
    /^az-/,
    /^o-/,
    /^ud-/,
    /^be-/,
    /^ham-/,
    /^aba[g]?-/,
    /^an-/
  ];
  const suffixPatterns = [
    /-(iz|is|im|it|san|man|tan|ag|ih|an|om|tar|tom)$/
  ];

  [...variants].forEach((variant) => {
    prefixPatterns.forEach((pattern) => {
      const stripped = variant.replace(pattern, "");
      if (stripped && stripped !== variant) {
        variants.add(stripped);
      }
    });
    suffixPatterns.forEach((pattern) => {
      const stripped = variant.replace(pattern, "");
      if (stripped && stripped !== variant) {
        variants.add(stripped);
      }
    });
  });

  return [...variants].flatMap((variant) => [
    variant,
    variant.replace(/-/g, ""),
    variant.replace(/-/g, " ")
  ]);
}

function uniqueVariantList(variants) {
  const seen = new Set();
  const unique = [];
  variants.forEach((variant) => {
    const folded = foldText(variant, diagramState.caseSensitive).text.trim();
    if (!folded || seen.has(folded)) {
      return;
    }
    seen.add(folded);
    unique.push(folded);
  });
  return unique.slice(0, MAX_SEARCH_VARIANTS);
}

function createSearch(query) {
  if (!query) {
    return null;
  }

  const terms = getSearchTerms(query);
  if (!terms.length) {
    return null;
  }

  return { terms, phraseSearch: diagramState.phraseSearch };
}

function getSearchTerms(query) {
  const terms = diagramState.phraseSearch
    ? parsePhraseSearchTerms(query)
    : diagramState.multipleWords
      ? parseMixedSearchTerms(query)
      : [query];
  const cleanTerms = terms.map((term) => term.trim()).filter(Boolean);
  return dedupeEquivalentTerms(expandOhrmazdSearchFamily(cleanTerms));
}

function expandOhrmazdSearchFamily(terms) {
  if (diagramState.phraseSearch) {
    return terms;
  }

  return terms.flatMap((term) => {
    const key = foldText(term, false).text;
    return ["ohrmazd", "ormazd", "ahura mazda", "ahuramazda"].includes(key)
      ? OHRMAZD_SEARCH_FAMILY
      : [term];
  });
}

function parsePhraseSearchTerms(query) {
  const separatedTerms = parseSeparatedSearchTerms(query);
  return separatedTerms.length > 1 ? separatedTerms : [query.trim()];
}

function parseMixedSearchTerms(query) {
  const separatedTerms = parseSeparatedSearchTerms(query);
  if (separatedTerms.length > 1) {
    return separatedTerms;
  }
  return mergeKnownPhraseTerms(parseTermsWithQuotedPhrases(query));
}

function parseSeparatedSearchTerms(query) {
  const terms = [];
  let current = "";
  let quote = "";

  Array.from(query).forEach((char) => {
    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      return;
    }
    if (char === quote) {
      quote = "";
      return;
    }
    if (!quote && /[,;]/.test(char)) {
      const trimmed = current.trim();
      if (trimmed) {
        terms.push(trimmed);
      }
      current = "";
      return;
    }
    current += char;
  });

  const trimmed = current.trim();
  if (trimmed) {
    terms.push(trimmed);
  }
  return terms;
}

function dedupeEquivalentTerms(terms) {
  const seen = new Set();
  const uniqueTerms = [];

  terms.forEach((term) => {
    const key = getVariantKey(term);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueTerms.push(term);
  });

  return uniqueTerms;
}

function getVariantKey(term) {
  const variants = getSearchVariants(term).map((variant) => foldText(variant, diagramState.caseSensitive).text);
  return variants.length ? variants.sort().join("|") : foldText(term, diagramState.caseSensitive).text;
}

function parseTermsWithQuotedPhrases(query) {
  const terms = [];
  const pattern = /"([^"]+)"|'([^']+)'|[^,\s;]+/g;
  let match;
  while ((match = pattern.exec(query)) !== null) {
    terms.push(match[1] || match[2] || match[0]);
  }
  return terms;
}

function mergeKnownPhraseTerms(terms) {
  const knownPhrases = getKnownSearchPhrases();
  const merged = [];
  let index = 0;
  const maxPhraseLength = Math.max(
    2,
    ...[...knownPhrases].map((phrase) => phrase.split(/\s+/).filter(Boolean).length)
  );

  while (index < terms.length) {
    let matchedPhrase = "";
    let matchedLength = 0;

    for (let length = Math.min(maxPhraseLength, terms.length - index); length >= 2; length -= 1) {
      const phrase = terms.slice(index, index + length).join(" ");
      const foldedPhrase = foldText(phrase, diagramState.caseSensitive).text;
      if (knownPhrases.has(foldedPhrase)) {
        matchedPhrase = phrase;
        matchedLength = length;
        break;
      }
    }

    if (matchedPhrase) {
      merged.push(matchedPhrase);
      index += matchedLength;
      continue;
    }

    merged.push(terms[index]);
    index += 1;
  }

  return merged;
}

function getKnownSearchPhrases() {
  const phrases = new Set();
  getLexicalVariantGroups()
    .flat()
    .filter(isPhraseTerm)
    .forEach((phrase) => phrases.add(foldText(phrase, diagramState.caseSensitive).text));

  getPhraseVariants("gannag menog").forEach((phrase) => {
    phrases.add(foldText(phrase, diagramState.caseSensitive).text);
  });

  [
    "dadar i ohrmazd"
  ].forEach((phrase) => {
    phrases.add(foldText(phrase, diagramState.caseSensitive).text);
  });

  return phrases;
}

function buildPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(termToSearchPattern)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return diagramState.wholeWord ? `(?<!${boundary})(?:${escaped})(?!${boundary})` : `(?:${escaped})`;
}

function termToSearchPattern(term) {
  const compoundPrefixPattern = getJoinedCompoundPrefixPattern(term);
  if (compoundPrefixPattern) {
    return compoundPrefixPattern;
  }
  return escapeRegExp(term).replace(/(?:\s+|\\-|_|-)+/g, "[\\s_-]*");
}

function getJoinedCompoundPrefixPattern(term) {
  const gannagVariants = ["gannag", "ganag", "gannak", "ganak", "gandag", "gannay"];
  if (!gannagVariants.includes(term)) {
    return "";
  }

  const menogVariants = ["menog", "menoy", "menok", "minog", "mainyog"];
  const prefix = "(?:dus[\\s_-]*)?";
  const ending = "(?:an|ih)?";
  const menogTail = `(?:[\\s_-]*(?:${menogVariants.map(escapeRegExp).join("|")}))?`;
  return `${prefix}${escapeRegExp(term)}${ending}${menogTail}`;
}

function isPhraseTerm(term) {
  return /[\s-]/.test(term.trim());
}

function parseRecords(raw, mode = "auto") {
  const lines = raw.split(/\r\n|\n|\r/);
  if (mode === "section") {
    return parseSectionRecords(lines);
  }

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
  return [first, second].filter(Boolean).join(" · ");
}

function foldText(value, caseSensitive = false) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const folded = TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, "");
    const normalized = caseSensitive ? folded : folded.toLocaleLowerCase();
    Array.from(normalized).forEach((foldedChar) => {
      text += foldedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function renderDictionaryWord(term) {
  const meanings = getMeanings(term);
  const word = escapeHtml(term);
  return meanings.length
    ? `<span class="dict-word" title="${escapeHtml(meanings.join("; "))}">${word}</span>`
    : word;
}

function getTermGloss(term) {
  const meanings = getMeanings(term);
  return meanings.length ? `(${meanings.slice(0, 2).join("; ")})` : "";
}

function getMeanings(token) {
  for (const key of getDictionaryKeys(token)) {
    const meanings = diagramState.dictionary.get(key);
    if (meanings?.length) {
      return meanings;
    }
  }
  return [];
}

function getDictionaryKeys(value) {
  const raw = String(value).trim();
  const trimmed = raw.replace(/^[=_.:;,[\](){}<>]+|[=_.:;,[\](){}<>]+$/g, "");
  const seeds = [raw, trimmed, foldText(raw).text, foldText(trimmed).text]
    .map((key) => key.toLowerCase())
    .filter(Boolean);
  const variants = new Set(seeds);

  seeds.forEach((key) => {
    [
      key.replace(/^=+/, ""),
      key.replace(/^u-/, ""),
      key.replace(/^i-/, ""),
      key.replace(/^pad-/, ""),
      key.replace(/^az-/, ""),
      key.replace(/^o-/, ""),
      key.replace(/^ud-/, ""),
      key.replace(/-(iz|is|im|it|san|man|tan)$/, "")
    ].forEach((variant) => {
      const clean = variant.replace(/^[=_.:-]+|[=_.:-]+$/g, "");
      if (clean) {
        variants.add(clean);
      }
    });
  });

  return [...variants];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeSvg(value) {
  return escapeHtml(value);
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("Clipboard command was not accepted");
    }
  } finally {
    textarea.remove();
  }
}
