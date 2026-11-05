// Stacked project browser: one gesture (wheel, swipe, arrow key) = one card.
const root = document.querySelector(".pj");

if (root) {
  const panel = root.closest('[role="tabpanel"]');
  const stage = root.querySelector(".pj-stage");
  const cards = [...root.querySelectorAll(".pj-card")];
  const dots = [...root.querySelectorAll(".pj-dot")];
  const filterBtns = [...root.querySelectorAll(".pj-filter")];
  const numWrap = root.querySelector(".pj-num-wrap");
  const total = root.querySelector(".pj-total");
  const dialog = root.querySelector(".pj-lightbox");
  const frame = dialog.querySelector(".pj-frame");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let order = cards.map((_, i) => i); // visible cards, in stack order
  let k = 0; // index into `order` of the front card

  const isProjectsTab = () => document.body.dataset.tab === "projects";

  // ---------- render ----------
  const setNumber = (n, dir) => {
    const old = numWrap.querySelector(".pj-num:last-child");
    if (old.textContent === String(n)) return;
    const next = document.createElement("span");
    next.className = "pj-num";
    next.style.gridArea = "1 / 1";
    old.style.gridArea = "1 / 1";
    next.textContent = n;
    numWrap.append(next);
    if (reduceMotion.matches || !dir) return old.remove();
    const out = dir > 0 ? "-100%" : "100%";
    const inn = dir > 0 ? "100%" : "-100%";
    const opts = { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
    old.animate([{ transform: "none", opacity: 1 }, { transform: `translateY(${out})`, opacity: 0 }], opts).finished.then(() => old.remove(), () => old.remove());
    next.animate([{ transform: `translateY(${inn})`, opacity: 0 }, { transform: "none", opacity: 1 }], opts);
  };

  const syncVideos = () => {
    cards.forEach((c) => {
      const v = c.querySelector("video");
      if (!v) return;
      if (c.dataset.pos === "0" && isProjectsTab() && !reduceMotion.matches) {
        if (!v.getAttribute("src")) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  };

  const render = (dir = 0) => {
    cards.forEach((c, i) => {
      const at = order.indexOf(i);
      const d = at - k;
      const pos = at < 0 ? "out" : d < 0 ? "gone" : d > 2 ? "far" : String(d);
      c.dataset.pos = pos;
      const front = pos === "0";
      // Not `inert`: an inert card left under a still cursor swallows the next wheel gesture.
      if (front) c.removeAttribute("aria-hidden");
      else c.setAttribute("aria-hidden", "true");
      c.querySelectorAll("a, button, video").forEach((el) => (front ? el.removeAttribute("tabindex") : (el.tabIndex = -1)));
      if (at >= 0) c.setAttribute("aria-label", `${c.querySelector(".pj-title").textContent}, ${at + 1} of ${order.length}`);
    });
    dots.forEach((dot, i) => {
      const at = order.indexOf(i);
      dot.hidden = at < 0;
      dot.setAttribute("aria-current", String(at === k));
    });
    total.textContent = order.length;
    setNumber(k + 1, dir);
    syncVideos();
  };

  // Nudge the front card when there's nothing further that way.
  const bump = (dir) => {
    const front = cards[order[k]];
    if (!front || reduceMotion.matches) return;
    front.animate([{ translate: "0 0" }, { translate: `0 ${dir > 0 ? -10 : 10}px` }, { translate: "0 0" }], { duration: 260, easing: "ease-out" });
  };

  const step = (dir) => {
    const next = Math.min(order.length - 1, Math.max(0, k + dir));
    if (next === k) return bump(dir);
    k = next;
    render(dir);
  };

  const jumpTo = (cardIndex) => {
    const at = order.indexOf(cardIndex);
    if (at < 0 || at === k) return;
    const dir = Math.sign(at - k);
    k = at;
    render(dir);
  };

  // ---------- wheel: lock after one card until the gesture goes quiet ----------
  const canScroll = (el, dy) => el && el.scrollHeight > el.clientHeight + 2 && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0);
  let locked = false;
  let lockedAt = 0;
  let acc = 0;
  let lastWheel = 0;
  let quiet;
  const releaseWhenQuiet = () => {
    clearTimeout(quiet);
    quiet = setTimeout(() => {
      const wait = 550 - (performance.now() - lockedAt);
      quiet = setTimeout(() => {
        locked = false;
        acc = 0;
      }, Math.max(0, wait));
    }, 180);
  };

  window.addEventListener(
    "wheel",
    (e) => {
      if (!isProjectsTab() || dialog.open || !(e.target instanceof Node) || !panel.contains(e.target)) return;
      const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (canScroll(e.target.closest(".pj-body"), dy) || e.target.closest(".pj-filters")) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 200) acc = 0;
      lastWheel = now;
      if (locked) return releaseWhenQuiet();
      acc += dy * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(acc) < 24) return;
      step(Math.sign(acc));
      locked = true;
      lockedAt = now;
      acc = 0;
      releaseWhenQuiet();
    },
    { passive: false }
  );

  // ---------- touch swipe ----------
  let touch = null;
  stage.addEventListener(
    "touchstart",
    (e) => {
      touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, body: e.target.closest(".pj-body") } : null;
    },
    { passive: true }
  );
  stage.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    const vertical = Math.abs(dy) > Math.abs(dx);
    const scrollableBody = touch.body && touch.body.scrollHeight > touch.body.clientHeight + 2;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    if (vertical && scrollableBody) return; // that swipe scrolled the description
    step((vertical ? -dy : -dx) > 0 ? 1 : -1);
  });

  // ---------- keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (!isProjectsTab() || dialog.open || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest('[role="tablist"], input, textarea, select')) return;
    const dir = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const target = e.key === "Home" ? 0 : order.length - 1;
      if (target !== k) {
        const d = Math.sign(target - k);
        k = target;
        render(d);
      }
      return;
    }
    if (!dir) return;
    e.preventDefault();
    step(dir);
  });

  // ---------- pill icons + filters ----------
  dots.forEach((dot) => dot.addEventListener("click", () => jumpTo(Number(dot.dataset.index))));

  filterBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("aria-pressed") === "true" && btn.dataset.filter !== "all" ? "all" : btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
      order = cards.map((c, i) => [c, i]).filter(([c]) => key === "all" || c.dataset.tags.split(" ").includes(key)).map(([, i]) => i);
      k = 0;
      render(0);
    })
  );

  // ---------- demo lightbox ----------
  const openDemo = (node, label) => {
    frame.replaceChildren(node);
    dialog.setAttribute("aria-label", label);
    cards.forEach((c) => c.querySelector("video")?.pause());
    dialog.showModal();
  };
  dialog.addEventListener("close", () => {
    frame.replaceChildren();
    syncVideos();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelector(".pj-close").addEventListener("click", () => dialog.close());

  root.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-demo]");
    if (link && link.dataset.demo && e.button === 0 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${link.dataset.demo}?autoplay=1&rel=0`;
      iframe.title = `${link.dataset.title} demo video`;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      openDemo(iframe, `${link.dataset.title} demo`);
      return;
    }
    const video = e.target.closest("video.pj-video");
    if (video) {
      const full = document.createElement("video");
      full.src = video.dataset.src;
      full.controls = true;
      full.autoplay = true;
      full.playsInline = true;
      full.setAttribute("aria-label", `${video.dataset.title} demo video`);
      openDemo(full, `${video.dataset.title} demo`);
    }
  });

  document.addEventListener("tab:shown", syncVideos);
  render(0);
}
