const TEXT_EDITOR_LOGIN = "editor";
const TEXT_EDITOR_PASSWORD = "druz-edit";
const TEXT_EDITOR_SESSION_KEY = "druzTextEditorLoggedIn";
const TEXT_EDITOR_DRAFT_KEY = "druzTextEditorDrafts";

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

const loginPanel = document.querySelector("#text-editor-login-panel");
const loginForm = document.querySelector("#text-editor-login-form");
const loginInput = document.querySelector("#text-editor-login");
const passwordInput = document.querySelector("#text-editor-password");
const loginMessage = document.querySelector("#text-editor-login-message");
const workspaceEl = document.querySelector("#text-editor-workspace");
const statusEl = document.querySelector("#text-editor-status");
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
    if (login === TEXT_EDITOR_LOGIN && passwordInput.value === TEXT_EDITOR_PASSWORD) {
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
}

async function unlockTextEditor() {
  loginPanel.classList.add("hidden");
  workspaceEl.classList.remove("hidden");
  statusEl.textContent = "Loading texts...";
  editorState.drafts = loadDrafts();
  await loadWorkspaceTexts();
  renderTextEditorList();
  renderCurrentFile();
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

function logoutTextEditor() {
  saveDraft({ quiet: true });
  sessionStorage.removeItem(TEXT_EDITOR_SESSION_KEY);
  workspaceEl.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  passwordInput.value = "";
  statusEl.textContent = "Logged out";
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
