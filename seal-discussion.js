const DATA_URL = "seal-discussion-data.json";

const imageEl = document.querySelector("#seal-image");
const hotspotsEl = document.querySelector("#seal-hotspots");
const popoverEl = document.querySelector("#seal-popover");
const regionListEl = document.querySelector("#seal-region-list");
const detailEl = document.querySelector("#seal-region-detail");
const statusEl = document.querySelector("#seal-status");
const toolbarEl = document.querySelector("#seal-toolbar");
const editToggleEl = document.querySelector("#seal-edit-toggle");
const addRegionEl = document.querySelector("#seal-add-region");
const deleteRegionEl = document.querySelector("#seal-delete-region");

const DRAFT_KEY = "druz-mazdyasnian-cosmology-draft";
const canEdit = isLocalEditorHost();
let mapData = null;
let regions = [];
let activeId = "";
let editMode = false;
let addMode = false;
let dragState = null;
let suppressNextClick = false;

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }
    mapData = await response.json();
    if (canEdit) {
      mapData = loadLocalDraft(mapData);
    }
    regions = normalizeRegions(mapData.regions || []);
    imageEl.src = mapData.image || "logos/druz-logo-fire-altar-resisting-smoke-seal.png";
    bindControls();
    renderHotspots();
    renderRegionList();
    updateToolbarState();
    selectRegion(regions[0]?.id || "");
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Mazdyasnian Cosmology unavailable";
    detailEl.hidden = false;
    detailEl.innerHTML = `<div class="empty-state">The discussion map data could not be loaded.</div>`;
  }
}

function bindControls() {
  hotspotsEl.addEventListener("click", handleCanvasClick);
  hotspotsEl.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRegionPopup();
    }
  });

  regionListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-region-id]");
    if (button) {
      closeRegionPopup();
      selectRegion(button.dataset.regionId);
    }
  });

  detailEl.addEventListener("input", handleEditorInput);
  detailEl.addEventListener("click", handleEditorClick);

  if (!canEdit) {
    return;
  }

  toolbarEl.hidden = false;

  editToggleEl.addEventListener("click", () => {
    setEditMode(!editMode);
  });

  addRegionEl.addEventListener("click", () => {
    setEditMode(true);
    addMode = !addMode;
    updateToolbarState();
    statusEl.textContent = addMode ? "Click the image to place a new number" : "Add number cancelled";
  });

  deleteRegionEl.addEventListener("click", deleteSelectedRegion);
}

function normalizeRegions(sourceRegions) {
  return sourceRegions.map((region) => ({
    ...region,
    x: Number(region.x) || 0,
    y: Number(region.y) || 0,
    notes: Array.isArray(region.notes) ? region.notes : []
  }));
}

function renderHotspots() {
  hotspotsEl.innerHTML = regions
    .map((region, index) => `
      <button
        class="seal-hotspot"
        type="button"
        style="left: ${Number(region.x)}%; top: ${Number(region.y)}%;"
        data-region-id="${escapeHtml(region.id)}"
        aria-label="${escapeHtml(region.label)}"
        aria-pressed="${region.id === activeId}"
      >${index + 1}</button>
    `)
    .join("");
}

function renderRegionList() {
  regionListEl.innerHTML = regions
    .map((region, index) => `
      <button class="seal-region-button" type="button" data-region-id="${escapeHtml(region.id)}">
        <span>${index + 1}</span>
        <strong>${escapeHtml(region.label)}</strong>
      </button>
    `)
    .join("");
  syncActiveState();
}

function handleCanvasClick(event) {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  const button = event.target.closest("[data-region-id]");
  if (button) {
    selectRegion(button.dataset.regionId);
    if (!editMode) {
      const region = getActiveRegion();
      if (region) {
        openRegionPopup(region);
      }
    }
    return;
  }

  if (canEdit && editMode && addMode) {
    const position = getCanvasPosition(event);
    addRegionAt(position.x, position.y);
    return;
  }

  closeRegionPopup();
}

function selectRegion(id) {
  const region = regions.find((item) => item.id === id);
  if (!region) {
    return;
  }
  activeId = id;
  statusEl.textContent = region.label;
  syncActiveState();
  renderDetail(region);
  updateToolbarState();
}

function syncActiveState() {
  document.querySelectorAll("[data-region-id]").forEach((el) => {
    const active = el.dataset.regionId === activeId;
    el.classList.toggle("active", active);
    if (el.classList.contains("seal-hotspot")) {
      el.setAttribute("aria-pressed", String(active));
    }
  });
}

function renderDetail(region = getActiveRegion()) {
  if (!region) {
    detailEl.hidden = true;
    detailEl.innerHTML = "";
    return;
  }

  if (canEdit && editMode) {
    detailEl.hidden = false;
    renderEditor(region);
    return;
  }

  detailEl.hidden = true;
  detailEl.innerHTML = "";
}

function renderEditor(region) {
  closeRegionPopup();
  detailEl.hidden = false;
  detailEl.innerHTML = `
    <form class="seal-editor-form" aria-label="Edit selected region">
      <label>
        <span>Title</span>
        <input type="text" value="${escapeHtml(region.label || "")}" data-region-field="label">
      </label>
      <label>
        <span>Category</span>
        <input type="text" value="${escapeHtml(region.theme || "")}" data-region-field="theme">
      </label>
      <label>
        <span>Description</span>
        <textarea rows="4" data-region-field="summary">${escapeHtml(region.summary || "")}</textarea>
      </label>
      <div class="seal-position-grid">
        <label>
          <span>X</span>
          <input type="number" min="0" max="100" step="0.1" value="${Number(region.x)}" data-region-field="x">
        </label>
        <label>
          <span>Y</span>
          <input type="number" min="0" max="100" step="0.1" value="${Number(region.y)}" data-region-field="y">
        </label>
      </div>
      <div class="seal-editor-header">
        <span>Texts</span>
        <button class="clear-button" type="button" data-add-note>Add text</button>
      </div>
      <div class="seal-note-editor-list">
        ${(region.notes || []).map((note, index) => `
          <section class="seal-note-editor">
            <label>
              <span>Text title</span>
              <input type="text" value="${escapeHtml(note.heading || "")}" data-note-index="${index}" data-note-field="heading">
            </label>
            <label>
              <span>Text body</span>
              <textarea rows="5" data-note-index="${index}" data-note-field="body">${escapeHtml(note.body || "")}</textarea>
            </label>
            <button class="clear-button danger" type="button" data-remove-note="${index}">Remove text</button>
          </section>
        `).join("")}
      </div>
    </form>
  `;
}

function handleEditorInput(event) {
  if (!canEdit || !editMode) {
    return;
  }

  const region = getActiveRegion();
  if (!region) {
    return;
  }

  const regionField = event.target.dataset.regionField;
  if (regionField) {
    updateRegionField(region, regionField, event.target.value, event.target);
    return;
  }

  const noteField = event.target.dataset.noteField;
  if (noteField) {
    const noteIndex = Number(event.target.dataset.noteIndex);
    if (region.notes[noteIndex]) {
      region.notes[noteIndex][noteField] = event.target.value;
      persistDraft();
    }
  }
}

function handleEditorClick(event) {
  if (!canEdit || !editMode) {
    return;
  }

  const region = getActiveRegion();
  if (!region) {
    return;
  }

  if (event.target.closest("[data-add-note]")) {
    region.notes.push({
      heading: `Text ${region.notes.length + 1}`,
      body: ""
    });
    persistDraft();
    renderEditor(region);
    return;
  }

  const removeButton = event.target.closest("[data-remove-note]");
  if (removeButton) {
    const noteIndex = Number(removeButton.dataset.removeNote);
    region.notes.splice(noteIndex, 1);
    persistDraft();
    renderEditor(region);
  }
}

function updateRegionField(region, field, rawValue, inputEl) {
  if (field === "x" || field === "y") {
    region[field] = Number(clamp(Number(rawValue) || 0, 0, 100).toFixed(2));
    inputEl.value = region[field];
    updateHotspotPosition(region);
    persistDraft();
    statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
    return;
  }

  region[field] = rawValue;
  persistDraft();
  if (field === "label") {
    statusEl.textContent = region.label || "Untitled region";
    updateRegionLabels(region);
  }
}

function setEditMode(value) {
  if (!canEdit) {
    return;
  }
  editMode = value;
  if (!editMode) {
    addMode = false;
  } else {
    closeRegionPopup();
  }
  updateToolbarState();
  renderDetail();
}

function updateToolbarState() {
  if (!canEdit) {
    editMode = false;
    addMode = false;
    toolbarEl.hidden = true;
    hotspotsEl.classList.remove("moving", "adding");
    return;
  }
  editToggleEl.setAttribute("aria-pressed", String(editMode));
  editToggleEl.textContent = editMode ? "Done editing" : "Move/Edit regions";
  addRegionEl.disabled = !mapData;
  addRegionEl.setAttribute("aria-pressed", String(addMode));
  deleteRegionEl.disabled = !editMode || !activeId || regions.length < 1;
  hotspotsEl.classList.toggle("moving", editMode);
  hotspotsEl.classList.toggle("adding", editMode && addMode);
}

function addRegionAt(x, y) {
  if (!canEdit) {
    return;
  }
  const number = regions.length + 1;
  const region = {
    id: createUniqueId(`new-region-${number}`),
    label: `New Region ${number}`,
    x,
    y,
    theme: "new region",
    summary: "Add description here.",
    notes: [
      {
        heading: "Text 1",
        body: ""
      }
    ]
  };
  regions.push(region);
  addMode = false;
  renderHotspots();
  renderRegionList();
  persistDraft();
  selectRegion(region.id);
  statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
}

function deleteSelectedRegion() {
  if (!canEdit || !editMode || !activeId) {
    return;
  }
  const activeIndex = regions.findIndex((region) => region.id === activeId);
  if (activeIndex === -1) {
    return;
  }
  regions.splice(activeIndex, 1);
  closeRegionPopup();
  activeId = regions[Math.max(0, activeIndex - 1)]?.id || regions[0]?.id || "";
  renderHotspots();
  renderRegionList();
  persistDraft();
  if (activeId) {
    selectRegion(activeId);
  } else {
    renderDetail();
    updateToolbarState();
  }
}

function startDrag(event) {
  if (!canEdit || !editMode || addMode) {
    return;
  }
  const button = event.target.closest("[data-region-id]");
  if (!button) {
    return;
  }
  event.preventDefault();
  selectRegion(button.dataset.regionId);
  button.setPointerCapture?.(event.pointerId);
  dragState = {
    button,
    id: button.dataset.regionId,
    pointerId: event.pointerId,
    moved: false
  };
}

function moveDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }
  event.preventDefault();
  dragState.moved = true;
  suppressNextClick = true;
  dragState.button.dataset.dragging = "true";
  updateRegionPosition(event);
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }
  const button = dragState.button;
  button.releasePointerCapture?.(event.pointerId);
  window.setTimeout(() => {
    delete button.dataset.dragging;
  }, 0);
  dragState = null;
}

function updateRegionPosition(event) {
  const region = regions.find((item) => item.id === dragState.id);
  if (!region) {
    return;
  }
  const position = getCanvasPosition(event);
  region.x = position.x;
  region.y = position.y;
  updateHotspotPosition(region);
  updateCoordinateInputs(region);
  closeRegionPopup();
  persistDraft();
  statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
}

function openRegionPopup(region) {
  const orientationClass = getPopupOrientationClass(region);
  popoverEl.className = `seal-popover ${orientationClass}`;
  popoverEl.style.left = `${region.x}%`;
  popoverEl.style.top = `${region.y}%`;
  popoverEl.innerHTML = `
    <button class="seal-popover-close" type="button" aria-label="Close popup">&times;</button>
    <div class="siglum">${escapeHtml(region.theme || "Region")}</div>
    <h2>${escapeHtml(region.label)}</h2>
    <p class="meta">${escapeHtml(region.summary || "")}</p>
    <div class="seal-note-list">
      ${(region.notes || []).map((note) => `
        <section class="seal-note">
          <h3>${escapeHtml(note.heading || "Note")}</h3>
          <p>${escapeHtml(note.body || "")}</p>
        </section>
      `).join("")}
    </div>
  `;
  popoverEl.hidden = false;
  popoverEl.querySelector(".seal-popover-close").addEventListener("click", closeRegionPopup);
}

function closeRegionPopup() {
  if (popoverEl.hidden) {
    return;
  }
  popoverEl.hidden = true;
  popoverEl.innerHTML = "";
}

function getPopupOrientationClass(region) {
  const horizontal = region.x > 62 ? "is-left" : region.x < 38 ? "is-right" : "is-centered";
  const vertical = region.y > 58 ? "is-above" : "is-below";
  return `${horizontal} ${vertical}`;
}

function updateHotspotPosition(region) {
  const button = findRegionElement(hotspotsEl, region.id);
  if (!button) {
    return;
  }
  button.style.left = `${region.x}%`;
  button.style.top = `${region.y}%`;
}

function updateCoordinateInputs(region) {
  if (!editMode || region.id !== activeId) {
    return;
  }
  const xInput = detailEl.querySelector('[data-region-field="x"]');
  const yInput = detailEl.querySelector('[data-region-field="y"]');
  if (xInput) {
    xInput.value = region.x;
  }
  if (yInput) {
    yInput.value = region.y;
  }
}

function updateRegionLabels(region) {
  const listButton = findRegionElement(regionListEl, region.id);
  const hotspot = findRegionElement(hotspotsEl, region.id);
  if (listButton) {
    const listLabel = listButton.querySelector("strong");
    if (listLabel) {
      listLabel.textContent = region.label || "Untitled region";
    }
  }
  if (hotspot) {
    hotspot.setAttribute("aria-label", region.label || "Untitled region");
  }
}

function getCanvasPosition(event) {
  const rect = hotspotsEl.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2))
  };
}

function getActiveRegion() {
  return regions.find((region) => region.id === activeId) || null;
}

function createUniqueId(baseId) {
  const slug = baseId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "region";
  let candidate = slug;
  let index = 2;
  while (regions.some((region) => region.id === candidate)) {
    candidate = `${slug}-${index}`;
    index += 1;
  }
  return candidate;
}

function findRegionElement(container, id) {
  return Array.from(container.querySelectorAll("[data-region-id]"))
    .find((element) => element.dataset.regionId === id);
}

function loadLocalDraft(fallbackData) {
  try {
    const draft = window.localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : fallbackData;
  } catch (error) {
    console.warn("Could not load local cosmology draft", error);
    return fallbackData;
  }
}

function persistDraft() {
  if (!canEdit) {
    return;
  }
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...mapData, regions }));
  } catch (error) {
    console.warn("Could not save local cosmology draft", error);
  }
}

function isLocalEditorHost() {
  const host = window.location.hostname;
  return window.location.protocol === "file:"
    || host === "localhost"
    || host === "127.0.0.1"
    || host === "::1"
    || host === "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
