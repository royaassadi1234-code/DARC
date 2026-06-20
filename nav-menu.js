(function () {
  document.addEventListener("DOMContentLoaded", initCollapsibleMenus);

  function initCollapsibleMenus() {
    document.querySelectorAll(".site-nav").forEach((nav) => {
      nav.addEventListener("toggle", handleMenuToggle, true);
      nav.addEventListener("click", handleMenuClick);
    });
  }

  function handleMenuToggle(event) {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open) {
      return;
    }

    const selector = details.classList.contains("nav-menu")
      ? ":scope > .nav-menu"
      : ":scope > .pattern-submenu";
    const container = details.parentElement;
    if (!container) {
      return;
    }

    container.querySelectorAll(selector).forEach((item) => {
      if (item !== details) {
        item.removeAttribute("open");
      }
    });
  }

  function handleMenuClick(event) {
    const link = event.target.closest(".nav-menu-list a");
    if (link) {
      closeMenus(link.closest(".site-nav"));
      return;
    }

    const summary = event.target.closest("summary");
    if (!summary) {
      return;
    }

    const details = summary.parentElement;
    if (details instanceof HTMLDetailsElement && details.open) {
      window.requestAnimationFrame(() => {
        if (!details.open) {
          closeChildMenus(details);
        }
      });
    }
  }

  function closeMenus(nav) {
    nav?.querySelectorAll(".nav-menu, .pattern-submenu").forEach((details) => {
      details.removeAttribute("open");
    });
  }

  function closeChildMenus(details) {
    details.querySelectorAll(".pattern-submenu").forEach((child) => {
      child.removeAttribute("open");
    });
  }
})();
