const DATA_URL = "seal-discussion-data.json";

const imageEl = document.querySelector("#seal-image");
const hotspotsEl = document.querySelector("#seal-hotspots");
const regionListEl = document.querySelector("#seal-region-list");
const detailEl = document.querySelector("#seal-region-detail");
const statusEl = document.querySelector("#seal-status");
const editToggleEl = document.querySelector("#seal-edit-toggle");
const copyJsonEl = document.querySelector("#seal-copy-json");
const downloadJsonEl = document.querySelector("#seal-download-json");

let mapData = null;
let regions = [];
let activeId = "";
let editMode = false;
let dragState = null;

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }
    mapData = await response.json();
    regions = mapData.regions || [];
    imageEl.src = mapData.image || "logos/druz-logo-fire-altar-resisting-smoke-seal.png";
    renderHotspots();
    renderRegionList();
    bindEditControls();
    selectRegion(regions[0]?.id || "");
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Seal map unavailable";
    detailEl.innerHTML = `<div class="empty-state">The discussion map data could not be loaded.</div>`;
  }
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
      >${index + 1}</button>
    `)
    .join("");

  hotspotsEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-dragging='true']")) {
      return;
    }
    const button = event.target.closest("[data-region-id]");
    if (button) {
      selectRegion(button.dataset.regionId);
    }
  });

  hotspotsEl.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
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

  regionListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-region-id]");
    if (button) {
      selectRegion(button.dataset.regionId);
    }
  });
}

function selectRegion(id) {
  const region = regions.find((item) => item.id === id);
  if (!region) {
    return;
  }
  activeId = id;
  statusEl.textContent = region.label;

  document.querySelectorAll("[data-region-id]").forEach((el) => {
    const active = el.dataset.regionId === activeId;
    el.classList.toggle("active", active);
    if (el.classList.contains("seal-hotspot")) {
      el.setAttribute("aria-pressed", String(active));
    }
  });

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

function bindEditControls() {
  copyJsonEl.disabled = false;
  downloadJsonEl.disabled = false;

  editToggleEl.addEventListener("click", () => {
    editMode = !editMode;
    editToggleEl.setAttribute("aria-pressed", String(editMode));
    editToggleEl.textContent = editMode ? "Done moving" : "Move regions";
    hotspotsEl.classList.toggle("moving", editMode);
    statusEl.textContent = editMode ? "Move regions" : (regions.find((region) => region.id === activeId)?.label || "Seal map");
  });

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

function startDrag(event) {
  if (!editMode) {
    return;
  }
  const button = event.target.closest("[data-region-id]");
  if (!button) {
    return;
  }
  event.preventDefault();
  selectRegion(button.dataset.regionId);
  button.setPointerCapture?.(event.pointerId);
  button.dataset.dragging = "false";
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
  const rect = hotspotsEl.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
  region.x = Number(x.toFixed(2));
  region.y = Number(y.toFixed(2));
  dragState.button.style.left = `${region.x}%`;
  dragState.button.style.top = `${region.y}%`;
  statusEl.textContent = `${region.label}: ${region.x}, ${region.y}`;
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
