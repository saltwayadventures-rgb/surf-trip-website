/* Dev utility: generates labelled SVG placeholder images into /assets.
   Not part of the site runtime. Run with: node scripts/gen-placeholders.mjs
   Replace the generated .svg files with real photos/video when ready. */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "assets");
mkdirSync(assets, { recursive: true });

const INK = "#0b1a24", INK2 = "#102836", SAND = "#f4ece1", BRASS = "#c98f4e";

function ph(name, w, h, label, sub = "PLACEHOLDER — replace") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${INK2}"/>
      <stop offset="1" stop-color="${INK}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <path d="M0 ${h * 0.72} Q ${w * 0.25} ${h * 0.66}, ${w * 0.5} ${h * 0.72} T ${w} ${h * 0.72} V ${h} H 0 Z" fill="${BRASS}" opacity="0.12"/>
  <path d="M0 ${h * 0.8} Q ${w * 0.25} ${h * 0.74}, ${w * 0.5} ${h * 0.8} T ${w} ${h * 0.8} V ${h} H 0 Z" fill="${SAND}" opacity="0.08"/>
  <text x="50%" y="48%" fill="${SAND}" font-family="Georgia, serif" font-size="${Math.round(w / 18)}" text-anchor="middle">${label}</text>
  <text x="50%" y="48%" dy="${Math.round(w / 16)}" fill="${BRASS}" font-family="Arial, sans-serif" font-size="${Math.round(w / 42)}" letter-spacing="2" text-anchor="middle">${sub}</text>
</svg>`;
  writeFileSync(join(assets, name), svg.trim());
  console.log("wrote", name);
}

// Logo (brass wordmark on transparent)
writeFileSync(join(assets, "logo.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
  <text x="0" y="34" fill="${INK}" font-family="Georgia, serif" font-weight="600" font-size="30" letter-spacing="6">SALTWAY</text>
  <text x="2" y="50" fill="${BRASS}" font-family="Arial, sans-serif" font-size="9" letter-spacing="5">SAILING SURF ADVENTURES</text>
</svg>`);
console.log("wrote logo.svg");

ph("og-image.svg", 1200, 630, "SALTWAY", "OG IMAGE — replace with hero photo 1200×630");
ph("hero-poster.svg", 1600, 900, "Hero video poster", "PLACEHOLDER — drop hero-loop.mp4 + this poster");
ph("onboard.svg", 800, 600, "On-board life", "PLACEHOLDER — deck / anchor photo");

ph("voyage-sumba.svg", 600, 450, "Sumba — Secret Breaks");
ph("voyage-sumbawa.svg", 600, 450, "Sumbawa — Expedition");
ph("voyage-crossing.svg", 600, 450, "Lombok–Sumbawa Crossing");
ph("voyage-coaching.svg", 600, 450, "Coaching Voyage");

ph("day-night-surf.svg", 600, 375, "Night Surf");
ph("day-sunset.svg", 600, 375, "Sunset Sailing");
ph("day-yacht.svg", 600, 375, "Yacht Full Day");
ph("day-celebration.svg", 600, 375, "Celebration Charters");

ph("reel-1.svg", 400, 600, "Reel 1");
ph("reel-2.svg", 400, 600, "Reel 2");
ph("reel-3.svg", 400, 600, "Reel 3");
