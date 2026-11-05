// Light/dark toggle. The initial theme is applied by an inline <head> script.
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const current = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

const sync = () => {
  const dark = current() === "dark";
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
};

toggle.addEventListener("click", () => {
  const next = current() === "dark" ? "light" : "dark";
  const apply = () => {
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    sync();
  };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
});

systemDark.addEventListener("change", sync);
sync();
