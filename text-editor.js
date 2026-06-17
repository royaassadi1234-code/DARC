const TEXT_EDITOR_LOGIN = "editor";
const TEXT_EDITOR_PASSWORD = "druz-edit";
const REVIEW_LOGIN = "reviewer";
const REVIEW_PASSWORD = "druz-review";
const TEXT_EDITOR_SESSION_KEY = "druzTextEditorLoggedIn";
const TEXT_EDITOR_DRAFT_KEY = "druzTextEditorDrafts";
const TEXT_EDITOR_CUSTOM_TEXTS_KEY = "druzTextEditorCustomTexts";
const TEXT_EDITOR_ANNOTATION_OPTIONS_KEY = "druzTextEditorAnnotationOptions";
const ANNOTATION_FILE = "druz-concept-annotations.json";
const ANNOTATION_DRAFT_KEY = "druzAnnotationReviewDraft";
const ANNOTATION_COMPLETION_KEY = "druzAnnotationFieldCompletion";

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
  customTexts: [],
  annotationOptions: {
    hidden: [],
    custom: []
  },
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
  loaded: false,
  completion: {}
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
const sourceLocationDisplayEl = document.querySelector("#text-source-location-display");
const translationLocationDisplayEl = document.querySelector("#text-translation-location-display");
const passagePositionEl = document.querySelector("#text-passage-position");
const passagePrevButton = document.querySelector("#text-passage-prev");
const passageNextButton = document.querySelector("#text-passage-next");
const saveButton = document.querySelector("#text-editor-save");
const addTextToggleButton = document.querySelector("#text-editor-add-text-toggle");
const annotationOptionsToggleButton = document.querySelector("#text-editor-annotation-options-toggle");
const addTextPanelEl = document.querySelector("#text-editor-add-text-panel");
const newTextTitleEl = document.querySelector("#text-editor-new-title");
const newTextSiglumEl = document.querySelector("#text-editor-new-siglum");
const newTextSourceEl = document.querySelector("#text-editor-new-source");
const newTextTranslationEl = document.querySelector("#text-editor-new-translation");
const createTextButton = document.querySelector("#text-editor-create-text");
const annotationOptionsPanelEl = document.querySelector("#text-editor-annotation-options-panel");
const customAnnotationNameEl = document.querySelector("#text-custom-annotation-name");
const customAnnotationAddButton = document.querySelector("#text-custom-annotation-add");
const annotationOptionsListEl = document.querySelector("#text-annotation-options-list");
const customAnnotationFieldsEl = document.querySelector("#text-custom-annotation-fields");
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
const optionOtherToggles = document.querySelectorAll(".option-other-toggle");
const fieldCompletionInputs = document.querySelectorAll("[data-complete-field]");
const textFieldCompletionInputs = document.querySelectorAll("[data-text-complete-field]");

const textPassageFields = {
  realm: Array.from(document.querySelectorAll("input[name='text-realm']")),
  oppositions: Array.from(document.querySelectorAll("input[name='text-oppositions']")),
  oppositionsCustom: document.querySelector("#text-field-oppositions-custom"),
  referent: Array.from(document.querySelectorAll("input[name='text-referent']")),
  referentCustom: document.querySelector("#text-field-referent-custom"),
  actionsUsedWithIt: document.querySelector("#text-field-actionsUsedWithIt"),
  relationship: document.querySelector("#text-field-relationship"),
  similarity: document.querySelector("#text-field-similarity"),
  difference: document.querySelector("#text-field-difference"),
  id: document.querySelector("#text-field-id"),
  concept: document.querySelector("#text-field-concept"),
  mainWord: document.querySelector("#text-field-mainWord"),
  matchedWords: document.querySelector("#text-field-matchedWords"),
  reviewStatus: document.querySelector("#text-field-reviewStatus"),
  adjectivesDescriptions: document.querySelector("#text-field-adjectivesDescriptions"),
  metaphors: document.querySelector("#text-field-metaphors"),
  theme: document.querySelector("#text-field-theme"),
  relatedTheme: document.querySelector("#text-field-relatedTheme"),
  reviewNote: document.querySelector("#text-field-reviewNote")
};

const TEXT_ANNOTATION_OPTION_CARDS = [
  { key: "reviewNote", label: "Review note", selector: ".text-annotation-review-note" },
  { key: "theme", label: "Theme", selector: ".text-annotation-theme" },
  { key: "relatedTheme", label: "Related theme", selector: ".text-annotation-related-theme" },
  { key: "concept", label: "Concept", selector: ".text-annotation-concept" },
  { key: "mainWord", label: "Main word", selector: ".text-annotation-main-word" },
  { key: "matchedWords", label: "Matched words", selector: ".text-annotation-matched-words" },
  { key: "realm", label: "Realm", selector: ".text-annotation-realm" },
  { key: "oppositions", label: "Opposition", selector: ".text-annotation-oppositions" },
  { key: "actionsUsedWithIt", label: "Action", selector: ".text-annotation-action" },
  { key: "referent", label: "Referent", selector: ".text-annotation-referent" },
  { key: "relationship", label: "Relationship", selector: ".text-annotation-relationship" },
  { key: "similarity", label: "Similarity", selector: ".text-annotation-similarity" },
  { key: "difference", label: "Difference", selector: ".text-annotation-difference" },
  { key: "adjectivesDescriptions", label: "Adjectives / descriptions", selector: ".text-annotation-adjectives" },
  { key: "metaphors", label: "Metaphors", selector: ".text-annotation-metaphors" },
  { key: "id", label: "ID", selector: ".text-annotation-id" }
];

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
    saveCurrentPassageToDraft();
    editorState.query = searchInput.value.trim();
    moveToFirstTextSearchMatch();
    listEl.classList.toggle("hidden", !editorState.query);
    fileToggleButton.setAttribute("aria-expanded", editorState.query ? "true" : "false");
    renderTextEditorList();
    renderCurrentFile();
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

  optionOtherToggles.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOptionPopover(button);
    });
  });

  fieldCompletionInputs.forEach((input) => {
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("change", () => {
      setFieldCompletion(input.dataset.completeField, input.checked);
    });
  });

  textFieldCompletionInputs.forEach((input) => {
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("change", () => {
      const file = getSelectedFile();
      if (file) {
        statusEl.textContent = `${file.siglum} passage has unsaved metadata`;
      }
    });
  });

  const textChoiceGroups = Array.from(document.querySelectorAll(".text-annotation-realm, .text-annotation-oppositions, .text-annotation-referent"));
  const textAnnotationDetails = Array.from(document.querySelectorAll(".text-annotation-column details.text-annotation-item"));
  const closeOtherTextAnnotationCards = (currentCard) => {
    textAnnotationDetails.forEach((details) => {
      if (details !== currentCard) {
        details.open = false;
      }
    });
    textChoiceGroups.forEach((group) => {
      if (group !== currentCard) {
        group.classList.add("text-annotation-choice-collapsed");
      }
    });
  };

  textAnnotationDetails.forEach((details) => {
    const summary = details.querySelector("summary");
    if (summary) {
      summary.addEventListener("click", () => {
        closeOtherTextAnnotationCards(details);
      });
    }
  });

  textChoiceGroups.forEach((group) => {
    group.classList.add("text-annotation-choice-collapsed");
    group.addEventListener("click", (event) => {
      const isCollapsed = group.classList.contains("text-annotation-choice-collapsed");
      const toggleTarget = event.target.closest("legend, .field-complete");
      if (isCollapsed || toggleTarget) {
        if (isCollapsed) {
          closeOtherTextAnnotationCards(group);
        }
        group.classList.toggle("text-annotation-choice-collapsed", !isCollapsed);
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".option-choice-group")) {
      closeOptionPopovers();
    }
  });

  window.addEventListener("hashchange", openToolFromHash);

  listEl.addEventListener("click", (event) => {
    const passageButton = event.target.closest("[data-passage-index]");
    if (passageButton) {
      saveDraft({ quiet: true });
      editorState.passageIndex = Number(passageButton.dataset.passageIndex) || 0;
      renderTextEditorList();
      renderCurrentFile();
      return;
    }

    const button = event.target.closest("[data-text-id]");
    if (!button) {
      return;
    }
    saveDraft({ quiet: true });
    editorState.selectedId = button.dataset.textId;
    editorState.passageIndex = 0;
    if (!editorState.query) {
      listEl.classList.add("hidden");
      fileToggleButton.setAttribute("aria-expanded", "false");
    }
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

  getTextPassageControls().forEach((control) => {
    const eventName = control.type === "checkbox" || control.tagName === "SELECT" ? "change" : "input";
    control.addEventListener(eventName, () => {
      const file = getSelectedFile();
      if (file) {
        statusEl.textContent = `${file.siglum} passage has unsaved metadata`;
      }
    });
  });

  passagePrevButton.addEventListener("click", () => {
    const file = getSelectedFile();
    if (!file) {
      return;
    }
    saveCurrentPassageToDraft();
    editorState.passageIndex = getPreviousPassageIndex(file);
    renderTextEditorList();
    renderCurrentFile();
  });

  passageNextButton.addEventListener("click", () => {
    const file = getSelectedFile();
    if (!file) {
      return;
    }
    saveCurrentPassageToDraft();
    editorState.passageIndex = getNextPassageIndex(file);
    renderTextEditorList();
    renderCurrentFile();
  });

  saveButton.addEventListener("click", () => saveDraft());
  addTextToggleButton.addEventListener("click", () => {
    const hidden = addTextPanelEl.classList.toggle("hidden");
    addTextToggleButton.setAttribute("aria-expanded", hidden ? "false" : "true");
  });
  annotationOptionsToggleButton.addEventListener("click", () => {
    const hidden = annotationOptionsPanelEl.classList.toggle("hidden");
    annotationOptionsToggleButton.setAttribute("aria-expanded", hidden ? "false" : "true");
  });
  createTextButton.addEventListener("click", createCustomText);
  customAnnotationAddButton.addEventListener("click", addCustomAnnotationOption);
  annotationOptionsListEl.addEventListener("click", handleAnnotationOptionListClick);
  customAnnotationFieldsEl.addEventListener("input", () => {
    const file = getSelectedFile();
    if (file) {
      statusEl.textContent = `${file.siglum} passage has unsaved metadata`;
    }
  });
  customAnnotationFieldsEl.addEventListener("change", () => {
    const file = getSelectedFile();
    if (file) {
      statusEl.textContent = `${file.siglum} passage has unsaved metadata`;
    }
  });
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
  editorState.customTexts = loadCustomTexts();
  editorState.annotationOptions = loadTextAnnotationOptions();
  annotationState.completion = loadAnnotationCompletion();
  await Promise.all([loadWorkspaceTexts(), loadAnnotations()]);
  fillAllTextPassageIdsFromLocations();
  persistDrafts();
  renderTextEditorList();
  renderTextAnnotationOptions();
  listEl.classList.add("hidden");
  fileToggleButton.setAttribute("aria-expanded", "false");
  renderCurrentFile();
  openToolFromHash();
}

function switchEditorTool(tool) {
  saveDraft({ quiet: true });
  saveCurrentAnnotation({ quiet: true });
  const activeTool = "texts";
  textToolPanel.classList.remove("hidden");
  annotationToolPanel.classList.add("hidden");
  toolTabs.forEach((tab) => {
    const active = tab.dataset.editorTool === activeTool;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  statusEl.textContent = "Text editor";
}

function openToolFromHash() {
  switchEditorTool("texts");
}

function toggleOptionPopover(button) {
  const panel = document.querySelector(`#${button.getAttribute("aria-controls")}`);
  if (!panel) {
    return;
  }
  const willOpen = panel.classList.contains("hidden");
  closeOptionPopovers();
  panel.classList.toggle("hidden", !willOpen);
  button.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function closeOptionPopovers() {
  optionOtherToggles.forEach((button) => {
    const panel = document.querySelector(`#${button.getAttribute("aria-controls")}`);
    if (panel) {
      panel.classList.add("hidden");
    }
    button.setAttribute("aria-expanded", "false");
  });
}

function renderTextAnnotationOptions() {
  const hidden = new Set(editorState.annotationOptions.hidden || []);
  TEXT_ANNOTATION_OPTION_CARDS.forEach((option) => {
    const card = document.querySelector(option.selector);
    if (card) {
      card.classList.toggle("hidden", hidden.has(option.key));
    }
  });

  customAnnotationFieldsEl.innerHTML = (editorState.annotationOptions.custom || []).map((option) => `
    <details class="annotation-field-card text-annotation-item text-custom-annotation-item" data-custom-annotation-key="${escapeHtml(option.key)}">
      <summary>
        <label class="field-complete">
          <input type="checkbox" data-text-custom-complete-field="${escapeHtml(option.key)}">
          <span>${escapeHtml(option.label)}</span>
        </label>
      </summary>
      <label class="annotation-field" for="text-custom-field-${escapeHtml(option.key)}">
        <span>${escapeHtml(option.label)}</span>
        <textarea id="text-custom-field-${escapeHtml(option.key)}" data-text-custom-field="${escapeHtml(option.key)}" rows="4"></textarea>
      </label>
    </details>
  `).join("");

  annotationOptionsListEl.innerHTML = [
    ...TEXT_ANNOTATION_OPTION_CARDS.map((option) => {
      const isHidden = hidden.has(option.key);
      return `
        <div class="text-annotation-option-row">
          <span>${escapeHtml(option.label)}</span>
          <button class="copy-button secondary" type="button" data-annotation-option-key="${escapeHtml(option.key)}" data-annotation-option-action="${isHidden ? "restore" : "hide"}">${isHidden ? "Restore" : "Delete"}</button>
        </div>
      `;
    }),
    ...(editorState.annotationOptions.custom || []).map((option) => `
      <div class="text-annotation-option-row">
        <span>${escapeHtml(option.label)}</span>
        <button class="copy-button secondary" type="button" data-custom-annotation-key="${escapeHtml(option.key)}" data-annotation-option-action="delete-custom">Delete</button>
      </div>
    `)
  ].join("");
}

function addCustomAnnotationOption() {
  const label = customAnnotationNameEl.value.trim();
  if (!label) {
    statusEl.textContent = "Add an annotation option name first";
    return;
  }
  const key = makeCustomAnnotationKey(label);
  editorState.annotationOptions.custom.push({ key, label });
  customAnnotationNameEl.value = "";
  persistTextAnnotationOptions();
  renderTextAnnotationOptions();
  const file = getSelectedFile();
  if (file) {
    renderTextPassageMetadata(file, getSourceRecords(file)[editorState.passageIndex]);
  }
  statusEl.textContent = `Added annotation option ${label}`;
}

function handleAnnotationOptionListClick(event) {
  const button = event.target.closest("[data-annotation-option-action]");
  if (!button) {
    return;
  }
  const action = button.dataset.annotationOptionAction;
  if (action === "hide" || action === "restore") {
    const key = button.dataset.annotationOptionKey;
    const hidden = new Set(editorState.annotationOptions.hidden || []);
    if (action === "hide") {
      hidden.add(key);
      removeBuiltInAnnotationValue(key);
    } else {
      hidden.delete(key);
    }
    editorState.annotationOptions.hidden = Array.from(hidden);
  }
  if (action === "delete-custom") {
    const key = button.dataset.customAnnotationKey;
    editorState.annotationOptions.custom = (editorState.annotationOptions.custom || []).filter((option) => option.key !== key);
    removeCustomAnnotationValue(key);
  }
  persistTextAnnotationOptions();
  renderTextAnnotationOptions();
  renderCurrentFile();
}

function makeCustomAnnotationKey(label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `option-${Date.now()}`;
  let key = `custom-${base}`;
  let suffix = 2;
  const existing = new Set([
    ...TEXT_ANNOTATION_OPTION_CARDS.map((option) => option.key),
    ...(editorState.annotationOptions.custom || []).map((option) => option.key)
  ]);
  while (existing.has(key)) {
    key = `custom-${base}-${suffix}`;
    suffix += 1;
  }
  return key;
}

function removeCustomAnnotationValue(key) {
  editorState.files.forEach((file) => {
    const draft = editorState.drafts[file.id];
    if (!isPlainObject(draft?.passageAnnotations)) {
      return;
    }
    Object.values(draft.passageAnnotations).forEach((metadata) => {
      if (isPlainObject(metadata.customFields)) {
        delete metadata.customFields[key];
      }
      if (isPlainObject(metadata.completion)) {
        delete metadata.completion[key];
      }
    });
  });
  persistDrafts();
}

function removeBuiltInAnnotationValue(key) {
  editorState.files.forEach((file) => {
    const draft = editorState.drafts[file.id];
    if (!isPlainObject(draft?.passageAnnotations)) {
      return;
    }
    Object.values(draft.passageAnnotations).forEach((metadata) => {
      removeTextAnnotationValueFromMetadata(metadata, key);
    });
  });
  persistDrafts();
}

function removeTextAnnotationValueFromMetadata(metadata, key) {
  const property = key === "referent" ? "meaning" : key;
  delete metadata[property];
  if (isPlainObject(metadata.completion)) {
    delete metadata.completion[key];
  }
}

async function loadWorkspaceTexts() {
  const loaded = await Promise.all(TEXT_EDITOR_FILES.map(loadWorkspaceText));
  editorState.files = [
    ...loaded.filter(Boolean),
    ...editorState.customTexts.map(buildCustomTextFile)
  ];
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

function buildCustomTextFile(config) {
  const sourceRecords = cloneRecords(config.sourceRecords || []);
  const translationRecords = cloneRecords(config.translationRecords || []);
  return {
    id: config.id,
    siglum: config.siglum,
    title: config.title,
    file: config.file || `${config.siglum}.txt`,
    translationFile: config.translationFile || `${config.siglum}-en.txt`,
    kind: config.kind || "Custom text",
    original: serializeEditableRecords(sourceRecords),
    translationOriginal: serializeEditableRecords(translationRecords),
    sourceRecords,
    translationRecords,
    custom: true
  };
}

function createCustomText() {
  const title = newTextTitleEl.value.trim();
  const siglum = newTextSiglumEl.value.trim();
  const sourceRaw = newTextSourceEl.value.trim();
  const translationRaw = newTextTranslationEl.value.trim();
  if (!title || !siglum || !sourceRaw) {
    statusEl.textContent = "Add a title, short title, and text before creating a text";
    return;
  }

  saveDraft({ quiet: true });
  const id = makeCustomTextId(siglum, title);
  if (editorState.files.some((file) => file.id === id)) {
    statusEl.textContent = "A text with this short title already exists";
    return;
  }

  const sourceRecords = parseEditableRecords(sourceRaw);
  const translationRecords = translationRaw ? parseEditableRecords(translationRaw) : sourceRecords.map((record) => ({
    location: record.location,
    text: "",
    format: record.format || "section"
  }));
  const config = {
    id,
    siglum,
    title,
    file: `${siglum}.txt`,
    translationFile: `${siglum}-en.txt`,
    kind: "Custom text",
    sourceRecords,
    translationRecords
  };
  editorState.customTexts.push(config);
  persistCustomTexts();
  const file = buildCustomTextFile(config);
  editorState.files.push(file);
  editorState.selectedId = id;
  editorState.passageIndex = 0;
  editorState.query = "";
  searchInput.value = "";
  addTextPanelEl.classList.add("hidden");
  addTextToggleButton.setAttribute("aria-expanded", "false");
  newTextTitleEl.value = "";
  newTextSiglumEl.value = "";
  newTextSourceEl.value = "";
  newTextTranslationEl.value = "";
  ensureStructuredDraft(file);
  persistDrafts();
  renderTextEditorList();
  renderCurrentFile();
  statusEl.textContent = `Created ${siglum}`;
}

function makeCustomTextId(siglum, title) {
  const base = `${siglum}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `custom-${Date.now()}`;
  let id = `custom-${base}`;
  let suffix = 2;
  while (editorState.files.some((file) => file.id === id) || editorState.customTexts.some((file) => file.id === id)) {
    id = `custom-${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function renderTextEditorList() {
  const query = editorState.query;
  if (query) {
    renderTextSearchLocations(query);
    return;
  }

  const files = editorState.files;
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

function renderTextSearchLocations(query) {
  const file = getSelectedFile();
  if (!file) {
    summaryEl.innerHTML = "<span>No text selected</span>";
    listEl.innerHTML = `<div class="empty-state">Select a text before searching.</div>`;
    return;
  }

  const matches = getTextSearchMatches(file, query);
  summaryEl.innerHTML = `
    <span>${matches.length.toLocaleString()} locations</span>
    <span>${escapeHtml(file.siglum)}</span>
    <span>${escapeHtml(query)}</span>
  `;

  if (!matches.length) {
    listEl.innerHTML = `<div class="empty-state">No locations contain this word in ${escapeHtml(file.siglum)}.</div>`;
    return;
  }

  listEl.innerHTML = matches.map((match) => {
    const active = match.index === editorState.passageIndex ? " active" : "";
    const displayLocation = formatTextLocationId(file, match.location);
    return `
      <button class="annotation-list-item text-editor-list-item text-location-result${active}" type="button" data-passage-index="${match.index}">
        <strong>${escapeHtml(displayLocation)}</strong>
        <span>${escapeHtml(match.snippet)}</span>
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
    sourceLocationDisplayEl.textContent = "";
    translationLocationDisplayEl.textContent = "";
    clearTextPassageMetadata();
    setPassageControlsDisabled(true);
    return;
  }

  const sourceRecords = getSourceRecords(file);
  const translationRecords = getTranslationRecords(file);
  const searchMatches = editorState.query ? getTextSearchMatches(file, editorState.query) : [];
  const searchMatchIndexes = searchMatches.map((match) => match.index);
  if (editorState.query && !searchMatches.length) {
    titleEl.textContent = file.title;
    setPassageControlsDisabled(true);
    sourceContentEl.value = "";
    sourceLocationEl.value = "";
    translationContentEl.value = "";
    translationLocationEl.value = "";
    sourceLocationDisplayEl.textContent = "";
    translationLocationDisplayEl.textContent = "";
    clearTextPassageMetadata();
    passagePositionEl.textContent = `No matches for "${editorState.query}"`;
    passagePrevButton.disabled = true;
    passageNextButton.disabled = true;
    statusEl.textContent = `No ${file.siglum} passages match "${editorState.query}"`;
    return;
  }
  if (searchMatchIndexes.length && !searchMatchIndexes.includes(editorState.passageIndex)) {
    editorState.passageIndex = searchMatchIndexes[0];
  }
  editorState.passageIndex = Math.min(Math.max(0, editorState.passageIndex), Math.max(0, sourceRecords.length - 1));
  const sourceRecord = sourceRecords[editorState.passageIndex];
  const translationRecord = findTranslationRecord(file, sourceRecord, translationRecords);
  const sourceDisplayLocation = formatTextLocationId(file, sourceRecord?.location || "");
  const translationDisplayLocation = formatTextLocationId(file, translationRecord?.location || sourceRecord?.location || "");
  titleEl.textContent = file.title;
  setPassageControlsDisabled(false);
  sourceContentEl.value = sourceRecord?.text || "";
  sourceLocationEl.value = sourceDisplayLocation;
  translationContentEl.value = translationRecord?.text || "";
  translationLocationEl.value = translationDisplayLocation;
  sourceLocationDisplayEl.textContent = sourceDisplayLocation;
  translationLocationDisplayEl.textContent = translationDisplayLocation;
  sourceLabelEl.textContent = `${file.siglum} correspondence text`;
  translationLabelEl.textContent = file.translationFile ? `${file.siglum} translation` : "Translation";
  translationContentEl.disabled = !file.translationFile;
  translationLocationEl.disabled = !file.translationFile;
  renderTextPassageMetadata(file, sourceRecord);
  if (editorState.query) {
    const matchPosition = searchMatchIndexes.indexOf(editorState.passageIndex);
    passagePositionEl.textContent = searchMatches.length
      ? `${sourceDisplayLocation || "No passage"} | ${(matchPosition + 1).toLocaleString()} of ${searchMatches.length.toLocaleString()} matches`
      : `No matches for "${editorState.query}"`;
    passagePrevButton.disabled = matchPosition <= 0;
    passageNextButton.disabled = matchPosition < 0 || matchPosition >= searchMatches.length - 1;
  } else {
    passagePositionEl.textContent = `${sourceDisplayLocation || "No passage"} | ${(editorState.passageIndex + 1).toLocaleString()} of ${sourceRecords.length.toLocaleString()}`;
    passagePrevButton.disabled = editorState.passageIndex <= 0;
    passageNextButton.disabled = editorState.passageIndex >= sourceRecords.length - 1;
  }
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
  getTextPassageControls().forEach((control) => {
    control.disabled = disabled;
  });
}

function getSelectedFile() {
  return editorState.files.find((file) => file.id === editorState.selectedId) || null;
}

function moveToFirstTextSearchMatch() {
  const file = getSelectedFile();
  if (!file || !editorState.query) {
    return;
  }
  const matches = getTextSearchMatches(file, editorState.query);
  if (matches.length && !matches.some((match) => match.index === editorState.passageIndex)) {
    editorState.passageIndex = matches[0].index;
  }
}

function getPreviousPassageIndex(file) {
  const matchIndexes = getCurrentTextSearchMatchIndexes(file);
  if (!matchIndexes.length) {
    return Math.max(0, editorState.passageIndex - 1);
  }
  const currentMatchPosition = matchIndexes.indexOf(editorState.passageIndex);
  if (currentMatchPosition <= 0) {
    return matchIndexes[0];
  }
  return matchIndexes[currentMatchPosition - 1];
}

function getNextPassageIndex(file) {
  const matchIndexes = getCurrentTextSearchMatchIndexes(file);
  if (!matchIndexes.length) {
    return Math.min(getSourceRecords(file).length - 1, editorState.passageIndex + 1);
  }
  const currentMatchPosition = matchIndexes.indexOf(editorState.passageIndex);
  if (currentMatchPosition < 0) {
    return matchIndexes[0];
  }
  if (currentMatchPosition >= matchIndexes.length - 1) {
    return matchIndexes[matchIndexes.length - 1];
  }
  return matchIndexes[currentMatchPosition + 1];
}

function getCurrentTextSearchMatchIndexes(file) {
  if (!editorState.query) {
    return [];
  }
  return getTextSearchMatches(file, editorState.query).map((match) => match.index);
}

function getTextSearchMatches(file, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const translationRecords = getTranslationRecords(file);
  return getSourceRecords(file).reduce((matches, record, index) => {
    const translationRecord = findTranslationRecord(file, record, translationRecords);
    const searchable = normalizeSearchText([record.text, translationRecord?.text].filter(Boolean).join(" "));
    if (searchable.includes(normalizedQuery)) {
      matches.push({
        index,
        location: record.location || `passage ${index + 1}`,
        snippet: getTextSearchSnippet(record.text, translationRecord?.text, normalizedQuery)
      });
    }
    return matches;
  }, []);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getTextSearchSnippet(sourceText, translationText, query) {
  const text = [sourceText, translationText].filter(Boolean).join(" ");
  const normalizedText = normalizeSearchText(text);
  const index = normalizedText.indexOf(normalizeSearchText(query));
  if (index < 0) {
    return text.slice(0, 120).trim();
  }
  const start = Math.max(0, index - 44);
  const end = Math.min(text.length, index + query.length + 76);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
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
  if (sourceContent === file.original && translationContent === (file.translationOriginal || "") && !hasTextPassageMetadata(draft)) {
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
  fillAllTextPassageIdsFromLocations();
  persistDrafts();
  const payload = {
    exportedAt: new Date().toISOString(),
    customTexts: editorState.customTexts,
    annotationOptions: editorState.annotationOptions,
    files: editorState.files.map((file) => ({
      id: file.id,
      siglum: file.siglum,
      title: file.title,
      file: file.file,
      translationFile: file.translationFile || "",
      kind: file.kind,
      custom: Boolean(file.custom),
      content: getCurrentContent(file),
      translationContent: file.translationFile ? serializeEditableRecords(getTranslationRecords(file), file.translationRecords) : "",
      sourceRecords: getSourceRecords(file),
      translationRecords: getTranslationRecords(file),
      passageAnnotations: getPassageAnnotations(file)
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
      const nextCustomTexts = [...editorState.customTexts];
      files.forEach((item) => {
        let match = editorState.files.find((workspaceFile) => workspaceFile.id === item.id || workspaceFile.file === item.file);
        if (!match && item.custom) {
          const config = {
            id: item.id || makeCustomTextId(item.siglum || "Custom", item.title || "Custom text"),
            siglum: item.siglum || "Custom",
            title: item.title || "Custom text",
            file: item.file || `${item.siglum || "Custom"}.txt`,
            translationFile: item.translationFile || `${item.siglum || "Custom"}-en.txt`,
            kind: item.kind || "Custom text",
            sourceRecords: Array.isArray(item.sourceRecords) ? item.sourceRecords : parseEditableRecords(item.content || ""),
            translationRecords: Array.isArray(item.translationRecords) ? item.translationRecords : parseEditableRecords(item.translationContent || "")
          };
          if (!nextCustomTexts.some((text) => text.id === config.id)) {
            nextCustomTexts.push(config);
            match = buildCustomTextFile(config);
            editorState.files.push(match);
          }
        }
        if (!match) {
          return;
        }
        if (Array.isArray(item.sourceRecords)) {
          nextDrafts[match.id] = {
            sourceRecords: item.sourceRecords,
            translationRecords: Array.isArray(item.translationRecords) ? item.translationRecords : getTranslationRecords(match),
            passageAnnotations: isPlainObject(item.passageAnnotations) ? item.passageAnnotations : {}
          };
          return;
        }
        if (typeof item.content === "string") {
          nextDrafts[match.id] = {
            sourceRecords: parseEditableRecords(item.content),
            translationRecords: typeof item.translationContent === "string" ? parseEditableRecords(item.translationContent) : getTranslationRecords(match),
            passageAnnotations: isPlainObject(item.passageAnnotations) ? item.passageAnnotations : {}
          };
        }
      });
      editorState.drafts = nextDrafts;
      editorState.customTexts = nextCustomTexts;
      if (isPlainObject(imported.annotationOptions)) {
        editorState.annotationOptions = {
          hidden: Array.isArray(imported.annotationOptions.hidden) ? imported.annotationOptions.hidden : editorState.annotationOptions.hidden,
          custom: Array.isArray(imported.annotationOptions.custom) ? imported.annotationOptions.custom : editorState.annotationOptions.custom
        };
      }
      fillAllTextPassageIdsFromLocations();
      persistCustomTexts();
      persistTextAnnotationOptions();
      persistDrafts();
      renderTextAnnotationOptions();
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

function getPassageAnnotations(file) {
  const draft = editorState.drafts[file.id];
  if (draft && isPlainObject(draft.passageAnnotations)) {
    return draft.passageAnnotations;
  }
  return {};
}

function ensureStructuredDraft(file) {
  const draft = editorState.drafts[file.id];
  if (draft && Array.isArray(draft.sourceRecords)) {
    if (!isPlainObject(draft.passageAnnotations)) {
      draft.passageAnnotations = {};
    }
    return draft;
  }
  const next = {
    sourceRecords: typeof draft === "string" ? parseEditableRecords(draft) : cloneRecords(file.sourceRecords || []),
    translationRecords: cloneRecords(file.translationRecords || []),
    passageAnnotations: isPlainObject(draft?.passageAnnotations) ? draft.passageAnnotations : {}
  };
  editorState.drafts[file.id] = next;
  return next;
}

function fillAllTextPassageIdsFromLocations() {
  editorState.files.forEach((file) => {
    const draft = ensureStructuredDraft(file);
    draft.sourceRecords.forEach((sourceRecord, index) => {
      const location = getCorrespondenceLocation(sourceRecord, index);
      if (!location) {
        return;
      }
      const key = getTextPassageMetadataKey(sourceRecord, index);
      draft.passageAnnotations[key] = {
        ...(draft.passageAnnotations[key] || {}),
        location,
        id: formatTextLocationId(file, location)
      };
    });
  });
}

function saveCurrentPassageToDraft() {
  const file = getSelectedFile();
  if (!file || sourceContentEl.disabled) {
    return;
  }
  const draft = ensureStructuredDraft(file);
  const sourceRecord = draft.sourceRecords[editorState.passageIndex];
  const previousMetadataKey = getTextPassageMetadataKey(sourceRecord, editorState.passageIndex);
  if (sourceRecord) {
    sourceRecord.location = parseTextLocationInput(file, sourceLocationEl.value) || sourceRecord.location;
    sourceRecord.text = sourceContentEl.value;
  }
  saveTextPassageMetadata(draft, sourceRecord, previousMetadataKey);
  if (file.translationFile) {
    let translationRecord = findTranslationRecord(file, sourceRecord, draft.translationRecords);
    if (!translationRecord) {
      translationRecord = {
        location: parseTextLocationInput(file, translationLocationEl.value) || sourceRecord?.location || "",
        text: "",
        format: sourceRecord?.format || "section"
      };
      draft.translationRecords.splice(editorState.passageIndex, 0, translationRecord);
    }
    translationRecord.location = parseTextLocationInput(file, translationLocationEl.value) || sourceRecord?.location || translationRecord.location;
    translationRecord.text = translationContentEl.value;
  }
}

function renderTextPassageMetadata(file, sourceRecord) {
  const metadata = getPassageAnnotations(file)[getTextPassageMetadataKey(sourceRecord, editorState.passageIndex)] || {};
  const correspondenceLocation = getCorrespondenceLocation(sourceRecord, editorState.passageIndex);
  const correspondenceId = formatTextLocationId(file, correspondenceLocation);
  setChoiceSelection(textPassageFields.realm, null, metadata.realm);
  setChoiceSelection(textPassageFields.oppositions, textPassageFields.oppositionsCustom, metadata.oppositions);
  setChoiceSelection(textPassageFields.referent, textPassageFields.referentCustom, metadata.meaning);
  textPassageFields.actionsUsedWithIt.value = valueToEditable(metadata.actionsUsedWithIt);
  textPassageFields.relationship.value = valueToEditable(metadata.relationship);
  textPassageFields.similarity.value = valueToEditable(metadata.similarity);
  textPassageFields.difference.value = valueToEditable(metadata.difference);
  textPassageFields.id.value = correspondenceId || metadata.id || "";
  textPassageFields.concept.value = metadata.concept || "";
  textPassageFields.mainWord.value = valueToEditable(metadata.mainWord);
  textPassageFields.matchedWords.value = valueToEditable(metadata.matchedWords);
  textPassageFields.reviewStatus.value = metadata.reviewStatus || "machine draft";
  textPassageFields.adjectivesDescriptions.value = valueToEditable(metadata.adjectivesDescriptions);
  textPassageFields.metaphors.value = valueToEditable(metadata.metaphors);
  textPassageFields.theme.value = valueToEditable(metadata.theme);
  textPassageFields.relatedTheme.value = valueToEditable(metadata.relatedTheme);
  textPassageFields.reviewNote.value = valueToEditable(metadata.reviewNote);
  renderTextFieldCompletion(metadata.completion || {});
  renderCustomTextPassageMetadata(metadata.customFields || {}, metadata.completion || {});
}

function saveTextPassageMetadata(draft, sourceRecord, previousKey) {
  if (!draft || !isPlainObject(draft.passageAnnotations)) {
    return;
  }
  const nextKey = getTextPassageMetadataKey(sourceRecord, editorState.passageIndex);
  const existing = draft.passageAnnotations[previousKey] || draft.passageAnnotations[nextKey] || {};
  const correspondenceLocation = getCorrespondenceLocation(sourceRecord, editorState.passageIndex);
  const correspondenceId = formatTextLocationId(getSelectedFile(), correspondenceLocation);
  const metadata = {
    ...existing,
    location: correspondenceLocation,
    id: correspondenceId,
    concept: textPassageFields.concept.value.trim(),
    mainWord: parseSingleOrList(textPassageFields.mainWord.value),
    matchedWords: parseList(textPassageFields.matchedWords.value),
    meaning: getChoiceSelection(textPassageFields.referent, textPassageFields.referentCustom),
    actionsUsedWithIt: parseList(textPassageFields.actionsUsedWithIt.value),
    relationship: parseList(textPassageFields.relationship.value),
    similarity: parseList(textPassageFields.similarity.value),
    difference: parseList(textPassageFields.difference.value),
    adjectivesDescriptions: parseList(textPassageFields.adjectivesDescriptions.value),
    metaphors: parseList(textPassageFields.metaphors.value),
    oppositions: getChoiceSelection(textPassageFields.oppositions, textPassageFields.oppositionsCustom),
    realm: singleOrList(getCheckedValues(textPassageFields.realm)),
    reviewStatus: textPassageFields.reviewStatus.value,
    theme: parseList(textPassageFields.theme.value),
    relatedTheme: parseList(textPassageFields.relatedTheme.value),
    reviewNote: parseSingleOrList(textPassageFields.reviewNote.value),
    customFields: getCustomTextPassageMetadata(),
    completion: {
      ...getTextFieldCompletion(),
      ...getCustomTextFieldCompletion()
    }
  };
  (editorState.annotationOptions.hidden || []).forEach((key) => {
    removeTextAnnotationValueFromMetadata(metadata, key);
  });
  if (previousKey && previousKey !== nextKey) {
    delete draft.passageAnnotations[previousKey];
  }
  if (hasMeaningfulTextPassageMetadata(metadata)) {
    draft.passageAnnotations[nextKey] = metadata;
  } else {
    delete draft.passageAnnotations[nextKey];
  }
}

function getTextPassageMetadataKey(sourceRecord, index) {
  return normalizeLocation(sourceRecord?.location || sourceLocationEl.value || `passage-${index + 1}`) || `passage-${index + 1}`;
}

function getCorrespondenceLocation(sourceRecord, index) {
  return String(sourceRecord?.location || sourceLocationEl.value || `passage-${index + 1}`).trim();
}

function formatTextLocationId(file, location) {
  const siglum = String(file?.siglum || "").trim();
  const cleanedLocation = String(location || "").trim();
  if (!siglum || !cleanedLocation) {
    return cleanedLocation;
  }
  const compactLocation = cleanedLocation.replace(/\s+/g, "");
  const escapedSiglum = siglum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^${escapedSiglum}`, "i").test(compactLocation)) {
    return compactLocation;
  }
  return `${siglum}${compactLocation}`;
}

function parseTextLocationInput(file, location) {
  const siglum = String(file?.siglum || "").trim();
  const cleanedLocation = String(location || "").trim();
  if (!siglum || !cleanedLocation) {
    return cleanedLocation;
  }
  const escapedSiglum = siglum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanedLocation.replace(new RegExp(`^${escapedSiglum}\\s*`, "i"), "").trim();
}

function clearTextPassageMetadata() {
  setChoiceSelection(textPassageFields.realm, null, []);
  setChoiceSelection(textPassageFields.oppositions, textPassageFields.oppositionsCustom, []);
  setChoiceSelection(textPassageFields.referent, textPassageFields.referentCustom, []);
  Object.values(textPassageFields).forEach((field) => {
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.value = "";
    }
    if (field instanceof HTMLSelectElement) {
      field.value = "machine draft";
    }
  });
  renderTextFieldCompletion({});
  renderCustomTextPassageMetadata({}, {});
}

function getTextPassageControls() {
  return [
    ...textPassageFields.realm,
    ...textPassageFields.oppositions,
    textPassageFields.oppositionsCustom,
    ...textPassageFields.referent,
    textPassageFields.referentCustom,
    textPassageFields.actionsUsedWithIt,
    textPassageFields.relationship,
    textPassageFields.similarity,
    textPassageFields.difference,
    textPassageFields.id,
    textPassageFields.concept,
    textPassageFields.mainWord,
    textPassageFields.matchedWords,
    textPassageFields.reviewStatus,
    textPassageFields.adjectivesDescriptions,
    textPassageFields.metaphors,
    textPassageFields.theme,
    textPassageFields.relatedTheme,
    textPassageFields.reviewNote,
    ...textFieldCompletionInputs,
    ...getCustomTextPassageControls()
  ].filter(Boolean);
}

function getCustomTextPassageControls() {
  return Array.from(customAnnotationFieldsEl.querySelectorAll("[data-text-custom-field], [data-text-custom-complete-field]"));
}

function renderCustomTextPassageMetadata(customFields, completion) {
  customAnnotationFieldsEl.querySelectorAll("[data-text-custom-field]").forEach((field) => {
    field.value = valueToEditable(customFields[field.dataset.textCustomField]);
  });
  customAnnotationFieldsEl.querySelectorAll("[data-text-custom-complete-field]").forEach((input) => {
    input.checked = Boolean(completion[input.dataset.textCustomCompleteField]);
  });
}

function getCustomTextPassageMetadata() {
  return Array.from(customAnnotationFieldsEl.querySelectorAll("[data-text-custom-field]")).reduce((customFields, field) => {
    const value = parseSingleOrList(field.value);
    if (valueToLines(value).length) {
      customFields[field.dataset.textCustomField] = value;
    }
    return customFields;
  }, {});
}

function getCustomTextFieldCompletion() {
  return Array.from(customAnnotationFieldsEl.querySelectorAll("[data-text-custom-complete-field]")).reduce((completion, input) => {
    if (input.checked) {
      completion[input.dataset.textCustomCompleteField] = true;
    }
    return completion;
  }, {});
}

function renderTextFieldCompletion(completion) {
  textFieldCompletionInputs.forEach((input) => {
    input.checked = Boolean(completion[input.dataset.textCompleteField]);
  });
}

function getTextFieldCompletion() {
  return Array.from(textFieldCompletionInputs).reduce((completion, input) => {
    if (input.checked) {
      completion[input.dataset.textCompleteField] = true;
    }
    return completion;
  }, {});
}

function hasTextPassageMetadata(draft) {
  return Boolean(draft && isPlainObject(draft.passageAnnotations) && Object.keys(draft.passageAnnotations).length);
}

function hasMeaningfulTextPassageMetadata(metadata) {
  return Boolean(
    valueToLines(metadata.realm).length ||
    valueToLines(metadata.oppositions).length ||
    valueToLines(metadata.meaning).length ||
    valueToLines(metadata.actionsUsedWithIt).length ||
    valueToLines(metadata.relationship).length ||
    valueToLines(metadata.similarity).length ||
    valueToLines(metadata.difference).length ||
    metadata.id ||
    metadata.concept ||
    valueToLines(metadata.mainWord).length ||
    valueToLines(metadata.matchedWords).length ||
    metadata.reviewStatus !== "machine draft" ||
    valueToLines(metadata.adjectivesDescriptions).length ||
    valueToLines(metadata.metaphors).length ||
    valueToLines(metadata.theme).length ||
    valueToLines(metadata.relatedTheme).length ||
    valueToLines(metadata.reviewNote).length ||
    Object.values(metadata.customFields || {}).some((value) => valueToLines(value).length) ||
    Object.keys(metadata.completion || {}).length
  );
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

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
  renderFieldCompletion();
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

function getAnnotationCompletionKey() {
  const annotation = annotationState.annotations[annotationState.selectedIndex];
  if (!annotation) {
    return "";
  }
  return annotation.id || annotation.location || `entry-${annotationState.selectedIndex}`;
}

function renderFieldCompletion() {
  const key = getAnnotationCompletionKey();
  const completion = annotationState.completion[key] || {};
  fieldCompletionInputs.forEach((input) => {
    input.checked = Boolean(completion[input.dataset.completeField]);
  });
}

function setFieldCompletion(field, complete) {
  const key = getAnnotationCompletionKey();
  if (!key || !field) {
    return;
  }
  annotationState.completion[key] = {
    ...(annotationState.completion[key] || {}),
    [field]: complete
  };
  persistAnnotationCompletion();
}

function loadAnnotationCompletion() {
  try {
    return JSON.parse(localStorage.getItem(ANNOTATION_COMPLETION_KEY)) || {};
  } catch {
    return {};
  }
}

function persistAnnotationCompletion() {
  localStorage.setItem(ANNOTATION_COMPLETION_KEY, JSON.stringify(annotationState.completion));
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

function loadCustomTexts() {
  try {
    const stored = JSON.parse(localStorage.getItem(TEXT_EDITOR_CUSTOM_TEXTS_KEY)) || [];
    return Array.isArray(stored) ? stored.filter((item) => item?.id && item?.siglum && item?.title) : [];
  } catch {
    return [];
  }
}

function persistCustomTexts() {
  localStorage.setItem(TEXT_EDITOR_CUSTOM_TEXTS_KEY, JSON.stringify(editorState.customTexts));
}

function loadTextAnnotationOptions() {
  try {
    const stored = JSON.parse(localStorage.getItem(TEXT_EDITOR_ANNOTATION_OPTIONS_KEY)) || {};
    return {
      hidden: Array.isArray(stored.hidden) ? stored.hidden : [],
      custom: Array.isArray(stored.custom) ? stored.custom.filter((item) => item?.key && item?.label) : []
    };
  } catch {
    return { hidden: [], custom: [] };
  }
}

function persistTextAnnotationOptions() {
  localStorage.setItem(TEXT_EDITOR_ANNOTATION_OPTIONS_KEY, JSON.stringify(editorState.annotationOptions));
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
