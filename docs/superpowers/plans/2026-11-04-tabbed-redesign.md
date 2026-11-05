# Tabbed, non-scrolling redesign — plan

**Goal:** Three-tab (About / Experience / Projects) portfolio in a fixed rounded card, with a pill tab bar,
a "Franoll Fantu › Section" header, the F-square intro reprised on every tab switch, a commit-graph
timeline and a stacked-card project browser.

**Stack:** Astro 7.4.1 (unchanged), static output (`build.format: "file"`), vanilla JS modules.
**Palette:** A — Moss & Amber (existing tokens). **Branch:** `redesign-tabs` (off `redesign`).

## Architecture
- `src/pages/{index,experience,projects}.astro` each render `BaseLayout` with `active` set.
  Every page contains all three panels; only the active one is visible. Direct loads, refresh and
  no-JS visitors get the right tab; Vercel `cleanUrls` serves `/experience` from `experience.html`.
- `src/scripts/tabs.js` is the router: intercepts tab/name clicks, `history.pushState`, `popstate`,
  moves the pill, animates the header word, and runs the card morph
  (collapse to a 48px square with a small "F" → swap panel → expand). One in-flight morph at a
  time; clicks during a morph only retarget it, so rapid clicks settle on the last tab.
  Reduced motion → `document.startViewTransition` crossfade (or instant).
- Page never scrolls (`html, body { overflow: hidden }`); `.card-scroll` scrolls About/Experience;
  Projects locks it and maps wheel/swipe/keys to the stack.
- Data: `experiences.json` uses `type: "work" | "leadership"`; `projects.json` uses
  `githubUrl`, `demoUrl`, `liveUrl`, `videoUrl` (null until clips exist), `image` (poster/screenshot).

## Tasks (one commit each)
1. Shell: layout, pill tabs, header, router (instant swap), no page scroll, three URLs.
2. Intro + tab-switch morph, rapid-click handling, reduced-motion crossfade.
3. About: hero (greeting, name, bio, Currently/Previously from data, chips, socials, resume) above
   the fold; about text, photos, education, skills below inside the card.
4. Experience: timeline with All / Work / Leadership filter, type rename.
5. Projects: stacked cards, "n of 7" pill with fanning thumbnails, wheel/swipe/keys (debounced),
   filters, demo lightbox (YouTube now, muted-loop MP4 path ready for clips).

## Verification
`npm test` (dist checks) + PS1 port, then Playwright at 375 and 1440: intro, every tab switch
mid-animation, back button, direct URLs, rapid clicks, timeline, stack via wheel/swipe/keys/dots,
lightbox, links, contrast.
