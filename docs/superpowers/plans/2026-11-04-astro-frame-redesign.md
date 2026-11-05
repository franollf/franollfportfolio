# Astro "Card in a Frame" Redesign — Design & Plan

**Goal:** Interactive portfolio inspired by patrick-kw-chiu.github.io (studied, not copied — that repo has no license), filled with Franoll's content, built in Astro with content in JSON.

**Branch:** `redesign` (started from the notebook redesign, which is preserved as `redesign-notebook`).

## Decisions (Franoll, 2026-11-04)

- Palette **A — Moss & Amber**: frame `#0f1a14`, card `#f3efe4`. Section accents: Projects amber, Experience moss, About terracotta, Contact plum. Type: Space Grotesk (headings and UI) + IBM Plex Mono (graph, dates, tags). Self-hosted via @fontsource.
- **Astro 5.18.2** (pinned to the latest 5.x; 7.x is newer than the implementer's knowledge). Static output, no UI framework; vanilla TS/JS islands.
- Roles: SSC (work, May 2026–Present), VJDS (work, Jan–Apr 2026), EWB SFU (clubs, Jan 2026–Present), Enactus SFU (clubs, Jan–Jun 2026). Outlier AI, ShareTea and RogueU stay out.
- Company links: SSC → canada.ca CanAI Garage page; EWB → go.sfss.ca/clubs/927/info; Enactus → go.sfss.ca/clubs/98/info (enactussfu.com is dead); VJDS has no findable site, so it's plain text.
- Badge: AI Polypharmacy Agent → "Hackathon" (not "Winner").
- Content stays as on `redesign-notebook` (resume-matched). New hero bio is composed only from existing facts; flagged for Franoll's review.

## Architecture

- `src/data/{profile,experiences,projects}.json`: all content. Components never hard-code copy.
- `src/layouts/BaseLayout.astro`: head, intro overlay, dark frame, fixed top strip with nav, theme toggle, card, footer on the frame.
- **Native document scrolling** (unlike the reference's fixed scroll container): the frame is the `html` background, the card is `<main>` with 8px side margins, and the top strip plus the rounded top corners are fixed overlays. This keeps anchors, scroll restoration, keyboard scrolling and mobile browser chrome working.
- `public/` holds photos, projects, icons and assets at their existing relative paths, so the PS1 tests' path strings still hold.

## Intro (≤ 2.5s)

- The overlay markup is in the HTML but `display: none` by default. An inline `<head>` script sets `html[data-intro="play"]` before first paint, only if `sessionStorage` has no `intro-seen` flag and the user doesn't prefer reduced motion.
- Driven by CSS keyframes, so it finishes even if later JS fails. The final keyframe sets the overlay to opacity 0 and `visibility: hidden`.
- **0–1.1s:** a light square (clip-path inset of a card-sized element) with "F" blinking twice (opacity).
- **1.1–1.9s:** clip-path expands to `inset(0 round 24px)`, exactly the card's rect under the 58px top strip.
- **1.5–2.1s:** the nav fades in.
- **2.1–2.3s:** the overlay fades out over the identical real card.
- **Skip:** a click or keydown sets `data-intro="done"`. An `animationend` on the last keyframe sets it too. The flag is written when the intro starts.
- No JS or reduced motion: the overlay never shows. All content is always in the HTML.

## Timeline

- Built at build time from dates: x = month offset ÷ (span from Jan 2026 to the build month). SVG lanes: main (work) at y0; EWB branches off at Jan 2026 to Present; Enactus branches off at Jan 2026 and merges back at Jun 2026, like a git merge.
- Each role is a `<button role="tab">` overlaid on its segment, inside a `role="tablist"`. Hover, focus or click activates it: the SVG segment gets `.is-active` (thicker stroke plus glow) and a tooltip appears with role and dates. The detail panel (`role="tabpanel"`, pre-rendered for every role) crossfades in via `document.startViewTransition`, falling back to a CSS opacity transition.
- Arrow keys and Home/End move between roles (roving tabindex). Defaults to the current SSC role.
- Labels: "Jan 2026" at the left, "Present" at the right.
- Below 768px: the SVG is hidden and the tabs become a vertical list with a left rail, a dot per role, and a "work"/"clubs" lane tag. The panel shows below the list.
- No JS: all panels are visible as a plain list.

## Hero & projects

- Hero: "Hi, this is" / Franoll Fantu / bio with inline links to SSC and VJDS / Resume button plus a "See projects" link / tech chips. Hovering a chip highlights matching project cards; clicking one applies that filter.
- Projects come first after the hero (best work first). Each card has a screenshot, title, GitHub/demo icon links, description, tags and badges. Hover lifts the card and zooms the screenshot. Filter buttons for tags used by ≥2 projects, plus "All", with `aria-pressed`. Filtering animates with view transitions.
- Section order: Hero → Projects → Experience → About (bio, photos, education, skills) → footer (Contact) on the frame.
- Sticky section headers sit under the strip, with an accent dash. Scroll reveals use IntersectionObserver, skipped for reduced motion and without JS.
- Theme toggle in the strip. Light and dark both keep the frame and card; the choice is stored in localStorage and defaults to the system setting.

## Tests

- `npm test` = `astro build` + `node tests/check-site.mjs` (reads `dist/index.html`, the source CSS and the scripts).
- The PS1 test's paths are updated to `dist/index.html`, `src/styles/global.css` and `src/scripts/nav.js`. The PokéVault card is extracted by `data-project="pokevault"` instead of HTML comments.
- Verification uses Playwright MCP against `astro preview`.

## Tasks (one commit each)

1. Astro scaffold: move assets to `public/`, add the JSON data, adapt the tests, build the shell (frame, card, strip, nav, footer, tokens, fonts).
2. Intro animation.
3. Commit-graph timeline.
4. Hero, projects and filters.
5. About, education, skills, theme toggle, reveals.
6. Playwright verification and fixes.
