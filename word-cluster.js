const WORD_CLUSTER_TEXTS = [
  { id: "dd", siglum: "DD", title: "Dādestān ī Dēnīg", file: "Dd.txt" },
  { id: "py", siglum: "PY", title: "Pahlavi Yasna", file: "PY-Pt4.txt" },
  { id: "wz", siglum: "WZ", title: "Wizīdagīhā ī Zādspram", file: "WZ.txt" }
];

const WORD_CLUSTER_DEBOUNCE_MS = 300;
const WORD_CLUSTER_PERSONAL_COMMON_STORAGE_KEY = "darcPersonalCommonWords";
const WORD_CLUSTER_PERSONAL_COMMON_BACKUP_STORAGE_KEY = "darcPersonalCommonWordsBackup";
const WORD_CLUSTER_DEFAULT_COMMON_WORDS_URL = "personal-common-words.json?v=20260620-excluded-common-words";

const WORD_CLUSTER_COMMON_WORDS = new Set([
  "a", "abar", "an", "andar", "az", "be", "bud", "ce", "ceg", "cegon", "ciyon",
  "dar", "ed", "eg", "est", "ham", "han", "hast", "i", "ka", "ke", "ku", "ne",
  "o", "pad", "pas", "ra", "s", "u", "ud", "abag", "bawad", "bawed", "hend",
  "hom", "is", "iz", "kard", "kerd", "kird", "oy", "ray", "ta"
]);

const WORD_CLUSTER_TRANSLITERATION_MAP = {
  "Ā": "A", "ā": "a", "Ē": "E", "ē": "e", "Ī": "I", "ī": "i",
  "Ō": "O", "ō": "o", "Ū": "U", "ū": "u", "Č": "C", "č": "c",
  "Š": "S", "š": "s", "ǰ": "j", "Ǧ": "G", "ǧ": "g"
};

const WORD_CLUSTER_COMPOUNDS = [
  {
    label: "gannag menog",
    variants: [
      ["gannag", "menog"],
      ["gannag", "menoy"],
      ["gannagmenog"],
      ["gannagmenoy"]
    ]
  },
  {
    label: "Ahura Mazda",
    variants: [["ahura", "mazda"]]
  },
  {
    label: "dadar i Ohrmazd",
    variants: [
      ["dadar", "i", "ohrmazd"],
      ["dadar", "ohrmazd"]
    ]
  }
].map((compound) => ({
  ...compound,
  key: normalizeClusterWord(compound.label)
}));

const WORD_CLUSTER_COMPOUND_VARIANTS = WORD_CLUSTER_COMPOUNDS
  .flatMap((compound) => compound.variants.map((tokens) => ({ ...compound, tokens })))
  .sort((a, b) => b.tokens.length - a.tokens.length);

const clusterState = {
  texts: [],
  filter: "",
  limit: 40,
  minTexts: 2,
  hideStopwords: true,
  selectedKey: "",
  personalCommonWords: loadClusterPersonalCommonWords()
};

let clusterRenderTimer = null;

const clusterStatusEl = document.querySelector("#word-cluster-status");
const clusterFilterEl = document.querySelector("#word-cluster-filter");
const clusterLimitEl = document.querySelector("#word-cluster-limit");
const clusterMinTextsEl = document.querySelector("#word-cluster-min-texts");
const clusterStopwordsEl = document.querySelector("#word-cluster-stopwords");
const clusterSummaryEl = document.querySelector("#word-cluster-summary");
const clusterMapEl = document.querySelector("#word-cluster-map");
const clusterDetailEl = document.querySelector("#word-cluster-detail");

initWordCluster();

async function initWordCluster() {
  bindWordClusterEvents();

  try {
    const [texts, defaultCommonWords] = await Promise.all([
      Promise.all(WORD_CLUSTER_TEXTS.map(loadClusterText)),
      loadDefaultClusterCommonWords()
    ]);
    mergeClusterPersonalCommonWords(defaultCommonWords);
    clusterState.texts = texts;
    clusterStatusEl.textContent = "Word cluster ready";
    renderWordCluster();
  } catch (error) {
    clusterStatusEl.textContent = "Text loading failed";
    clusterMapEl.innerHTML = `<div class="empty-state">DD, PY, and WZ could not be loaded.</div>`;
    console.error(error);
  }
}

function bindWordClusterEvents() {
  clusterFilterEl.addEventListener("input", () => {
    clusterState.filter = clusterFilterEl.value.trim();
    scheduleWordClusterRender();
  });

  clusterLimitEl.addEventListener("change", () => {
    clusterState.limit = Number(clusterLimitEl.value);
    clusterState.selectedKey = "";
    renderWordClusterImmediately();
  });

  clusterMinTextsEl.addEventListener("change", () => {
    clusterState.minTexts = Number(clusterMinTextsEl.value);
    clusterState.selectedKey = "";
    renderWordClusterImmediately();
  });

  clusterStopwordsEl.addEventListener("change", () => {
    clusterState.hideStopwords = clusterStopwordsEl.checked;
    clusterState.selectedKey = "";
    renderWordClusterImmediately();
  });

  clusterMapEl.addEventListener("click", (event) => {
    const node = event.target.closest("[data-cluster-key]");
    if (!node) {
      return;
    }
    clusterState.selectedKey = node.dataset.clusterKey === clusterState.selectedKey ? "" : node.dataset.clusterKey;
    renderWordClusterImmediately();
  });
}

function scheduleWordClusterRender() {
  window.clearTimeout(clusterRenderTimer);
  clusterRenderTimer = window.setTimeout(() => {
    clusterRenderTimer = null;
    clusterState.selectedKey = "";
    renderWordCluster();
  }, WORD_CLUSTER_DEBOUNCE_MS);
}

function renderWordClusterImmediately() {
  window.clearTimeout(clusterRenderTimer);
  clusterRenderTimer = null;
  renderWordCluster();
}

async function loadClusterText(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Could not load ${config.file}`);
  }

  const raw = await response.text();
  const wordStats = buildClusterWordStats(raw);
  const ranked = rankClusterWords(wordStats);

  return {
    ...config,
    raw,
    wordStats,
    ranked,
    tokenCount: [...wordStats.values()].reduce((sum, item) => sum + item.total, 0)
  };
}

function buildClusterWordStats(raw) {
  const stats = new Map();
  const tokens = getClusterTokenMatches(raw);

  for (let index = 0; index < tokens.length; index += 1) {
    const compound = getClusterCompoundAt(tokens, index);
    if (compound) {
      addClusterWordStat(stats, compound.key, compound.label);
      index += compound.tokens.length - 1;
      continue;
    }

    const token = tokens[index];
    if (!isClusterCountableWord(token.key)) {
      continue;
    }
    addClusterWordStat(stats, token.key, token.label);
  }

  return stats;
}

function getClusterTokens(text) {
  return String(text).match(/[\p{L}\p{M}\p{N}=_.:-]+/gu) || [];
}

function getClusterTokenMatches(text) {
  return getClusterTokens(text).map((token) => ({
    label: token,
    key: normalizeClusterWord(token)
  }));
}

function getClusterCompoundAt(tokens, index) {
  return WORD_CLUSTER_COMPOUND_VARIANTS.find((compound) =>
    compound.tokens.every((token, offset) => tokens[index + offset]?.key === token)
  ) || null;
}

function addClusterWordStat(stats, key, label) {
  if (!stats.has(key)) {
    stats.set(key, { key, label, total: 0 });
  }
  stats.get(key).total += 1;
}

function rankClusterWords(wordStats) {
  return [...wordStats.values()]
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function renderWordCluster() {
  const clusterData = getClusterData();
  renderClusterSummary(clusterData);
  renderClusterMap(clusterData);
  renderClusterDetail(clusterData);
}

function getClusterData() {
  const searchTerms = getClusterSearchTerms(clusterState.filter);
  const topByText = clusterState.texts.map((text) => ({
    text,
    words: text.ranked
      .filter((item) => !clusterState.hideStopwords || !isClusterCommonWord(item.key))
      .filter((item) => itemMatchesClusterSearch(item, searchTerms))
      .slice(0, clusterState.limit)
  }));

  const byKey = new Map();
  topByText.forEach(({ text, words }) => {
    words.forEach((word) => {
      if (!byKey.has(word.key)) {
        byKey.set(word.key, {
          key: word.key,
          label: word.label,
          texts: new Map(),
          total: 0
        });
      }
      const cluster = byKey.get(word.key);
      cluster.texts.set(text.id, { text, word });
      cluster.total += word.total;
    });
  });

  const clusters = [...byKey.values()]
    .filter((cluster) => cluster.texts.size >= clusterState.minTexts)
    .sort((a, b) => b.texts.size - a.texts.size || b.total - a.total || a.label.localeCompare(b.label));

  return { topByText, clusters };
}

function renderClusterSummary({ topByText, clusters }) {
  clusterSummaryEl.innerHTML = `
    <article class="text-card word-cluster-stat-card">
      <div class="siglum">Texts</div>
      <h2>${clusterState.texts.length}</h2>
      <p class="meta">DD, PY, and WZ loaded from the word-frequency corpus.</p>
    </article>
    <article class="text-card word-cluster-stat-card">
      <div class="siglum">Visible words</div>
      <h2>${topByText.reduce((sum, entry) => sum + entry.words.length, 0).toLocaleString()}</h2>
      <p class="meta">Top ${clusterState.limit} ranked words per text after filters.</p>
    </article>
    <article class="text-card word-cluster-stat-card">
      <div class="siglum">Clusters</div>
      <h2>${clusters.length.toLocaleString()}</h2>
      <p class="meta">Word nodes appearing in at least ${clusterState.minTexts} text${clusterState.minTexts === 1 ? "" : "s"}.</p>
    </article>
  `;
}

function renderClusterMap(clusterData) {
  if (!clusterData.clusters.length) {
    clusterMapEl.innerHTML = `<div class="empty-state">No clusters match the current filter and minimum-text setting.</div>`;
    return;
  }

  const width = 1040;
  const height = Math.max(520, clusterData.clusters.length * 34 + 120);
  const columns = new Map([
    ["dd", { x: 170, color: "#7fa6c0" }],
    ["py", { x: 520, color: "#9fc8aa" }],
    ["wz", { x: 870, color: "#d2b879" }]
  ]);
  const nodePositions = [];
  const visibleClusters = clusterData.clusters.slice(0, 80);
  const maxCount = Math.max(1, ...visibleClusters.flatMap((cluster) =>
    [...cluster.texts.values()].map((entry) => entry.word.total)
  ));

  visibleClusters.forEach((cluster, clusterIndex) => {
    const y = 72 + clusterIndex * 34;
    cluster.texts.forEach((entry, textId) => {
      const column = columns.get(textId);
      if (!column) {
        return;
      }
      nodePositions.push({
        cluster,
        text: entry.text,
        word: entry.word,
        x: column.x,
        y,
        color: column.color,
        radius: 7 + Math.sqrt(entry.word.total / maxCount) * 15
      });
    });
  });

  const edges = visibleClusters.flatMap((cluster) => {
    const nodes = nodePositions.filter((node) => node.cluster.key === cluster.key);
    return nodes.slice(1).map((node) => ({ from: nodes[0], to: node, key: cluster.key }));
  });

  clusterMapEl.innerHTML = `
    <svg class="word-cluster-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Word cluster map for DD, PY, and WZ">
      <defs>
        <filter id="wordClusterGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"></feGaussianBlur>
          <feMerge>
            <feMergeNode in="blur"></feMergeNode>
            <feMergeNode in="SourceGraphic"></feMergeNode>
          </feMerge>
        </filter>
      </defs>
      ${[...columns.entries()].map(([id, column]) => renderClusterColumnLabel(id, column)).join("")}
      ${edges.map(renderClusterEdge).join("")}
      ${nodePositions.map((node) => renderClusterNode(node)).join("")}
    </svg>
    <p class="word-cluster-caption">
      Circle size follows frequency inside each text; horizontal links mark the same normalized word appearing across texts.
      Click a node to focus the reading table.
    </p>
  `;
}

function renderClusterColumnLabel(textId, column) {
  const text = clusterState.texts.find((item) => item.id === textId);
  return `
    <g class="word-cluster-column-label">
      <line x1="${column.x}" y1="42" x2="${column.x}" y2="100%" stroke="${column.color}" stroke-opacity="0.18"></line>
      <text x="${column.x}" y="30" text-anchor="middle">${escapeClusterHtml(text?.siglum || textId.toUpperCase())}</text>
    </g>
  `;
}

function renderClusterEdge(edge) {
  const selected = clusterState.selectedKey && edge.key === clusterState.selectedKey;
  return `
    <path
      class="word-cluster-edge ${selected ? "active" : ""}"
      d="M ${edge.from.x} ${edge.from.y} C ${(edge.from.x + edge.to.x) / 2} ${edge.from.y - 18}, ${(edge.from.x + edge.to.x) / 2} ${edge.to.y + 18}, ${edge.to.x} ${edge.to.y}"
    ></path>
  `;
}

function renderClusterNode(node) {
  const selected = clusterState.selectedKey === node.cluster.key;
  const dimmed = clusterState.selectedKey && !selected;
  const labelAnchor = node.text.id === "wz" ? "end" : node.text.id === "py" ? "middle" : "start";
  const labelX = node.text.id === "wz" ? node.x - node.radius - 8 : node.text.id === "py" ? node.x : node.x + node.radius + 8;
  const labelY = node.y + (node.text.id === "py" ? -node.radius - 6 : 4);

  return `
    <g class="word-cluster-node ${selected ? "active" : ""} ${dimmed ? "dimmed" : ""}" data-cluster-key="${escapeClusterHtml(node.cluster.key)}" tabindex="0">
      <circle cx="${node.x}" cy="${node.y}" r="${node.radius.toFixed(2)}" fill="${node.color}"></circle>
      <text x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="${labelAnchor}">
        ${escapeClusterHtml(node.word.label)} #${node.word.rank}
      </text>
      <title>${escapeClusterHtml(node.text.siglum)} · ${escapeClusterHtml(node.word.label)} · rank #${node.word.rank} · ${node.word.total} occurrence${node.word.total === 1 ? "" : "s"}</title>
    </g>
  `;
}

function renderClusterDetail({ clusters }) {
  const selected = clusterState.selectedKey
    ? clusters.filter((cluster) => cluster.key === clusterState.selectedKey)
    : clusters.slice(0, 24);
  const heading = clusterState.selectedKey ? "Selected cluster" : "Top cluster relations";

  clusterDetailEl.innerHTML = `
    <p class="meta word-cluster-note">
      ${heading}. Ranks are calculated within each complete text before the top-word filter is applied.
    </p>
    <div class="word-cluster-table-wrap">
      <table class="word-cluster-table">
        <thead>
          <tr>
            <th scope="col">Word</th>
            ${clusterState.texts.map((text) => `<th scope="col">${escapeClusterHtml(text.siglum)}</th>`).join("")}
            <th scope="col">Relation</th>
          </tr>
        </thead>
        <tbody>
          ${selected.map(renderClusterDetailRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderClusterDetailRow(cluster) {
  return `
    <tr>
      <th scope="row">${escapeClusterHtml(cluster.label)}</th>
      ${clusterState.texts.map((text) => renderClusterDetailCell(cluster, text)).join("")}
      <td>${cluster.texts.size}/3 texts · grouped total ${cluster.total.toLocaleString()}</td>
    </tr>
  `;
}

function renderClusterDetailCell(cluster, text) {
  const entry = cluster.texts.get(text.id);
  if (!entry) {
    return `<td class="missing">—</td>`;
  }
  return `
    <td>
      <strong>#${entry.word.rank.toLocaleString()}</strong>
      <span>${entry.word.total.toLocaleString()} · ${escapeClusterHtml(entry.word.label)}</span>
    </td>
  `;
}

function getClusterSearchTerms(query) {
  return [...new Set(
    String(query || "")
      .split(/[,;\s]+/)
      .map(normalizeClusterWord)
      .filter(Boolean)
  )];
}

function itemMatchesClusterSearch(item, searchTerms) {
  if (!searchTerms.length) {
    return true;
  }
  const label = foldClusterText(item.label).toLowerCase();
  return searchTerms.some((term) => item.key.includes(term) || label.includes(term));
}

function normalizeClusterWord(word) {
  const folded = foldClusterText(word).toLowerCase();
  return folded.replace(/^[=_.:-]+|[=_.:-]+$/g, "");
}

function foldClusterText(value) {
  return String(value)
    .replace(/[\u0100-\u01FF]/g, (char) => WORD_CLUSTER_TRANSLITERATION_MAP[char] || char.normalize("NFD").replace(/\p{M}/gu, ""))
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isClusterCountableWord(key) {
  return key.length > 0 && /[\p{L}\p{M}]/u.test(key);
}

function isClusterCommonWord(key) {
  return WORD_CLUSTER_COMMON_WORDS.has(key) || clusterState.personalCommonWords.has(key);
}

function loadClusterPersonalCommonWords() {
  try {
    return new Set([
      ...readStoredClusterCommonWords(WORD_CLUSTER_PERSONAL_COMMON_STORAGE_KEY),
      ...readStoredClusterCommonWords(WORD_CLUSTER_PERSONAL_COMMON_BACKUP_STORAGE_KEY)
    ]);
  } catch {
    return new Set();
  }
}

function readStoredClusterCommonWords(key) {
  const value = window.localStorage?.getItem(key);
  if (!value) {
    return [];
  }

  try {
    const words = JSON.parse(value);
    return Array.isArray(words) ? words.map(normalizeClusterWord).filter(Boolean) : [];
  } catch {
    return parseClusterCommonWords(value);
  }
}

function parseClusterCommonWords(value) {
  return [...new Set(
    String(value || "")
      .split(/[,;\n]+/)
      .map((word) => normalizeClusterWord(word.trim()))
      .filter(Boolean)
  )];
}

async function loadDefaultClusterCommonWords() {
  try {
    const response = await fetch(WORD_CLUSTER_DEFAULT_COMMON_WORDS_URL);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const words = Array.isArray(data) ? data : data.words;
    return Array.isArray(words) ? words.map(normalizeClusterWord).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mergeClusterPersonalCommonWords(words) {
  words.forEach((word) => {
    const key = normalizeClusterWord(word);
    if (key) {
      clusterState.personalCommonWords.add(key);
    }
  });
}

function escapeClusterHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
