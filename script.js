// Mobile navigation
const hamburger = document.getElementById("hamburger");
const mobileNav = document.getElementById("mobileNav");
const mobileBreakpoint = window.matchMedia("(max-width: 768px)");

const closeMobileNav = () => {
  hamburger.classList.remove("open");
  mobileNav.classList.remove("open");
  document.body.classList.remove("mobile-nav-open");
  hamburger.setAttribute("aria-expanded", "false");
};

hamburger.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  hamburger.classList.toggle("open", isOpen);
  document.body.classList.toggle("mobile-nav-open", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".mobile-nav-link").forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileNav.classList.contains("open")) {
    closeMobileNav();
    hamburger.focus();
  }
});

// Prevent a hidden mobile menu from leaving the page scroll-locked after
// a phone rotation or a responsive breakpoint change.
mobileBreakpoint.addEventListener("change", closeMobileNav);

// Reveal sections on scroll (skipped when the user prefers reduced motion)
const reveals = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("show"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  reveals.forEach((el) => observer.observe(el));
}

// Footer year
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
