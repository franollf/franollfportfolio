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
