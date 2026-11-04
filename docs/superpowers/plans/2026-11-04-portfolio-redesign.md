# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-page portfolio in the "Engineer's Notebook" design, with resume-matched content, featured projects and resume link on the first screen.

**Architecture:** Same static site: `index.html` (markup and content), `styles.css` (rewritten from scratch around design tokens), `script.js` (mobile nav, reveal-on-scroll, year). No build step. A dependency-free Node checker (`tests/check-site.mjs`) enforces content and asset integrity. Visual checks use the Playwright MCP browser against `python3 -m http.server`.

**Tech Stack:** HTML5, CSS (custom properties, grid, `clamp()`), vanilla JS, Google Fonts (Fraunces, Instrument Sans, JetBrains Mono), macOS `sips` for image resizing, Node 25 for the checker.

**Spec:** `docs/superpowers/specs/2026-11-04-portfolio-redesign-design.md`

## Global Constraints

- No placeholder or lorem ipsum. Copy comes from the current site or the resume, as the spec's "Content decisions" section says.
- Every assertion in `tests/portfolio-content.tests.ps1` remains true, except the three inline-script assertions. Those move to `script.js`, and the PS1 file is updated to read `script.js` for them.
- Colors are defined only as tokens on `:root`: paper `#f5f0e8`, ink `#1c1a17`, muted `#5a544c`, rule `#d8cfc2`, accent `#2340a8`. There is a dark palette under `prefers-color-scheme: dark`. Every text/background pair is at least 4.5:1.
- No `overflow-x: hidden` anywhere; use `overflow-x: clip`.
- External links: `target="_blank" rel="noopener noreferrer"`.
- Any new file under `assets/`, `photos/`, `projects/` or `icons/` is added to the `.gitignore` allowlist.
- Commit after each task, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Mobile nav open, then rotate or resize past 768px:** the menu closes and the page scrolls. Checked in Task 6 with a Playwright resize.
2. **Keyboard-only visitor:** the skip link appears on first Tab, focus is visible on every link and button, and the menu button toggles `aria-expanded`. Checked in Task 6.
3. **Filename with a space (`photos/shared services team.jpg`) and resized copies:** they load from `src`. Covered by the checker's file-exists test and naturalWidth in Task 6.
4. **Dark mode on the OS:** text contrast stays at least 4.5:1, and the transparent portrait and logos stay visible. Task 6 emulates dark mode.
5. **Long titles at 375px** ("Engineering Without Borders Canada (SFU Chapter)", "AI Polypharmacy Agent"): no horizontal overflow. Task 6 compares `scrollWidth <= clientWidth`.

---

### Task 1: Checker, resume, and asset cleanup

**Files:**
- Create: `tests/check-site.mjs`
- Create: `assets/franoll-fantu-resume.pdf` (copied from `~/Downloads/franoll_fantu_resume (14).pdf`)
- Modify: `.gitignore` (allowlist the resume and the resized images)
- Delete (git rm): `photos/{SSC.png,SSC2.png,basketball.JPG,marathongroup.JPG,runclub.JPG,headshot.png,dinner.jpg,marathonphoto.JPG,volleyball.JPG}`, `projects/running sprite.png`, `icons/{outlierai.png,sharetea.png,rogue.u.png}`

**Interfaces:**
- Produces: `node tests/check-site.mjs` exits 0 and prints `OK (<n> checks)`, or exits 1 listing failures.

- [ ] **Step 1: Write `tests/check-site.mjs` with these checks:**
  - Every `src=`/`href=` local path in `index.html` and `url()` in `styles.css` exists on disk **and** is tracked or not ignored (`git check-ignore -q` must fail for it).
  - Every `<img>` has an `alt` attribute and `width`/`height`.
  - Every `target="_blank"` link has `rel="noopener noreferrer"`.
  - The content strings must be present: `href="assets/franoll-fantu-resume.pdf"` (at least 2 occurrences), `AI Polypharmacy Agent`, `TechNation × TELUS Hackathon`, `January 2026 – April 2026` (VJDS), `Software Engineer` + `Enactus SFU`, `Vice President, Web &amp; Digital Systems`, `Simon Fraser University`, `Apr 2028`, `MLflow`, `Scrum Master`, `JavaScript` and not `JavaScfipt`, `people's lives`, all 7 project names.
  - Featured order: the first three `<h3>` inside `#work` are PokéVault, AI Polypharmacy Agent, NutriScan.
  - Absent: `typewriter`, `side-social`, `overflow-x: hidden`, `reactnative.svg`.
- [ ] **Step 2: Run `node tests/check-site.mjs`.** Expected: FAIL (the resume and new content are missing).
- [ ] **Step 3: Copy the resume, update `.gitignore` (`!/assets/` → allow `assets/franoll-fantu-resume.pdf` and `assets/franoll-piskel-blinking.gif`), and git rm the unused files.**
- [ ] **Step 4: Commit** `chore: add resume, checker, remove unused assets`. The checker still fails on content; Tasks 2–5 make it pass.

### Task 2: Optimized images

**Files:**
- Create: `photos/web/*.jpg` and `projects/web/*.jpg|png` (resized copies, long edge 1200px for photos and 1400px for screenshots, JPEG quality 78 via `sips -Z <px> -s formatOptions 78`). Logos are not resized.
- Modify: `.gitignore` (allow `!/photos/web/`, `!/projects/web/`)

- [ ] **Step 1:** Resize the 6 gallery photos and 7 project screenshots. Copy names drop spaces (`shared-services-team.jpg`). PNG screenshots with transparency stay PNG.
- [ ] **Step 2:** `du -sh photos/web projects/web`. Expected: under 2.5 MB total.
- [ ] **Step 3: Commit** `perf: add resized web copies of photos and screenshots`.

### Task 3: Design tokens, base styles, header and hero

**Files:**
- Modify: `index.html` (whole `<head>`, header, hero, skip link, `<main>` wrapper)
- Rewrite: `styles.css` (tokens, reset, typography, header, hero, buttons, focus, reveal, reduced motion)
- Rewrite: `script.js` (mobile nav moved from inline; keeps `closeMobileNav`, `mobileBreakpoint.addEventListener("change", closeMobileNav)`, `mobileNav.classList.remove("open")`, the `body.mobile-nav-open` class and `aria-expanded`; reveal observer; no typewriter)
- Modify: `tests/portfolio-content.tests.ps1` (the 3 nav assertions read `script.js`)

**Interfaces:**
- Produces CSS classes used by later tasks: `.container` (max-width 1120px, padding-inline 16px → 32px at ≥768px), `.section`, `.section-label` (mono caps, text like `01 — Selected work`), `.btn`, `.btn--primary`, `.tag`, `.reveal`/`.reveal.show`.

- [ ] **Step 1:** `<head>`: title "Franoll Fantu — Software Developer", a meta description built from the hero line, OG tags (image `photos/transparentpfp.png`), favicon `assets/franoll-piskel-blinking.gif`, font preconnect plus one Google Fonts CSS link (Fraunces 400..600 opsz, Instrument Sans 400;500;600, JetBrains Mono 400;500; `display=swap`).
- [ ] **Step 2:** Header: skip link → `#main`. Brand "Franoll Fantu". Nav: Work, Experience, About, Contact. Resume `.btn--primary` (visible at every width). Menu button (`aria-controls="mobileNav"`, `aria-expanded="false"`) shown below 768px.
- [ ] **Step 3:** Hero: pixel avatar (48px, `alt=""`, decorative), `<h1>Franoll Fantu</h1>`, the hero line verbatim, buttons Resume (primary), Email (`mailto:ffa28@sfu.ca`), GitHub, LinkedIn. Hero height is content-driven, not 100vh, so featured work starts above the fold at 1440×900.
- [ ] **Step 4:** Run the checker. Expected: the remaining failures are content-only (projects and experience).
- [ ] **Step 5: Commit** `feat(redesign): tokens, header, hero`.

### Task 4: Projects (selected work and more projects)

**Files:** Modify `index.html` (`<section id="work">`), `styles.css`.

- [ ] **Step 1:** Featured rows, in order: PokéVault, AI Polypharmacy Agent, NutriScan. Each row: screenshot (`projects/web/…`, eager on the first, lazy after), `<h3>`, context line in mono (e.g. "TechNation × TELUS Hackathon"), a description (resume-based for resume projects, current text for NutriScan), icon tags `.tag`, icon-only GitHub and Demo links with `aria-label`s. Keep `<!-- PokéVault -->` … `<!-- Safe Rx -->` comment markers and `class="project-preview pokevault-project-preview"` with `src="projects/pokevault.png"` (the PS1 test pins it; use the original, not the web copy).
- [ ] **Step 2:** "More projects" grid: Elevate, QuizLing (resume stack: React, Node.js, JavaScript, GeminiAI, Firebase, Figma), Vibeify, Capture the Star. These use current copy.
- [ ] **Step 3:** Polypharmacy tags follow the resume: React, Python, FastAPI, PostgreSQL, OCR. NutriScan's React Native tag becomes text-only.
- [ ] **Step 4:** Run the checker. Expected: the featured-order and project-name checks pass.
- [ ] **Step 5: Commit** `feat(redesign): projects`.

### Task 5: Experience, education, about, skills, contact, footer

**Files:** Modify `index.html`, `styles.css`.

- [ ] **Step 1:** `#experience`: "Work" (SSC, VJDS) and "Leadership" (EWB, Enactus) lists. Each entry: logo, title, company, location, mono dates, the resume bullets verbatim. Then "Education": SFU, Bachelor of Sciences in Computer Science, Burnaby, BC, Graduation: Apr 2028.
- [ ] **Step 2:** `#about`: `photos/transparentpfp.png` portrait (`object-fit: contain`), the current bio with the "people's lives" fix, and the 6 photos with their existing `src` paths, captions, classes (`gallery-bowling`, `gallery-full-marathon`, `gallery-church`, `gallery-half-marathon`) and `data-caption` values preserved. Captions are rendered visibly in `<figcaption>`. Use the original `src` for these 6 (the PS1 test pins them) plus `srcset` pointing at the web copies so browsers download the small ones.
- [ ] **Step 3:** `#skills`: the resume's five groups as `<dl>`, terms in mono.
- [ ] **Step 4:** `#contact`: the existing heading and line, plus Email, LinkedIn, GitHub and Resume. Footer: email and `© <span id="year">`.
- [ ] **Step 5:** Run the checker. Expected: `OK`.
- [ ] **Step 6:** Delete icons the redesign no longer references (`git ls-files icons | while read f; do grep -q "$f" index.html styles.css || git rm "$f"; done`), then re-run the checker. Expected: `OK`.
- [ ] **Step 7: Commit** `feat(redesign): experience, about, skills, contact`.

### Task 6: Visual and accessibility verification

**Files:** Fixes land wherever the bugs are; screenshots go to the scratchpad (not committed).

- [ ] **Step 1:** Start `python3 -m http.server 8765` in the background.
- [ ] **Step 2:** With Playwright MCP at 375×812 and 1440×900: take full-page and first-screen screenshots. Confirm the Resume button and the first featured project are visible on the first screen at 1440, and the Resume button is visible at 375.
- [ ] **Step 3:** In the page, evaluate: every `img.complete && naturalWidth > 0`; `document.documentElement.scrollWidth <= innerWidth`; every `a[href^="#"]` target exists; WCAG contrast for every text element's computed color against its nearest opaque background, at least 4.5:1 (3:1 for text ≥24px). Do this in light and in emulated dark mode.
- [ ] **Step 4:** External links: `curl -sI -o /dev/null -w "%{http_code}"` for each GitHub, LinkedIn and YouTube URL. Expected: a status below 400. LinkedIn returns 999 to bots, so record it as unverifiable rather than broken.
- [ ] **Step 5:** Mobile nav: open, check `aria-expanded="true"`, resize to 1024, and check that the menu is closed and `body` doesn't have `mobile-nav-open`. Keyboard: press Tab once and check that the skip link is focused and visible.
- [ ] **Step 6:** Fix any failures, re-run Steps 2–5, then commit `fix(redesign): verification fixes`.
