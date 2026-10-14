// Pure model of the cleanroom: geometry, physics and the air paths.
// Imported by build.mjs and inlined (exports stripped) into the live page.

export const M = 40; // world units per metre

// Room shell (world units). x along the bay, y across it, z up.
export const ROOM = { x0: 0, x1: 240, y0: 0, y1: 144 };
export const Z = { slab: 0, floor: 24, tile: 22, ceil: 146, hepa: 151, ffu: 160, top: 200, beam: 208 };
export const CHASE = { x0: -36, x1: -4 }; // return-air chase between the outer wall and the room wall
export const COIL = { x0: -35, x1: -5, y0: 2, y1: 140, z0: 70, z1: 96 };

// Process tool and particle counter.
export const BENCH = { x: 88, y: 40, w: 56, d: 38, z0: 24, z1: 61 };
export const SOURCE = [131, 59, 84]; // wafer on the handler: where particles are shed
export const PROBE = [163, 59, 84]; // isokinetic inlet of the particle counter, same height
export const COUNTER = { x: 151, y: 48, w: 24, d: 22, z0: 28, z1: 54 };

// Physics.
export const NOMINAL = 0.45; // m/s, unidirectional-flow design velocity
export const V_MIN = 0.1;
export const V_MAX = 0.6;
export const G = 1e4; // particles >= 0.5 um shed per second by tool and operators (6 x 10^5 / min)
export const D = 0.03; // m^2/s, turbulent diffusivity in the room
export const LIMIT = 100; // FED-STD-209E Class 100: particles >= 0.5 um per ft^3
export const FT3 = 0.0283168; // m^3 per ft^3
export const FFU_COUNT = 30;
export const FFU_FACE = 1.2 * 0.6; // m^2 per FFU
export const FFU_WATTS = 120; // W per FFU at 0.45 m/s
export const ROOM_H = (Z.ceil - Z.floor) / M; // 3.05 m

export const probeDistance = () => Math.hypot(PROBE[0] - SOURCE[0], PROBE[1] - SOURCE[1], PROBE[2] - SOURCE[2]) / M;

// Steady point source in uniform downflow v with eddy diffusivity D:
// C(r, z) = G / (4 pi D r) * exp(-v (r + z) / 2D), z measured downstream. The probe sits level with the source, z = 0.
export const concentration = (v) => {
  const r = probeDistance();
  return (G / (4 * Math.PI * D * r)) * Math.exp((-v * r) / (2 * D));
};
export const perFt3 = (v) => concentration(v) * FT3;
export const flowRate = (v) => v * FFU_COUNT * FFU_FACE * 3600; // m^3/h
export const airChanges = (v) => (v * 3600) / ROOM_H;
export const fanPower = (v) => FFU_COUNT * FFU_WATTS * Math.pow(v / NOMINAL, 3); // fan affinity law

// Air speed relative to the room downflow, by continuity, at a point on a path.
const SUB_H = Z.tile - Z.slab;
const PLENUM_H = Z.top - Z.ffu;
export function speedFactor([x, , z]) {
  const L = ROOM.x1 - ROOM.x0;
  if (x < CHASE.x1 + 0.5 && z > Z.slab + SUB_H * 0.5 && z < Z.ffu) return L / (CHASE.x1 - CHASE.x0); // up the chase
  if (z < Z.tile) return Math.max(1, (L - Math.max(0, x)) / SUB_H); // sub-floor, gathering toward the chase
  if (z > Z.ffu + 2) return Math.max(1, (L - Math.max(0, x)) / PLENUM_H); // plenum, spreading to the fans
  return 1; // room and through the FFUs
}

// Round the corners of a closed polyline with quarter-circle-like quadratic arcs.
function rounded(points, radius, per = 6) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n];
    const b = points[i];
    const c = points[(i + 1) % n];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const bc = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]);
    const r = Math.min(radius, ab * 0.45, bc * 0.45);
    const p = b.map((v, k) => v + ((a[k] - v) * r) / ab);
    const q = b.map((v, k) => v + ((c[k] - v) * r) / bc);
    for (let s = 0; s <= per; s++) {
      const t = s / per;
      out.push(p.map((v, k) => (1 - t) * (1 - t) * v + 2 * (1 - t) * t * b[k] + t * t * q[k]));
    }
  }
  return out;
}

// The recirculation loops: one per (FFU column, lane, side). Each is sampled at even steps of
// "room time" (arc length divided by the local speed factor), so a parcel advancing at the
// room velocity moves at the true speed everywhere on its loop.
export const FAN_X = [24, 72, 120, 168, 216];
export const LANES = [
  { room: 138, fan: 132 },
  { room: 122, fan: 108 },
  { room: 106, fan: 108 },
  { room: 90, fan: 84 },
  { room: 28, fan: 36 },
  { room: 10, fan: 12 },
];
export const OFFSETS = [-18, -6, 6, 18];
export function loops(step = 1) {
  const out = [];
  const L = ROOM.x1;
  for (const fx of FAN_X) {
    const f = fx / L;
    const zs = Z.tile - 3 - 15 * f; // far columns run lowest under the floor
    const zp = Z.ffu + 6 + 28 * f; // and highest in the plenum
    const xc = CHASE.x1 - 4 - 24 * f; // and on the outside of the chase
    for (const lane of LANES) {
      for (const off of OFFSETS) {
        const xr = fx + off; // where it leaves the HEPA face
        const xin = fx + Math.sign(off) * 6.5; // where it enters the fan, between hub and guard
        const pts = [
          [xc, lane.room, zs],
          [xc, lane.room, Z.ffu - 4],
          [xc, lane.fan, zp],
          [xin, lane.fan, zp],
          [xin, lane.fan, Z.ffu + 1],
          [xr, lane.room, Z.hepa - 6],
          [xr, lane.room, zs],
        ];
        const path = rounded(pts, 14);
        // resample by room time
        const samples = [];
        let carry = 0;
        for (let i = 0; i < path.length; i++) {
          const a = path[i];
          const b = path[(i + 1) % path.length];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
          const pieces = Math.max(1, Math.ceil(len / 0.5));
          for (let k = 0; k < pieces; k++) {
            const t0 = k / pieces;
            const p = a.map((v, j) => v + (b[j] - v) * (t0 + 0.5 / pieces));
            const dt = len / pieces / speedFactor(p);
            carry += dt;
            while (carry >= step) {
              carry -= step;
              const t = t0 + (1 / pieces) * (1 - carry / dt);
              samples.push(a.map((v, j) => Math.round((v + (b[j] - v) * t) * 10) / 10));
            }
          }
        }
        out.push(samples);
      }
    }
  }
  return out;
}

// Makeup air: outdoor air in through the MAU hood, down through the deck into the chase top.
export const MAU = { x0: -36, x1: -4, y0: 16, y1: 120, z0: 207, z1: 236 };
export function makeupPath() {
  return [
    [-20, 196, 224],
    [-20, 131, 224],
    [-20, 116, 222],
    [-20, 116, 196],
    [-14, 116, 178],
    [60, 116, 176],
  ];
}

// Boxes that hide what is behind them, for culling the moving air and particles.
export function occluders() {
  const b = (x0, y0, z0, x1, y1, z1) => [x0, y0, z0, x1, y1, z1];
  const list = [
    b(-40, -4, -10, 244, 148, 0), // structural slab
    b(-36, -4, 0, 244, 0, Z.top), // back wall
    b(-40, -4, 0, -36, 148, Z.top), // outer chase wall
    b(-4, 0, Z.floor, 0, 144, Z.ffu), // room-side chase wall
    b(0, 0, Z.tile, 240, 144, Z.floor), // raised floor
    b(240, -4, 0, 244, 148, 30), // end curb
    b(0, 0, Z.ceil - 2, 240, 144, Z.ffu), // FFU layer
    b(COIL.x0, COIL.y0, COIL.z0, COIL.x1, 144, COIL.z1), // dry cooling coil
    b(-40, -4, Z.top, -2, 148, Z.top + 4), // MAU deck
    b(-37, 14, Z.top + 4, -3, 132, 236), // MAU and hood
    b(-40, 144, Z.top, 244, 148, Z.beam), // front girder
    b(240, 144, 0, 244, 148, Z.beam), // corner column
    b(BENCH.x, BENCH.y, BENCH.z0, BENCH.x + BENCH.w, BENCH.y + BENCH.d, BENCH.z1),
    b(98, 53, BENCH.z1, 110, 65, 83), // wafer handler column
    b(COUNTER.x, COUNTER.y, COUNTER.z0 - 4, COUNTER.x + COUNTER.w, COUNTER.y + COUNTER.d, COUNTER.z1),
  ];
  for (let x = 0; x <= 240; x += 48) list.push(b(x - 2, -4, Z.top, x + 2, 144, Z.beam));
  for (const [y0, y1] of [[0, 6], [52, 58], [104, 110], [140, 144]]) list.push(b(-4, y0, 0, 0, y1, Z.floor)); // posts under the chase wall
  return list;
}

// Does the ray from p toward the viewer (direction V) hit any box?
export function hidden(p, V, boxes) {
  for (const bx of boxes) {
    let t0 = 1e-3;
    let t1 = 1e9;
    let miss = false;
    for (let k = 0; k < 3; k++) {
      const lo = bx[k];
      const hi = bx[k + 3];
      if (Math.abs(V[k]) < 1e-9) {
        if (p[k] < lo || p[k] > hi) { miss = true; break; }
        continue;
      }
      let a = (lo - p[k]) / V[k];
      let c = (hi - p[k]) / V[k];
      if (a > c) [a, c] = [c, a];
      if (a > t0) t0 = a;
      if (c < t1) t1 = c;
      if (t0 > t1) { miss = true; break; }
    }
    if (!miss) return true;
  }
  return false;
}
