const networkState = {
  data: null,
  selectedThemeId: ""
};

const statusEl = document.querySelector("#network-status");
const themeSelectEl = document.querySelector("#network-theme");
const titleEl = document.querySelector("#network-title");
const workspaceEl = document.querySelector("#network-workspace");

initNetwork();

async function initNetwork() {
  bindNetworkEvents();

  try {
    const response = await fetch("network-template.json");
    if (!response.ok) {
      throw new Error("Could not load network-template.json");
    }

    networkState.data = await response.json();
    networkState.selectedThemeId = networkState.data.themes[0]?.id || "";
    populateThemeSelect();
    renderNetwork();
  } catch (error) {
    statusEl.textContent = "Network loading failed";
    workspaceEl.innerHTML = `<div class="empty-state">The thematic network data could not be loaded.</div>`;
    console.error(error);
  }
}

function bindNetworkEvents() {
  themeSelectEl.addEventListener("change", () => {
    networkState.selectedThemeId = themeSelectEl.value;
    renderNetwork();
  });
}

function populateThemeSelect() {
  themeSelectEl.innerHTML = networkState.data.themes
    .map((theme) => `<option value="${escapeHtml(theme.id)}">${escapeHtml(theme.label)}</option>`)
    .join("");
  themeSelectEl.value = networkState.selectedThemeId;
}

function renderNetwork() {
  const theme = getSelectedTheme();
  if (!theme) {
    statusEl.textContent = "No themes";
    workspaceEl.innerHTML = `<div class="empty-state">Add a theme to network-template.json to begin.</div>`;
    return;
  }

  const visibleTexts = getVisibleTexts(theme);
  const links = theme.links || [];
  const passages = theme.confirmedPassages || [];

  statusEl.textContent = `${visibleTexts.length} texts | ${passages.length} passages | ${links.length} links`;
  titleEl.innerHTML = `
    <div class="siglum">${escapeHtml(networkState.data.metadata.title)}</div>
    <strong>${escapeHtml(theme.label)}</strong>
    <span>${escapeHtml(theme.description || "")}</span>
  `;

  workspaceEl.innerHTML = `
    <section class="network-panel">
      ${renderGraph(theme, visibleTexts, links)}
      ${renderNetworkDetails(theme, visibleTexts, links, passages)}
    </section>
  `;
}

function renderGraph(theme, visibleTexts, links) {
  const textNodes = getTextNodePositions(visibleTexts);
  const themeNode = { x: 50, y: 50 };

  return `
    <article class="network-graph-card">
      <header>
        <div>
          <div class="siglum">Graph</div>
          <h2>${escapeHtml(theme.label)}</h2>
        </div>
        <span class="count-pill hit">${visibleTexts.length}</span>
      </header>
      <svg class="network-svg" viewBox="0 0 100 100" role="img" aria-label="Thematic network graph">
        ${textNodes.map((node) => `
          <line
            class="network-edge theme-edge"
            x1="${themeNode.x}"
            y1="${themeNode.y}"
            x2="${node.x}"
            y2="${node.y}"
          ></line>
        `).join("")}
        ${links.map((link) => {
          const source = textNodes.find((node) => node.id === link.sourceTextId);
          const target = textNodes.find((node) => node.id === link.targetTextId);
          if (!source || !target) {
            return "";
          }
          return `
            <line
              class="network-edge text-edge"
              x1="${source.x}"
              y1="${source.y}"
              x2="${target.x}"
              y2="${target.y}"
              stroke-width="${Math.max(1, Math.min(6, Number(link.strength) || 1))}"
            ></line>
          `;
        }).join("")}
        <g class="network-node theme-node" transform="translate(${themeNode.x} ${themeNode.y})">
          <circle r="11"></circle>
          <text y="1">${escapeSvgText(shortThemeLabel(theme.label))}</text>
        </g>
        ${textNodes.map((node) => `
          <g class="network-node text-node" transform="translate(${node.x} ${node.y})">
            <circle r="8"></circle>
            <text y="1">${escapeSvgText(node.label)}</text>
          </g>
        `).join("")}
      </svg>
    </article>
  `;
}

function renderNetworkDetails(theme, visibleTexts, links, passages) {
  return `
    <article class="network-detail-card">
      <header>
        <div>
          <div class="siglum">Evidence</div>
          <h2>${escapeHtml(networkState.data.metadata.title)}</h2>
        </div>
        <span class="count-pill ${theme.status === "confirmed" ? "hit" : ""}">${escapeHtml(theme.status || "draft")}</span>
      </header>

      <section class="network-section">
        <h3>Shown Texts</h3>
        <div class="tags">
          ${visibleTexts.map((text) => `<span>${escapeHtml(text.label)}: ${escapeHtml(text.title)}</span>`).join("")}
        </div>
      </section>

      <section class="network-section">
        <h3>Keywords</h3>
        <div class="tags">
          ${(theme.keywords || []).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}
        </div>
      </section>

      <section class="network-section">
        <h3>Confirmed Passages</h3>
        <div class="network-list">
          ${passages.map((passage) => `
            <div class="network-list-item">
              <strong>${escapeHtml(getTextLabel(passage.textId))} ${escapeHtml(passage.location)}</strong>
              <span>${escapeHtml(passage.passageLabel || "")}</span>
              <p>${escapeHtml(passage.note || "")}</p>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="network-section">
        <h3>Text Links</h3>
        <div class="network-list">
          ${links.map((link) => `
            <div class="network-list-item">
              <strong>${escapeHtml(getTextLabel(link.sourceTextId))} - ${escapeHtml(getTextLabel(link.targetTextId))}</strong>
              <span>Strength ${escapeHtml(link.strength || 1)} | ${link.confirmed ? "confirmed" : "draft"}</span>
              <p>${escapeHtml(link.basis || "")}</p>
              ${(link.passagePairs || []).map((pair) => `
                <p class="pair-line">${escapeHtml(pair.sourceLocation)} - ${escapeHtml(pair.targetLocation)}: ${escapeHtml(pair.note || "")}</p>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </section>
    </article>
  `;
}

function getVisibleTexts(theme) {
  const ids = theme.visibleTextIds?.length ? theme.visibleTextIds : networkState.data.texts.map((text) => text.id);
  return ids
    .map((id) => networkState.data.texts.find((text) => text.id === id))
    .filter(Boolean);
}

function getTextNodePositions(texts) {
  const positions = [
    { x: 20, y: 22 },
    { x: 80, y: 22 },
    { x: 20, y: 78 },
    { x: 80, y: 78 }
  ];

  return texts.map((text, index) => ({
    ...text,
    x: positions[index]?.x || 50,
    y: positions[index]?.y || 82
  }));
}

function getSelectedTheme() {
  return networkState.data?.themes.find((theme) => theme.id === networkState.selectedThemeId);
}

function getTextLabel(textId) {
  return networkState.data.texts.find((text) => text.id === textId)?.label || textId;
}

function shortThemeLabel(label) {
  const words = String(label).split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeSvgText(value) {
  return escapeHtml(value);
}
