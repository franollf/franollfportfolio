export type TabKey = "about" | "experience" | "projects";

export const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: "about", label: "About", path: "/" },
  { key: "experience", label: "Experience", path: "/experience" },
  { key: "projects", label: "Projects", path: "/projects" },
];
