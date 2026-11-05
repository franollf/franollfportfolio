export type TabKey = "about" | "experience" | "projects";

export const TABS: { key: TabKey; label: string; path: string; dot: string }[] = [
  { key: "about", label: "About", path: "/", dot: "var(--terracotta)" },
  { key: "experience", label: "Experience", path: "/experience", dot: "var(--moss)" },
  { key: "projects", label: "Projects", path: "/projects", dot: "var(--amber)" },
];
