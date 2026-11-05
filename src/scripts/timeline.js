// Commit-graph timeline: hover/focus/click/arrow keys select a role.
const tablist = document.querySelector('.tl-tabs[role="tablist"]');

if (tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const segs = new Map([...document.querySelectorAll(".tl-seg")].map((s) => [s.dataset.seg, s]));
  const panels = new Map([...document.querySelectorAll(".tl-panel")].map((p) => [p.id, p]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover) and (min-width: 769px)");

  const timeline = tablist.closest(".timeline");
  const filterBtns = [...timeline.querySelectorAll(".tl-filter-btn")];
  const shownTabs = () => tabs.filter((t) => !t.hidden);
  const activeTab = () => tabs.find((t) => t.getAttribute("aria-selected") === "true");
  // Default role for a view: the ongoing one, else the most recent (DOM order is oldest → newest per lane).
  const defaultFor = (list) => list.find((t) => t.dataset.default === "true") || list[list.length - 1];

  const apply = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      t.classList.toggle("is-active", on);
      segs.get(t.dataset.role)?.classList.toggle("is-active", on);
      panels.get(t.getAttribute("aria-controls"))?.classList.toggle("is-active", on);
    });
  };

  const select = (tab, { focus = false } = {}) => {
    if (!tab) return;
    if (focus) tab.focus();
    if (tab === activeTab()) return;
    if (document.startViewTransition && !reduceMotion.matches) {
      document.startViewTransition(() => apply(tab));
    } else {
      apply(tab);
    }
  };

  // Mark the server-rendered default as active on the graph too.
  apply(activeTab() || tabs[0]);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      select(tab);
      // On the vertical (mobile) layout the panel sits below the list.
      if (!canHover.matches) {
        const panel = panels.get(tab.getAttribute("aria-controls"));
        const rect = panel?.getBoundingClientRect();
        if (rect && rect.top > window.innerHeight * 0.7) {
          panel.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
        }
      }
    });
    tab.addEventListener("mouseenter", () => {
      segs.get(tab.dataset.role)?.classList.add("is-hover");
      if (canHover.matches) select(tab);
    });
    tab.addEventListener("mouseleave", () => segs.get(tab.dataset.role)?.classList.remove("is-hover"));
  });

  const applyFilter = (type) => {
    timeline.dataset.filter = type;
    filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === type)));
    tabs.forEach((t) => (t.hidden = type !== "all" && t.dataset.type !== type));
    if (activeTab()?.hidden) apply(defaultFor(shownTabs()));
  };

  filterBtns.forEach((b) =>
    b.addEventListener("click", () => {
      if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(() => applyFilter(b.dataset.type));
      else applyFilter(b.dataset.type);
    })
  );

  tablist.addEventListener("keydown", (event) => {
    const list = shownTabs();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    const next = {
      ArrowRight: list[(i + 1) % list.length],
      ArrowDown: list[(i + 1) % list.length],
      ArrowLeft: list[(i - 1 + list.length) % list.length],
      ArrowUp: list[(i - 1 + list.length) % list.length],
      Home: list[0],
      End: list[list.length - 1],
    }[event.key];
    if (next) {
      event.preventDefault();
      select(next, { focus: true });
    }
  });
}
