// Shared palette and drawing helpers for the profile SVGs.
// Everything renders through GitHub's image proxy, so: inline CSS only, system fonts, no JS.

export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
export const SANS = "-apple-system,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
export const CW = 0.6; // monospace advance, in em

// Transparent backgrounds, tuned against GitHub's #ffffff and #0d1117.
// One brand accent (Pneuma ember -> sand) and one cool secondary, used only for memory.
// ember = the agent, sand = the human, everywhere.
export const THEMES = {
  light: {
    fg: '#1f2328', muted: '#59636e', faint: '#818b98', line: '#d1d9e0', soft: '#eaeef2',
    ember: '#e2592a', emberText: '#c0501c', sand: '#cf9e55', sandText: '#8f6127', cool: '#3a7ca5',
  },
  dark: {
    fg: '#e6edf3', muted: '#9198a1', faint: '#6e7681', line: '#30363d', soft: '#21262d',
    ember: '#f0703a', emberText: '#f0703a', sand: '#d9a86c', sandText: '#d9a86c', cool: '#7fb6d5',
  },
};

export const fmt = n => n.toLocaleString('en-US');
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const r1 = n => Math.round(n * 10) / 10;
export const r2 = n => Math.round(n * 100) / 100;
export const textW = (str, size) => [...String(str)].length * size * CW;

// <text>. Mono is the default (set once in the stylesheet); pass sans:true for prose.
export function text(x, y, content, o = {}) {
  const a = [`x="${r1(x)}" y="${r1(y)}"`];
  if (o.size) a.push(`font-size="${o.size}"`);
  if (o.fill) a.push(`fill="${o.fill}"`);
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.italic) a.push('font-style="italic"');
  if (o.opacity !== undefined) a.push(`opacity="${o.opacity}"`);
  if (o.fit) a.push(`textLength="${r1(o.fit)}" lengthAdjust="spacing"`);
  const cls = [o.cls, o.class, o.sans && 's'].filter(Boolean).join(' ');
  if (cls) a.push(`class="${cls}"`);
  if (o.style) a.push(`style="${o.style}"`);
  return `<text ${a.join(' ')}>${o.raw ? content : esc(content)}</text>`;
}

export const tspan = (content, fill, extra = '') => `<tspan fill="${fill}"${extra}>${esc(content)}</tspan>`;

export function attrs(o) {
  return Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${typeof v === 'number' ? r2(v) : v}"`).join(' ');
}
export const el = (name, o, inner) => inner === undefined ? `<${name} ${attrs(o)}/>` : `<${name} ${attrs(o)}>${inner}</${name}>`;
export const g = (o, inner) => `<g${Object.keys(o).length ? ' ' + attrs(o) : ''}>${inner}</g>`;

export function svg({ w, h, title, desc, css = '', defs = '', body }) {
  const base = `text{font-family:${MONO};white-space:pre}.s{font-family:${SANS}}`
    + '.a{animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-fill-mode:both}'
    + '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(desc || title)}">`
    + `<title>${esc(title)}</title><style>${base}${css}</style>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>\n`;
}

// A looping keyframe timeline. Times are in seconds; every animated element gets its own
// keyframes (deduplicated), all sharing one loop length so the whole piece stays in sync.
// The element's own attributes are its *final* state: that's what shows with motion off.
export class Loop {
  constructor(dur, fadeOut = 0.6) {
    this.dur = dur;
    this.out = dur - fadeOut; // the content wrapper fades out here, so the loop restarts clean
    this.rules = new Map();
  }
  p(t) { return r2(Math.min(100, Math.max(0, (t / this.dur) * 100))); }
  // frames: [[t | [t0, t1, ...], 'css'], ...]
  kf(frames) {
    const body = frames.map(([t, css]) => `${[].concat(t).map(x => this.p(x) + '%').join(',')}{${css}}`).join('');
    let name = this.rules.get(body);
    if (!name) this.rules.set(body, (name = 'k' + this.rules.size.toString(36)));
    return name;
  }
  // style attr for an element using keyframes `frames`
  on(frames, extra = '') {
    return `animation-name:${this.kf(frames)};animation-duration:${this.dur}s${extra}`;
  }
  // visible from t0 (fading in over f) until t1 (default: through the end of the loop)
  show(t0, t1 = null, f = 0.35) {
    if (t1 === null) return this.on([[[0, t0], 'opacity:0'], [[t0 + f, this.dur], 'opacity:1']]);
    return this.on([[[0, t0], 'opacity:0'], [[t0 + f, t1], 'opacity:1'], [[t1 + f, this.dur], 'opacity:0']]);
  }
  // shorthand: class + style attributes for show()
  sh(t0, t1 = null, f) { return { class: 'a', style: this.show(t0, t1, f) }; }
  // keyframes that carry an element (drawn at 0,0) along pts between t0 and t1 at constant speed,
  // visible from t0 until `hide` (default: loop end)
  along(pts, t0, t1, hide = null) {
    const total = polyLen(pts) || 1;
    let acc = 0;
    const at = ([x, y]) => `transform:translate(${r1(x)}px,${r1(y)}px)`;
    const frames = [[[0, t0 - 0.01], `${at(pts[0])};opacity:0`]];
    pts.forEach((p, i) => {
      if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      frames.push([t0 + (t1 - t0) * (acc / total), `${at(p)};opacity:1;animation-timing-function:linear`]);
    });
    if (hide === null) frames.push([this.dur, `${at(pts.at(-1))};opacity:1`]);
    else frames.push([hide, `${at(pts.at(-1))};opacity:1`], [[hide + 0.25, this.dur], `${at(pts.at(-1))};opacity:0`]);
    return this.on(frames);
  }
  // the whole animated layer: fade in at the top of the loop, out at the end
  wrap() { return { class: 'a', style: this.on([[0, 'opacity:0'], [[0.4, this.out], 'opacity:1'], [this.dur, 'opacity:0']]) }; }
  css() { return [...this.rules].map(([body, name]) => `@keyframes ${name}{${body}}`).join(''); }
}

// Catmull-Rom through points -> smooth cubic path. Catmull-Rom is C1, so after the first
// segment every curve can use the relative "s" shorthand, which keeps morph frames small.
const n1 = v => { const r = r1(v); return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, '$1.'); };
const pair = (a, b) => n1(a) + (r1(b) < 0 ? '' : ',') + n1(b);
export function smooth(pts) {
  const n = pts.length;
  const P = i => pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${pair(...pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const rel = q => [q[0] - p1[0], q[1] - p1[1]];
    d += i === 0
      ? `c${pair(...rel(c1))} ${pair(...rel(c2))} ${pair(...rel(p2))}`
      : `s${pair(...rel(c2))} ${pair(...rel(p2))}`;
  }
  return d;
}

// Dense points along the same Catmull-Rom curve smooth() draws, and along a cubic Bézier;
// used for path lengths (dash draws) and for moving a dot along a curve with CSS keyframes.
const cubic = (a, b, c, d, s) => { const u = 1 - s; return u * u * u * a + 3 * u * u * s * b + 3 * u * s * s * c + s * s * s * d; };
export function bezPoints(p0, c1, c2, p1, per = 16) {
  const out = [];
  for (let k = 0; k <= per; k++) out.push([cubic(p0[0], c1[0], c2[0], p1[0], k / per), cubic(p0[1], c1[1], c2[1], p1[1], k / per)]);
  return out;
}
export function smoothPoints(pts, per = 12) {
  const n = pts.length;
  const P = i => pts[Math.max(0, Math.min(n - 1, i))];
  const out = [pts[0]];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push(...bezPoints(p1, c1, c2, p2, per).slice(1));
  }
  return out;
}
export const polyLen = pts => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// Deterministic PRNG so renders are reproducible.
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// The breath helix: strands y = A(x)·sin(kx + phase) inside a spindle-shaped envelope,
// sampled as smooth paths. Returns one path per strand for a given phase offset.
export function helix({ x0, x1, cy, amp, waves, strands, phase = 0, breathe = 1, n = 24, lean = 0.75 }) {
  return strands.map(({ phi, scale = 1, n: ns = n }) => {
    const pts = [];
    for (let i = 0; i <= ns; i++) {
      const u = i / ns;
      // asymmetric spindle: swells early, trails off long, like an exhale (peak at u = 0.5^(1/lean))
      const env = Math.sin(Math.PI * Math.pow(u, lean));
      const y = cy + amp * scale * breathe * env * Math.sin(2 * Math.PI * waves * u + phi + phase);
      pts.push([x0 + (x1 - x0) * u, y]);
    }
    return smooth(pts);
  });
}
