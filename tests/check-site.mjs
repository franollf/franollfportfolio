// Dependency-free content, data and asset checks for the built site.
// Run: npm test   (builds with Astro, then runs this against dist/)
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const html = read("dist/index.html");
const css = read("src/styles/global.css");
const navJs = read("src/scripts/nav.js");
const projects = JSON.parse(read("src/data/projects.json"));
const experiences = JSON.parse(read("src/data/experiences.json"));
const profile = JSON.parse(read("src/data/profile.json"));

const failures = [];
let checks = 0;
const check = (ok, msg) => {
  checks++;
  if (!ok) failures.push(msg);
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'");
const text = decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

// --- Local references exist in dist and their sources are committed -------
const refs = new Set();
for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/\bsrcset="([^"]+)"/g))
  m[1].split(",").forEach((c) => refs.add(c.trim().split(/\s+/)[0]));
for (const ref of refs) {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
  if (!/\.(png|jpe?g|gif|svg|webp|pdf|css|js|ico|woff2?)$/i.test(ref)) continue;
  const p = decode(ref).replace(/^\//, "");
  check(existsSync(join(root, "dist", p)), `Missing file in build: ${p}`);
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
  const tag = m[0];
  const src = (tag.match(/src="([^"]+)"/) || [])[1];
  check(/\balt=/.test(tag), `<img> without alt: ${src}`);
  check(/\bwidth="?\d+/.test(tag) && /\bheight="?\d+/.test(tag), `<img> without width/height: ${src}`);
}
for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gs))
  check(/rel="noopener noreferrer"/.test(m[0]), `target=_blank without rel: ${m[0].slice(0, 90)}`);

// --- Intro: overlay present, but never active in the static HTML ----------
check(/class="intro"[^>]*aria-hidden="true"/.test(html), "Intro overlay should exist and be aria-hidden");
check(/class="intro-letter"[^>]*>F</.test(html), 'Intro square should show the letter "F"');
check(!/<html[^>]*data-intro/.test(html), "Static HTML must not start with data-intro (no-JS visitors see content)");
check(/sessionStorage/.test(html) && /prefers-reduced-motion/.test(html), "Intro gate should use sessionStorage and reduced motion");

// --- Content comes from the JSON data -------------------------------------
const resumeLinks = html.match(new RegExp(`href="/?${profile.resume}"`, "g")) || [];
check(resumeLinks.length >= 2, `Resume should be linked at least twice (found ${resumeLinks.length})`);
for (const p of projects) check(text.includes(p.title), `Project missing from page: ${p.title}`);
for (const e of experiences) {
  check(text.includes(decode(e.role)), `Role missing from page: ${e.role}`);
  for (const b of e.bullets) check(text.includes(b), `Bullet missing for ${e.id}: ${b.slice(0, 40)}…`);
}
for (const para of profile.about.paragraphs) check(text.includes(para), `About paragraph missing: ${para.slice(0, 40)}…`);
for (const ph of profile.photos) check(text.includes(ph.caption), `Photo caption missing: ${ph.caption}`);

const projectsSection = (html.match(/<section[^>]*id="projects"[\s\S]*?<\/section>/) || [""])[0];
const order = [...projectsSection.matchAll(/data-project="([^"]+)"/g)].map((m) => m[1]);
check(order.slice(0, 3).join("|") === "pokevault|saferx|nutriscan", `Featured order wrong: ${order.slice(0, 3)}`);
check(/Hackathon/.test(projectsSection) && !/Hackathon Winner/.test(projectsSection), 'Polypharmacy badge should be "Hackathon"');

for (const s of ["JavaScfipt", "ShareTea", "Outlier AI", "RogueU", "lorem", "Lorem"])
  check(!html.includes(s), `Should not contain: ${s}`);
check(text.includes("Apr 2028") && text.includes("Simon Fraser University"), "Education should be present");

// --- Timeline --------------------------------------------------------------
const tablist = (html.match(/<[^>]+role="tablist"[\s\S]*?<\/div>\s*<\/div>/) || [""])[0];
const tabs = html.match(/role="tab"[\s>]/g) || [];
const panels = html.match(/role="tabpanel"/g) || [];
check(tabs.length === experiences.length, `Timeline should have ${experiences.length} tabs (found ${tabs.length})`);
check(panels.length === experiences.length, `Timeline should have ${experiences.length} panels (found ${panels.length})`);
check(/data-role="ssc"[^>]*aria-selected="true"|aria-selected="true"[^>]*data-role="ssc"/.test(html), "Timeline should default to the current SSC role");
check(/class="[^"]*\bbranch-clubs\b/.test(html), "Timeline should draw a clubs branch");
check(html.includes(">Present<"), 'Timeline should end with "Present"');

// --- Filters & theme -------------------------------------------------------
check(/data-filter="all"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-filter="all"/.test(html), 'Project filter should default to "All"');
check(/id="themeToggle"/.test(html), "Theme toggle should exist");

// --- Mobile nav ------------------------------------------------------------
const headerBlock = (html.match(/<header[\s\S]*?<\/header>/) || [""])[0];
check(!headerBlock.includes('id="mobileNav"'), "Mobile nav must be outside <header>");
check(navJs.includes('mobileBreakpoint.addEventListener("change", closeMobileNav)'), "nav.js should close nav on breakpoint change");
check(navJs.includes('mobileNav.classList.remove("open")'), "nav.js should have an explicit close path");
check(!navJs.includes("document.body.style.overflow"), "No inline overflow lock");
check(!css.includes("overflow-x: hidden"), "global.css should not use overflow-x: hidden");

if (failures.length) {
  failures.forEach((f) => console.error("FAIL " + f));
  console.error(`${failures.length} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`OK (${checks} checks)`);
