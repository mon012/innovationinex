import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://innovationinex.com",
  output: "static",
  integrations: [react()],
  build: { format: "directory" }
});
