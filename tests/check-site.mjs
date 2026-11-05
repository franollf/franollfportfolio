// Dependency-free content, data and asset checks for the built site.
// Run: npm test   (builds with Astro, then runs this against dist/)
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const has = (f) => existsSync(join(root, f));
const css = read("src/styles/global.css");
const projects = JSON.parse(read("src/data/projects.json"));
const experiences = JSON.parse(read("src/data/experiences.json"));
const profile = JSON.parse(read("src/data/profile.json"));

const failures = [];
let checks = 0;
const check = (ok, msg) => {
  checks++;
  if (!ok) failures.push(msg);
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&gt;/g, ">");
const textOf = (h) => decode(h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
const tag = (h, re) => (h.match(re) || [""])[0];

// --- Three URLs, one card, three panels -----------------------------------
const PAGES = [
  { file: "dist/index.html", key: "about", path: "/" },
  { file: "dist/experience.html", key: "experience", path: "/experience" },
  { file: "dist/projects.html", key: "projects", path: "/projects" },
];
for (const pg of PAGES) check(has(pg.file), `Missing page ${pg.file}`);
const pages = Object.fromEntries(PAGES.filter((p) => has(p.file)).map((p) => [p.key, read(p.file)]));
const html = pages.about || "";
const text = textOf(html);

for (const pg of PAGES) {
  const h = pages[pg.key];
  if (!h) continue;
  for (const other of PAGES) {
    const panel = tag(h, new RegExp(`<section[^>]*id="panel-${other.key}"[^>]*>`));
    check(panel, `${pg.key}: panel-${other.key} missing`);
    check(/\bhidden\b/.test(panel) === (other.key !== pg.key), `${pg.key}: panel-${other.key} visibility wrong`);
    const t = tag(h, new RegExp(`<a[^>]*id="tab-${other.key}"[^>]*>`));
    check(/role="tab"/.test(t) && t.includes(`href="${other.path}"`), `${pg.key}: tab-${other.key} should be a role=tab link to ${other.path}`);
    check(t.includes(`aria-selected="${other.key === pg.key}"`), `${pg.key}: tab-${other.key} aria-selected wrong`);
  }
  check(new RegExp(`class="crumb-word"[^>]*>${pg.key[0].toUpperCase() + pg.key.slice(1)}<`).test(h), `${pg.key}: header should read "${profile.name} › ${pg.key}"`);
  check(/class="crumb-name"[^>]*href="\/"|href="\/"[^>]*class="crumb-name"/.test(h), `${pg.key}: name should link to About`);
  check(new RegExp(`<link rel="canonical" href="https://[^"]+${pg.path === "/" ? "/" : pg.path}"`).test(h), `${pg.key}: canonical link`);
}
check(/role="tablist"[^>]*aria-label="Sections"/.test(html), "Pill tab bar should be a labelled tablist");
check(/class="tab-pill"/.test(html), "Tab bar should have the sliding pill");
check(/html,\s*body\s*{[^}]*overflow:\s*hidden/.test(css), "Page itself must not scroll");
check(/\.card-scroll\s*{[^}]*overflow-y:\s*auto/.test(css), "Card inner area should scroll");
check(JSON.parse(read("vercel.json")).cleanUrls === true, "vercel.json needs cleanUrls for /experience and /projects");
check(has("src/scripts/tabs.js") && /pushState/.test(read("src/scripts/tabs.js")) && /popstate/.test(read("src/scripts/tabs.js")), "Router should push history and handle back/forward");

// --- Local references exist in dist and their sources are committed -------
const refs = new Set();
for (const h of Object.values(pages)) {
  for (const m of h.matchAll(/\b(?:src|href|poster)="([^"]+)"/g)) refs.add(m[1]);
  for (const m of h.matchAll(/\bsrcset="([^"]+)"/g)) m[1].split(",").forEach((c) => refs.add(c.trim().split(/\s+/)[0]));
}
for (const ref of refs) {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
  if (!/\.(png|jpe?g|gif|svg|webp|pdf|css|js|ico|woff2?|mp4|webm)$/i.test(ref)) continue;
  const p = decode(ref).replace(/^\//, "");
  check(has(join("dist", p)), `Missing file in build: ${p}`);
  if (p.startsWith("_astro/")) continue;
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", join("public", p)], { cwd: root });
    ignored = true;
  } catch {}
  check(!ignored, `public/${p} is untracked and git-ignored (won't deploy)`);
}

// --- Images and links ------------------------------------------------------
for (const m of html.matchAll(/<img\b[^>]*>/gs)) {
  const t = m[0];
  const src = (t.match(/src="([^"]+)"/) || [])[1];
  check(/\balt=/.test(t), `<img> without alt: ${src}`);
  check(/\bwidth="?\d+/.test(t) && /\bheight="?\d+/.test(t), `<img> without width/height: ${src}`);
}
for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gs))
  check(/rel="noopener noreferrer"/.test(m[0]), `target=_blank without rel: ${m[0].slice(0, 90)}`);

// --- Intro: overlay present, never active in static HTML -------------------
check(/class="intro"[^>]*aria-hidden="true"/.test(html), "Intro overlay should exist and be aria-hidden");
check(/class="intro-letter"[^>]*>F</.test(html), 'Intro square should show the letter "F"');
check(!/<html[^>]*data-intro/.test(html), "Static HTML must not start with data-intro");
check(/sessionStorage/.test(html) && /prefers-reduced-motion/.test(html), "Intro gate should use sessionStorage and reduced motion");

// --- Tab-switch morph ------------------------------------------------------
const tabsJs = read("src/scripts/tabs.js");
check(/class="card-letter"[^>]*>F</.test(html), 'Card should carry the "F" for the tab-switch square');
check(/clipPath/.test(tabsJs) && /collapse/.test(tabsJs) && /expand/.test(tabsJs), "Tab switch should collapse/expand the card with clip-path");
check(/startViewTransition/.test(tabsJs) && /reduceMotion/.test(tabsJs), "Reduced motion should crossfade via View Transitions");

// --- About tab -------------------------------------------------------------
const aboutPanel = tag(html, /<section[^>]*id="panel-about"[\s\S]*?<!-- \/panel-about -->/);
const aboutText = textOf(aboutPanel);
const work = experiences.filter((e) => e.type === "work");
const now = work.find((e) => !e.to);
const prev = work.filter((e) => e.to).sort((a, b) => b.to.localeCompare(a.to))[0];
check(experiences.every((e) => e.type === "work" || e.type === "leadership"), 'experiences.json: type must be "work" | "leadership"');
check(now && aboutText.includes(`Currently ${now.role} @ ${now.company}`), "About: Currently @ line from experience data");
check(prev && aboutText.includes(`Previously ${prev.role} @ ${prev.company}`), "About: Previously @ line from experience data");
check(new RegExp(`class="[^"]*about-hero[\\s\\S]*href="${profile.resume}"`).test(aboutPanel), "About hero: resume button");
for (const l of profile.links) check(aboutPanel.includes(`href="${l.href}"`), `About hero: ${l.label} link`);
check(aboutPanel.includes(`href="mailto:${profile.email}"`), "About hero: email link");
check((aboutPanel.match(/class="chip stack-chip/g) || []).length === profile.heroStack.length, "About hero: one chip per stack item");
check(!/Currently planning to do my second full marathon/.test(html), "Marathon line should be updated");
check(aboutText.includes(profile.contact.heading), "About: closing contact line");

// --- Content comes from the JSON data -------------------------------------
const resumeLinks = html.match(new RegExp(`href="/?${profile.resume}"`, "g")) || [];
check(resumeLinks.length >= 1, "Resume should be linked");
for (const p of projects) check(text.includes(p.title), `Project missing: ${p.title}`);
for (const e of experiences) {
  check(text.includes(decode(e.role)), `Role missing: ${e.role}`);
  for (const b of e.bullets) check(text.includes(b), `Bullet missing for ${e.id}: ${b.slice(0, 40)}…`);
}
for (const para of profile.about.paragraphs) check(text.includes(para), `About paragraph missing: ${para.slice(0, 40)}…`);
for (const ph of profile.photos) check(text.includes(ph.caption), `Photo caption missing: ${ph.caption}`);
check(text.includes("Apr 2028") && text.includes("Simon Fraser University"), "Education should be present");
for (const s of ["JavaScfipt", "ShareTea", "Outlier AI", "RogueU", "lorem", "Lorem"]) check(!html.includes(s), `Should not contain: ${s}`);

const projectsPanel = tag(html, /<section[^>]*id="panel-projects"[\s\S]*?<\/section>\s*<!-- \/panel-projects -->/) || html;
const order = [...projectsPanel.matchAll(/data-project="([^"]+)"/g)].map((m) => m[1]);
check(order.slice(0, 3).join("|") === "pokevault|saferx|nutriscan", `Project order wrong: ${order.slice(0, 3)}`);
check(/Hackathon/.test(projectsPanel) && !/Hackathon Winner/.test(projectsPanel), 'Polypharmacy badge should be "Hackathon"');

const stackJs = has("src/scripts/stack.js") ? read("src/scripts/stack.js") : "";
// --- Projects stack --------------------------------------------------------
for (const p of projects)
  for (const k of ["githubUrl", "demoUrl", "liveUrl", "videoUrl", "icon"]) check(k in p, `projects.json ${p.slug}: missing "${k}"`);
const cards = [...projectsPanel.matchAll(/<article[^>]*class="pj-card[^"]*"[^>]*>/g)].map((m) => m[0]);
check(cards.length === projects.length, `Stack should have ${projects.length} cards (found ${cards.length})`);
check(/data-pos="0"/.test(cards[0] || "") && cards.slice(1).every((c) => /aria-hidden="true"/.test(c)), "Only the front card is exposed on load");
check(cards.every((c) => !/\binert\b/.test(c)), "Cards must not use inert (stale wheel targets swallow the next scroll)");
check(/window\.addEventListener\(\s*"wheel"/.test(stackJs), "Wheel should be handled at window level so card swaps never strand the cursor");
const dots = projectsPanel.match(/<button[^>]*class="pj-dot[^"]*"[^>]*>/g) || [];
check(dots.length === projects.length && dots.every((d) => /aria-label="Show [^"]+"/.test(d)), "Pill should have one labelled icon per project");
check(/class="pj-num"[^>]*>1<[\s\S]{0,80}of[\s\S]{0,40}class="pj-total"[^>]*>7</.test(projectsPanel.replace(/data-astro-cid-\w+/g, "")), 'Pill counter should read "1 of 7"');
for (const p of projects) {
  check(projectsPanel.includes(`href="${p.githubUrl}"`), `${p.slug}: GitHub link`);
  if (p.demoUrl) check(new RegExp(`href="${p.demoUrl}"[^>]*data-demo`).test(projectsPanel), `${p.slug}: demo opens in lightbox`);
}
check(/<dialog[^>]*class="pj-lightbox/.test(projectsPanel), "Demo lightbox dialog");
for (const ev of ["wheel", "touchstart", "keydown"]) check(stackJs.includes(`"${ev}"`), `Stack should handle ${ev}`);

// --- Timeline --------------------------------------------------------------
check((html.match(/class="tl-tab[^"]*"[^>]*role="tab"|role="tab"[^>]*class="tl-tab/g) || []).length === experiences.length, "Timeline should have one tab per role");
check(/data-role="ssc"[^>]*aria-selected="true"|aria-selected="true"[^>]*data-role="ssc"/.test(html), "Timeline should default to SSC");
check(html.includes(">Present<"), 'Timeline should end with "Present"');
const tlFilter = tag(html, /<div[^>]*class="tl-filter"[\s\S]*?<\/div>/);
for (const [k, label] of [["all", "All"], ["work", "Work"], ["leadership", "Leadership"]])
  check(new RegExp(`data-type="${k}"[^>]*aria-pressed="${k === "all"}"[^>]*>\\s*${label}`).test(tlFilter), `Timeline filter button: ${label}`);
for (const e of experiences)
  check(new RegExp(`id="tab-${e.id}"[^>]*data-type="${e.type}"|data-type="${e.type}"[^>]*id="tab-${e.id}"`).test(html), `Timeline tab ${e.id} should carry data-type`);
check(/data-view="single"/.test(html) && /timeline\.dataset\.view = "list"/.test(read("src/scripts/timeline.js")), "Filter buttons should list every matching role's description");
check(/branch-leadership/.test(html) && !/branch-clubs/.test(html), "Leadership branch class naming");
check(/id="themeToggle"/.test(html), "Theme toggle should exist");
check(/overflow-x: clip/.test(css) && !css.includes("overflow-x: hidden"), "Use overflow-x: clip, never hidden");

if (failures.length) {
  failures.forEach((f) => console.error("FAIL " + f));
  console.error(`${failures.length} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`OK (${checks} checks)`);
