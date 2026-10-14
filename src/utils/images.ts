import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

// Images referenced by legacy string paths ("/wp-content/...", "/assets/images/...") live in src/assets
// so Astro can optimise them; this maps each public-style path to its imported asset.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{jpg,jpeg,png,webp,avif}",
  { eager: true }
);

const assets = new Map(
  Object.entries(modules).map(([path, module]) => [path.replace(/^\/src\/assets/, ""), module.default])
);

export function resolveImage(src: string): ImageMetadata | undefined {
  return assets.get(decodeURI(src).replace(/^\/assets\/images\//, "/images/"));
}

/** Absolute URL of an optimised copy, for og:image / schema.org where a plain URL is required. */
export async function imageUrl(src: string, site: URL): Promise<string> {
  const asset = resolveImage(src);
  if (!asset) return new URL(src, site).href;
  const image = await getImage({ src: asset, width: Math.min(asset.width, 1200), format: "jpg" });
  return new URL(image.src, site).href;
}

/** Public-style paths of images that used to be served from /wp-content/. */
export function legacyImages(): [string, ImageMetadata][] {
  return [...assets].filter(([path]) => path.startsWith("/wp-content/"));
}
