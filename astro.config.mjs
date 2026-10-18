import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://innovationinex.com",
  output: "static",
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/404") })],
  build: { format: "directory" },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.deftform.com",
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.scribd.com https://*.deftform.com",
        "form-action 'self' https://*.deftform.com",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests"
      ],
      scriptDirective: { resources: ["'self'", "https://cdn.deftform.com"] },
      // Inline style="" attributes are used throughout, so styles stay on 'unsafe-inline'.
      styleDirective: { resources: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"] }
    }
  }
});
