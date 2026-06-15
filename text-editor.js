const TEXT_EDITOR_LOGIN = "editor";
const TEXT_EDITOR_PASSWORD = "druz-edit";
const REVIEW_LOGIN = "reviewer";
const REVIEW_PASSWORD = "druz-review";
const TEXT_EDITOR_SESSION_KEY = "druzTextEditorLoggedIn";
const TEXT_EDITOR_DRAFT_KEY = "druzTextEditorDrafts";
const ANNOTATION_FILE = "druz-concept-annotations.json";
const ANNOTATION_DRAFT_KEY = "druzAnnotationReviewDraft";

const TEXT_EDITOR_FILES = [
  { id: "dd", siglum: "DD", title: "Dādestān ī Dēnīg", file: "Dd.txt", kind: "Middle Persian" },
  { id: "dd-en", siglum: "DD EN", title: "Dādestān ī Dēnīg English", file: "DD-en.txt", kind: "English" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt", kind: "Middle Persian" },
  { id: "wz", siglum: "WZ", title: "Wizīdagīhā ī Zādspram", file: "WZ.txt", kind: "Middle Persian" },
  { id: "wz-en", siglum: "WZ EN", title: "Wizīdagīhā ī Zādspram English", file: "WZ-en.txt", kind: "English" },
  { id: "nm", siglum: "NM", title: "Nāmagīhā ī Manuščīhr", file: "NM.txt", kind: "Middle Persian" },
  { id: "gbd", siglum: "GBd", title: "Greater Bundahišn", file: "GBd.txt", kind: "Middle Persian" },
  { id: "prdd", siglum: "PRDd", title: "Pursišn-Rēd Dēnīg", file: "PRDd.txt", kind: "Middle Persian" }
];

const editorState = {
  files: [],
  drafts: {},
  selectedId: "dd",
  query: ""
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
const titleEl = document.querySelector("#text-editor-title");
const metaEl = document.querySelector("#text-editor-meta");
const contentEl = document.querySelector("#text-editor-content");
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

const annotationFields = {
  sourceParagraph: document.querySelector("#field-sourceParagraph"),
  translation: document.querySelector("#field-translation"),
  location: document.querySelector("#field-location"),
  id: document.querySelector("#field-id"),
  concept: document.querySelector("#field-concept"),
  mainWord: document.querySelector("#field-mainWord"),
  matchedWords: document.querySelector("#field-matchedWords"),
  meaning: document.querySelector("#field-meaning"),
  actionsUsedWithIt: document.querySelector("#field-actionsUsedWithIt"),
  adjectivesDescriptions: document.querySelector("#field-adjectivesDescriptions"),
  metaphors: document.querySelector("#field-metaphors"),
  oppositions: document.querySelector("#field-oppositions"),
  realm: document.querySelector("#field-realm"),
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
    renderTextEditorList();
    renderCurrentFile();
  });

  contentEl.addEventListener("input", () => {
    const file = getSelectedFile();
    if (file) {
      statusEl.textContent = `${file.siglum} has unsaved changes`;
    }
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
  if (window.location.hash === "#annotations") {
    switchEditorTool("annotations");
  } else {
    switchEditorTool("texts");
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
    const response = await fetch(config.file);
    if (!response.ok) {
      throw new Error(`Could not load ${config.file}`);
    }
    return {
      ...config,
      original: await response.text()
    };
  } catch (error) {
    console.error(error);
    return null;
  }
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
    contentEl.value = "";
    contentEl.disabled = true;
    return;
  }

  const content = getCurrentContent(file);
  titleEl.textContent = file.title;
  contentEl.disabled = false;
  contentEl.value = content;
  metaEl.innerHTML = `
    <span>${escapeHtml(file.file)}</span>
    <span>${escapeHtml(file.kind)}</span>
    <span>${countLines(content).toLocaleString()} lines</span>
    <span>${content.length.toLocaleString()} characters</span>
    ${hasDraft(file) ? "<span>Draft active</span>" : "<span>Original file</span>"}
  `;
  statusEl.textContent = `${file.siglum} loaded`;
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
  return Object.prototype.hasOwnProperty.call(editorState.drafts, file.id)
    ? editorState.drafts[file.id]
    : file.original;
}

function hasDraft(file) {
  return Object.prototype.hasOwnProperty.call(editorState.drafts, file.id);
}

function saveDraft(options = {}) {
  const file = getSelectedFile();
  if (!file || contentEl.disabled) {
    return;
  }
  if (contentEl.value === file.original) {
    delete editorState.drafts[file.id];
  } else {
    editorState.drafts[file.id] = contentEl.value;
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
  const content = contentEl.value;
  metaEl.innerHTML = `
    <span>${escapeHtml(file.file)}</span>
    <span>${escapeHtml(file.kind)}</span>
    <span>${countLines(content).toLocaleString()} lines</span>
    <span>${content.length.toLocaleString()} characters</span>
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
  contentEl.value = file.original;
  renderTextEditorList();
  renderCurrentMeta();
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
  downloadText(file.file, contentEl.value);
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
      kind: file.kind,
      content: getCurrentContent(file)
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
        if (match && typeof item.content === "string") {
          nextDrafts[match.id] = item.content;
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

  annotationTitleEl.textContent = annotation.location || annotation.id || `Entry ${annotationState.selectedIndex + 1}`;
  annotationFields.sourceParagraph.value = annotation.sourceParagraph || "";
  annotationFields.translation.value = annotation.translation || "";
  annotationFields.location.value = annotation.location || "";
  annotationFields.id.value = annotation.id || "";
  annotationFields.concept.value = annotation.concept || "";
  annotationFields.mainWord.value = valueToEditable(annotation.mainWord);
  annotationFields.matchedWords.value = valueToEditable(annotation.matchedWords);
  annotationFields.meaning.value = valueToEditable(annotation.meaning);
  annotationFields.actionsUsedWithIt.value = valueToEditable(annotation.actionsUsedWithIt);
  annotationFields.adjectivesDescriptions.value = valueToEditable(annotation.adjectivesDescriptions);
  annotationFields.metaphors.value = valueToEditable(annotation.metaphors);
  annotationFields.oppositions.value = valueToEditable(annotation.oppositions);
  annotationFields.realm.value = annotation.realm || "";
  annotationFields.reviewStatus.value = annotation.reviewStatus || "machine draft";
  annotationFields.theme.value = valueToEditable(annotation.theme);
  annotationFields.relatedTheme.value = valueToEditable(annotation.relatedTheme);
  annotationFields.reviewNote.value = valueToEditable(annotation.reviewNote);
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
  annotation.meaning = parseSingleOrList(annotationFields.meaning.value);
  annotation.actionsUsedWithIt = parseList(annotationFields.actionsUsedWithIt.value);
  annotation.adjectivesDescriptions = parseList(annotationFields.adjectivesDescriptions.value);
  annotation.metaphors = parseList(annotationFields.metaphors.value);
  annotation.oppositions = parseList(annotationFields.oppositions.value);
  annotation.realm = annotationFields.realm.value.trim() || null;
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
