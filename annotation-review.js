const ANNOTATION_FILE = "druz-concept-annotations.json";
const REVIEW_PASSWORD = "druz-review";
const SESSION_KEY = "druzAnnotationReviewLoggedIn";
const DRAFT_KEY = "druzAnnotationReviewDraft";

const state = {
  annotations: [],
  filtered: [],
  selectedIndex: 0,
  query: "",
  filter: "all"
};

const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const passwordInput = document.querySelector("#review-password");
const loginMessage = document.querySelector("#login-message");
const workspaceEl = document.querySelector("#annotation-workspace");
const statusEl = document.querySelector("#review-status");
const searchInput = document.querySelector("#annotation-search");
const filterSelect = document.querySelector("#annotation-filter");
const summaryEl = document.querySelector("#annotation-summary");
const listEl = document.querySelector("#annotation-list");
const formEl = document.querySelector("#annotation-form");
const titleEl = document.querySelector("#annotation-title");
const exportButton = document.querySelector("#export-json");
const importInput = document.querySelector("#import-json");
const resetButton = document.querySelector("#reset-draft");
const logoutButton = document.querySelector("#logout-review");

const fields = {
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

init();

function init() {
  bindEvents();
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    unlock();
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (passwordInput.value === REVIEW_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      unlock();
      return;
    }
    loginMessage.textContent = "The password is not correct.";
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  filterSelect.addEventListener("change", () => {
    state.filter = filterSelect.value;
    applyFilters();
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrentEntry();
  });

  exportButton.addEventListener("click", exportJson);
  importInput.addEventListener("change", importJson);
  resetButton.addEventListener("click", resetDraft);
  logoutButton.addEventListener("click", logout);
}

async function unlock() {
  loginPanel.classList.add("hidden");
  workspaceEl.classList.remove("hidden");
  statusEl.textContent = "Loading annotations...";
  await loadAnnotations();
}

async function loadAnnotations() {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      state.annotations = JSON.parse(draft);
      statusEl.textContent = "Draft loaded";
    } else {
      const response = await fetch(ANNOTATION_FILE);
      if (!response.ok) {
        throw new Error(`Could not load ${ANNOTATION_FILE}`);
      }
      state.annotations = await response.json();
      persistDraft();
      statusEl.textContent = "Annotations loaded";
    }
    state.selectedIndex = 0;
    applyFilters();
  } catch (error) {
    statusEl.textContent = "Loading failed";
    listEl.innerHTML = `<div class="empty-state">The annotation file could not be loaded.</div>`;
    console.error(error);
  }
}

function applyFilters() {
  const query = state.query;
  const status = state.filter;
  state.filtered = state.annotations
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

  if (!state.filtered.some((item) => item.index === state.selectedIndex)) {
    state.selectedIndex = state.filtered[0]?.index ?? 0;
  }

  renderList();
  renderSummary();
  renderForm();
}

function renderSummary() {
  const total = state.annotations.length;
  const reviewed = state.annotations.filter((item) => ["reviewed", "approved"].includes(String(item.reviewStatus || "").toLowerCase())).length;
  summaryEl.innerHTML = `
    <span>${state.filtered.length} shown</span>
    <span>${reviewed} reviewed</span>
    <span>${total} total</span>
  `;
}

function renderList() {
  if (!state.filtered.length) {
    listEl.innerHTML = `<div class="empty-state">No annotations match the current filters.</div>`;
    return;
  }

  listEl.innerHTML = state.filtered.map(({ annotation, index }) => {
    const active = index === state.selectedIndex ? " active" : "";
    const words = valueToLines(annotation.matchedWords).slice(0, 2).join(", ");
    return `
      <button class="annotation-list-item${active}" type="button" data-index="${index}">
        <strong>${escapeHtml(annotation.location || annotation.id || `Entry ${index + 1}`)}</strong>
        <span>${escapeHtml(annotation.mainWord || words || "No main word")}</span>
        <small>${escapeHtml(annotation.reviewStatus || "machine draft")}</small>
      </button>
    `;
  }).join("");

  listEl.querySelectorAll(".annotation-list-item").forEach((button) => {
    button.addEventListener("click", () => {
      saveCurrentEntry({ quiet: true });
      state.selectedIndex = Number(button.dataset.index);
      renderList();
      renderForm();
    });
  });
}

function renderForm() {
  const annotation = state.annotations[state.selectedIndex];
  if (!annotation) {
    titleEl.textContent = "No annotation selected";
    formEl.querySelectorAll("input, textarea, select, button").forEach((control) => {
      if (control.id !== "export-json" && control.id !== "reset-draft" && control.id !== "logout-review") {
        control.disabled = true;
      }
    });
    return;
  }

  formEl.querySelectorAll("input, textarea, select, button").forEach((control) => {
    control.disabled = false;
  });

  titleEl.textContent = annotation.location || annotation.id || `Entry ${state.selectedIndex + 1}`;
  fields.sourceParagraph.value = annotation.sourceParagraph || "";
  fields.translation.value = annotation.translation || "";
  fields.location.value = annotation.location || "";
  fields.id.value = annotation.id || "";
  fields.concept.value = annotation.concept || "";
  fields.mainWord.value = valueToEditable(annotation.mainWord);
  fields.matchedWords.value = valueToEditable(annotation.matchedWords);
  fields.meaning.value = valueToEditable(annotation.meaning);
  fields.actionsUsedWithIt.value = valueToEditable(annotation.actionsUsedWithIt);
  fields.adjectivesDescriptions.value = valueToEditable(annotation.adjectivesDescriptions);
  fields.metaphors.value = valueToEditable(annotation.metaphors);
  fields.oppositions.value = valueToEditable(annotation.oppositions);
  fields.realm.value = annotation.realm || "";
  fields.reviewStatus.value = annotation.reviewStatus || "machine draft";
  fields.theme.value = valueToEditable(annotation.theme);
  fields.relatedTheme.value = valueToEditable(annotation.relatedTheme);
  fields.reviewNote.value = valueToEditable(annotation.reviewNote);
}

function saveCurrentEntry(options = {}) {
  const annotation = state.annotations[state.selectedIndex];
  if (!annotation) {
    return;
  }

  annotation.sourceParagraph = fields.sourceParagraph.value.trim();
  annotation.translation = fields.translation.value.trim();
  annotation.location = fields.location.value.trim();
  annotation.id = fields.id.value.trim();
  annotation.concept = fields.concept.value.trim();
  annotation.mainWord = parseSingleOrList(fields.mainWord.value);
  annotation.matchedWords = parseList(fields.matchedWords.value);
  annotation.meaning = parseSingleOrList(fields.meaning.value);
  annotation.actionsUsedWithIt = parseList(fields.actionsUsedWithIt.value);
  annotation.adjectivesDescriptions = parseList(fields.adjectivesDescriptions.value);
  annotation.metaphors = parseList(fields.metaphors.value);
  annotation.oppositions = parseList(fields.oppositions.value);
  annotation.realm = fields.realm.value.trim() || null;
  annotation.reviewStatus = fields.reviewStatus.value;
  annotation.theme = parseList(fields.theme.value);
  annotation.relatedTheme = parseList(fields.relatedTheme.value);
  annotation.reviewNote = parseSingleOrList(fields.reviewNote.value);

  persistDraft();
  applyFilters();
  if (!options.quiet) {
    statusEl.textContent = `Saved ${annotation.location || annotation.id}`;
  }
}

function persistDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state.annotations));
}

function exportJson() {
  saveCurrentEntry({ quiet: true });
  const blob = new Blob([JSON.stringify(state.annotations, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "druz-concept-annotations-reviewed.json";
  link.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "JSON exported";
}

function importJson(event) {
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
      state.annotations = imported;
      state.selectedIndex = 0;
      persistDraft();
      applyFilters();
      statusEl.textContent = "JSON imported";
    } catch (error) {
      statusEl.textContent = "Import failed";
      console.error(error);
    } finally {
      importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function resetDraft() {
  localStorage.removeItem(DRAFT_KEY);
  state.annotations = [];
  state.filtered = [];
  loadAnnotations();
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  workspaceEl.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  passwordInput.value = "";
  statusEl.textContent = "Login required";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
