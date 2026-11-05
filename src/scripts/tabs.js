// Tab router: one URL per tab, history push/pop, sliding pill, header word.
// Every page ships all three panels, so switching never fetches anything.
const tablist = document.querySelector('.tablist[role="tablist"]');
const tabs = [...tablist.querySelectorAll('[role="tab"]')];
const pill = tablist.querySelector(".tab-pill");
const crumb = document.querySelector(".crumb-section");
const scroller = document.querySelector(".card-scroll");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const byKey = new Map(tabs.map((t) => [t.dataset.tab, t]));
const panelOf = (key) => document.getElementById(`panel-${key}`);
const keyFromPath = (path) => {
  const clean = path.replace(/\.html$/, "").replace(/\/+$/, "");
  const tab = tabs.find((t) => t.getAttribute("href").replace(/\/+$/, "") === clean);
  return tab ? tab.dataset.tab : "about";
};

let shown = document.body.dataset.tab; // panel currently visible
let selected = shown; // tab the user asked for (may run ahead of `shown`)

// ---------- pill + header ----------
const placePill = (tab) => {
  pill.style.setProperty("--pill-x", `${tab.offsetLeft}px`);
  pill.style.setProperty("--pill-w", `${tab.offsetWidth}px`);
  pill.style.setProperty("--pill-o", "1");
};

const setHeader = (label, animate) => {
  const old = crumb.querySelector(".crumb-word:last-child");
  if (old.textContent === label) return;
  const word = document.createElement("span");
  word.className = "crumb-word";
  word.textContent = label;
  crumb.append(word);
  if (!animate || reduceMotion.matches) {
    old.remove();
    return;
  }
  const opts = { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
  old.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], opts).finished.then(() => old.remove(), () => old.remove());
  word.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], opts);
};

const selectTab = (key, animate = true) => {
  selected = key;
  tabs.forEach((t) => {
    const on = t.dataset.tab === key;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
  });
  const tab = byKey.get(key);
  placePill(tab);
  setHeader(tab.dataset.label, animate);
  document.title = tab.dataset.title;
};

// ---------- panel swap ----------
const showPanel = (key) => {
  tabs.forEach((t) => (panelOf(t.dataset.tab).hidden = t.dataset.tab !== key));
  document.body.dataset.tab = key;
  scroller.scrollTop = 0;
  shown = key;
  document.dispatchEvent(new CustomEvent("tab:shown", { detail: key }));
};

const go = (key, { push = true } = {}) => {
  if (!byKey.has(key)) return;
  if (push && key !== selected) history.pushState({ tab: key }, "", byKey.get(key).getAttribute("href"));
  selectTab(key);
  if (shown !== key) showPanel(key);
};

// ---------- wiring ----------
const isPlainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

document.addEventListener("click", (e) => {
  const link = e.target.closest('[role="tab"][data-tab], a[data-tab-link]');
  if (!link || !isPlainClick(e)) return;
  e.preventDefault();
  go(link.dataset.tab || link.dataset.tabLink);
});

tablist.addEventListener("keydown", (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  const next = {
    ArrowRight: tabs[(i + 1) % tabs.length],
    ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
    Home: tabs[0],
    End: tabs[tabs.length - 1],
  }[e.key];
  if (!next) return;
  e.preventDefault();
  next.focus();
  go(next.dataset.tab);
});

window.addEventListener("popstate", () => go(keyFromPath(location.pathname), { push: false }));

history.replaceState({ tab: shown }, "");
selectTab(shown, false);
requestAnimationFrame(() => pill.classList.add("is-ready"));
// Fonts change tab widths; re-measure once they're in, and on resize.
document.fonts?.ready.then(() => placePill(byKey.get(selected)));
window.addEventListener("resize", () => placePill(byKey.get(selected)));

export { go, showPanel };
