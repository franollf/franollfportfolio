// Dependency-free content and asset integrity checks for the portfolio.
// Run: node tests/check-site.mjs
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const html = read("index.html");
const css = read("styles.css");
const js = read("script.js");

const failures = [];
let checks = 0;
const check = (ok, msg) => {
  checks++;
  if (!ok) failures.push(msg);
};
const decode = (s) => s.replace(/&amp;/g, "&");

// --- Local references exist and are not git-ignored -----------------------
const refs = new Set();
for (const m of html.matchAll(/\b(?:src|href|content)="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/\bsrcset="([^"]+)"/g))
  m[1].split(",").forEach((c) => refs.add(c.trim().split(/\s+/)[0]));
for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) refs.add(m[1]);

for (const ref of refs) {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
  if (!/\.(png|jpe?g|gif|svg|webp|pdf|css|js|ico)$/i.test(ref)) continue;
  const p = decode(ref);
  check(existsSync(join(root, p)), `Missing file: ${p}`);
  // Plain check-ignore (without --no-index) treats tracked files as not ignored.
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", p], { cwd: root });
    ignored = true;
  } catch {}
  check(!ignored, `File is untracked and git-ignored (won't deploy): ${p}`);
}

// --- Images and links ------------------------------------------------------
for (const m of html.matchAll(/<img\b[^>]*>/gs)) {
  const tag = m[0];
  const src = (tag.match(/src="([^"]+)"/) || [])[1];
  check(/\balt="/.test(tag), `<img> without alt: ${src}`);
  check(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag), `<img> without width/height: ${src}`);
}
for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gs))
  check(/rel="noopener noreferrer"/.test(m[0]), `target=_blank without rel: ${m[0].slice(0, 80)}`);

// --- Content (resume-matched) ---------------------------------------------
const resumeLinks = html.match(/href="assets\/franoll-fantu-resume\.pdf"/g) || [];
check(resumeLinks.length >= 2, `Resume should be linked at least twice (found ${resumeLinks.length})`);
const mustContain = [
  "AI Polypharmacy Agent",
  "TechNation × TELUS Hackathon",
  "January 2026 – April 2026",
  "Enactus SFU",
  "Vice President, Web &amp; Digital Systems",
  "Simon Fraser University",
  "Apr 2028",
  "MLflow",
  "Scrum Master",
  "JavaScript",
  "people's lives",
  "Computer Science student at Simon Fraser University. Currently a Software Developer Co-op at Shared Services Canada.",
];
for (const s of mustContain) check(html.includes(s), `Missing content: ${s}`);
check(/Software Engineer<\/[^>]+>[\s\S]{0,400}Enactus SFU|Enactus SFU[\s\S]{0,400}Software Engineer</.test(html), "Enactus title should be Software Engineer");
for (const name of ["PokéVault", "AI Polypharmacy Agent", "NutriScan", "Elevate", "QuizLing", "Vibeify", "Capture the Star"])
  check(new RegExp(`<h3[^>]*>\\s*${name}\\s*</h3>`).test(html), `Missing project: ${name}`);

const work = (html.match(/<section[^>]*id="work"[\s\S]*?<\/section>/) || [""])[0];
const featured = [...work.matchAll(/<h3[^>]*>\s*([^<]+?)\s*<\/h3>/g)].slice(0, 3).map((m) => m[1]);
check(
  featured.join("|") === "PokéVault|AI Polypharmacy Agent|NutriScan",
  `Featured order should be PokéVault, AI Polypharmacy Agent, NutriScan (got ${featured.join(", ")})`
);

for (const s of ["JavaScfipt", "typewriter", "side-social", "reactnative.svg", "peoples lives"])
  check(!html.includes(s) && !js.includes(s), `Should not contain: ${s}`);
check(!css.includes("overflow-x: hidden"), "styles.css should not use overflow-x: hidden");

// --- Mobile nav behaviour lives in script.js -------------------------------
check(js.includes('mobileBreakpoint.addEventListener("change", closeMobileNav)'), "script.js should close nav on breakpoint change");
check(js.includes('mobileNav.classList.remove("open")'), "script.js should have an explicit nav close path");
check(!js.includes("document.body.style.overflow") && !html.includes("document.body.style.overflow"), "No inline overflow lock");

if (failures.length) {
  failures.forEach((f) => console.error("FAIL " + f));
  console.error(`${failures.length} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`OK (${checks} checks)`);
