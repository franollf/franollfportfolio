// The intro runs on CSS keyframes (see global.css) so it always finishes,
// even if this script fails. This file only adds "skip" and cleanup.
const root = document.documentElement;
const intro = document.querySelector(".intro");

if (root.dataset.intro === "play" && intro) {
  const finish = () => {
    if (root.dataset.intro !== "play") return;
    root.dataset.intro = "done";
    window.removeEventListener("keydown", finish, true);
    intro.removeEventListener("pointerdown", finish);
  };

  intro.addEventListener("animationend", (event) => {
    if (event.animationName === "intro-out") finish();
  });
  intro.addEventListener("pointerdown", finish);
  window.addEventListener("keydown", finish, true);
}
