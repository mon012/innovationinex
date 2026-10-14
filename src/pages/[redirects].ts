import type { APIRoute } from "astro";
import { getImage } from "astro:assets";
import { legacyImages } from "../utils/images";
import staticRules from "../data/redirects.txt?raw";

// Emits /_redirects (Astro ignores _-prefixed page files, hence the dynamic route).
export const getStaticPaths = () => [{ params: { redirects: "_redirects" } }];

// Legacy WordPress image URLs moved into src/assets for optimisation; send them to the optimised copy.
export const GET: APIRoute = async () => {
  const imageRules = await Promise.all(
    legacyImages().map(async ([path, asset]) => {
      const image = await getImage({ src: asset, width: Math.min(asset.width, 1600) });
      return `${encodeURI(path)} ${image.src} 301`;
    })
  );
  return new Response(`${staticRules.trim()}\n${imageRules.join("\n")}\n`, { headers: { "Content-Type": "text/plain" } });
};
