const DATA_URL = "seal-discussion-data.json";

const imageEl = document.querySelector("#seal-image");
const hotspotsEl = document.querySelector("#seal-hotspots");
const regionListEl = document.querySelector("#seal-region-list");
const detailEl = document.querySelector("#seal-region-detail");
const statusEl = document.querySelector("#seal-status");
const editToggleEl = document.querySelector("#seal-edit-toggle");
const addRegionEl = document.querySelector("#seal-add-region");
const deleteRegionEl = document.querySelector("#seal-delete-region");
const copyJsonEl = document.querySelector("#seal-copy-json");
const downloadJsonEl = document.querySelector("#seal-download-json");

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
    detailEl.innerHTML = `<div class="empty-state">The discussion map data could not be loaded.</div>`;
  }
}

function bindControls() {
  hotspotsEl.addEventListener("click", handleCanvasClick);
  hotspotsEl.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  regionListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-region-id]");
    if (button) {
      selectRegion(button.dataset.regionId);
    }
  });

  detailEl.addEventListener("input", handleEditorInput);
  detailEl.addEventListener("click", handleEditorClick);

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

  copyJsonEl.addEventListener("click", async () => {
    const json = getUpdatedJson();
    try {
      await writeClipboardText(json);
      flashButton(copyJsonEl, "Copied");
    } catch (error) {
      console.error(error);
      flashButton(copyJsonEl, "Copy failed");
    }
  });

  downloadJsonEl.addEventListener("click", () => {
    const blob = new Blob([getUpdatedJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = DATA_URL;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
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
    return;
  }

  if (editMode && addMode) {
    const position = getCanvasPosition(event);
    addRegionAt(position.x, position.y);
  }
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
    detailEl.innerHTML = `<div class="empty-state">Select or add a numbered region.</div>`;
    return;
  }

  if (editMode) {
    renderEditor(region);
    return;
  }

  detailEl.innerHTML = `
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
}

function renderEditor(region) {
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
  if (!editMode) {
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
    }
  }
}

function handleEditorClick(event) {
  if (!editMode) {
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
    renderEditor(region);
    return;
  }

  const removeButton = event.target.closest("[data-remove-note]");
  if (removeButton) {
    const noteIndex = Number(removeButton.dataset.removeNote);
    region.notes.splice(noteIndex, 1);
    renderEditor(region);
  }
}

function updateRegionField(region, field, rawValue, inputEl) {
  if (field === "x" || field === "y") {
    region[field] = Number(clamp(Number(rawValue) || 0, 0, 100).toFixed(2));
    inputEl.value = region[field];
    updateHotspotPosition(region);
    statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
    return;
  }

  region[field] = rawValue;
  if (field === "label") {
    statusEl.textContent = region.label || "Untitled region";
    updateRegionLabels(region);
  }
}

function setEditMode(value) {
  editMode = value;
  if (!editMode) {
    addMode = false;
  }
  updateToolbarState();
  renderDetail();
}

function updateToolbarState() {
  editToggleEl.setAttribute("aria-pressed", String(editMode));
  editToggleEl.textContent = editMode ? "Done editing" : "Move/Edit regions";
  addRegionEl.disabled = !mapData;
  addRegionEl.setAttribute("aria-pressed", String(addMode));
  deleteRegionEl.disabled = !editMode || !activeId || regions.length < 1;
  copyJsonEl.disabled = !mapData;
  downloadJsonEl.disabled = !mapData;
  hotspotsEl.classList.toggle("moving", editMode);
  hotspotsEl.classList.toggle("adding", editMode && addMode);
}

function addRegionAt(x, y) {
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
  selectRegion(region.id);
  statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
}

function deleteSelectedRegion() {
  if (!editMode || !activeId) {
    return;
  }
  const activeIndex = regions.findIndex((region) => region.id === activeId);
  if (activeIndex === -1) {
    return;
  }
  regions.splice(activeIndex, 1);
  activeId = regions[Math.max(0, activeIndex - 1)]?.id || regions[0]?.id || "";
  renderHotspots();
  renderRegionList();
  if (activeId) {
    selectRegion(activeId);
  } else {
    renderDetail();
    updateToolbarState();
  }
}

function startDrag(event) {
  if (!editMode || addMode) {
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
  statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
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

function getUpdatedJson() {
  return JSON.stringify({ ...mapData, regions }, null, 2);
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

function flashButton(button, label) {
  const original = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1400);
}

function findRegionElement(container, id) {
  return Array.from(container.querySelectorAll("[data-region-id]"))
    .find((element) => element.dataset.regionId === id);
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
