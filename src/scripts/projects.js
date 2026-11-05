// Project filtering by tech tag (filter bar + hero stack chips).
const filterButtons = [...document.querySelectorAll(".filter[data-filter]")];
const cards = [...document.querySelectorAll(".project[data-project]")];
const groups = [...document.querySelectorAll("[data-group]")];
const status = document.querySelector(".filter-status");
const chips = [...document.querySelectorAll(".stack-chip[data-tech]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const applyFilter = (key, label) => {
  let shown = 0;
  cards.forEach((card) => {
    const match = key === "all" || card.dataset.tags.split(" ").includes(key);
    card.hidden = !match;
    if (match) {
      shown++;
      card.classList.add("show"); // never leave a filtered-in card mid-reveal
    }
  });
  groups.forEach((g) => {
    g.hidden = !g.querySelector(".project:not([hidden])");
  });
  filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
  chips.forEach((c) => c.setAttribute("aria-pressed", String(key !== "all" && slug(c.dataset.tech) === key)));
  if (status) {
    status.textContent =
      key === "all"
        ? ""
        : shown
          ? `Showing ${shown} project${shown === 1 ? "" : "s"} using ${label}.`
          : `No projects tagged ${label} yet.`;
  }
};

const setFilter = (key, label) => {
  if (document.startViewTransition && !reduceMotion.matches) {
    document.startViewTransition(() => applyFilter(key, label));
  } else {
    applyFilter(key, label);
  }
};

filterButtons.forEach((b) => {
  b.addEventListener("click", () => {
    const key = b.dataset.filter;
    const label = b.firstChild.textContent.trim();
    setFilter(b.getAttribute("aria-pressed") === "true" && key !== "all" ? "all" : key, label);
  });
});

// Hero chips: clicking filters projects to that tech and jumps there.
chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = slug(chip.dataset.tech);
    const active = chip.getAttribute("aria-pressed") === "true";
    setFilter(active ? "all" : key, chip.dataset.tech);
    if (!active) {
      document.getElementById("projects")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
  });
});
