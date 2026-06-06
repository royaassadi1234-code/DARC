const TRANS_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dadestan i Denig", file: "Dd.txt", englishFile: "DD-en.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt", englishFile: "PY-en.txt" },
  { id: "wz", siglum: "WZ", title: "Wizidagiha i Zadspram", file: "WZ.txt", englishFile: "WZ-en.txt" },
  { id: "nm", siglum: "NM", title: "Namagiha i Manuscihr", file: "NM.txt", englishFile: "NM-en.txt" }
];

const transState = {
  texts: [],
  selectedTextId: "dd"
};

const textSelectEl = document.querySelector("#trans-text-select");
const statusEl = document.querySelector("#trans-status");
const readerEl = document.querySelector("#trans-reader");

initTrans();

async function initTrans() {
  try {
    transState.texts = await Promise.all(TRANS_TEXTS.map(loadTextBundle));
    populateTextSelect();
    bindTransEvents();
    renderReader();
  } catch (error) {
    statusEl.textContent = "Text loading failed";
    readerEl.innerHTML = `<div class="empty-state">The texts could not be loaded.</div>`;
    console.error(error);
  }
}

function bindTransEvents() {
  textSelectEl.addEventListener("change", () => {
    transState.selectedTextId = textSelectEl.value;
    renderReader();
  });
}

function populateTextSelect() {
  textSelectEl.innerHTML = transState.texts
    .map((text) => `<option value="${escapeHtml(text.id)}">${escapeHtml(text.siglum)} - ${escapeHtml(text.title)}</option>`)
    .join("");
  textSelectEl.value = transState.selectedTextId;
}

async function loadTextBundle(config) {
  const [mainRaw, englishRaw] = await Promise.all([
    fetchRequiredText(config.file),
    fetchOptionalText(config.englishFile)
  ]);

  const records = parseRecords(mainRaw);
  const englishRecords = englishRaw ? parseRecords(englishRaw) : [];
  const englishByLocation = new Map(englishRecords.map((record) => [record.location, record.text]));

  return {
    ...config,
    records,
    englishByLocation
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
  try {
    const response = await fetch(file);
    return response.ok ? response.text() : "";
  } catch {
    return "";
  }
}

function renderReader() {
  const text = transState.texts.find((item) => item.id === transState.selectedTextId) || transState.texts[0];
  if (!text) {
    return;
  }

  statusEl.textContent = `${text.siglum} | ${text.records.length.toLocaleString()} paragraphs`;
  readerEl.innerHTML = `
    <article class="trans-heading">
      <div>
        <div class="siglum">${escapeHtml(text.siglum)}</div>
        <h2>${escapeHtml(text.title)}</h2>
      </div>
      <span class="count-pill hit">${text.records.length.toLocaleString()}</span>
    </article>
    <div class="trans-list">
      ${text.records.map((record) => renderTransParagraph(record, text.englishByLocation.get(record.location))).join("")}
    </div>
  `;
}

function renderTransParagraph(record, englishText = "") {
  return `
    <article class="trans-card">
      <div class="theme-hit-meta">
        <span>${escapeHtml(record.location)}</span>
      </div>
      <dl class="trans-entry-list">
        <div>
          <dt>Trans.</dt>
          <dd>${escapeHtml(record.text)}</dd>
        </div>
        <div>
          <dt>Eng. Transl.</dt>
          <dd>
            <details>
              <summary>Eng. Transl.</summary>
              <p>${englishText ? escapeHtml(englishText) : "English translation will be added later."}</p>
            </details>
          </dd>
        </div>
        <div>
          <dt>Pers. Trans.</dt>
          <dd>
            <details>
              <summary>Pers. Trans.</summary>
              <p dir="rtl" lang="fa">${escapeHtml(toArabicTranscription(record.text))}</p>
            </details>
          </dd>
        </div>
      </dl>
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
  if (body === "čē" || body === "ce") {
    return `${prefix}چه${suffix}`;
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

  const transcribed = `${initialA ? "ا" : ""}${initialE ? "ای" : ""}${Array.from(body).map((char) => chars[char] || char).join("")}`;
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
