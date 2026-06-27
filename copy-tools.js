(function () {
  const RESULT_CONTAINERS = [
    "#diagram-tool",
    "#pseudo-gallery",
    "#theme-comparison",
    "#trans-reader",
    "#concept-stage",
    "#seal-detail",
    "#annotation-list"
  ];

  const CARD_SELECTORS = [
    ".result-card",
    ".diagram-card",
    ".diagram-result-row",
    ".linear-occurrence-card",
    ".pseudo-card",
    ".theme-column",
    ".theme-hit",
    ".trans-card",
    ".concept-card",
    ".concept-info-card",
    ".seal-detail-card",
    ".annotation-card"
  ];

  const IGNORE_SELECTOR = ".copy-tools-bar, .copy-tool-button, script, style, nav, button, summary";

  document.addEventListener("DOMContentLoaded", initCopyTools);

  function initCopyTools() {
    enhanceAll();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(enhanceAll);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceAll() {
    RESULT_CONTAINERS
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .forEach(enhanceContainer);
  }

  function enhanceContainer(container) {
    if (!hasCopyableContent(container)) {
      return;
    }

    if (!container.querySelector(":scope > .copy-tools-bar")) {
      const bar = document.createElement("div");
      bar.className = "copy-tools-bar";
      bar.appendChild(createCopyButton("Copy visible results", () => getCleanText(container)));
      container.prepend(bar);
    }

    container.querySelectorAll(CARD_SELECTORS.join(",")).forEach((card) => {
      if (card.tagName === "BUTTON") {
        return;
      }

      if (hasNestedCard(card)) {
        return;
      }

      if (card.querySelector(":scope .copy-tools-card-button")) {
        return;
      }

      const button = createCopyButton(card.matches(".trans-card") ? "Copy" : "Copy card", () => getCleanText(card));
      button.classList.add("copy-tools-card-button");
      const actionTarget = card.matches(".trans-card") ? card.querySelector(":scope .trans-card-actions") : null;
      if (actionTarget) {
        actionTarget.append(button);
      } else {
        card.prepend(button);
      }
    });
  }

  function hasNestedCard(card) {
    return CARD_SELECTORS.some((selector) => card.querySelector(selector));
  }

  function createCopyButton(label, getText) {
    const button = document.createElement("button");
    button.className = "copy-tool-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const original = button.textContent;
      const text = getText().trim();
      if (!text) {
        return;
      }

      try {
        await writeClipboardText(text);
        button.textContent = "Copied";
      } catch (error) {
        console.error("Copy failed", error);
        button.textContent = "Copy failed";
      }

      window.setTimeout(() => {
        button.textContent = original;
      }, 1500);
    });
    return button;
  }

  function hasCopyableContent(element) {
    return getCleanText(element).length > 0;
  }

  function getCleanText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(IGNORE_SELECTOR).forEach((node) => node.remove());
    return clone.innerText
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
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
})();
