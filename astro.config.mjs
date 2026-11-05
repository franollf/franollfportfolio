// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://franollfantu.vercel.app",
  build: { format: "file" },
  compressHTML: true,
});
