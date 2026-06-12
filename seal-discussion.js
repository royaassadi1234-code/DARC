const DATA_URL = "seal-discussion-data.json";

const imageEl = document.querySelector("#seal-image");
const hotspotsEl = document.querySelector("#seal-hotspots");
const regionListEl = document.querySelector("#seal-region-list");
const detailEl = document.querySelector("#seal-region-detail");
const statusEl = document.querySelector("#seal-status");

let regions = [];
let activeId = "";

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Could not load ${DATA_URL}`);
    }
    const data = await response.json();
    regions = data.regions || [];
    imageEl.src = data.image || "logos/druz-logo-fire-altar-resisting-smoke-seal.png";
    renderHotspots();
    renderRegionList();
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
    const button = event.target.closest("[data-region-id]");
    if (button) {
      selectRegion(button.dataset.regionId);
    }
  });
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
