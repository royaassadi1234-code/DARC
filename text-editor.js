const TEXT_EDITOR_LOGIN = "editor";
const TEXT_EDITOR_PASSWORD = "druz-edit";
const REVIEW_LOGIN = "reviewer";
const REVIEW_PASSWORD = "druz-review";
const TEXT_EDITOR_SESSION_KEY = "druzTextEditorLoggedIn";
const TEXT_EDITOR_DRAFT_KEY = "druzTextEditorDrafts";
const ANNOTATION_FILE = "druz-concept-annotations.json";
const ANNOTATION_DRAFT_KEY = "druzAnnotationReviewDraft";

const TEXT_EDITOR_FILES = [
  { id: "dd", siglum: "DD", title: "Dādestān ī Dēnīg", file: "Dd.txt", translationFile: "DD-en.txt", kind: "Middle Persian" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt", kind: "Middle Persian" },
  { id: "wz", siglum: "WZ", title: "Wizīdagīhā ī Zādspram", file: "WZ.txt", translationFile: "WZ-en.txt", kind: "Middle Persian" },
  { id: "nm", siglum: "NM", title: "Nāmagīhā ī Manuščīhr", file: "NM.txt", kind: "Middle Persian" },
  { id: "gbd", siglum: "GBd", title: "Greater Bundahišn", file: "GBd.txt", kind: "Middle Persian" },
  { id: "prdd", siglum: "PRDd", title: "Pursišn-Rēd Dēnīg", file: "PRDd.txt", kind: "Middle Persian" }
];

const editorState = {
  files: [],
  drafts: {},
  selectedId: "dd",
  query: "",
  passageIndex: 0
};

const annotationState = {
  annotations: [],
  filtered: [],
  selectedIndex: 0,
  query: "",
  filter: "all",
  loaded: false
};

const loginPanel = document.querySelector("#text-editor-login-panel");
const loginForm = document.querySelector("#text-editor-login-form");
const loginInput = document.querySelector("#text-editor-login");
const passwordInput = document.querySelector("#text-editor-password");
const loginMessage = document.querySelector("#text-editor-login-message");
const workspaceEl = document.querySelector("#text-editor-workspace");
const statusEl = document.querySelector("#text-editor-status");
const toolTabs = document.querySelectorAll("[data-editor-tool]");
const textToolPanel = document.querySelector("#text-tool-panel");
const annotationToolPanel = document.querySelector("#annotation-tool-panel");
const searchInput = document.querySelector("#text-editor-search");
const summaryEl = document.querySelector("#text-editor-summary");
const listEl = document.querySelector("#text-editor-list");
const fileToggleButton = document.querySelector("#text-file-toggle");
const titleEl = document.querySelector("#text-editor-title");
const metaEl = document.querySelector("#text-editor-meta");
const sourceContentEl = document.querySelector("#text-source-content");
const translationContentEl = document.querySelector("#text-translation-content");
const sourceLabelEl = document.querySelector("#text-source-label");
const translationLabelEl = document.querySelector("#text-translation-label");
const sourceLocationEl = document.querySelector("#text-passage-location");
const translationLocationEl = document.querySelector("#text-translation-location");
const passagePositionEl = document.querySelector("#text-passage-position");
const passagePrevButton = document.querySelector("#text-passage-prev");
const passageNextButton = document.querySelector("#text-passage-next");
const saveButton = document.querySelector("#text-editor-save");
const exportButton = document.querySelector("#text-editor-export");
const exportAllButton = document.querySelector("#text-editor-export-all");
const importInput = document.querySelector("#text-editor-import");
const resetButton = document.querySelector("#text-editor-reset");
const resetAllButton = document.querySelector("#text-editor-reset-all");
const logoutButton = document.querySelector("#text-editor-logout");
const annotationSearchInput = document.querySelector("#annotation-search");
const annotationFilterSelect = document.querySelector("#annotation-filter");
const annotationSummaryEl = document.querySelector("#annotation-summary");
const annotationListEl = document.querySelector("#annotation-list");
const annotationFormEl = document.querySelector("#annotation-form");
const annotationTitleEl = document.querySelector("#annotation-title");
const annotationExportButton = document.querySelector("#export-json");
const annotationImportInput = document.querySelector("#import-json");
const annotationResetButton = document.querySelector("#reset-draft");
const annotationPrevButton = document.querySelector("#annotation-prev");
const annotationNextButton = document.querySelector("#annotation-next");
const annotationPositionEl = document.querySelector("#annotation-position");

const annotationFields = {
  sourceParagraph: document.querySelector("#field-sourceParagraph"),
  translation: document.querySelector("#field-translation"),
  location: document.querySelector("#field-location"),
  id: document.querySelector("#field-id"),
  concept: document.querySelector("#field-concept"),
  mainWord: document.querySelector("#field-mainWord"),
  matchedWords: document.querySelector("#field-matchedWords"),
  meaning: Array.from(document.querySelectorAll("input[name='referent']")),
  meaningCustom: document.querySelector("#field-meaning-custom"),
  actionsUsedWithIt: document.querySelector("#field-actionsUsedWithIt"),
  adjectivesDescriptions: document.querySelector("#field-adjectivesDescriptions"),
  metaphors: document.querySelector("#field-metaphors"),
  oppositions: Array.from(document.querySelectorAll("input[name='oppositions']")),
  oppositionsCustom: document.querySelector("#field-oppositions-custom"),
  realm: Array.from(document.querySelectorAll("input[name='realm']")),
  reviewStatus: document.querySelector("#field-reviewStatus"),
  theme: document.querySelector("#field-theme"),
  relatedTheme: document.querySelector("#field-relatedTheme"),
  reviewNote: document.querySelector("#field-reviewNote")
};

initTextEditor();

function initTextEditor() {
  bindTextEditorEvents();
  if (sessionStorage.getItem(TEXT_EDITOR_SESSION_KEY) === "true") {
    unlockTextEditor();
  }
}

function bindTextEditorEvents() {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const login = loginInput.value.trim().toLowerCase();
    const textEditorAccess = login === TEXT_EDITOR_LOGIN && passwordInput.value === TEXT_EDITOR_PASSWORD;
    const reviewerAccess = login === REVIEW_LOGIN && passwordInput.value === REVIEW_PASSWORD;
    if (textEditorAccess || reviewerAccess) {
      sessionStorage.setItem(TEXT_EDITOR_SESSION_KEY, "true");
      unlockTextEditor();
      return;
    }
    loginMessage.textContent = "The login or password is not correct.";
  });

  searchInput.addEventListener("input", () => {
    editorState.query = searchInput.value.trim().toLowerCase();
    renderTextEditorList();
  });

  fileToggleButton.addEventListener("click", () => {
    const hidden = listEl.classList.toggle("hidden");
    fileToggleButton.setAttribute("aria-expanded", hidden ? "false" : "true");
  });

  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchEditorTool(tab.dataset.editorTool);
    });
  });

  window.addEventListener("hashchange", openToolFromHash);

  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-text-id]");
    if (!button) {
      return;
    }
    saveDraft({ quiet: true });
    editorState.selectedId = button.dataset.textId;
    editorState.passageIndex = 0;
    renderTextEditorList();
    renderCurrentFile();
  });

  [sourceContentEl, translationContentEl, sourceLocationEl, translationLocationEl].forEach((control) => {
    control.addEventListener("input", () => {
      const file = getSelectedFile();
      if (file) {
        statusEl.textContent = `${file.siglum} passage has unsaved changes`;
      }
    });
  });

  passagePrevButton.addEventListener("click", () => {
    const file = getSelectedFile();
    if (!file) {
      return;
    }
    saveCurrentPassageToDraft();
    editorState.passageIndex = Math.max(0, editorState.passageIndex - 1);
    renderCurrentFile();
  });

  passageNextButton.addEventListener("click", () => {
    const file = getSelectedFile();
    if (!file) {
      return;
    }
    saveCurrentPassageToDraft();
    editorState.passageIndex = Math.min(getSourceRecords(file).length - 1, editorState.passageIndex + 1);
    renderCurrentFile();
  });

  saveButton.addEventListener("click", () => saveDraft());
  exportButton.addEventListener("click", exportCurrentFile);
  exportAllButton.addEventListener("click", exportAllFiles);
  importInput.addEventListener("change", importDrafts);
  resetButton.addEventListener("click", resetCurrentDraft);
  resetAllButton.addEventListener("click", resetAllDrafts);
  logoutButton.addEventListener("click", logoutTextEditor);

  annotationSearchInput.addEventListener("input", () => {
    annotationState.query = annotationSearchInput.value.trim().toLowerCase();
    applyAnnotationFilters();
  });

  annotationFilterSelect.addEventListener("change", () => {
    annotationState.filter = annotationFilterSelect.value;
    applyAnnotationFilters();
  });

  annotationFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrentAnnotation();
  });

  annotationExportButton.addEventListener("click", exportAnnotationsJson);
  annotationImportInput.addEventListener("change", importAnnotationsJson);
  annotationResetButton.addEventListener("click", resetAnnotationDraft);
  annotationPrevButton.addEventListener("click", () => {
    moveAnnotationPage(-1);
  });
  annotationNextButton.addEventListener("click", () => {
    moveAnnotationPage(1);
  });
}

async function unlockTextEditor() {
  loginPanel.classList.add("hidden");
  workspaceEl.classList.remove("hidden");
  statusEl.textContent = "Loading texts...";
  editorState.drafts = loadDrafts();
  await Promise.all([loadWorkspaceTexts(), loadAnnotations()]);
  renderTextEditorList();
  renderCurrentFile();
  openToolFromHash();
}

function switchEditorTool(tool) {
  saveDraft({ quiet: true });
  saveCurrentAnnotation({ quiet: true });
  const showAnnotations = tool === "annotations";
  textToolPanel.classList.toggle("hidden", showAnnotations);
  annotationToolPanel.classList.toggle("hidden", !showAnnotations);
  toolTabs.forEach((tab) => {
    const active = tab.dataset.editorTool === tool;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  statusEl.textContent = showAnnotations ? "Annotation review" : "Text editor";
}

function openToolFromHash() {
  if (window.location.hash === "#texts") {
    switchEditorTool("texts");
  } else {
    switchEditorTool("annotations");
  }
}

async function loadWorkspaceTexts() {
  const loaded = await Promise.all(TEXT_EDITOR_FILES.map(loadWorkspaceText));
  editorState.files = loaded.filter(Boolean);
  const selectedStillAvailable = editorState.files.some((file) => file.id === editorState.selectedId);
  if (!selectedStillAvailable) {
    editorState.selectedId = editorState.files[0]?.id || "";
  }
}

async function loadWorkspaceText(config) {
  try {
    const [sourceRaw, translationRaw] = await Promise.all([
      fetchTextFile(config.file),
      config.translationFile ? fetchTextFile(config.translationFile, true) : Promise.resolve("")
    ]);
    const sourceRecords = parseEditableRecords(sourceRaw);
    const translationRecords = translationRaw ? parseEditableRecords(translationRaw) : [];
    return {
      ...config,
      original: sourceRaw,
      translationOriginal: translationRaw,
      sourceRecords,
      translationRecords
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchTextFile(file, optional = false) {
  const response = await fetch(file);
  if (!response.ok) {
    if (optional) {
      return "";
    }
    throw new Error(`Could not load ${file}`);
  }
  return response.text();
}

function renderTextEditorList() {
  const files = getFilteredFiles();
  const draftCount = editorState.files.filter(hasDraft).length;

  summaryEl.innerHTML = `
    <span>${files.length} shown</span>
    <span>${draftCount} drafts</span>
    <span>${editorState.files.length} files</span>
  `;

  if (!files.length) {
    listEl.innerHTML = `<div class="empty-state">No text files match this search.</div>`;
    return;
  }

  listEl.innerHTML = files.map((file) => {
    const active = file.id === editorState.selectedId ? " active" : "";
    const draft = hasDraft(file) ? `<small>Draft saved</small>` : `<small>${escapeHtml(file.kind)}</small>`;
    return `
      <button class="annotation-list-item text-editor-list-item${active}" type="button" data-text-id="${escapeHtml(file.id)}">
        <strong>${escapeHtml(file.siglum)}</strong>
        <span>${escapeHtml(file.title)}</span>
        ${draft}
      </button>
    `;
  }).join("");
}

function renderCurrentFile() {
  const file = getSelectedFile();
  if (!file) {
    titleEl.textContent = "No text selected";
    metaEl.innerHTML = "";
    sourceContentEl.value = "";
    translationContentEl.value = "";
    setPassageControlsDisabled(true);
    return;
  }

  const sourceRecords = getSourceRecords(file);
  const translationRecords = getTranslationRecords(file);
  editorState.passageIndex = Math.min(Math.max(0, editorState.passageIndex), Math.max(0, sourceRecords.length - 1));
  const sourceRecord = sourceRecords[editorState.passageIndex];
  const translationRecord = findTranslationRecord(file, sourceRecord, translationRecords);
  titleEl.textContent = file.title;
  setPassageControlsDisabled(false);
  sourceContentEl.value = sourceRecord?.text || "";
  sourceLocationEl.value = sourceRecord?.location || "";
  translationContentEl.value = translationRecord?.text || "";
  translationLocationEl.value = translationRecord?.location || sourceRecord?.location || "";
  sourceLabelEl.textContent = `${file.siglum} passage`;
  translationLabelEl.textContent = file.translationFile ? `${file.siglum} translation` : "Translation";
  translationContentEl.disabled = !file.translationFile;
  translationLocationEl.disabled = !file.translationFile;
  passagePositionEl.textContent = `${sourceRecord?.location || "No passage"} | ${(editorState.passageIndex + 1).toLocaleString()} of ${sourceRecords.length.toLocaleString()}`;
  passagePrevButton.disabled = editorState.passageIndex <= 0;
  passageNextButton.disabled = editorState.passageIndex >= sourceRecords.length - 1;
  metaEl.innerHTML = `
    <span>${escapeHtml(file.file)}</span>
    ${file.translationFile ? `<span>${escapeHtml(file.translationFile)}</span>` : ""}
    <span>${escapeHtml(file.kind)}</span>
    <span>${sourceRecords.length.toLocaleString()} passages</span>
    ${translationRecords.length ? `<span>${translationRecords.length.toLocaleString()} translations</span>` : ""}
    ${hasDraft(file) ? "<span>Draft active</span>" : "<span>Original file</span>"}
  `;
  statusEl.textContent = `${file.siglum} loaded`;
}

function setPassageControlsDisabled(disabled) {
  [sourceContentEl, translationContentEl, sourceLocationEl, translationLocationEl, passagePrevButton, passageNextButton].forEach((control) => {
    control.disabled = disabled;
  });
}

function getFilteredFiles() {
  if (!editorState.query) {
    return editorState.files;
  }
  return editorState.files.filter((file) => {
    const haystack = [file.siglum, file.title, file.file, file.kind].join(" ").toLowerCase();
    return haystack.includes(editorState.query);
  });
}

function getSelectedFile() {
  return editorState.files.find((file) => file.id === editorState.selectedId) || null;
}

function getCurrentContent(file) {
  return serializeEditableRecords(getSourceRecords(file), file.sourceRecords);
}

function hasDraft(file) {
  return Object.prototype.hasOwnProperty.call(editorState.drafts, file.id);
}

function saveDraft(options = {}) {
  const file = getSelectedFile();
  if (!file || sourceContentEl.disabled) {
    return;
  }
  saveCurrentPassageToDraft();
  const draft = editorState.drafts[file.id];
  const sourceContent = serializeEditableRecords(draft?.sourceRecords || file.sourceRecords, file.sourceRecords);
  const translationContent = file.translationFile
    ? serializeEditableRecords(draft?.translationRecords || file.translationRecords, file.translationRecords)
    : "";
  if (sourceContent === file.original && translationContent === (file.translationOriginal || "")) {
    delete editorState.drafts[file.id];
  }
  persistDrafts();
  renderTextEditorList();
  renderCurrentMeta();
  if (!options.quiet) {
    statusEl.textContent = `Draft saved for ${file.siglum}`;
  }
}

function renderCurrentMeta() {
  const file = getSelectedFile();
  if (!file) {
    return;
  }
  const sourceRecords = getSourceRecords(file);
  const translationRecords = getTranslationRecords(file);
  metaEl.innerHTML = `
    <span>${escapeHtml(file.file)}</span>
    ${file.translationFile ? `<span>${escapeHtml(file.translationFile)}</span>` : ""}
    <span>${escapeHtml(file.kind)}</span>
    <span>${sourceRecords.length.toLocaleString()} passages</span>
    ${translationRecords.length ? `<span>${translationRecords.length.toLocaleString()} translations</span>` : ""}
    ${hasDraft(file) ? "<span>Draft active</span>" : "<span>Original file</span>"}
  `;
}

function resetCurrentDraft() {
  const file = getSelectedFile();
  if (!file) {
    return;
  }
  delete editorState.drafts[file.id];
  persistDrafts();
  editorState.passageIndex = 0;
  renderTextEditorList();
  renderCurrentFile();
  statusEl.textContent = `Draft reset for ${file.siglum}`;
}

function resetAllDrafts() {
  if (!Object.keys(editorState.drafts).length) {
    statusEl.textContent = "There are no drafts to reset";
    return;
  }
  const confirmed = window.confirm("Reset all saved text drafts in this browser?");
  if (!confirmed) {
    return;
  }
  editorState.drafts = {};
  persistDrafts();
  renderTextEditorList();
  renderCurrentFile();
  statusEl.textContent = "All drafts reset";
}

function exportCurrentFile() {
  const file = getSelectedFile();
  if (!file) {
    return;
  }
  saveDraft({ quiet: true });
  downloadText(file.file, getCurrentContent(file));
  if (file.translationFile) {
    downloadText(file.translationFile, serializeEditableRecords(getTranslationRecords(file), file.translationRecords));
  }
  statusEl.textContent = `Exported ${file.file}`;
}

function exportAllFiles() {
  saveDraft({ quiet: true });
  const payload = {
    exportedAt: new Date().toISOString(),
    files: editorState.files.map((file) => ({
      id: file.id,
      siglum: file.siglum,
      title: file.title,
      file: file.file,
      translationFile: file.translationFile || "",
      kind: file.kind,
      content: getCurrentContent(file),
      translationContent: file.translationFile ? serializeEditableRecords(getTranslationRecords(file), file.translationRecords) : "",
      sourceRecords: getSourceRecords(file),
      translationRecords: getTranslationRecords(file)
    }))
  };
  downloadText("druz-workspace-texts-edited.json", JSON.stringify(payload, null, 2) + "\n", "application/json");
  statusEl.textContent = "Exported all edited texts";
}

function importDrafts(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      const files = Array.isArray(imported.files) ? imported.files : [];
      const nextDrafts = { ...editorState.drafts };
      files.forEach((item) => {
        const match = editorState.files.find((workspaceFile) => workspaceFile.id === item.id || workspaceFile.file === item.file);
        if (!match) {
          return;
        }
        if (Array.isArray(item.sourceRecords)) {
          nextDrafts[match.id] = {
            sourceRecords: item.sourceRecords,
            translationRecords: Array.isArray(item.translationRecords) ? item.translationRecords : getTranslationRecords(match)
          };
          return;
        }
        if (typeof item.content === "string") {
          nextDrafts[match.id] = {
            sourceRecords: parseEditableRecords(item.content),
            translationRecords: typeof item.translationContent === "string" ? parseEditableRecords(item.translationContent) : getTranslationRecords(match)
          };
        }
      });
      editorState.drafts = nextDrafts;
      persistDrafts();
      renderTextEditorList();
      renderCurrentFile();
      statusEl.textContent = `Imported ${files.length.toLocaleString()} text drafts`;
    } catch (error) {
      statusEl.textContent = "Import failed";
      console.error(error);
    } finally {
      importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function getSourceRecords(file) {
  const draft = editorState.drafts[file.id];
  if (draft && Array.isArray(draft.sourceRecords)) {
    return draft.sourceRecords;
  }
  if (typeof draft === "string") {
    return parseEditableRecords(draft);
  }
  return file.sourceRecords || [];
}

function getTranslationRecords(file) {
  const draft = editorState.drafts[file.id];
  if (draft && Array.isArray(draft.translationRecords)) {
    return draft.translationRecords;
  }
  return file.translationRecords || [];
}

function ensureStructuredDraft(file) {
  const draft = editorState.drafts[file.id];
  if (draft && Array.isArray(draft.sourceRecords)) {
    return draft;
  }
  const next = {
    sourceRecords: typeof draft === "string" ? parseEditableRecords(draft) : cloneRecords(file.sourceRecords || []),
    translationRecords: cloneRecords(file.translationRecords || [])
  };
  editorState.drafts[file.id] = next;
  return next;
}

function saveCurrentPassageToDraft() {
  const file = getSelectedFile();
  if (!file || sourceContentEl.disabled) {
    return;
  }
  const draft = ensureStructuredDraft(file);
  const sourceRecord = draft.sourceRecords[editorState.passageIndex];
  if (sourceRecord) {
    sourceRecord.location = sourceLocationEl.value.trim() || sourceRecord.location;
    sourceRecord.text = sourceContentEl.value;
  }
  if (file.translationFile) {
    let translationRecord = findTranslationRecord(file, sourceRecord, draft.translationRecords);
    if (!translationRecord) {
      translationRecord = {
        location: translationLocationEl.value.trim() || sourceRecord?.location || "",
        text: "",
        format: sourceRecord?.format || "section"
      };
      draft.translationRecords.splice(editorState.passageIndex, 0, translationRecord);
    }
    translationRecord.location = translationLocationEl.value.trim() || sourceRecord?.location || translationRecord.location;
    translationRecord.text = translationContentEl.value;
  }
}

function findTranslationRecord(file, sourceRecord, translationRecords) {
  if (!sourceRecord || !translationRecords.length) {
    return null;
  }
  const normalizedLocation = normalizeLocation(sourceRecord.location);
  return translationRecords.find((record) => normalizeLocation(record.location) === normalizedLocation) || null;
}

function normalizeLocation(location) {
  return String(location || "").toLowerCase().replace(/^[a-z]+\s*/i, "").trim();
}

function cloneRecords(records) {
  return records.map((record) => ({ ...record }));
}

function parseEditableRecords(raw) {
  const lines = String(raw || "").split(/\r\n|\n|\r/);
  const hasTsvRecords = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && isTsvRecord(trimmed);
  });
  return hasTsvRecords ? parseEditableTsvRecords(lines) : parseEditableSectionRecords(lines);
}

function parseEditableTsvRecords(lines) {
  const records = [];
  const byLocation = new Map();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const columns = trimmed.split("\t");
    const hasTsvShape = isTsvRecord(trimmed) && !trimmed.startsWith("#");
    if (!hasTsvShape) {
      return;
    }
    const location = formatTsvLocation(columns);
    const existing = byLocation.get(normalizeLocation(location));
    if (existing) {
      existing.text += ` ${columns.slice(2).join(" ")}`;
      return;
    }
    const record = {
      index,
      location,
      text: columns.slice(2).join(" "),
      prefix: columns.slice(0, 2).join("\t"),
      format: "tsv"
    };
    byLocation.set(normalizeLocation(location), record);
    records.push(record);
  });

  return records;
}

function parseEditableSectionRecords(lines) {
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
        format: "section"
      };
      records.push(current);
      return;
    }

    if (current) {
      current.text += ` ${trimmed}`;
      return;
    }

    current = {
      index,
      location: `line ${index + 1}`,
      text: trimmed,
      format: "section"
    };
    records.push(current);
  });

  return records;
}

function serializeEditableRecords(records, originalRecords = []) {
  const format = records.find((record) => record.format)?.format
    || originalRecords.find((record) => record.format)?.format
    || "section";
  const lines = records.map((record, index) => {
    const original = originalRecords[index] || {};
    const location = record.location || original.location || `line ${index + 1}`;
    const text = record.text || "";
    if (format === "tsv") {
      const prefix = record.prefix || original.prefix || `${index + 1}\t${location}`;
      return `${prefix}\t${text}`;
    }
    return `${location}\t${text}`;
  });
  return `${lines.join("\n")}\n`;
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

async function loadAnnotations() {
  try {
    const draft = localStorage.getItem(ANNOTATION_DRAFT_KEY);
    if (draft) {
      annotationState.annotations = JSON.parse(draft);
    } else {
      const response = await fetch(ANNOTATION_FILE);
      if (!response.ok) {
        throw new Error(`Could not load ${ANNOTATION_FILE}`);
      }
      annotationState.annotations = await response.json();
      persistAnnotationDraft();
    }
    annotationState.loaded = true;
    annotationState.selectedIndex = 0;
    applyAnnotationFilters();
  } catch (error) {
    annotationState.loaded = false;
    annotationListEl.innerHTML = `<div class="empty-state">The annotation file could not be loaded.</div>`;
    console.error(error);
  }
}

function applyAnnotationFilters() {
  const query = annotationState.query;
  const status = annotationState.filter;
  annotationState.filtered = annotationState.annotations
    .map((annotation, index) => ({ annotation, index }))
    .filter(({ annotation }) => {
      const reviewStatus = String(annotation.reviewStatus || "").toLowerCase();
      const matchesStatus = status === "all" || reviewStatus === status;
      const haystack = [
        annotation.location,
        annotation.mainWord,
        annotation.matchedWords,
        annotation.meaning,
        annotation.reviewStatus,
        annotation.reviewNote,
        annotation.sourceParagraph,
        annotation.translation
      ].flat().join(" ").toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });

  if (!annotationState.filtered.some((item) => item.index === annotationState.selectedIndex)) {
    annotationState.selectedIndex = annotationState.filtered[0]?.index ?? 0;
  }

  renderAnnotationList();
  renderAnnotationSummary();
  renderAnnotationForm();
}

function renderAnnotationSummary() {
  const total = annotationState.annotations.length;
  const reviewed = annotationState.annotations.filter((item) => ["reviewed", "approved"].includes(String(item.reviewStatus || "").toLowerCase())).length;
  annotationSummaryEl.innerHTML = `
    <span>${annotationState.filtered.length} shown</span>
    <span>${reviewed} reviewed</span>
    <span>${total} total</span>
  `;
}

function renderAnnotationList() {
  if (!annotationState.filtered.length) {
    annotationListEl.innerHTML = `<div class="empty-state">No annotations match the current filters.</div>`;
    return;
  }

  annotationListEl.innerHTML = annotationState.filtered.map(({ annotation, index }) => {
    const active = index === annotationState.selectedIndex ? " active" : "";
    const words = valueToLines(annotation.matchedWords).slice(0, 2).join(", ");
    return `
      <button class="annotation-list-item${active}" type="button" data-annotation-index="${index}">
        <strong>${escapeHtml(annotation.location || annotation.id || `Entry ${index + 1}`)}</strong>
        <span>${escapeHtml(annotation.mainWord || words || "No main word")}</span>
        <small>${escapeHtml(annotation.reviewStatus || "machine draft")}</small>
      </button>
    `;
  }).join("");

  annotationListEl.querySelectorAll("[data-annotation-index]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCurrentAnnotation({ quiet: true });
      annotationState.selectedIndex = Number(button.dataset.annotationIndex);
      renderAnnotationList();
      renderAnnotationForm();
    });
  });
}

function renderAnnotationForm() {
  const annotation = annotationState.annotations[annotationState.selectedIndex];
  if (!annotation) {
    annotationTitleEl.textContent = "No annotation selected";
    annotationPositionEl.textContent = "Annotation 0 of 0";
    annotationPrevButton.disabled = true;
    annotationNextButton.disabled = true;
    annotationFormEl.querySelectorAll("input, textarea, select, button").forEach((control) => {
      if (control.id !== "export-json" && control.id !== "reset-draft") {
        control.disabled = true;
      }
    });
    return;
  }

  annotationFormEl.querySelectorAll("input, textarea, select, button").forEach((control) => {
    control.disabled = false;
  });

  const filteredIndex = annotationState.filtered.findIndex((item) => item.index === annotationState.selectedIndex);
  annotationPositionEl.textContent = `${annotation.location || annotation.id || "Annotation"} | ${(filteredIndex + 1).toLocaleString()} of ${annotationState.filtered.length.toLocaleString()}`;
  annotationPrevButton.disabled = filteredIndex <= 0;
  annotationNextButton.disabled = filteredIndex >= annotationState.filtered.length - 1;
  annotationTitleEl.textContent = annotation.location || annotation.id || `Entry ${annotationState.selectedIndex + 1}`;
  annotationFields.sourceParagraph.value = annotation.sourceParagraph || "";
  annotationFields.translation.value = annotation.translation || "";
  annotationFields.location.value = annotation.location || "";
  annotationFields.id.value = annotation.id || "";
  annotationFields.concept.value = annotation.concept || "";
  annotationFields.mainWord.value = valueToEditable(annotation.mainWord);
  annotationFields.matchedWords.value = valueToEditable(annotation.matchedWords);
  setChoiceSelection(annotationFields.meaning, annotationFields.meaningCustom, annotation.meaning);
  annotationFields.actionsUsedWithIt.value = valueToEditable(annotation.actionsUsedWithIt);
  annotationFields.adjectivesDescriptions.value = valueToEditable(annotation.adjectivesDescriptions);
  annotationFields.metaphors.value = valueToEditable(annotation.metaphors);
  setChoiceSelection(annotationFields.oppositions, annotationFields.oppositionsCustom, annotation.oppositions);
  setRealmSelection(annotation.realm);
  annotationFields.reviewStatus.value = annotation.reviewStatus || "machine draft";
  annotationFields.theme.value = valueToEditable(annotation.theme);
  annotationFields.relatedTheme.value = valueToEditable(annotation.relatedTheme);
  annotationFields.reviewNote.value = valueToEditable(annotation.reviewNote);
}

function moveAnnotationPage(direction) {
  if (!annotationState.filtered.length) {
    return;
  }
  saveCurrentAnnotation({ quiet: true });
  const currentFilteredIndex = annotationState.filtered.findIndex((item) => item.index === annotationState.selectedIndex);
  const nextFilteredIndex = Math.min(
    Math.max(0, currentFilteredIndex + direction),
    annotationState.filtered.length - 1
  );
  annotationState.selectedIndex = annotationState.filtered[nextFilteredIndex].index;
  renderAnnotationList();
  renderAnnotationForm();
}

function saveCurrentAnnotation(options = {}) {
  const annotation = annotationState.annotations[annotationState.selectedIndex];
  if (!annotation || !annotationState.loaded) {
    return;
  }

  annotation.sourceParagraph = annotationFields.sourceParagraph.value.trim();
  annotation.translation = annotationFields.translation.value.trim();
  annotation.location = annotationFields.location.value.trim();
  annotation.id = annotationFields.id.value.trim();
  annotation.concept = annotationFields.concept.value.trim();
  annotation.mainWord = parseSingleOrList(annotationFields.mainWord.value);
  annotation.matchedWords = parseList(annotationFields.matchedWords.value);
  annotation.meaning = getChoiceSelection(annotationFields.meaning, annotationFields.meaningCustom);
  annotation.actionsUsedWithIt = parseList(annotationFields.actionsUsedWithIt.value);
  annotation.adjectivesDescriptions = parseList(annotationFields.adjectivesDescriptions.value);
  annotation.metaphors = parseList(annotationFields.metaphors.value);
  annotation.oppositions = getChoiceSelection(annotationFields.oppositions, annotationFields.oppositionsCustom);
  annotation.realm = getRealmSelection();
  annotation.reviewStatus = annotationFields.reviewStatus.value;
  annotation.theme = parseList(annotationFields.theme.value);
  annotation.relatedTheme = parseList(annotationFields.relatedTheme.value);
  annotation.reviewNote = parseSingleOrList(annotationFields.reviewNote.value);

  persistAnnotationDraft();
  applyAnnotationFilters();
  if (!options.quiet) {
    statusEl.textContent = `Saved ${annotation.location || annotation.id}`;
  }
}

function persistAnnotationDraft() {
  localStorage.setItem(ANNOTATION_DRAFT_KEY, JSON.stringify(annotationState.annotations));
}

function exportAnnotationsJson() {
  saveCurrentAnnotation({ quiet: true });
  downloadText("druz-concept-annotations-reviewed.json", JSON.stringify(annotationState.annotations, null, 2) + "\n", "application/json");
  statusEl.textContent = "Annotation JSON exported";
}

function importAnnotationsJson(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(imported)) {
        throw new Error("Imported JSON must be an array.");
      }
      annotationState.annotations = imported;
      annotationState.selectedIndex = 0;
      annotationState.loaded = true;
      persistAnnotationDraft();
      applyAnnotationFilters();
      statusEl.textContent = "Annotation JSON imported";
    } catch (error) {
      statusEl.textContent = "Annotation import failed";
      console.error(error);
    } finally {
      annotationImportInput.value = "";
    }
  });
  reader.readAsText(file);
}

function resetAnnotationDraft() {
  localStorage.removeItem(ANNOTATION_DRAFT_KEY);
  annotationState.annotations = [];
  annotationState.filtered = [];
  annotationState.loaded = false;
  loadAnnotations();
}

function logoutTextEditor() {
  saveDraft({ quiet: true });
  saveCurrentAnnotation({ quiet: true });
  sessionStorage.removeItem(TEXT_EDITOR_SESSION_KEY);
  workspaceEl.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  passwordInput.value = "";
  statusEl.textContent = "Logged out";
}

function valueToLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value === null || value === undefined || value === "") {
    return [];
  }
  return [String(value)];
}

function setRealmSelection(value) {
  setChoiceSelection(annotationFields.realm, null, value);
}

function getRealmSelection() {
  return singleOrList(getCheckedValues(annotationFields.realm));
}

function setChoiceSelection(inputs, customField, value) {
  const values = splitChoiceValues(value);
  const standardValues = new Set(inputs.map((input) => input.value));
  inputs.forEach((input) => {
    input.checked = values.includes(input.value);
  });
  if (customField) {
    customField.value = values.filter((item) => !standardValues.has(item)).join("\n");
  }
}

function getChoiceSelection(inputs, customField) {
  return singleOrList([
    ...getCheckedValues(inputs),
    ...parseList(customField?.value || "")
  ]);
}

function getCheckedValues(inputs) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function splitChoiceValues(value) {
  return valueToLines(value).flatMap((item) => {
    return String(item)
      .split(/\n|;|,/)
      .map((part) => part.trim())
      .filter(Boolean);
  });
}

function singleOrList(items) {
  if (!items.length) {
    return null;
  }
  return items.length === 1 ? items[0] : items;
}

function valueToEditable(value) {
  return valueToLines(value).join("\n");
}

function parseList(value) {
  return value
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSingleOrList(value) {
  const items = parseList(value);
  if (!items.length) {
    return "";
  }
  return items.length === 1 ? items[0] : items;
}

function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(TEXT_EDITOR_DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}

function persistDrafts() {
  localStorage.setItem(TEXT_EDITOR_DRAFT_KEY, JSON.stringify(editorState.drafts));
}

function downloadText(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function countLines(text) {
  if (!text) {
    return 0;
  }
  return text.split(/\r\n|\r|\n/).length;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
