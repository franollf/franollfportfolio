const TOTAL_KM = 42.2;
const SPRITE_SCALE = 4;
const KM_MARKS = [5, 10, 15, 20, 21.1, 25, 30, 35, 40];

interface Point {
  x: number;
  y: number;
}

interface Segment {
  a: Point;
  b: Point;
  c1: Point;
  c2: Point;
  len: number;
  start: number;
  s0: number;
  s1: number;
}

const $ = <T extends Element>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

class RouteAbout {
  private started = false;
  private intro = false;
  private running = false;
  private frame = 0;
  private x = 0;
  private y = 0;
  private flip = false;
  private passed: boolean[] = [];
  private kmMarkers: HTMLElement[] = [];
  private lastKmText = "";
  private lastDash = -1;

  private segs: Segment[] = [];
  private numTotal = 0;
  private pathLen = 1;
  private startOffset = 0;
  private raf = 0;
  private stopT: ReturnType<typeof setTimeout> | undefined;
  private updateScheduled = false;
  private wheelRaf = 0;
  private wheelTarget = 0;
  private wheelPos = 0;

  private scroller: HTMLElement;
  private track: HTMLElement;
  private introEl: HTMLElement;
  private introInner: HTMLElement;
  private sliding = false;
  private startBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private runner: HTMLElement;
  private frameA: SVGElement;
  private frameB: SVGElement;
  private pathSvg: SVGSVGElement;
  private pathBg: SVGPathElement;
  private pathFg: SVGPathElement;
  private kmBox: HTMLElement;
  private kmText: HTMLElement;
  private progressFill: HTMLElement;
  private reveals: HTMLElement[];
  private routePts: HTMLElement[];

  constructor(root: HTMLElement) {
    this.scroller = $(root, "[data-scroller]");
    this.track = $(root, "[data-track]");
    this.introEl = $(root, ".ra-intro");
    this.introInner = $(root, ".intro-inner");
    this.startBtn = $(root, "[data-start-btn]");
    this.backBtn = $(root, "[data-back-btn]");
    this.runner = $(root, "[data-runner]");
    this.frameA = $(root, "[data-runner-frame-a]");
    this.frameB = $(root, "[data-runner-frame-b]");
    this.pathSvg = $(root, "[data-path-svg]");
    this.pathBg = $(root, "[data-path-bg]");
    this.pathFg = $(root, "[data-path-fg]");
    this.kmBox = $(root, "[data-km-markers]");
    this.kmText = $(root, "[data-km-text]");
    this.progressFill = $(root, "[data-progress-fill]");
    this.reveals = [this.pathSvg as unknown as HTMLElement, ...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    this.routePts = [...root.querySelectorAll<HTMLElement>("[data-route-pt]")];

    this.startBtn.addEventListener("click", () => this.start());
    this.backBtn.addEventListener("click", () => this.back());
    $(root, "[data-restart-btn]").addEventListener("click", () => this.back());
    this.scroller.addEventListener("scroll", () => this.handleScroll(), { passive: true });
    this.scroller.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    window.addEventListener("resize", () => this.measure());
    new ResizeObserver(() => this.measure()).observe(this.track);

    setInterval(() => {
      if (this.running) {
        this.frame = this.frame ? 0 : 1;
        this.renderFrame();
      }
    }, 110);

    this.observeVideos(root);
    setTimeout(() => this.measure(), 60);
    setTimeout(() => this.measure(), 800);
  }

  private observeVideos(root: HTMLElement) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }),
      { threshold: 0.5 }
    );
    root.querySelectorAll("[data-video]").forEach((v) => io.observe(v));
  }

  private start() {
    if (this.started || this.intro) return;
    this.setIntroCompact(true);
    this.runIntro();
  }

  // Swaps the centred intro for the compact one and slides the content between the two positions.
  private setIntroCompact(compact: boolean) {
    const before = this.introInner.getBoundingClientRect().left;
    this.introEl.classList.toggle("started", compact);
    this.measure();
    const dx = before - this.introInner.getBoundingClientRect().left;
    if (!dx) return;
    this.sliding = true;
    const anim = this.introInner.animate(
      [{ transform: `translateX(${dx}px)` }, { transform: "none" }],
      { duration: 500, easing: "ease-out" }
    );
    anim.onfinish = () => {
      this.sliding = false;
    };
  }

  private back() {
    if (this.raf) cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.wheelRaf);
    this.wheelRaf = 0;
    this.intro = false;
    this.started = false;
    this.running = false;
    this.frame = 0;
    this.startBtn.classList.remove("hidden");
    this.backBtn.classList.add("hidden");
    this.runner.classList.remove("show");
    this.reveals.forEach((el) => el.classList.remove("show"));
    this.kmBox.replaceChildren();
    this.scroller.classList.remove("started");
    this.scroller.scrollLeft = 0;
    this.setIntroCompact(false);
    this.renderFrame();
  }

  private runIntro() {
    const sc = this.scroller;
    if (!this.segs.length) {
      this.measure();
      return;
    }
    const target = this.segs[0].a;
    const h = this.track.offsetHeight;
    let x0 = sc.scrollLeft + 40 + Math.random() * (sc.clientWidth - 80);
    let y0 = h * (0.12 + Math.random() * 0.76);
    if (Math.hypot(x0 - target.x, y0 - target.y) < 320) {
      x0 = sc.scrollLeft + 60 + Math.random() * 200;
      y0 = h * (0.15 + Math.random() * 0.3);
    }
    const dist = Math.hypot(x0 - target.x, y0 - target.y);
    const dur = Math.max(1500, Math.min(4000, (dist / 250) * 1000));
    const t0 = performance.now();

    this.intro = true;
    this.running = true;
    this.startBtn.classList.add("hidden");
    this.backBtn.classList.remove("hidden");
    this.runner.classList.add("show");
    this.moveRunner(x0, y0, target.x < x0);

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e =
        t < 0.12
          ? (t / 0.12) * (t / 0.12) * 0.06
          : t > 0.9
            ? 1 - Math.pow((1 - t) / 0.1, 2) * 0.05
            : 0.06 + ((t - 0.12) / 0.78) * 0.89;
      const bob = Math.abs(Math.sin(((now - t0) / 1000) * Math.PI * 4.5)) * 3;
      this.moveRunner(x0 + (target.x - x0) * e, y0 + (target.y - y0) * e - (t < 1 ? bob : 0), this.flip);
      if (t < 1) this.raf = requestAnimationFrame(step);
      else this.finishIntro();
    };
    this.raf = requestAnimationFrame(step);
  }

  private finishIntro() {
    const sc = this.scroller;
    const a = this.segs[0].a;
    this.startOffset = this.segs[0].s0 - (sc.scrollLeft + sc.clientWidth * 0.45);
    this.intro = false;
    this.started = true;
    this.running = false;
    this.frame = 0;
    // BACK stays up for the whole run so the page can always return to how it first loads.
    this.startBtn.classList.remove("hidden");
    this.moveRunner(a.x, a.y, false);
    this.renderFrame();
    this.reveals.forEach((el) => el.classList.add("show"));
    this.kmBox.querySelectorAll(".km-marker").forEach((m) => m.classList.add("show"));
    sc.classList.add("started");
    sc.focus({ preventScroll: true });
    this.update();
  }

  private bez(s: Segment, t: number): Point {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const e = t * t * t;
    return {
      x: a * s.a.x + b * s.c1.x + c * s.c2.x + e * s.b.x,
      y: a * s.a.y + b * s.c1.y + c * s.c2.y + e * s.b.y,
    };
  }

  private measure() {
    const t = this.track;
    if (!t.offsetWidth || this.sliding) return;
    this.introEl.style.setProperty("--stage-w", `${this.scroller.clientWidth}px`);
    const tb = t.getBoundingClientRect();
    const scale = tb.width / t.offsetWidth || 1;
    // Photos are entered and left through their sides (at mid-height), so the line
    // never crosses the caption sitting under or the text sitting opposite a photo.
    const pts = this.routePts.flatMap((el) => {
      const b = el.getBoundingClientRect();
      const x = (b.left - tb.left + b.width / 2) / scale;
      const y = (b.top - tb.top + b.height / 2) / scale;
      if (!el.classList.contains("media-item")) return [{ x, y }];
      const half = b.width / 2 / scale;
      return [{ x: x - half - 28, y }, { x, y }, { x: x + half + 28, y }];
    });
    if (pts.length < 2) return;
    // Phones: leave START sideways and climb in the gap past the intro, not up through its text.
    if (this.scroller.clientWidth <= 760) {
      const ib = this.introEl.getBoundingClientRect();
      pts.splice(1, 0, { x: (ib.right - tb.left) / scale + 14, y: pts[0].y });
    }

    const segs: Segment[] = [];
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    let cum = 0;
    let anchor = pts[0].x;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || pts[i + 1];
      const s: Segment = {
        a: p1,
        b: p2,
        c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
        c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
        len: 0,
        start: cum,
        s0: anchor,
        s1: 0,
      };
      let prev = p1;
      for (let j = 1; j <= 24; j++) {
        const q = this.bez(s, j / 24);
        s.len += Math.hypot(q.x - prev.x, q.y - prev.y);
        prev = q;
      }
      cum += s.len;
      anchor = Math.max(p2.x, anchor + 0.45 * Math.abs(p2.y - p1.y) + 24);
      s.s1 = anchor;
      segs.push(s);
      d += ` C ${s.c1.x.toFixed(1)} ${s.c1.y.toFixed(1)}, ${s.c2.x.toFixed(1)} ${s.c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    this.segs = segs;
    this.numTotal = cum;

    const w = t.offsetWidth;
    const h = t.offsetHeight;
    this.pathSvg.setAttribute("width", String(w));
    this.pathSvg.setAttribute("height", String(h));
    this.pathSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    this.pathBg.setAttribute("d", d);
    this.pathFg.setAttribute("d", d);
    this.pathLen = this.pathBg.getTotalLength() || cum;
    this.pathFg.style.strokeDasharray = `${this.pathLen} ${this.pathLen}`;
    this.setProgress(0);

    this.placeKms();
    this.update();
  }

  private pointAtDist(dist: number): Point {
    for (let i = 0; i < this.segs.length; i++) {
      const s = this.segs[i];
      if (dist <= s.start + s.len || i === this.segs.length - 1) {
        return this.bez(s, Math.max(0, Math.min(1, (dist - s.start) / (s.len || 1))));
      }
    }
    return { x: 0, y: 0 };
  }

  /** Boxes (track coords) a km sign must not cover: each photo/clip plus its caption. */
  private obstacles(): { l: number; t: number; r: number; b: number }[] {
    const tb = this.track.getBoundingClientRect();
    const scale = tb.width / this.track.offsetWidth || 1;
    const pad = 10;
    return [...this.track.querySelectorAll<HTMLElement>(".media-item, .media-item .cap, .route-note, .finish-flag, .intro-text, .avatar, .start-btn, .back-btn")].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        l: (b.left - tb.left) / scale - pad,
        t: (b.top - tb.top) / scale - pad,
        r: (b.right - tb.left) / scale + pad,
        b: (b.bottom - tb.top) / scale + pad,
      };
    });
  }

  private placeKms() {
    this.passed = KM_MARKS.map(() => false);
    const blocked = this.obstacles();
    const h = this.track.offsetHeight;
    // Sign footprint: label (~22px) + stick (14px), plus the raised flag (26px) once passed.
    const W = 56;
    const H = 66;
    const boxFor = (p: Point, below: boolean) =>
      below ? { l: p.x - W / 2, r: p.x + W / 2, t: p.y + 6, b: p.y + 6 + H } : { l: p.x - W / 2, r: p.x + W / 2, t: p.y - 6 - H, b: p.y - 6 };
    const hits = (a: { l: number; t: number; r: number; b: number }) =>
      a.t < 0 || a.b > h || blocked.some((o) => a.l < o.r && a.r > o.l && a.t < o.b && a.b > o.t);
    const step = 6;
    const maxShift = this.numTotal * 0.16;

    this.kmMarkers = KM_MARKS.map((k) => {
      const ideal = (k / TOTAL_KM) * this.numTotal;
      let p = this.pointAtDist(ideal);
      let below = p.y < 80;
      let clear = false;
      // Slide along the route (nearest first) until the sign sits clear of photos and other signs.
      search: for (let off = 0; off <= maxShift; off += step) {
        for (const d of off ? [ideal - off, ideal + off] : [ideal]) {
          if (d < 0 || d > this.numTotal) continue;
          const q = this.pointAtDist(d);
          // Prefer standing on top of the path; hang below it only when that is the clear spot.
          for (const bl of [false, true]) {
            const box = boxFor(q, bl);
            if (!hits(box)) {
              p = q;
              below = bl;
              clear = true;
              blocked.push({ l: box.l - 8, t: box.t, r: box.r + 8, b: box.b });
              break search;
            }
          }
        }
      }
      const half = k === 21.1;
      const marker = document.createElement("div");
      marker.className = "km-marker";
      marker.classList.toggle("show", this.started);
      marker.classList.toggle("below", below);
      // Nowhere clear nearby: leave this sign out rather than cover a photo or text.
      marker.hidden = !clear;
      marker.style.left = `${p.x.toFixed(1)}px`;
      marker.style.top = `${(below ? p.y + 6 : p.y - 6).toFixed(1)}px`;
      const label = document.createElement("span");
      label.className = half ? "km-label half" : "km-label";
      label.textContent = half ? "HALF" : `${k}K`;
      const stick = document.createElement("span");
      stick.className = "km-stick";
      const flag = document.createElement("span");
      flag.className = "km-flag";
      flag.innerHTML =
        '<span class="km-pole"></span><svg class="km-pennant" viewBox="0 0 6 4" style="fill: var(--ra-accent)">' +
        '<rect x="0" y="0" width="6" height="1"/><rect x="0" y="1" width="5" height="1"/>' +
        '<rect x="0" y="2" width="4" height="1"/><rect x="0" y="3" width="2" height="1"/></svg>';
      marker.append(label, stick, flag);
      return marker;
    });
    this.kmBox.replaceChildren(...this.kmMarkers);
  }

  private update() {
    const sc = this.scroller;
    const segs = this.segs;
    if (!segs.length || this.intro || !this.started) return;
    const max = Math.max(1, sc.scrollWidth - sc.clientWidth);
    const atEnd = sc.scrollLeft >= max - 2;
    const tx = sc.scrollLeft + sc.clientWidth * 0.45 + this.startOffset;
    let dist = 0;
    let pt = segs[0].a;
    if (atEnd || tx >= segs[segs.length - 1].s1) {
      dist = this.numTotal;
      pt = segs[segs.length - 1].b;
    } else if (tx > segs[0].s0) {
      for (const s of segs) {
        if (tx < s.s1) {
          const f = (tx - s.s0) / (s.s1 - s.s0 || 1);
          pt = this.bez(s, f);
          dist = s.start + f * s.len;
          break;
        }
      }
    }
    let flip = this.flip;
    if (pt.x < this.x - 0.5) flip = true;
    else if (pt.x > this.x + 0.5) flip = false;
    this.moveRunner(pt.x, pt.y, flip);
    this.setProgress(this.numTotal ? dist / this.numTotal : 0);
  }

  private setProgress(frac: number) {
    const f = Math.min(1, Math.max(0, frac));
    const km = f * TOTAL_KM;

    // The fill path is thousands of px wide, so only repaint it when it visibly moves.
    const dash = this.pathLen * (1 - f);
    if (Math.abs(dash - this.lastDash) >= 1 || f === 0 || f === 1) {
      this.pathFg.style.strokeDashoffset = dash.toFixed(1);
      this.lastDash = dash;
    }

    const text = `${km.toFixed(1)} / 42.2 KM`;
    if (text !== this.lastKmText) {
      this.kmText.textContent = text;
      this.lastKmText = text;
    }
    this.progressFill.style.transform = `scaleX(${f.toFixed(4)})`;

    KM_MARKS.forEach((k, i) => {
      const isPassed = this.started && km >= k;
      if (isPassed !== this.passed[i] && this.kmMarkers[i]) {
        this.passed[i] = isPassed;
        this.kmMarkers[i].classList.toggle("passed", isPassed);
      }
    });
  }

  private handleScroll() {
    if (!this.started) return;

    this.running = true;
    clearTimeout(this.stopT);
    this.stopT = setTimeout(() => {
      this.running = false;
      this.frame = 0;
      this.renderFrame();
    }, 180);

    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => {
        this.update();
        this.updateScheduled = false;
      });
    }
  }

  // Wheel notches jump ~100px at once; ease toward an accumulated target instead.
  private handleWheel(e: WheelEvent) {
    if (!this.started || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const sc = this.scroller;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sc.clientWidth : 1;
    const max = sc.scrollWidth - sc.clientWidth;
    if (!this.wheelRaf) this.wheelTarget = this.wheelPos = sc.scrollLeft;
    this.wheelTarget = Math.min(max, Math.max(0, this.wheelTarget + e.deltaY * unit));
    if (!this.wheelRaf) this.wheelRaf = requestAnimationFrame(() => this.wheelStep());
  }

  private wheelStep() {
    const sc = this.scroller;
    // Something else (scrollbar drag, arrow keys) moved it: follow that instead.
    if (Math.abs(sc.scrollLeft - this.wheelPos) > 2) this.wheelTarget = this.wheelPos = sc.scrollLeft;
    const diff = this.wheelTarget - this.wheelPos;
    if (Math.abs(diff) < 0.5) {
      sc.scrollLeft = this.wheelPos = this.wheelTarget;
      this.wheelRaf = 0;
      return;
    }
    this.wheelPos += diff * 0.16;
    sc.scrollLeft = this.wheelPos;
    this.wheelRaf = requestAnimationFrame(() => this.wheelStep());
  }

  private moveRunner(x: number, y: number, flip: boolean) {
    this.x = x;
    this.y = y;
    this.flip = flip;
    const s = SPRITE_SCALE;
    this.runner.style.transform =
      `translate3d(${(x - 6 * s).toFixed(1)}px, ${(y - 8 * s).toFixed(1)}px, 0) scaleX(${flip ? -1 : 1})`;
  }

  private renderFrame() {
    const strideA = this.running && this.frame === 1;
    this.frameA.toggleAttribute("hidden", !strideA);
    this.frameB.toggleAttribute("hidden", strideA);
  }
}

export function initRouteAbout() {
  const root = document.querySelector<HTMLElement>(".route-about");
  if (root) new RouteAbout(root);
}
