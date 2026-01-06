// Gallery Caption Functionality
const images = document.querySelectorAll(".about-gallery img");
const captionBox = document.getElementById("galleryCaption");
const captionText = document.getElementById("captionText");
const gallery = document.querySelector(".about-gallery");

// Create ONE reusable overlay
const overlay = document.createElement("div");
overlay.style.position = "absolute";
overlay.style.pointerEvents = "none";
overlay.style.padding = "1rem";
overlay.style.color = "#fff";
overlay.style.fontSize = "1rem";
overlay.style.lineHeight = "1.4";
overlay.style.background =
  "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))";
overlay.style.opacity = "0";
overlay.style.transform = "translateY(20px)";
overlay.style.transition = "opacity 0.3s ease, transform 0.3s ease";
overlay.style.borderRadius = "inherit";

gallery.style.position = "relative";
gallery.appendChild(overlay);

images.forEach(img => {
  const caption = img.dataset.caption;
  if (!caption) return;

  img.style.transition = "filter 0.3s ease";

  img.addEventListener("mouseenter", () => {
    const imgRect = img.getBoundingClientRect();
    const galleryRect = gallery.getBoundingClientRect();

    overlay.textContent = caption;

    overlay.style.width = `${imgRect.width}px`;
    overlay.style.height = `${imgRect.height}px`;
    overlay.style.left = `${imgRect.left - galleryRect.left}px`;
    overlay.style.top = `${imgRect.top - galleryRect.top}px`;

    img.style.filter = "brightness(0.7)";
    overlay.style.opacity = "1";
    overlay.style.transform = "translateY(0)";
  });

  img.addEventListener("mouseleave", () => {
    img.style.filter = "brightness(1)";
    overlay.style.opacity = "0";
    overlay.style.transform = "translateY(20px)";
  });
});

// Reveal on scroll
const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

reveals.forEach((el) => observer.observe(el));

// Typewriter effect
const texts = [
  "a Frontend Developer",
  "an Athlete",
  "a Problem Solver",
  "a Student",
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typewriterElement = document.getElementById("typewriter");
const typingSpeed = 100;
const deletingSpeed = 50;
const pauseTime = 2000;

function typeWriter() {
  const currentText = texts[textIndex];

  if (isDeleting) {
    typewriterElement.textContent = currentText.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typewriterElement.textContent = currentText.substring(0, charIndex + 1);
    charIndex++;
  }

  let speed = isDeleting ? deletingSpeed : typingSpeed;

  if (!isDeleting && charIndex === currentText.length) {
    speed = pauseTime;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    textIndex = (textIndex + 1) % texts.length;
    speed = 500;
  }

  setTimeout(typeWriter, speed);
}

// Start the typewriter effect
typeWriter();

// Tabs functionality
const tabs = document.querySelectorAll(".tab");
const grids = document.querySelectorAll(".skills-grid");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    grids.forEach(g => g.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});