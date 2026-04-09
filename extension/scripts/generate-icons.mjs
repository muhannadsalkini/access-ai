/**
 * Renders the AccessAI SVG icons to PNG at the sizes required by Chrome extensions.
 *
 * Uses @resvg/resvg-js — a WASM-based Rust SVG renderer, no system dependencies needed.
 *
 * Sources:
 *  - favicon.svg (32×32 rounded-square design) → icon-16.png (optimised for small sizes)
 *  - icon.svg    (56×56 circular eye/scan design) → icon-48.png + icon-128.png
 */

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const frontendApp = path.resolve(__dirname, "../../frontend/src/app");
const outDir = path.resolve(__dirname, "../public/icons");

mkdirSync(outDir, { recursive: true });

const circularSvg = readFileSync(path.join(frontendApp, "icon.svg"), "utf8");
const squareSvg = readFileSync(path.join(frontendApp, "favicon.svg"), "utf8");

/**
 * Render an SVG string to a PNG Buffer at a given pixel size.
 */
function renderPNG(svgString, size) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width", value: size },
  });
  return resvg.render().asPng();
}

const configs = [
  { size: 16, svg: squareSvg },   // favicon.svg is cleaner at 16px
  { size: 48, svg: circularSvg }, // icon.svg at medium resolution
  { size: 128, svg: circularSvg }, // icon.svg at full resolution
];

for (const { size, svg } of configs) {
  const png = renderPNG(svg, size);
  const outPath = path.join(outDir, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`  created icon-${size}.png  (${png.length} bytes)`);
}

console.log("\nDone. Icons rendered from frontend/src/app/icon.svg and favicon.svg.");
