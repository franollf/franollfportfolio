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

// ---------- the morph: card -> "F" square -> card ----------
const card = document.querySelector(".card");
const cover = card.querySelector(".card-cover");
const letter = card.querySelector(".card-letter");
let running = false;

const squareClip = () => {
  const { width, height } = card.getBoundingClientRect();
  const sq = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sq")) || 48;
  const y = (height - sq) / 2;
  const x = (width - sq) / 2;
  return `inset(${y}px ${x}px ${y}px ${x}px round 10px)`;
};
const fullClip = () => `inset(0px 0px 0px 0px round ${getComputedStyle(card).borderTopLeftRadius})`;
const play = (el, frames, opts) => el.animate(frames, { fill: "both", ...opts });
const settle = (anims) => Promise.all(anims.map((a) => a.finished));

// ~300ms: shrink into the square while a blank cover fades over the content.
const collapse = async () => {
  const anims = [
    play(card, [{ clipPath: fullClip() }, { clipPath: squareClip() }], { duration: 300, easing: "cubic-bezier(0.7, 0, 0.84, 0)" }),
    play(cover, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-in" }),
    play(letter, [{ opacity: 0 }, { opacity: 1 }], { duration: 110, delay: 220 }),
  ];
  await settle(anims);
  return anims;
};

// ~400ms: brief hold on the "F", then open back up onto the new panel.
const expand = async (held) => {
  const anims = [
    play(card, [{ clipPath: squareClip() }, { clipPath: fullClip() }], { duration: 340, delay: 60, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }),
    play(letter, [{ opacity: 1 }, { opacity: 0 }], { duration: 110, delay: 50 }),
    play(cover, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 190 }),
  ];
  held.forEach((a) => a.cancel()); // new animations already hold the same values
  await settle(anims);
  anims.forEach((a) => a.cancel());
};

const resetMorph = () => [card, cover, letter].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

// One morph at a time. Clicks during a morph only change `selected`;
// the swap reads it at the last moment, so rapid clicks land on the final tab.
const morphTo = async () => {
  if (running) return;
  running = true;
  try {
    while (shown !== selected) {
      if (reduceMotion.matches || !card.animate) {
        const key = selected;
        if (document.startViewTransition) {
          await document.startViewTransition(() => showPanel(key)).finished.catch(() => {});
        } else {
          showPanel(key);
        }
        continue;
      }
      const held = await collapse();
      showPanel(selected);
      await expand(held);
    }
  } catch {
    resetMorph();
    if (shown !== selected) showPanel(selected);
  } finally {
    running = false;
  }
};

const go = (key, { push = true } = {}) => {
  if (!byKey.has(key)) return;
  if (push && key !== selected) history.pushState({ tab: key }, "", byKey.get(key).getAttribute("href"));
  selectTab(key);
  morphTo();
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
