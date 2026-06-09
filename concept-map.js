const CONCEPT_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt" }
];

const conceptState = {
  concepts: [],
  comments: [],
  texts: [],
  selectedConceptId: "druz"
};

const conceptSelectEl = document.querySelector("#concept-select");
const statusEl = document.querySelector("#concept-status");
const summaryEl = document.querySelector("#concept-summary");
const stageEl = document.querySelector("#concept-stage");

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
  "\u01E7": "g",
  "\u0161": "s",
  "\u0160": "S"
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "az", "be", "but", "by", "for", "from", "i", "in", "is",
  "it", "of", "on", "or", "pad", "the", "this", "to", "ud", "with", "xwesh", "xwes", "that",
  "which", "who", "his", "her", "their", "they", "he", "she", "we", "you", "was", "were"
]);

initConceptMap();

async function initConceptMap() {
  bindEvents();

  try {
    const [concepts, comments, texts] = await Promise.all([
      fetchJson("concept-map-data.json"),
      fetchJson("dd-comment-highlights.json"),
      Promise.all(CONCEPT_TEXTS.map(loadText))
    ]);
    conceptState.concepts = concepts;
    conceptState.comments = comments;
    conceptState.texts = texts;
    conceptState.selectedConceptId = concepts[0]?.id || "druz";
    populateConcepts();
    renderConceptMap();
  } catch (error) {
    statusEl.textContent = "Concept loading failed";
    stageEl.innerHTML = `<div class="empty-state">The concept map data could not be loaded.</div>`;
    console.error(error);
  }
}

function bindEvents() {
  conceptSelectEl.addEventListener("change", () => {
    conceptState.selectedConceptId = conceptSelectEl.value;
    renderConceptMap();
  });
}

async function fetchJson(file) {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not load ${file}`);
  }
  return response.json();
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
    records: parseRecords(raw)
  };
}

function populateConcepts() {
  conceptSelectEl.innerHTML = conceptState.concepts
    .map((concept) => `<option value="${escapeHtml(concept.id)}">${escapeHtml(concept.label)}</option>`)
    .join("");
  conceptSelectEl.value = conceptState.selectedConceptId;
}

function renderConceptMap() {
  const concept = getSelectedConcept();
  if (!concept) {
    return;
  }

  const analysis = analyzeConcept(concept);
  statusEl.textContent = `${analysis.total} text hits | ${analysis.commentMatches.length} DD notes`;
  renderSummary(concept, analysis);
  stageEl.innerHTML = renderRebuildNotice(concept, analysis);
}

function analyzeConcept(concept) {
  const summaries = conceptState.texts.map((text) => {
    const occurrences = getConceptOccurrences(text, concept);
    return {
      text,
      occurrences,
      total: occurrences.length,
      meanings: countBy(occurrences.map((occurrence) => occurrence.meaning.id))
    };
  });

  const commentMatches = getCommentMatches(concept);
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);

  return {
    summaries,
    commentMatches,
    total
  };
}

function getConceptOccurrences(text, concept) {
  const occurrences = [];
  text.records.forEach((record, recordIndex) => {
    findConceptRanges(record.text, concept).forEach((range) => {
      const snippet = makeSnippet(text.records, recordIndex, range);
      occurrences.push({
        textId: text.id,
        textSiglum: text.siglum,
        location: record.location,
        variant: record.text.slice(range.start, range.end),
        snippet,
        meaning: inferMeaning(concept, `${record.text} ${snippet}`)
      });
    });
  });
  return occurrences;
}

function getCommentMatches(concept) {
  return conceptState.comments
    .map((comment) => {
      const combined = [
        comment.title,
        comment.englishComment,
        comment.translationPassage,
        ...(comment.highlightedWords || [])
      ].join(" ");
      const ranges = findConceptRanges(combined, concept);
      const titleMatch = matchesAny(comment.title, concept.variants);
      const highlightMatch = (comment.highlightedWords || []).some((word) => matchesAny(word, concept.variants));
      if (!ranges.length && !titleMatch && !highlightMatch) {
        return null;
      }
      return {
        ...comment,
        textId: "dd",
        textSiglum: "DD",
        meaning: inferMeaning(concept, combined)
      };
    })
    .filter(Boolean);
}

function getContextWords(summaries, commentMatches, concept) {
  const counts = new Map();
  summaries.forEach((summary) => {
    summary.occurrences.forEach((occurrence) => {
      occurrence.nearWords.forEach((word) => addContextWord(counts, word));
    });
  });
  commentMatches.forEach((comment) => {
    (comment.highlightedWords || []).forEach((word) => addContextWord(counts, word));
    comment.nearWords.forEach((word) => addContextWord(counts, word));
  });

  concept.opposites.forEach((word) => {
    const key = normalizeToken(word);
    if (counts.has(key)) {
      counts.get(key).type = "opposite";
    }
  });

  return [...counts.values()]
    .filter((item) => !matchesAny(item.label, concept.variants))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 32);
}

function addContextWord(counts, word) {
  const label = cleanToken(word);
  const key = normalizeToken(label);
  if (!key || STOP_WORDS.has(key) || key.length < 2) {
    return;
  }
  const current = counts.get(key) || { key, label, count: 0, type: "context" };
  current.count += 1;
  counts.set(key, current);
}

function getNetworkTerms(concept, contextWords, commentMatches) {
  const highlighted = new Map();
  commentMatches.forEach((comment) => {
    (comment.highlightedWords || []).forEach((word) => {
      const label = cleanToken(word);
      const key = normalizeToken(label);
      if (!key || STOP_WORDS.has(key) || matchesAny(label, concept.variants)) {
        return;
      }
      highlighted.set(key, {
        key,
        label,
        count: (highlighted.get(key)?.count || 0) + 1,
        type: "highlight"
      });
    });
  });

  const merged = new Map();
  contextWords.slice(0, 18).forEach((word) => merged.set(word.key, word));
  concept.opposites.forEach((word) => {
    const key = normalizeToken(word);
    merged.set(key, { key, label: word, count: merged.get(key)?.count || 1, type: "opposite" });
  });
  highlighted.forEach((word, key) => {
    merged.set(key, { ...word, count: word.count + (merged.get(key)?.count || 0) });
  });

  return [...merged.values()]
    .sort((a, b) => typeRank(a.type) - typeRank(b.type) || b.count - a.count)
    .slice(0, 24);
}

function typeRank(type) {
  return type === "opposite" ? 0 : type === "highlight" ? 1 : 2;
}

function renderSummary(concept, analysis) {
  const topMeanings = getMeaningTotals(analysis)
    .slice(0, 4)
    .map(({ meaning, count }) => `<span>${escapeHtml(meaning.label)}: ${count}</span>`)
    .join("");
  const sources = (concept.sources || [])
    .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`)
    .join("");

  summaryEl.innerHTML = `
    <article class="concept-info-card">
      <div>
        <div class="siglum">${escapeHtml(concept.label)}</div>
        <h2>${escapeHtml(concept.description)}</h2>
        <p class="meta">Variants: ${concept.variants.map(escapeHtml).join(", ")}</p>
      </div>
      <div class="concept-chip-row">
        ${topMeanings}
        <span>DD comment notes: ${analysis.commentMatches.length}</span>
      </div>
      <div class="concept-source-row">${sources}</div>
    </article>
  `;
}

function renderRebuildNotice(concept, analysis) {
  const textRows = analysis.summaries
    .map((summary) => `
      <tr>
        <th scope="row">${escapeHtml(summary.text.siglum)}</th>
        <td>${escapeHtml(summary.text.title)}</td>
        <td>${summary.total}</td>
      </tr>
    `)
    .join("");

  return `
    <article class="concept-card concept-rebuild-card">
      <header>
        <div>
          <div class="siglum">Rebuild mode</div>
          <h2>Visual concept maps are hidden for now</h2>
        </div>
        <span class="count-pill">${analysis.total}</span>
      </header>
      <div class="concept-rebuild-body">
        <p>
          The earlier mind map, network graph, frequency chart, and context map were too noisy.
          This page is paused while we rebuild the concept analysis from a cleaner review table.
        </p>
        <div class="concept-next-grid">
          <section>
            <h3>Data kept</h3>
            <ul class="source-list">
              <li>${escapeHtml(concept.label)} variants from <strong>concept-map-data.json</strong></li>
              <li>Occurrences across DD, PY, WZ, and NM</li>
              <li>${analysis.commentMatches.length} matching DD comment notes from <strong>dd-comments-aligned-with-english.docx</strong></li>
            </ul>
          </section>
          <section>
            <h3>Next rebuild step</h3>
            <ul class="source-list">
              <li>Create a review table for Druz first</li>
              <li>Use four meanings: Ahreman, demon, falsehood, unclear</li>
              <li>Confirm each row before drawing new charts</li>
            </ul>
          </section>
        </div>
        <table class="concept-review-preview">
          <caption>Available text hits for ${escapeHtml(concept.label)}</caption>
          <thead>
            <tr>
              <th scope="col">Text</th>
              <th scope="col">Title</th>
              <th scope="col">Hits</th>
            </tr>
          </thead>
          <tbody>${textRows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function getMeaningTotals(analysis) {
  const meanings = new Map();
  analysis.summaries.forEach((summary) => {
    summary.occurrences.forEach((occurrence) => {
      const current = meanings.get(occurrence.meaning.id) || { meaning: occurrence.meaning, count: 0 };
      current.count += 1;
      meanings.set(occurrence.meaning.id, current);
    });
  });
  analysis.commentMatches.forEach((comment) => {
    const current = meanings.get(comment.meaning.id) || { meaning: comment.meaning, count: 0 };
    current.count += 1;
    meanings.set(comment.meaning.id, current);
  });
  return [...meanings.values()].sort((a, b) => b.count - a.count);
}

function inferMeaning(concept, text) {
  const folded = foldText(text).text;
  const scored = concept.meaningCategories
    .map((meaning) => ({
      meaning,
      score: meaning.keywords.reduce((sum, keyword) => sum + (folded.includes(foldText(keyword).text) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].meaning : concept.meaningCategories[0];
}

function findConceptRanges(text, concept) {
  const folded = foldText(text);
  const ranges = [];
  concept.variants.forEach((variant) => {
    const terms = getSearchVariants(variant);
    if (!terms.length) {
      return;
    }
    const regex = new RegExp(buildPattern(terms), "gu");
    let match;
    while ((match = regex.exec(folded.text)) !== null) {
      ranges.push({
        start: folded.map[match.index],
        end: folded.map[match.index + match[0].length - 1] + 1
      });
    }
  });
  return mergeRanges(ranges);
}

function makeSnippet(records, recordIndex, range) {
  const text = records[recordIndex].text;
  const radius = 180;
  const start = Math.max(0, range.start - radius);
  const end = Math.min(text.length, range.end + radius);
  return `${start > 0 ? "... " : ""}${text.slice(start, end)}${end < text.length ? " ..." : ""}`;
}

function getNearWords(text, range) {
  const words = getWordPositions(text);
  const hitIndex = words.findIndex((word) => word.start <= range.start && word.end >= range.end);
  if (hitIndex < 0) {
    return [];
  }
  const start = Math.max(0, hitIndex - conceptState.nearWindow);
  const end = Math.min(words.length, hitIndex + conceptState.nearWindow + 1);
  return words.slice(start, end).map((word) => word.value);
}

function getCommentNearWords(comment, concept) {
  const text = [comment.title, comment.englishComment, comment.translationPassage].join(" ");
  const ranges = findConceptRanges(text, concept);
  if (!ranges.length) {
    return [];
  }
  return ranges.flatMap((range) => getNearWords(text, range));
}

function getWordPositions(text) {
  const words = [];
  const regex = /[\p{L}\p{M}\p{N}=_-]+/gu;
  let match;
  while ((match = regex.exec(String(text))) !== null) {
    words.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return words;
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

function getSearchVariants(term) {
  const folded = foldText(term).text;
  if (!folded) {
    return [];
  }

  const variants = new Set([folded]);
  [
    folded.replace(/^=+/, ""),
    folded.replace(/^u-/, ""),
    folded.replace(/^i-/, ""),
    folded.replace(/^pad-/, ""),
    folded.replace(/^az-/, ""),
    folded.replace(/^o-/, ""),
    folded.replace(/^ud-/, ""),
    folded.replace(/-(iz|is|im|it|san|man|tan)$/, "")
  ].forEach((variant) => {
    const clean = variant.replace(/^[=_.:-]+|[=_.:-]+$/g, "");
    if (clean) {
      variants.add(clean);
    }
  });

  [...variants].forEach((variant) => {
    ["u", "i", "pad", "az", "o", "ud"].forEach((prefix) => variants.add(`${prefix}-${variant}`));
    ["iz", "is", "im", "it", "san", "man", "tan"].forEach((suffix) => variants.add(`${variant}-${suffix}`));
  });

  return [...variants].filter(Boolean);
}

function buildPattern(terms) {
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const boundary = "[\\p{L}\\p{M}\\p{N}_-]";
  return `(?<!${boundary})(?:${escaped})(?!${boundary})`;
}

function matchesAny(value, variants) {
  const folded = foldText(value).text;
  return variants.some((variant) => {
    const terms = getSearchVariants(variant);
    return terms.some((term) => folded.includes(term));
  });
}

function cleanToken(value) {
  return String(value).replace(/^[=_.:;,[\](){}<>!?'"-]+|[=_.:;,[\](){}<>!?'"-]+$/g, "").trim();
}

function normalizeToken(value) {
  return foldText(cleanToken(value)).text.toLowerCase();
}

function foldText(value) {
  let text = "";
  const map = [];

  Array.from(String(value)).forEach((char, index) => {
    const folded = TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, "");
    const normalized = folded.toLocaleLowerCase();
    Array.from(normalized).forEach((foldedChar) => {
      text += foldedChar;
      map.push(index);
    });
  });

  return { text, map };
}

function mergeRanges(ranges) {
  return ranges
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .reduce((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start < previous.end) {
        if (range.end > previous.end) {
          previous.end = range.end;
        }
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function getSelectedConcept() {
  return conceptState.concepts.find((concept) => concept.id === conceptState.selectedConceptId);
}

function shorten(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
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
