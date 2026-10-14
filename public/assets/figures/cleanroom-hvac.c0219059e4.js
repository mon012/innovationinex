const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

// Pure model of the cleanroom: geometry, physics and the air paths.
// Imported by build.mjs and inlined (exports stripped) into the live page.

const M = 40; // world units per metre

// Room shell (world units). x along the bay, y across it, z up.
const ROOM = { x0: 0, x1: 240, y0: 0, y1: 144 };
const Z = { slab: 0, floor: 24, tile: 22, ceil: 146, hepa: 151, ffu: 160, top: 200, beam: 208 };
const CHASE = { x0: -36, x1: -4 }; // return-air chase between the outer wall and the room wall
const COIL = { x0: -35, x1: -5, y0: 2, y1: 140, z0: 70, z1: 96 };

// Process tool and particle counter.
const BENCH = { x: 88, y: 40, w: 56, d: 38, z0: 24, z1: 61 };
const SOURCE = [131, 59, 84]; // wafer on the handler: where particles are shed
const PROBE = [163, 59, 84]; // isokinetic inlet of the particle counter, same height
const COUNTER = { x: 151, y: 48, w: 24, d: 22, z0: 28, z1: 54 };

// Physics.
const NOMINAL = 0.45; // m/s, unidirectional-flow design velocity
const V_MIN = 0.1;
const V_MAX = 0.6;
const G = 1e4; // particles >= 0.5 um shed per second by tool and operators (6 x 10^5 / min)
const D = 0.03; // m^2/s, turbulent diffusivity in the room
const LIMIT = 100; // FED-STD-209E Class 100: particles >= 0.5 um per ft^3
const FT3 = 0.0283168; // m^3 per ft^3
const FFU_COUNT = 30;
const FFU_FACE = 1.2 * 0.6; // m^2 per FFU
const FFU_WATTS = 120; // W per FFU at 0.45 m/s
const ROOM_H = (Z.ceil - Z.floor) / M; // 3.05 m

const probeDistance = () => Math.hypot(PROBE[0] - SOURCE[0], PROBE[1] - SOURCE[1], PROBE[2] - SOURCE[2]) / M;

// Steady point source in uniform downflow v with eddy diffusivity D:
// C(r, z) = G / (4 pi D r) * exp(-v (r + z) / 2D), z measured downstream. The probe sits level with the source, z = 0.
const concentration = (v) => {
  const r = probeDistance();
  return (G / (4 * Math.PI * D * r)) * Math.exp((-v * r) / (2 * D));
};
const perFt3 = (v) => concentration(v) * FT3;
const flowRate = (v) => v * FFU_COUNT * FFU_FACE * 3600; // m^3/h
const airChanges = (v) => (v * 3600) / ROOM_H;
const fanPower = (v) => FFU_COUNT * FFU_WATTS * Math.pow(v / NOMINAL, 3); // fan affinity law

// Air speed relative to the room downflow, by continuity, at a point on a path.
const SUB_H = Z.tile - Z.slab;
const PLENUM_H = Z.top - Z.ffu;
function speedFactor([x, , z]) {
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
const FAN_X = [24, 72, 120, 168, 216];
const LANES = [
  { room: 138, fan: 132 },
  { room: 122, fan: 108 },
  { room: 106, fan: 108 },
  { room: 90, fan: 84 },
  { room: 28, fan: 36 },
  { room: 10, fan: 12 },
];
const OFFSETS = [-18, -6, 6, 18];
function loops(step = 1) {
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
const MAU = { x0: -36, x1: -4, y0: 16, y1: 120, z0: 207, z1: 236 };
function makeupPath() {
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
function occluders() {
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
function hidden(p, V, boxes) {
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

const P = {"origin":[324.1274071059002,331.31710789992394],"scale":1.0937356559868103,"azimuth":56,"elevation":30};
const stage = document.querySelector(".cr-stage");
const svg = stage.querySelector("svg");
const q = (name) => svg.querySelector('[data-part="' + name + '"]');
const airEls = [...Array(8).keys()].map((j) => svg.querySelector('[data-wisp="a' + j + '"]')), makeupEls = [...Array(8).keys()].map((j) => svg.querySelector('[data-wisp="m' + j + '"]')), dustEl = q("dust"), catchEl = q("catch");
const countEl = q("count"), ledEl = q("led"), setEl = q("setpoint"), pointerEl = q("pointer");
const fans = [...svg.querySelectorAll("[data-fan]")].map((el) => ({ el, cx: +el.dataset.cx, cy: +el.dataset.cy, phase: +el.dataset.fan }));
const readout = stage.closest(".iso-plate").querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const KNOB = [226,161], CTRL_TOP = 2, BLADE_Z = 161.3;
const { cosA, sinA, cosE, sinE } = cameraOf(P);
const V = [cosA * cosE, sinA * cosE, sinE];
const BOXES = occluders();
BOXES.push([196, 150, -10, 238, 172, 7]);
const LOOPS = loops(1);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const knobPointer = (v) => {
  const t = -0.75 * Math.PI + ((v - V_MIN) / (V_MAX - V_MIN)) * 1.5 * Math.PI;
  return lineOnTop([KNOB[0], KNOB[1]], [KNOB[0] + Math.sin(t) * 4.6, KNOB[1] - Math.cos(t) * 4.6], CTRL_TOP + 5, P);
};
const bladesAt = (cx, cy, angle) => {
  let d = "";
  for (let b = 0; b < 3; b++) {
    const a = angle + (b * 2 * Math.PI) / 3;
    d += lineOnTop([cx + Math.sin(a) * 4.1, cy - Math.cos(a) * 4.1], [cx + Math.sin(a + 0.5) * 8, cy - Math.cos(a + 0.5) * 8], BLADE_Z, P);
  }
  return d;
};
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
