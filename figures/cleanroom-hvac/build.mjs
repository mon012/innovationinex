// Cleanroom Class 100 (ISO 5) HVAC: a sectioned model of one bay with fan filter units,
// a perforated raised floor, a return-air chase with a dry cooling coil and a makeup-air unit.
// node build.mjs [--light]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/prarinyak/.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/Users/prarinyak/.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "/Users/prarinyak/.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as F from "./flow.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const embed = process.argv.includes("--embed");
const theme = embed || process.argv.includes("--light") ? "light" : "dark";
const { Z, BENCH, COUNTER, SOURCE, PROBE, MAU } = F;

const WIDTH = 760;
const HEIGHT = 600;
const PLINTH = { x: -64, y: -28, w: 332, d: 214, r: 8 };
const PLINTH_Z = -22;
const PLINTH_TOP = -10;
const FOOT_H = 5;
const CTRL = { x: 196, y: 150, w: 42, d: 22, r: 2 };
const CTRL_TOP = 2;
const KNOB = [226, 161];

const P = k.fitProjection(
  [...k.boxCorners(PLINTH, PLINTH_Z - FOOT_H, PLINTH_TOP), [-40, -4, 240], [-36, 132, 240], [244, 148, Z.beam], [244, -4, Z.beam]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 56 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const box = (x0, y0, z0, x1, y1, z1, r = 0.5, steps = 2, bevel = 0) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, steps, bevel);
const seg = (a, b) => k.segment(a, b, P);
const byDepth = (list, of = (item) => item) => [...list].sort((a, b) => depth(of(a)) - depth(of(b)));

// ---------------------------------------------------------------- plinth
function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, PLINTH_Z - FOOT_H, PLINTH_TOP - PLINTH_Z, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLINTH, 26), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 8, PLINTH_Z - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, PLINTH_Z - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLINTH, PLINTH_Z, PLINTH_TOP - PLINTH_Z, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 6), PLINTH_TOP, P), { tone: "lo" }));
  const screws = k.corners(PLINTH, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, PLINTH_TOP, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, PLINTH_TOP])), { size: 0.55 }));
  // ruler strip along the front: a tick every 10 cm, a major every metre
  const strip = { x: -52, y: 174, w: 236, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, PLINTH_TOP, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 10, strip.y + 0.8, PLINTH_TOP + 0.6, [1.8, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // label plate
  const plate = { x: -52, y: 152, w: 60, d: 16, r: 1.5 };
  const top = PLINTH_TOP + 0.8;
  out.push(S(k.slabOf(plate, PLINTH_TOP, 0.8, P, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), top, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([plate.x + 5, plate.y + 7.4], top, P, "x"), "ISO 5 · CLASS 100", { size: 3.4, tone: "mid" }));
  out.push(L([[5, 46], [5, 34], [5, 40]].map(([x, len], i) => k.lineOnTop([plate.x + x, plate.y + 10 + i * 1.7], [plate.x + x + len, plate.y + 10 + i * 1.7], top, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 3, plate.y + 3, top]), at([plate.x + plate.w - 3, plate.y + 3, top])], { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- shell and sub-floor
const POSTS = [[0, 6], [52, 58], [104, 110], [140, 144]];
function shell() {
  const out = [];
  out.push(S(box(-40, -4, PLINTH_TOP, 244, 148, 0, 1, 2, 0.6), { tone: "lo" }));
  out.push(S(box(-36, -4, 0, 244, 0, Z.top, 0.4, 2, 0.4), { tone: "mid" }));
  out.push(S(box(-40, -4, 0, -36, 148, Z.top, 0.4, 2, 0.4), { tone: "mid", inner: L([48, 96].map((y) => seg([-36, y, 0], [-36, y, Z.top])).join(""), { tone: "lo" }) }));
  // anchor bolts along the outer wall foot
  out.push(D([12, 48, 84, 120].map((y) => at([-35.6, y, 1.2])), { size: 0.45, tone: "mid" }));
  return out.join("");
}

function subfloor() {
  const out = [];
  for (const [y0, y1] of POSTS) out.push(S(box(-4, y0, 0, 0, y1, Z.floor), { tone: "mid" }));
  const pedestals = [];
  for (const y of [96, 120, 141]) for (let i = 1; i <= 9; i++) pedestals.push([24 * i, y]);
  for (const [x, y] of byDepth(pedestals, ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 3.2, 0, 1, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 1.1, 1, Z.tile - 2, P, 14), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(x, y, 1.1, 8, P, 10), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, 3.2, Z.tile - 1, 1, P, 20), { tone: "mid" }));
  }
  return out.join("");
}

// Solid (unperforated) tiles sit under the bench and the counter.
const solidTile = (i, j) => {
  const cx = i * 24 + 12;
  const cy = j * 24 + 12;
  const under = (b) => cx > b.x - 12 && cx < b.x + b.w + 12 && cy > b.y - 12 && cy < b.y + b.d + 12;
  return under(BENCH) || under(COUNTER);
};
// Panel joints, a pass box, a vision window and the airlock door on the back wall.
function backWall() {
  const out = [];
  out.push(L([48, 96, 144, 192].map((x) => seg([x, 0, Z.floor + 3], [x, 0, Z.ceil])).join(""), { tone: "lo" }));
  // pass box with interlocked doors
  out.push(S(box(56, 0, 60, 82, 4, 84, 0.6, 2, 0.4), { tone: "mid" }));
  out.push(`<path class="iso-line" data-tone="faint" d="${k.pathOf([[58.5, 4, 81.5], [79.5, 4, 81.5], [79.5, 4, 62.5], [58.5, 4, 62.5]].map(at), true)}"/>`);
  out.push(S(box(76, 4, 68, 77.4, 5.2, 76, 0.4, 2), { tone: "mid" }));
  out.push(D([at([61, 4, 79]), at([64, 4, 79])], { size: 0.5, tone: "hi" }));
  // vision window: frame, glass and a sill
  out.push(S(box(100, 0, 62, 140, 1.6, 106, 0.4, 2), { tone: "mid" }));
  out.push(`<path class="cr-glass" d="${k.pathOf([[102.5, 1.65, 103.5], [137.5, 1.65, 103.5], [137.5, 1.65, 64.5], [102.5, 1.65, 64.5]].map(at), true)}"/>`);
  out.push(L(seg([110, 1.65, 103.5], [128, 1.65, 64.5]) + seg([118, 1.65, 103.5], [136, 1.65, 64.5]), { tone: "faint" }));
  out.push(S(box(99, 0, 60.5, 141, 3, 62, 0.4, 2), { tone: "mid" }));
  // airlock door: jambs, header, leaf with vision panel, kick plate, handle and closer
  out.push(S(box(150, 0, Z.floor, 152.5, 2, 112, 0.3, 2), { tone: "mid" }));
  out.push(S(box(183.5, 0, Z.floor, 186, 2, 112, 0.3, 2), { tone: "mid" }));
  out.push(S(box(152.5, 0, 109.5, 183.5, 2, 112, 0.3, 2), { tone: "mid" }));
  const face = 0.9;
  const leaf = [`<path class="iso-line" data-tone="faint" d="${k.pathOf([[156, face, 104], [180, face, 104], [180, face, 84], [156, face, 84]].map(at), true)}"/>`,
    `<path class="iso-line" data-tone="faint" d="${k.pathOf([[154, face, 33], [182, face, 33], [182, face, 25.5], [154, face, 25.5]].map(at), true)}"/>`].join("");
  out.push(S(box(152.5, 0, Z.floor + 0.5, 183.5, face, 109.5, 0.3, 2), { tone: "hi", crease: "lo", inner: leaf }));
  out.push(`<path class="cr-glass" d="${k.pathOf([[157, face + 0.05, 103], [179, face + 0.05, 103], [179, face + 0.05, 85], [157, face + 0.05, 85]].map(at), true)}"/>`);
  out.push(S(box(177, face, 64, 178.5, face + 1.6, 71, 0.4, 2), { tone: "mid" }));
  out.push(S(box(155, face, 104.5, 167, face + 2.4, 108, 0.5, 2), { tone: "mid" }));
  return out.join("");
}

function raisedFloor() {
  const out = [];
  out.push(S(box(0, 0, Z.tile, 240, 144, Z.floor, 0.3, 2), { tone: "lo" }));
  const holes = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) if (!solidTile(i, j)) holes.push(...k.dotGrid(i * 24 + 4, j * 24 + 4, 5, 5, 4, Z.floor, P));
  out.push(D(holes, { size: 0.42, tone: "lo" }));
  const seams = [];
  for (let i = 1; i < 10; i++) seams.push(k.lineOnTop([i * 24, 0], [i * 24, 144], Z.floor, P));
  for (let j = 1; j < 6; j++) seams.push(k.lineOnTop([0, j * 24], [240, j * 24], Z.floor, P));
  out.push(L(seams.join(""), { tone: "faint" }));
  out.push(S(box(0, 0, Z.floor, 150, 2, Z.floor + 3, 0.3, 2), { tone: "mid" })); // cove along the back wall
  out.push(S(box(186, 0, Z.floor, 240, 2, Z.floor + 3, 0.3, 2), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- return chase
function chase() {
  const { COIL } = F;
  const out = [];
  out.push(S(box(-36, 0, COIL.z0 - 4, -33, 144, COIL.z0), { tone: "mid" }));
  out.push(S(box(-7, 0, COIL.z0 - 4, -4, 144, COIL.z0), { tone: "mid" }));
  out.push(S(box(COIL.x0, COIL.y0, COIL.z0, COIL.x1, COIL.y1, COIL.z1), {
    tone: "mid",
    inner: L(Array.from({ length: 20 }, (_, i) => k.lineOnTop([COIL.x0, 100 + i * 2], [COIL.x1, 100 + i * 2], COIL.z1, P)).join(""), { tone: "faint" }),
  }));
  out.push(S(box(COIL.x0, COIL.y1, COIL.z0 - 2, COIL.x1, 144, COIL.z1 + 2, 0.5, 2, 0.4), { tone: "hi", crease: "lo" }));
  const tubes = [];
  for (const z of [75, 83, 91]) for (const x of [-31, -25.5, -20, -14.5, -9]) tubes.push(k.sideRing([x, 144, z], 1.4, "y", P, 16));
  out.push(L(tubes.join(""), { tone: "mid" }));
  out.push(D([[-33.5, COIL.z0 - 0.5], [-6.5, COIL.z0 - 0.5], [-33.5, COIL.z1 + 0.5], [-6.5, COIL.z1 + 0.5]].map(([x, z]) => at([x, 144, z])), { size: 0.45 }));
  // the room-side wall of the chase, on its posts
  out.push(S(box(-4, 0, Z.floor, 0, 144, Z.ffu, 0.4, 2, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: -4, y: 0, w: 4, d: 144, r: 0.4 }, 132, P, 2), { tone: "faint" }) }));
  out.push(L([48, 96].map((y) => seg([0, y, Z.floor + 3], [0, y, Z.ceil])).join(""), { tone: "lo" }));
  out.push(S(box(0, 2, Z.floor, 2, 144, Z.floor + 3, 0.3, 2), { tone: "mid" })); // cove
  return out.join("");
}

// Differential-pressure gauge and FFU controller on the chase wall, facing the room.
const GAUGE = { y: 124, z: 98, r: 7 };
const gaugePoint = (r, theta) => [3.2, GAUGE.y - r * Math.sin(theta), GAUGE.z + r * Math.cos(theta)];
function wallInstruments() {
  const out = [];
  const Fg = G.frameAlong([0, GAUGE.y, GAUGE.z], [1, 0, 0]);
  out.push(S(G.disc(0, 3, GAUGE.r, Fg, P), { tone: "mid" }));
  out.push(L(G.circleOf(Fg, 3, GAUGE.r - 1.2, P), { tone: "lo" }));
  const arc = [];
  for (let i = 0; i <= 30; i++) arc.push(gaugePoint(5.4, -0.75 * Math.PI + (i / 30) * 1.5 * Math.PI));
  const ticks = [];
  for (let i = 0; i <= 12; i++) {
    const theta = -0.75 * Math.PI + (i / 12) * 1.5 * Math.PI;
    ticks.push(seg(gaugePoint(5.4, theta), gaugePoint(i % 2 ? 4.7 : 4.2, theta)));
  }
  out.push(L(k.pathOf(arc.map(at)) + ticks.join(""), { tone: "mid" }));
  // 0–60 Pa scale, needle at the +15 Pa room pressure
  const needle = -0.75 * Math.PI + (15 / 60) * 1.5 * Math.PI;
  out.push(L(seg(gaugePoint(1.2, needle + Math.PI), gaugePoint(4.6, needle)), { tone: "hi", free: true }));
  out.push(D([at(gaugePoint(0, 0))], { size: 0.6, tone: "hi" }));
  // reference tube from the gauge up to the ceiling grid
  out.push(S(box(0, GAUGE.y - 0.6, GAUGE.z + GAUGE.r - 1, 1.2, GAUGE.y + 0.6, Z.ceil - 2, 0.5, 2), { tone: "lo", crease: "none" }));
  // controller panel: a box with a display window and two LEDs
  const panel = { y0: 98, y1: 113, z0: 88, z1: 106 };
  out.push(S(box(0, panel.y0, panel.z0, 2.6, panel.y1, panel.z1, 0.6, 2, 0.4), { tone: "mid" }));
  const win = [[2.65, panel.y1 - 2, panel.z1 - 2.5], [2.65, panel.y0 + 2, panel.z1 - 2.5], [2.65, panel.y0 + 2, panel.z1 - 8], [2.65, panel.y1 - 2, panel.z1 - 8]];
  out.push(`<path class="cr-screen" d="${k.pathOf(win.map(at), true)}"/>`);
  out.push(D([at([2.65, panel.y1 - 3, panel.z0 + 3]), at([2.65, panel.y1 - 6, panel.z0 + 3])], { size: 0.55, tone: "hi" }));
  out.push(D([at([2.65, panel.y0 + 3, panel.z0 + 3])], { size: 0.5 }));
  return out.join("");
}

// ---------------------------------------------------------------- ceiling: grid and fan filter units
const FFUS = [];
for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) FFUS.push({ i, j, x0: i * 48, y0: j * 24, cx: i * 48 + 24, cy: j * 24 + 12 });
const BLADE_Z = Z.ffu + 1.3;
const bladesAt = (cx, cy, angle) => {
  let d = "";
  for (let b = 0; b < 3; b++) {
    const a = angle + (b * 2 * Math.PI) / 3;
    d += k.lineOnTop([cx + Math.sin(a) * 4.1, cy - Math.cos(a) * 4.1], [cx + Math.sin(a + 0.5) * 8, cy - Math.cos(a + 0.5) * 8], BLADE_Z, P);
  }
  return d;
};
function ceiling() {
  const out = [];
  out.push(S(box(0, 0, Z.ceil - 2, 240, 144, Z.ceil, 0.3, 2), { tone: "lo" }));
  FFUS.sort((a, b) => depth([a.cx, a.cy, 0]) - depth([b.cx, b.cy, 0]));
  FFUS.forEach((u, index) => {
    const x0 = u.x0, y0 = u.y0, x1 = u.x0 + 48, y1 = u.y0 + 24;
    const pleats = [];
    if (u.j === 5) for (let x = x0 + 1.9; x < x1 - 0.6; x += 1.6) pleats.push(seg([x, y1 - 0.5, Z.ceil], [x, y1 - 0.5, Z.hepa]));
    if (u.i === 4) for (let y = y0 + 1.9; y < y1 - 0.6; y += 1.6) pleats.push(seg([x1 - 0.5, y, Z.ceil], [x1 - 0.5, y, Z.hepa]));
    out.push(S(box(x0 + 0.5, y0 + 0.5, Z.ceil, x1 - 0.5, y1 - 0.5, Z.hepa, 0.4, 2), { tone: "hi", crease: "lo", inner: L(pleats.join(""), { tone: "lo" }) }));
    out.push(S(box(x0 + 2, y0 + 2, Z.hepa, x1 - 2, y1 - 2, Z.ffu, 1, 3, 0.5), { tone: "mid" }));
    out.push(D(k.corners({ x: x0 + 2, y: y0 + 2, w: 44, d: 20 }, 2.2).map(([x, y]) => at([x, y, Z.ffu])), { size: 0.42 }));
    out.push(S(k.cylinder(u.cx, u.cy, 9.4, Z.ffu, 1.2, P, 40), { tone: "mid" }));
    out.push(`<path class="iso-line" data-tone="mid" data-fan="${index}" data-cx="${u.cx}" data-cy="${u.cy}" d="${bladesAt(u.cx, u.cy, index)}"/>`);
    const guard = [k.ring(u.cx, u.cy, 8.6, BLADE_Z + 0.2, P, 40), k.ring(u.cx, u.cy, 6.2, BLADE_Z + 0.2, P, 32)];
    for (let s = 0; s < 4; s++) {
      const a = Math.PI / 4 + (s * Math.PI) / 2;
      guard.push(k.lineOnTop([u.cx + Math.sin(a) * 3.8, u.cy - Math.cos(a) * 3.8], [u.cx + Math.sin(a) * 8.6, u.cy - Math.cos(a) * 8.6], BLADE_Z + 0.2, P));
    }
    out.push(L(guard.join(""), { tone: "lo" }));
    out.push(S(k.cylinder(u.cx, u.cy, 3.8, Z.ffu + 1.2, 5, P, 24), { tone: "mid" }));
    out.push(L(k.ring(u.cx, u.cy, 2, Z.ffu + 6.2, P, 16), { tone: "lo" }));
    out.push(S(box(x1 - 10, y0 + 3, Z.ffu, x1 - 4.5, y0 + 8, Z.ffu + 3, 0.5, 2), { tone: "mid" }));
    out.push(D([at([x1 - 7.2, y0 + 5.5, Z.ffu + 3])], { size: 0.45, tone: "hi" }));
  });
  const rods = [];
  for (let i = 1; i <= 4; i++) for (let j = 1; j <= 5; j++) rods.push([48 * i, 24 * j]);
  for (const [x, y] of byDepth(rods, ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 0.65, Z.ffu, Z.top - Z.ffu, P, 10), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 1.3, Z.ffu + 3, 1.2, P, 12), { tone: "mid" })); // turnbuckle nut
  }
  return out.join("");
}

// ---------------------------------------------------------------- roof steel, deck and MAU
function ibeamY(x) {
  return [
    S(box(x - 2.5, -4, Z.top, x + 2.5, 144, Z.top + 1.4, 0.3, 2), { tone: "mid" }),
    S(box(x - 0.8, -4, Z.top + 1.4, x + 0.8, 144, Z.beam - 1.4, 0.2, 2), { tone: "lo", crease: "none" }),
    S(box(x - 2.5, -4, Z.beam - 1.4, x + 2.5, 144, Z.beam, 0.3, 2), { tone: "mid" }),
  ].join("");
}
function mau() {
  const out = [];
  out.push(S(box(-40, -4, Z.top, -2.5, 144, Z.top + 4, 0.4, 2, 0.4), { tone: "lo" }));
  out.push(L(k.lineOnTop([-40, 72], [-2.5, 72], Z.top + 4, P), { tone: "faint" }));
  const top = Z.top + 4;
  // skid
  out.push(S(box(-37, 14, top, -3, 122, top + 3, 0.4, 2), { tone: "lo" }));
  out.push(D([20, 60, 100, 118].map((y) => at([-3.4, y, top + 3])), { size: 0.45 }));
  // body with five sections: pre-filter, bag filter, cooling coil, fan, discharge plenum
  const cuts = [40, 62, 88, 104];
  const face = [];
  for (const y of cuts) face.push(seg([MAU.x1, y, MAU.z0], [MAU.x1, y, MAU.z1]), k.lineOnTop([MAU.x0, y], [MAU.x1, y], MAU.z1, P));
  out.push(S(box(MAU.x0, MAU.y0, MAU.z0, MAU.x1, MAU.y1, MAU.z1, 1, 3, 0.8), { tone: "mid", inner: L(face.join(""), { tone: "lo" }) }));
  // access doors on the room-facing side, each with a handle and hinges
  const spans = [[MAU.y0, 40], [40, 62], [62, 88], [88, 104]];
  for (const [y0, y1] of spans) {
    const door = [[MAU.x1, y0 + 3, MAU.z1 - 4], [MAU.x1, y1 - 3, MAU.z1 - 4], [MAU.x1, y1 - 3, MAU.z0 + 4], [MAU.x1, y0 + 3, MAU.z0 + 4]];
    out.push(`<path class="iso-line" data-tone="faint" d="${k.pathOf(door.map(at), true)}"/>`);
    out.push(S(box(MAU.x1, y1 - 6.5, MAU.z0 + 12, MAU.x1 + 1, y1 - 5, MAU.z0 + 19, 0.4, 2), { tone: "mid" }));
    out.push(D([at([MAU.x1, y0 + 3, MAU.z1 - 7]), at([MAU.x1, y0 + 3, MAU.z0 + 7])], { size: 0.45 }));
  }
  // filter differential gauge on the bag-filter door
  const Fg = G.frameAlong([MAU.x1, 51, 228], [1, 0, 0]);
  out.push(S(G.disc(0, 1.2, 3.2, Fg, P), { tone: "hi", crease: "lo" }));
  out.push(L(seg([MAU.x1 + 1.25, 51, 228], [MAU.x1 + 1.25, 49.2, 229.6]), { tone: "mid", free: "end" }));
  // fan motor on the roof of the fan section
  out.push(S(k.cylinder(-20, 96, 6, MAU.z1, 7, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(-20, 96, 6, MAU.z1 + 1, MAU.z1 + 6, 30, P), { tone: "faint" }));
  out.push(S(k.cylinder(-20, 96, 3, MAU.z1 + 7, 1.5, P, 20), { tone: "mid" }));
  // weather hood with louvres
  const louvres = [];
  for (let z = 214; z <= 232; z += 2.5) louvres.push(k.sideSeam({ x: -35, y: MAU.y1, w: 30, d: 12, r: 0.6 }, z, P, 2));
  out.push(S(box(-35, MAU.y1, 211, -5, 132, 235, 0.6, 2, 0.4), { tone: "mid", inner: L(louvres.join(""), { tone: "lo" }) }));
  out.push(D([at([-34, 132, 212]), at([-6, 132, 212]), at([-34, 132, 234]), at([-6, 132, 234])], { size: 0.45 }));
  return out.join("");
}
function steel() {
  const out = [];
  for (const x of [0, 48, 96, 144, 192, 240]) out.push(ibeamY(x));
  out.push(S(box(240, 144, 0, 244, 148, Z.top, 0.4, 2, 0.4), { tone: "mid" })); // corner column
  out.push(S(box(239, 143, 0, 245, 149, 1.2, 0.4, 2), { tone: "lo" })); // base plate
  out.push(D([at([239.6, 148.4, 1.2]), at([244.4, 148.4, 1.2])], { size: 0.4 }));
  out.push(S(box(-40, 144, Z.top, 244, 148, Z.top + 1.4, 0.3, 2), { tone: "mid" }));
  out.push(S(box(-40, 145.4, Z.top + 1.4, 244, 146.6, Z.beam - 1.4, 0.2, 2), { tone: "lo", crease: "none" }));
  out.push(S(box(-40, 144, Z.beam - 1.4, 244, 148, Z.beam, 0.3, 2), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- room: process tool, particle counter
function bench() {
  const out = [];
  const { x, y, w, d } = BENCH;
  out.push(`<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 2 }, Z.floor, 2, P)}" style="filter:blur(4px)"/>`);
  out.push(S(box(x + 2, y + 2, Z.floor, x + w - 2, y + d - 2, Z.floor + 4, 0.5, 2), { tone: "lo" }));
  const doors = [seg([x + w / 2, y + d, Z.floor + 4], [x + w / 2, y + d, 58])];
  out.push(S(box(x, y, Z.floor + 4, x + w, y + d, 58, 0.8, 2, 0.5), { tone: "mid", inner: L(doors.join(""), { tone: "lo" }) }));
  for (const hx of [x + w / 2 - 4, x + w / 2 + 2.6]) out.push(S(box(hx, y + d, 46, hx + 1.4, y + d + 1, 53, 0.4, 2), { tone: "mid" }));
  out.push(D([at([x + 3, y + d, 55]), at([x + w - 3, y + d, 55]), at([x + 3, y + d, 31]), at([x + w - 3, y + d, 31])], { size: 0.4 }));
  out.push(S(box(x - 1, y - 1, 58, x + w + 1, y + d + 1, BENCH.z1, 0.8, 2, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline({ x: x + 3, y: y + 3, w: w - 6, d: d - 6, r: 1 }, BENCH.z1, P, 2), { tone: "faint" }));
  // wafer handler: base, column, joint, arm, fork, wafer
  const [sx, sy] = SOURCE;
  const col = [104, sy];
  out.push(S(k.cylinder(col[0], col[1], 5.5, BENCH.z1, 3, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(col[0], col[1], 5.5, BENCH.z1 + 0.6, BENCH.z1 + 2.6, 36, P), { tone: "faint" }));
  out.push(S(k.cylinder(col[0], col[1], 3, BENCH.z1 + 3, 14, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(col[0], col[1], 3, BENCH.z1 + 10, P, 16), { tone: "faint" }));
  out.push(S(k.cylinder(col[0], col[1], 3.8, 78, 2.6, P, 24), { tone: "mid" }));
  out.push(S(box(col[0] - 2.4, sy - 2.2, 80.6, sx + 1.5, sy + 2.2, 82.4, 1, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(col[0], col[1], 1.4, 82.4, 0.8, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(sx, sy, 6, 82.4, 0.6, P, 40), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(sx, sy, 4.4, 83, P, 32), { tone: "faint" }));
  return out.join("");
}

const SCREEN = { x0: 154, x1: 172, z0: 40, z1: 49 };
function counter() {
  const out = [];
  const { x, y, w, d, z0, z1 } = COUNTER;
  out.push(`<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 2 }, Z.floor, 2, P)}" style="filter:blur(4px)"/>`);
  for (const [cx, cy] of byDepth(k.corners({ x, y, w, d }, 3), ([a, b]) => [a, b, 0])) {
    out.push(S(k.cylinder(cx, cy, 1.8, Z.floor, 2.4, P, 16), { tone: "lo" }));
    out.push(S(box(cx - 1, cy - 1, Z.floor + 2.4, cx + 1, cy + 1, z0, 0.3, 2), { tone: "mid" }));
  }
  out.push(S(box(x, y, z0, x + w, y + d, z1, 1.4, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x, y, w, d, r: 1.4 }, 36, P, 3), { tone: "faint" }) }));
  // vents on the x+ side: closed slots
  for (let i = 0; i < 4; i++) {
    const vy = y + 5 + i * 3.4;
    out.push(`<path class="iso-line" data-tone="lo" d="${k.pathOf([[x + w, vy, z0 + 3], [x + w, vy + 1.6, z0 + 3], [x + w, vy + 1.6, z0 + 7.5], [x + w, vy, z0 + 7.5]].map(at), true)}"/>`);
  }
  // keys under the screen
  for (const kx of [156, 160.5, 165]) out.push(S(box(kx, y + d, 33, kx + 3, y + d + 0.8, 35.5, 0.4, 2), { tone: "mid" }));
  // handle on the far end
  for (const hy of [y + 4, y + d - 4]) out.push(S(k.cylinder(x + 2.5, hy, 0.9, z1, 5, P, 10), { tone: "mid" }));
  out.push(S(box(x + 1.5, y + 3, z1 + 5, x + 3.5, y + d - 3, z1 + 6.4, 0.7, 2), { tone: "mid" }));
  // screen in the plane of the front face, with the live count
  const m = k.sideMatrix([SCREEN.x0, y + d], SCREEN.z1, P, "left");
  const sw = SCREEN.x1 - SCREEN.x0;
  const sh = SCREEN.z1 - SCREEN.z0;
  out.push(`<g transform="${m}"><rect class="cr-screen" x="0" y="0" width="${sw}" height="${sh}" rx="0.6"/><text class="cr-digits" data-part="count" x="${sw - 1.4}" y="${sh - 2}" font-size="6.2" text-anchor="end">2</text><text class="cr-units" x="1.2" y="2.6" font-size="1.9">0.5µm/ft³</text></g>`);
  out.push(`<circle class="cr-led" data-part="led" data-state="ok" cx="${at([SCREEN.x1 + 1.6, y + d, SCREEN.z1 - 1.2])[0].toFixed(1)}" cy="${at([SCREEN.x1 + 1.6, y + d, SCREEN.z1 - 1.2])[1].toFixed(1)}" r="0.8"/>`);
  // isokinetic probe: stem and funnel inlet, level with the wafer
  const [px, py, pz] = PROBE;
  out.push(S(k.cylinder(px, py, 2, z1, 1.4, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 0.9, z1 + 1.4, pz - 6 - z1 - 1.4, P, 12), { tone: "hi", crease: "none" }));
  const Fp = G.frameAlong([px, py, pz - 6], [0, 0, 1]);
  out.push(S(G.solidOf([[0, 1.3], [1.5, 1.3, 1], [4, 2.6, 1], [6, 3.4]], Fp, P), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(Fp, 6, 2.6, P), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- end curb and controller on the plinth
function curb() {
  return S(box(240, 0, 0, 244, 144, 30, 0.4, 2, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: 240, y: 0, w: 4, d: 144, r: 0.4 }, Z.floor, P, 2), { tone: "faint" }) });
}
const knobPointer = (v) => {
  const t = -0.75 * Math.PI + ((v - F.V_MIN) / (F.V_MAX - F.V_MIN)) * 1.5 * Math.PI;
  return k.lineOnTop([KNOB[0], KNOB[1]], [KNOB[0] + Math.sin(t) * 4.6, KNOB[1] - Math.cos(t) * 4.6], CTRL_TOP + 5, P);
};
function controller() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(CTRL, PLINTH_TOP, 4, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(CTRL, PLINTH_TOP, CTRL_TOP - PLINTH_TOP, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CTRL, -3, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(CTRL, 2.4).map(([x, y]) => at([x, y, CTRL_TOP])), { size: 0.45 }));
  // scale: an arc 0.10–0.60 m/s with a tick every 0.05 and a long tick at the 0.45 design point
  const arc = [];
  for (let i = 0; i <= 40; i++) {
    const a = -0.75 * Math.PI + (i / 40) * 1.5 * Math.PI;
    arc.push([KNOB[0] + Math.sin(a) * 9, KNOB[1] - Math.cos(a) * 9]);
  }
  out.push(L(k.onTop(arc, CTRL_TOP, P), { tone: "lo" }));
  const t = k.radialTicks(KNOB[0], KNOB[1], 9, 10, 2, CTRL_TOP, [1, 1.9], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const n = -0.75 * Math.PI + ((F.NOMINAL - F.V_MIN) / (F.V_MAX - F.V_MIN)) * 1.5 * Math.PI;
  out.push(L(k.lineOnTop([KNOB[0] + Math.sin(n) * 6.4, KNOB[1] - Math.cos(n) * 6.4], [KNOB[0] + Math.sin(n) * 9, KNOB[1] - Math.cos(n) * 9], CTRL_TOP, P), { tone: "hi" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], 5.5, CTRL_TOP, 5, P, 36), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], 5.5, CTRL_TOP + 0.6, CTRL_TOP + 5, 40, P), { tone: "lo" }));
  out.push(`<path class="iso-line" data-tone="lit" data-part="pointer" data-free="end" d="${knobPointer(F.NOMINAL)}" style="stroke-width:1.1"/>`);
  out.push(D([at([KNOB[0], KNOB[1], CTRL_TOP + 5])], { size: 0.6, tone: "hi" }));
  // display on the front face
  const m = k.sideMatrix([CTRL.x + 4, CTRL.y + CTRL.d], -1, P, "left");
  out.push(`<g transform="${m}"><rect class="cr-screen" x="0" y="0" width="17" height="6.6" rx="0.5"/><text class="cr-digits" data-part="setpoint" x="15.6" y="5.2" font-size="4.8" text-anchor="end">0.45</text></g>`);
  out.push(D([at([CTRL.x + 24, CTRL.y + CTRL.d, -3.8]), at([CTRL.x + 27, CTRL.y + CTRL.d, -3.8])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

// ---------------------------------------------------------------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "cr-svg",
  label:
    "A sectioned model of a Class 100 cleanroom bay. Thirty fan filter units cover the ceiling and blow HEPA-filtered air straight down at about 0.45 m/s; it leaves through a perforated raised floor, runs under the floor to a return chase with a dry cooling coil, rises to the ceiling plenum and is drawn into the fans again, with makeup air added from a unit on the roof. Particles shed at a wafer handler are swept down; a particle counter beside it reads the count per cubic foot.",
  body: [
    plinth(),
    shell(),
    backWall(),
    subfloor(),
    raisedFloor(),
    chase(),
    wallInstruments(),
    ceiling(),
    mau(),
    steel(),
    bench(),
    counter(),
    curb(),
    controller(),
    `<g class="cr-live" aria-hidden="true"><path class="cr-makeup" data-wisp="m0" d=""/><path class="cr-makeup" data-wisp="m1" d=""/><path class="cr-makeup" data-wisp="m2" d=""/><path class="cr-makeup" data-wisp="m3" d=""/><path class="cr-makeup" data-wisp="m4" d=""/><path class="cr-makeup" data-wisp="m5" d=""/><path class="cr-makeup" data-wisp="m6" d=""/><path class="cr-makeup" data-wisp="m7" d=""/><path class="cr-air" data-wisp="a0" d=""/><path class="cr-air" data-wisp="a1" d=""/><path class="cr-air" data-wisp="a2" d=""/><path class="cr-air" data-wisp="a3" d=""/><path class="cr-air" data-wisp="a4" d=""/><path class="cr-air" data-wisp="a5" d=""/><path class="cr-air" data-wisp="a6" d=""/><path class="cr-air" data-wisp="a7" d=""/><path class="cr-dust" data-part="dust" d=""/><circle class="cr-catch" data-part="catch" cx="${at(PROBE)[0].toFixed(1)}" cy="${at(PROBE)[1].toFixed(1)}" r="3.2"/></g>`,
  ],
});

const CSS = `
.cr-air,.cr-makeup{fill:none;stroke:var(--cr-air);stroke-linecap:butt;stroke-linejoin:round}
.cr-makeup{stroke:var(--anatomy-green)}
[data-wisp$="0"]{stroke-width:1.20;opacity:0.920}[data-wisp$="1"]{stroke-width:1.12;opacity:0.743}[data-wisp$="2"]{stroke-width:1.04;opacity:0.581}[data-wisp$="3"]{stroke-width:0.96;opacity:0.434}[data-wisp$="4"]{stroke-width:0.88;opacity:0.303}[data-wisp$="5"]{stroke-width:0.80;opacity:0.192}[data-wisp$="6"]{stroke-width:0.72;opacity:0.100}[data-wisp$="7"]{stroke-width:0.64;opacity:0.033}
[data-wisp$="0"]{stroke-linecap:round}
.cr-glass{fill:var(--cr-glass);stroke:var(--anatomy-lo);stroke-width:.4;vector-effect:non-scaling-stroke}
.cr-dust{fill:none;stroke:var(--anatomy-red);stroke-width:1.7;stroke-linecap:round}
.cr-catch{fill:none;stroke:var(--anatomy-red);stroke-width:.6;opacity:0;vector-effect:non-scaling-stroke}
.cr-screen{fill:var(--cr-screen);stroke:var(--anatomy-lo);stroke-width:.4;vector-effect:non-scaling-stroke}
.cr-digits{fill:var(--cr-digit);font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums;letter-spacing:.02em}
.cr-units{fill:var(--anatomy-mid);font-family:var(--anatomy-mono)}
.cr-led{fill:var(--anatomy-green)}
.cr-led[data-state="over"]{fill:var(--anatomy-red)}
.iso{--cr-screen:#0a0d0b;--cr-digit:#9be7b4;--cr-air:#8cc0ff;--cr-glass:#1a1f24}
.iso[data-theme="light"]{--cr-screen:#e3e7e2;--cr-digit:#1e3a2a;--cr-air:#3a7be8;--cr-glass:#e8eef2}
.cr-stage{outline:none;cursor:ew-resize;touch-action:pan-y}
.cr-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-mid)}
.iso-caption{display:block;margin-top:4px}
.iso-plate{overflow:hidden}
@media (max-width:560px){.cr-stage .iso-svg{width:118%;margin-left:-9%}}
`;

const flowSource = readFileSync(join(HERE, "flow.mjs"), "utf8").replace(/^export /gm, "");
const live = `
${flowSource}
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".cr-stage");
const svg = stage.querySelector("svg");
const q = (name) => svg.querySelector('[data-part="' + name + '"]');
const airEls = [...Array(8).keys()].map((j) => svg.querySelector('[data-wisp="a' + j + '"]')), makeupEls = [...Array(8).keys()].map((j) => svg.querySelector('[data-wisp="m' + j + '"]')), dustEl = q("dust"), catchEl = q("catch");
const countEl = q("count"), ledEl = q("led"), setEl = q("setpoint"), pointerEl = q("pointer");
const fans = [...svg.querySelectorAll("[data-fan]")].map((el) => ({ el, cx: +el.dataset.cx, cy: +el.dataset.cy, phase: +el.dataset.fan }));
const readout = stage.closest(".iso-plate").querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const KNOB = ${JSON.stringify(KNOB)}, CTRL_TOP = ${CTRL_TOP}, BLADE_Z = ${BLADE_Z};
const { cosA, sinA, cosE, sinE } = cameraOf(P);
const V = [cosA * cosE, sinA * cosE, sinE];
const BOXES = occluders();
BOXES.push([${CTRL.x}, ${CTRL.y}, ${PLINTH_TOP}, ${CTRL.x + CTRL.w}, ${CTRL.y + CTRL.d}, ${CTRL_TOP + 5}]);
const LOOPS = loops(1);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const knobPointer = ${knobPointer.toString().replace(/k\./g, "").replace(/F\./g, "")};
const bladesAt = ${bladesAt.toString().replace(/k\./g, "")};
const fmt = (n) => (n >= 9999 ? "9999" : String(Math.round(n)));

// seeded random, so the still frame is the same every time
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

const parcels = [];
LOOPS.forEach((loop) => { for (let j = 0; j < 4; j++) parcels.push({ loop, t: ((j + rand() * 0.9) / 4) * loop.length, f: [rand() * 6.28, rand() * 6.28, rand() * 6.28], a: 0.6 + rand() * 0.8 }); });
const MAKEUP = (() => {
  const pts = makeupPath(); const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const n = Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]) / 1); for (let s = 0; s < n; s++) out.push(a.map((v, k2) => v + (b[k2] - v) * s / n)); }
  return out;
})();
const makeup = Array.from({ length: 9 }, (_, i) => ({ t: (i / 9) * MAKEUP.length }));

const sampleAt = (loop, t) => {
  const n = loop.length; let u = ((t % n) + n) % n; const i = Math.floor(u); const f = u - i;
  const a = loop[i], b = loop[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};
const STREAK = 0.6; // seconds of travel shown by each wisp
const SEGS = 8;
let wall = 0;
// A parcel drifts a little across its streamline: barely in the laminar room, more where the
// return air is fast and turbulent. The wiggle depends on where it is and slowly on time,
// so its tail traces a soft curve instead of a ruler line.
const wobbleAt = (p, tau) => {
  const base = sampleAt(p.loop, tau);
  const ahead = sampleAt(p.loop, tau + 1);
  let dx = ahead[0] - base[0], dy = ahead[1] - base[1], dz = ahead[2] - base[2];
  const n = Math.hypot(dx, dy, dz) || 1; dx /= n; dy /= n; dz /= n;
  const amp = p.a * (speedFactor(base) > 1.5 ? 2.6 : 1.7);
  let ox = Math.sin(0.07 * tau + p.f[0] + 0.45 * wall), oy = Math.sin(0.055 * tau + p.f[1] + 0.35 * wall), oz = Math.sin(0.063 * tau + p.f[2] + 0.4 * wall);
  const along = ox * dx + oy * dy + oz * dz;
  ox -= along * dx; oy -= along * dy; oz -= along * dz;
  return [base[0] + ox * amp, base[1] + oy * amp, base[2] + oz * amp];
};
// Draw a wisp from its history points, head first; each piece fades into one of five buckets.
const wisp = (pts, out) => {
  for (let j = 0; j < SEGS; j++) {
    let a = pts[j], b = pts[j + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len > 2.6) { const s = 2.6 / len; b = [a[0] + dx * s, a[1] + dy * s, a[2] + dz * s]; pts[j + 1] = b; }
    if (hidden(a, V, BOXES) || hidden(b, V, BOXES)) continue;
    const A = iso(a, P), B = iso(b, P);
    out[j] += "M" + A[0].toFixed(1) + " " + A[1].toFixed(1) + "L" + B[0].toFixed(1) + " " + B[1].toFixed(1);
  }
};

// particles shed at the wafer: advected down at v, diffusing with D
const dust = [];
const DU = D * M * M; // world units^2 per second
const EMIT = 26; // drawn particles per second (each stands for ~385 real ones)
let emitCarry = 0, catches = 0, flash = 0;
function stepDust(v, dt) {
  const vu = v * M;
  emitCarry += EMIT * dt;
  while (emitCarry >= 1) { emitCarry -= 1; if (dust.length < 700) dust.push([SOURCE[0] + gauss() * 1.5, SOURCE[1] + gauss() * 1.5, SOURCE[2] + 0.5]); }
  const s = Math.sqrt(2 * DU * dt);
  const top = BENCH.z1 + 0.6;
  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p[0] += gauss() * s; p[1] += gauss() * s; p[2] += gauss() * s;
    const onTop = p[0] > BENCH.x - 1 && p[0] < BENCH.x + BENCH.w + 1 && p[1] > BENCH.y - 1 && p[1] < BENCH.y + BENCH.d + 1 && p[2] < top + 1.5;
    if (onTop) {
      // the downflow splits on the worktop and carries the particles to its nearest edge
      const ex = [BENCH.x - 1 - p[0], BENCH.x + BENCH.w + 1 - p[0]], ey = [BENCH.y - 1 - p[1], BENCH.y + BENCH.d + 1 - p[1]];
      const bx = Math.abs(ex[0]) < Math.abs(ex[1]) ? ex[0] : ex[1], by = Math.abs(ey[0]) < Math.abs(ey[1]) ? ey[0] : ey[1];
      if (Math.abs(bx) < Math.abs(by)) p[0] += Math.sign(bx) * vu * dt; else p[1] += Math.sign(by) * vu * dt;
      p[2] = Math.max(p[2] - vu * dt, top);
    } else p[2] -= vu * dt;
    const near = Math.hypot(p[0] - PROBE[0], p[1] - PROBE[1], p[2] - PROBE[2]) < 3.2;
    if (near) { catches++; flash = 1; }
    if (near || p[2] < Z.floor || p[0] < 0 || p[0] > 240 || p[1] < 0 || p[1] > 144 || p[2] > Z.ceil) dust.splice(i, 1);
  }
}

let v = NOMINAL, target = NOMINAL, rate = 0, shown = perFt3(NOMINAL), spin = 0;
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const TOUR = [[0.45, 7], [0.3, 6], [0.15, 10], [0.6, 6]];
const TOUR_T = TOUR.reduce((s, [, d]) => s + d, 0);
const tourAt = (t) => { let u = t % TOUR_T; for (const [x, d] of TOUR) { if (u < d) return x; u -= d; } return NOMINAL; };

function draw() {
  const air = Array(SEGS).fill("");
  const back = (STREAK * v * M) / SEGS;
  for (const p of parcels) {
    const pts = [];
    for (let j = 0; j <= SEGS; j++) pts.push(wobbleAt(p, p.t - j * back));
    wisp(pts, air);
  }
  airEls.forEach((el, j) => el.setAttribute("d", air[j]));
  const mk = Array(SEGS).fill("");
  for (const p of makeup) {
    const i = Math.floor(p.t) % MAKEUP.length;
    if (i < 17) continue;
    wisp([...Array(SEGS + 1).keys()].map((j) => MAKEUP[i - j * 2]), mk);
  }
  makeupEls.forEach((el, j) => el.setAttribute("d", mk[j]));
  let s = "";
  for (const p of dust) { if (hidden(p, V, BOXES)) continue; const a = iso(p, P); s += "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "h0"; }
  dustEl.setAttribute("d", s);
  catchEl.style.opacity = (flash * 0.9).toFixed(2);
  catchEl.setAttribute("r", (3.2 + (1 - flash) * 3).toFixed(1));
  fans.forEach((f) => f.el.setAttribute("d", bladesAt(f.cx, f.cy, f.phase + spin)));
  pointerEl.setAttribute("d", knobPointer(v));
  const vs = v.toFixed(2);
  if (setEl.textContent !== vs) setEl.textContent = vs;
  const c = fmt(shown);
  if (countEl.textContent !== c) countEl.textContent = c;
  const over = shown > LIMIT;
  ledEl.dataset.state = over ? "over" : "ok";
  const text = vs + " m/s · " + Math.round(airChanges(v)) + " ACH · " + c + " อนุภาค/ft³ · " + (over ? "เกิน Class 100" : "ผ่าน Class 100");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", vs);
  stage.setAttribute("aria-valuetext", vs + " เมตรต่อวินาที, " + c + " อนุภาคต่อลูกบาศก์ฟุต, FFU ใช้ไฟ " + (fanPower(v) / 1000).toFixed(1) + " kW");
}

function advance(dt) {
  if (touring) { clock += dt; target = tourAt(clock); }
  // fans spin up and down like real EC motors: a damped spring, about a second
  const stiff = 6, drag = 2 * Math.sqrt(stiff) * 1.05;
  rate += ((target - v) * stiff - rate * drag) * dt; v += rate * dt;
  v = clamp(v, 0.05, 0.65);
  const vu = v * M;
  for (const p of parcels) p.t += vu * dt;
  for (const p of makeup) p.t = (p.t + 2.4 * M * dt * 0.25) % MAKEUP.length;
  stepDust(v, dt);
  shown += (perFt3(v) - shown) * (1 - Math.exp(-dt / 2.5)); // the counter integrates its sample
  wall += dt;
  spin += dt * 2 * Math.PI * 0.7 * (v / NOMINAL);
  flash = Math.max(0, flash - dt * 2.5);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const n = Math.ceil(dt / (1 / 60));
  for (let i = 0; i < n; i++) advance(dt / n);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false; target = clamp(next, V_MIN, V_MAX);
  clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = true; clock = 0; run(); }, 5000);
  if (still.matches) { v = target; rate = 0; shown = perFt3(v); for (let i = 0; i < 240; i++) advance(1 / 60); draw(); }
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1);
  steer(V_MIN + share * (V_MAX - V_MIN));
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 0.05;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 0.05;
  if (event.key === "Home") to = NOMINAL;
  if (event.key === "End") to = V_MIN;
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(to * 20) / 20);
});
// warm the room up so the first frame already shows a steady plume
touring = false;
for (let i = 0; i < 300; i++) advance(1 / 60);
touring = !still.matches; clock = 0;
draw();
`;

const body = `<style>${CSS}</style>` + k.plateHtml({
  fig: "Fig 1",
  title: "Cleanroom Class 100 · HVAC",
  hint: "เลื่อนเมาส์ซ้าย–ขวา = ปรับความเร็ว FFU",
  readout: "0.45 m/s · 531 ACH · 2 อนุภาค/ft³ · ผ่าน Class 100",
  keys: [
    { mark: "blue", label: "อากาศสะอาดจาก HEPA: ไหลลงทางเดียว → พื้นยกเจาะรู → ใต้พื้น → ช่องลมกลับ → plenum → FFU" },
    { mark: "green", label: "อากาศภายนอก (makeup air) จาก MAU บนหลังคา ชดเชยลมรั่ว/ดูดทิ้ง ให้ห้องเป็นบวก +15 Pa" },
    { mark: "red", label: "อนุภาค ≥0.5 µm จากเครื่องจักรและคน (ประมาณ 6×10⁵ ต่อนาที)" },
    { mark: "raised", label: "FFU 30 ชุด (1.2 × 0.6 ม.) คลุมเพดาน 100%" },
  ],
  caption:
    "ห้องสะอาด Class 100 (ISO 5) ใช้การไหลแบบทิศทางเดียว: พัดลม FFU ดันอากาศผ่านแผ่นกรอง HEPA (99.97% ที่ 0.3 µm) ลงสู่พื้นด้วยความเร็วออกแบบ 0.45 m/s ± 20% หรือราว 530 รอบต่อชั่วโมงสำหรับห้องสูง 3 ม. อนุภาคที่เกิดตรงจุดทำงานจึงถูกกวาดลงพื้นก่อนจะฟุ้งไปทางข้าง แล้วอากาศกลับผ่านใต้พื้นยกขึ้นช่องลมกลับซึ่งมีคอยล์เย็นแบบแห้งคุมอุณหภูมิ เครื่องนับอนุภาควางห่างแหล่งกำเนิด 0.8 ม. ในระดับเดียวกัน ค่าที่อ่านมาจากสมการการพาและการแพร่ C = G/(4πDr)·e^(−vr/2D) โดย D = 0.03 m²/s: ลดความเร็วต่ำกว่าราว 0.17 m/s เมื่อไร การแพร่ทางข้างชนะการพาลง และค่าเกิน 100 อนุภาค/ft³ ทันที ขณะที่กำลังไฟพัดลมลดลงตามกำลังสามของความเร็ว",
  body: `<div class="cr-stage" tabindex="0" role="slider" aria-label="ความเร็วลม FFU: ใช้ปุ่มลูกศรปรับทีละ 0.05 m/s" aria-valuemin="${F.V_MIN}" aria-valuemax="${F.V_MAX}" aria-valuenow="${F.NOMINAL}">${svg}</div>`,
});

const report = () => console.log("count at 0.45:", F.perFt3(0.45).toFixed(2), "crossing:", (() => { let v = 0.6; while (F.perFt3(v) < 100) v -= 0.001; return v.toFixed(3); })());
if (embed) {
  // Site embed: a markup fragment for the Astro component and a hashed module script under /assets.
  const SITE = join(HERE, "..", "..");
  const script = kitScript() + live;
  const hash = createHash("sha256").update(script).digest("hex").slice(0, 10);
  const assets = join(SITE, "public", "assets", "figures");
  mkdirSync(assets, { recursive: true });
  for (const name of readdirSync(assets)) if (/^cleanroom-hvac\.[0-9a-f]+\.js$/.test(name)) rmSync(join(assets, name));
  writeFileSync(join(assets, `cleanroom-hvac.${hash}.js`), script);
  const components = join(SITE, "src", "components", "figures");
  mkdirSync(components, { recursive: true });
  const fragment = `<div class="iso cr-embed" data-theme="light"><style>${k.ISO_CSS}.cr-embed .iso-figure{margin:3rem 0}.cr-embed .iso-plate{border-radius:1rem}@media (max-width:560px){.cr-embed .iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;text-align:right;font-size:9.5px;line-height:1.35}.cr-embed .iso-plate-corner[data-corner="hint"]{bottom:30px}.cr-embed .iso-plate{padding-bottom:84px}}</style>${body}<script type="module" src="/assets/figures/cleanroom-hvac.${hash}.js"></script></div>`;
  writeFileSync(join(components, "cleanroom-hvac.fragment.html"), fragment);
  console.log("wrote embed fragment and", `cleanroom-hvac.${hash}.js`);
  report();
} else {
  const file = theme === "light" ? "cleanroom-hvac-light.html" : "cleanroom-hvac.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "Cleanroom HVAC", theme, body, script: kitScript() + live, width: 860 }).replace('<html lang="en">', '<html lang="th">'));
  console.log("wrote", file);
  report();
}
