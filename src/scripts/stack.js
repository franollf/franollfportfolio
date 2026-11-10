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
  let peak = 0;
  let trough = 0;
  let lockedDir = 0;
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
      // Trackpad momentum ramps up, peaks, then only decays. If the delta climbs well above
      // the low point after it has clearly faded (or flips direction), that's a fresh flick
      // riding the old tail: unlock for it instead of swallowing it.
      const mag = Math.abs(dy);
      const faded = trough < peak * 0.6;
      const fresh = locked && mag >= 8 && ((faded && mag > trough * 1.5 + 6) || (Math.sign(dy) !== lockedDir && now - lockedAt > 150));
      if (locked && !fresh) {
        if (mag > peak) peak = trough = mag;
        else trough = Math.min(trough, mag);
      }
      if (fresh) {
        locked = false;
        acc = 0;
        clearTimeout(quiet);
      }
      if (locked) return releaseWhenQuiet();
      acc += dy * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(acc) < 24) return;
      step(Math.sign(acc));
      locked = true;
      lockedAt = now;
      lockedDir = Math.sign(acc);
      peak = trough = Math.abs(dy);
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
      dialog.style.removeProperty("--lb-ratio");
      dialog.style.removeProperty("--lb-bg");
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
      const w = Number(video.getAttribute("width"));
      const h = Number(video.getAttribute("height"));
      if (w && h) dialog.style.setProperty("--lb-ratio", String(w / h));
      else dialog.style.removeProperty("--lb-ratio");
      dialog.style.setProperty("--lb-bg", getComputedStyle(video.closest(".pj-media")).getPropertyValue("--demo-bg") || "#000");
      openDemo(full, `${video.dataset.title} demo`);
    }
  });

  // ---------- ambient panel colour behind each demo video ----------
  // Each frame is shrunk to a tiny canvas and the colours along its outer edge are
  // averaged in a few segments per side. Those averages become a 5x5 colour field that
  // CSS scales up and blurs behind the video, so the panel always matches the video's
  // edges, and small objects touching an edge get averaged away instead of smeared.
  const SEG = 3; // segments per side
  const work = document.createElement("canvas");
  work.width = 24;
  work.height = 18;
  const wctx = work.getContext("2d", { willReadFrequently: true });

  const edgeField = (src) => {
    const sw = src.videoWidth || src.naturalWidth;
    const sh = src.videoHeight || src.naturalHeight;
    if (!sw || !sh || !wctx) return null;
    wctx.imageSmoothingQuality = "high";
    wctx.drawImage(src, 0, 0, work.width, work.height);
    const { data } = wctx.getImageData(0, 0, work.width, work.height);
    const W = work.width;
    const H = work.height;
    const avg = (x0, y0, x1, y1) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
      return [r / n, g / n, b / n];
    };
    const d = 2; // edge strip depth in work pixels
    const seg = (len, k) => [Math.round((len * k) / SEG), Math.round((len * (k + 1)) / SEG)];
    const top = [], bottom = [], left = [], right = [];
    for (let k = 0; k < SEG; k++) {
      const [x0, x1] = seg(W, k);
      const [y0, y1] = seg(H, k);
      top.push(avg(x0, 0, x1, d));
      bottom.push(avg(x0, H - d, x1, H));
      left.push(avg(0, y0, d, y1));
      right.push(avg(W - d, y0, W, y1));
    }
    const mix = (...cs) => cs.reduce((a, c) => a.map((v, i) => v + c[i] / cs.length), [0, 0, 0]);
    const N = SEG + 2;
    const field = new ImageData(N, N);
    const put = (x, y, c) => {
      const i = (y * N + x) * 4;
      field.data.set([c[0], c[1], c[2], 255], i);
    };
    const all = mix(...top, ...bottom, ...left, ...right);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, all);
    for (let k = 0; k < SEG; k++) {
      put(k + 1, 0, top[k]);
      put(k + 1, N - 1, bottom[k]);
      put(0, k + 1, left[k]);
      put(N - 1, k + 1, right[k]);
    }
    put(0, 0, mix(top[0], left[0]));
    put(N - 1, 0, mix(top[SEG - 1], right[0]));
    put(0, N - 1, mix(bottom[0], left[SEG - 1]));
    put(N - 1, N - 1, mix(bottom[SEG - 1], right[SEG - 1]));
    return field;
  };

  cards.forEach((c) => {
    const v = c.querySelector("video.pj-video");
    const cv = c.querySelector(".pj-ambient");
    if (!v || !cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    cv.width = cv.height = SEG + 2;
    const paint = (src) => {
      try {
        const field = edgeField(src);
        if (!field) return;
        ctx.putImageData(field, 0, 0);
        cv.classList.add("is-ready");
      } catch {}
    };
    let raf = 0;
    let last = 0;
    const loop = (t) => {
      if (v.readyState >= 2 && t - last > 66) {
        paint(v);
        last = t;
      }
      raf = v.paused ? 0 : requestAnimationFrame(loop);
    };
    v.addEventListener("play", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    });
    v.addEventListener("loadeddata", () => paint(v));
    if (v.poster) {
      const img = new Image();
      img.onload = () => v.readyState < 2 && paint(img);
      img.src = v.poster;
    }
  });

  document.addEventListener("tab:shown", syncVideos);
  render(0);
}
