# Portfolio Redesign — "Engineer's Notebook" (Direction A)

## Intent

Franoll is an SFU Computer Science student targeting co-op and internship roles.
The site's job is to get a recruiter to his best projects and his resume within
~5 seconds, while keeping the personality (running, church, cooking, pixel
avatar) that makes him memorable. Change the design, not the substance.

## Goals

- First screen (375px and 1440px): name, one-line role, **Resume** button, email.
  On desktop the first featured project starts above the fold (1440×900).
- Featured projects first (3, pending final pick now that PokéVault exists):
  SafeRx, NutriScan, Elevate. Remaining projects (PokéVault, QuizLing, Vibeify,
  Capture the Star) follow in a compact grid.
- Fast (no framework, optimized images, lazy-loading), accessible (WCAG AA
  contrast, keyboard, screen reader), responsive (375 → 1440+).

## Non-goals

- No new content, no placeholder text. (PokéVault was added by Franoll on
  `main` on 2026-10-22 and is existing content.)
- No stack change: stays plain HTML + CSS + vanilla JS, no build step.

## Anti-goals

- Looking like a template (typewriter hero, underline bars, zigzag timeline).
- Projects buried below the gallery/skills.
- Any written content changed without his sign-off.

## Approaches considered

- **A. Engineer's notebook** (chosen): warm paper palette, serif display +
  mono metadata, editorial rows. Distinctive, carries current identity forward.
- B. Swiss grid: fastest scan, but impersonal; photos/avatar lose room.
- C. Dark IDE: instant "developer" signal, but the most common student look,
  and long text in mono-on-dark reads poorly.

Chosen by Franoll: A.

## Design

### Visual system

- **Type:** Fraunces (headings, variable, 400–600), Instrument Sans (body,
  400/500/600), JetBrains Mono (dates, tags, labels, 400/500). Google Fonts with
  `preconnect` and `display=swap`.
- **Color tokens** on `:root` — paper `#f5f0e8`, ink `#1c1a17`, muted `#5a544c`,
  rule `#d8cfc2`, accent ink-blue `#2340a8` (echoes the resume header).
  Dark palette under `prefers-color-scheme: dark`. All text pairs checked ≥4.5:1.
- **Layout:** max content width ~1120px, 16px gutters on mobile; thin rules
  between sections instead of cards and shadows; section labels in small mono
  caps (`01 — Selected work`).
- **Motion:** a single subtle fade-up on section entry, disabled under
  `prefers-reduced-motion`. Nothing else animates.

### Page structure (single page, in order)

1. **Header (sticky, slim):** "Franoll Fantu" · Work · Experience · About ·
   Contact · **Resume** (accent button). Mobile: name + Resume + menu button
   (with `aria-expanded`).
2. **Hero:** large serif name; role line; buttons: Resume (primary), Email,
   GitHub, LinkedIn (text labels, not icon-only). Pixel avatar GIF small beside
   the name as a signature mark.
3. **Selected work:** SafeRx, NutriScan, Elevate as large rows — screenshot one
   side; title, existing description, mono tech list, GitHub link the other.
   Alternating sides on desktop, stacked on mobile.
4. **More projects:** QuizLing, Vibeify, Capture the Star as a compact 3-column
   grid (1 column on mobile) with screenshot, description, tech, link.
5. **Experience:** clean dated list — logo, role, company, mono dates, existing
   bullets. SSC, VJDS, Enactus, EWB in current order.
6. **About:** `transparentpfp.png` portrait (uncropped, `object-fit: contain`)
   + existing bio paragraphs; the six current photos (SSC team bowling, full
   marathon, hike, church, half marathon, boxing) with their focal-point classes, in a
   strip with captions always visible (scroll-snap row on mobile, grid on
   desktop).
7. **Skills:** the same three groups (Languages / Frameworks / Tools) as plain
   mono lists, no tabs.
8. **Contact:** existing heading + line; Email, LinkedIn, GitHub, Resume.
9. **Footer:** email.

### Content mapping

All existing copy moves verbatim except items Franoll approves in the
"Open content questions" list below. The hero role line replaces the
typewriter; its wording needs his approval.

### Assets

- Resume copied to `assets/franoll-fantu-resume.pdf`; linked with a plain `href`
  (opens in browser PDF viewer).
- Resized web copies of used photos/screenshots (via macOS `sips`) next to the
  originals; originals kept. All `<img>` get `width`/`height`,
  `loading="lazy"` below the fold, and real alt text.
- Tech tags become text-only, which removes the broken `reactnative.svg`
  reference and the Google icon on "TCP/UDP".
- Unused files are left in place until Franoll decides.
- `.gitignore` ignores `/assets`, `/photos/*`, `/projects/*`, `/icons/*` except
  an allowlist. Any new file there (resume PDF, resized images) must be added to
  the allowlist or it won't be committed/deployed.

### Tests

`tests/portfolio-content.tests.ps1` asserts current markup (photos, captions,
PokéVault card + icons + links, `rel="noopener noreferrer"`, mobile-nav close
path and breakpoint reset, `overflow-x: clip`, portrait `object-fit: contain`).
The redesign keeps every content assertion true and updates only the assertions
that are tied to old structure (e.g. inline nav script moving into `script.js`).
PowerShell isn't installed locally; equivalent checks are mirrored in the
Playwright verification script.

### Removed

Typewriter, side social rail, scroll indicator, skills tabs + JS, hover-only
gallery caption JS, inline hamburger script (moved into `script.js`, keeping
its close-on-link and close-on-breakpoint behaviour and the
`body.mobile-nav-open` class).

### Added

Skip link, landmarks (`header`/`main`/`footer`), visible focus styles, meta
description, Open Graph tags (headshot), favicon (pixel avatar).

## Verification

Playwright screenshots of the page at 375px and 1440px (full page + first
screen). Automated checks: every `<img>` loaded (naturalWidth > 0), every
internal anchor resolves, every external link returns < 400, no horizontal
overflow, text contrast ≥ 4.5:1. Fix before reporting done.

## Builder's calls (Claude)

Font choices, exact color values, resized-image approach, section numbering,
dark-mode palette, text-only tech tags.

## Open content questions (Franoll decides)

See conversation; defaults to "keep current text" if unanswered.
