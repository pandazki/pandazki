#!/usr/bin/env node
// Illustrative animated pieces (no live data): the Pneuma concept, the replay, the knowledge compiler,
// pneuma-craft + pneuma-framework, Nemori memory.
//   node scripts/visuals.mjs   renders just these (render.mjs renders them too)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, Loop, text, tspan, el, g, svg, textW, r1, rng, smooth, smoothPoints, bezPoints, polyLen } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- pneuma-replay: the agent builds a deck, a person steps in, the agent follows ----------

// Its own dark panel, so it reads the same on both GitHub themes.
const P = {
  bg: '#0b0e14', chrome: '#10141b', pane: '#0d1118', line: '#1f2631', line2: '#2b3440',
  fg: '#e6edf3', text: '#c9d1d9', muted: '#8b949e', faint: '#6e7681',
  ember: '#f0703a', sand: '#d9a86c', slide: '#121821', ink: '#2c3542',
};

function renderReplay() {
  const W = 880, H = 400, D = 18;
  const L = new Loop(D);
  const out = [];
  const css = [];
  const S = 12, CH = S * 0.6; // stream type size and its monospace advance

  // ---- static chrome ----
  out.push(el('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 10, fill: P.bg, stroke: P.line }));
  out.push(`<g clip-path="url(#panel)">`
    + el('rect', { x: 0, y: 0, width: W, height: 30, fill: P.chrome })
    + el('rect', { x: 0, y: H - 26, width: W, height: 26, fill: P.chrome })
    + '</g>');
  out.push(el('path', { d: `M0,30.5H${W}M0,${H - 26.5}H${W}`, stroke: P.line }));
  // title bar: a small breath glyph, the app, the backends (claude-code active)
  out.push(`<path d="M14,15c4,-7 8,-7 12,0s8,7 12,0" stroke="${P.ember}" stroke-width="1.6" stroke-linecap="round"/>`
    + `<path d="M14,15c4,7 8,7 12,0s8,-7 12,0" stroke="${P.sand}" stroke-width="1.6" stroke-linecap="round"/>`);
  out.push(text(48, 19.5, 'pneuma', { size: 12, fill: P.fg, weight: 600 }));
  out.push(text(W / 2, 19.5, '~/launch-deck', { size: 11.5, fill: P.faint, anchor: 'middle' }));
  const backends = 'claude-code   codex   kimi-code';
  const bx = W - 14 - textW(backends, 11.5);
  out.push(el('circle', { cx: bx - 9, cy: 15.5, r: 3, fill: P.ember }));
  out.push(text(bx, 19.5, tspan('claude-code', P.text) + tspan('   codex   kimi-code', P.faint), { size: 11.5, raw: true }));
  // status bar, static half
  out.push(text(W - 14, H - 9, 'illustrative replay', { size: 11.5, fill: P.faint, anchor: 'end' }));
  // panes
  const LX = 12, LW = 380, RX = 404, RW = 464, PY = 88, PH = 278;
  out.push(el('rect', { x: LX + 0.5, y: PY + 0.5, width: LW, height: PH, rx: 6, fill: P.pane, stroke: P.line }));
  out.push(el('rect', { x: RX + 0.5, y: PY + 0.5, width: RW, height: PH, rx: 6, fill: P.pane, stroke: P.line }));
  out.push(el('path', { d: `M${LX + 1},${PY + 24.5}H${LX + LW}M${RX + 1},${PY + 24.5}H${RX + RW}`, stroke: P.line }));
  out.push(text(LX + 12, PY + 16.5, tspan('agent', P.text) + tspan('  stream', P.faint), { size: 11.5, raw: true }));
  out.push(text(RX + 12, PY + 16.5, tspan('viewer', P.text) + tspan('  live preview', P.faint), { size: 11.5, raw: true }));

  // ---- the animated layer ----
  const A = [];

  // 1. the command, typed. A bg-colored cover slides off it in character steps.
  const CMD = 'bunx pneuma-skills slide --workspace ./launch-deck';
  const cmdX = 32, cmdY = 54, cmdW = CMD.length * CH;
  const T0 = 0.5, T1 = 2.2;
  A.push(text(16, cmdY, '$', { size: S, fill: P.sand }));
  A.push(text(cmdX, cmdY, CMD, { size: S, fill: P.fg, fit: cmdW }));
  const typeKf = (from, to) => L.on([
    [[0, T0], `transform:translateX(${from}px);opacity:1;animation-timing-function:steps(${CMD.length},end)`],
    [T1, `transform:translateX(${to}px);opacity:1`],
    [[T1 + 0.5, D], `transform:translateX(${to}px);opacity:0`],
  ]);
  A.push(el('rect', { x: cmdX - 1, y: cmdY - 12, width: cmdW + 10, height: 16, fill: P.bg, opacity: 0, class: 'a', style: typeKf(0, cmdW) }));
  A.push(el('rect', { x: cmdX, y: cmdY - 11, width: CH, height: 14, fill: P.fg, opacity: 0, class: 'a', style: typeKf(0, cmdW) }));
  A.push(g(L.sh(2.5), text(16, 74, tspan('✓ ', P.muted) + tspan('player live', P.text) + tspan(' · watching ./launch-deck · agent ', P.muted) + tspan('claude-code', P.ember), { size: 11.5, raw: true })));

  // 2. the agent stream
  const sx = LX + 14, rowY = i => PY + 50 + i * 25;
  const tool = (i, t0, verb, file, diff) => g(L.sh(t0),
    el('circle', { cx: sx + 3, cy: rowY(i) - 4, r: 3, fill: P.ember })
    + text(sx + 14, rowY(i), tspan(verb.padEnd(6), P.text, ' font-weight="600"') + tspan(file, P.muted), { size: S, raw: true })
    + text(LX + LW - 12, rowY(i), diff, { size: 11.5, fill: P.faint, anchor: 'end' }));
  A.push(tool(0, 3.4, 'Write', 'slides/01-cover.html', '+38'));
  A.push(tool(1, 5.0, 'Write', 'slides/02-problem.html', '+52'));
  A.push(tool(2, 7.6, 'Edit', 'theme.css', '+6 −2'));
  // the person's edit lands in the same stream
  A.push(g(L.sh(10.6),
    el('rect', { x: sx - 4, y: rowY(3) - 15, width: LW - 20, height: 21, rx: 3, fill: P.sand, opacity: 0.08 })
    + el('rect', { x: sx - 4, y: rowY(3) - 15, width: 2, height: 21, fill: P.sand })
    + el('rect', { x: sx + 0.5, y: rowY(3) - 6.5, width: 5, height: 5, fill: P.sand, transform: `rotate(45 ${sx + 3} ${rowY(3) - 4})` })
    + text(sx + 14, rowY(3), tspan('you', P.sand, ' font-weight="600"') + tspan('   retitled slide 2', P.text), { size: S, raw: true })
    + text(LX + LW - 12, rowY(3), 'direct edit', { size: 11.5, fill: P.sand, anchor: 'end', opacity: 0.8 })));
  A.push(g(L.sh(12.0),
    text(sx, rowY(4) + 4, tspan('↻ ', P.ember) + tspan('saw your edit on slide 2 —', P.fg), { size: S, raw: true })
    + text(sx + 2 * CH, rowY(4) + 22, 'updating the subtitle to match', { size: S, fill: P.fg })));
  A.push(tool(5.9, 13.2, 'Edit', 'slides/02-problem.html', '+1 −1'));
  const IDLE = '· waiting for input';
  A.push(g(L.sh(14.0), text(sx, rowY(7) - 2, IDLE, { size: 11.5, fill: P.faint })
    + el('rect', { x: sx + (IDLE.length + 1) * 6.9, y: rowY(7) - 12, width: 7, height: 13, fill: P.text, class: 'blink' })));
  css.push('.blink{animation:blink 1.1s step-end infinite}@keyframes blink{50%{opacity:0}}');

  // 3. the viewer
  const tx = RX + 12, th = 30, tw = 54;
  const SX = RX + 80, SY = PY + 36, SW = 372, SH = 209; // slide frame, 16:9
  const thumbY = i => SY + i * (th + 8);
  const mini = (i, lines) => el('rect', { x: tx + 0.5, y: thumbY(i) + 0.5, width: tw, height: th, rx: 2, fill: P.slide, stroke: P.line2 })
    + lines.map(([x, y, w, c]) => el('rect', { x: tx + x, y: thumbY(i) + y, width: w, height: 2.5, rx: 1, fill: c })).join('');
  A.push(g(L.sh(3.6), mini(0, [[14, 11, 26, P.muted], [19, 17, 16, P.ink]])));
  A.push(g(L.sh(5.2), mini(1, [[6, 7, 30, P.muted], [6, 12, 20, P.ink], [6, 19, 14, P.ink], [36, 18, 3, P.line2], [41, 15, 3, P.line2], [46, 12, 3, P.line2]])));
  // theme.css lands: the thumbnail's chart picks up the accent too
  A.push(g(L.sh(7.9), [[36, 18], [41, 15], [46, 12]].map(([x, y]) => el('rect', { x: tx + x, y: thumbY(1) + y, width: 3, height: 2.5, rx: 1, fill: P.ember })).join('')));
  // which thumb is showing
  A.push(el('rect', { x: tx - 1.5, y: thumbY(0) - 1.5, width: tw + 4, height: th + 4, rx: 3.5, stroke: P.muted, opacity: 0, class: 'a', style: L.show(3.6, 5.2, 0.2) }));
  A.push(el('rect', { x: tx - 1.5, y: thumbY(1) - 1.5, width: tw + 4, height: th + 4, rx: 3.5, stroke: P.muted, ...L.sh(5.2) }));

  // slide frame + placeholder
  A.push(el('rect', { x: SX + 0.5, y: SY + 0.5, width: SW, height: SH, rx: 4, fill: P.slide, stroke: P.line2, ...L.sh(2.8, null, 0.3) }));
  A.push(text(SX + SW / 2, SY + SH / 2 + 4, 'waiting for the first file…', { size: 11.5, fill: P.faint, anchor: 'middle', opacity: 0, class: 'a', style: L.show(2.9, 3.5, 0.25) }));
  // cover slide (01), shown until slide 02 arrives
  const cover = text(SX + SW / 2, SY + 92, 'Launch deck', { size: 26, fill: P.fg, weight: 600, anchor: 'middle', sans: true })
    + el('rect', { x: SX + SW / 2 - 16, y: SY + 108, width: 32, height: 2, fill: P.muted })
    + text(SX + SW / 2, SY + 132, 'draft · v0', { size: 12, fill: P.muted, anchor: 'middle', sans: true });
  A.push(g({ opacity: 0, class: 'a', style: L.show(3.7, 5.1, 0.3) }, cover));

  // slide 02
  const px = SX + 22;
  const kick = (c, o) => text(px, SY + 30, '02 — PROBLEM', { size: 11, fill: c, sans: true, weight: 600, ...o });
  A.push(kick(P.muted, { opacity: 0, class: 'a', style: L.show(5.3, 7.9, 0.3) }));
  A.push(kick(P.ember, { class: 'a', style: L.show(7.8, null, 0.4) }));
  const TITLE1 = 'Problem statement', TITLE2 = 'Review comes too late';
  const titleY = SY + 62;
  A.push(text(px, titleY, TITLE1, { size: 22, fill: P.fg, weight: 600, sans: true, opacity: 0, class: 'a', style: L.show(5.5, 10.25, 0.3) }));
  // person's selection, then the new title + caret
  A.push(el('rect', { x: px - 3, y: titleY - 21, width: 206, height: 28, rx: 2, fill: P.sand, opacity: 0, class: 'a', style: L.on([[[0, 9.8], 'opacity:0'], [[9.95, 10.2], 'opacity:.28'], [[10.3, D], 'opacity:0']]) }));
  A.push(text(px, titleY, TITLE2, { size: 22, fill: P.fg, weight: 600, sans: true, class: 'a', style: L.show(10.3, null, 0.15) }));
  A.push(el('rect', { x: px + 240, y: titleY - 19, width: 1.6, height: 24, fill: P.sand, opacity: 0, class: 'a', style: L.on([[[0, 10.3], 'opacity:0'], [10.31, 'opacity:1'], [10.7, 'opacity:1'], [10.71, 'opacity:0'], [11.1, 'opacity:0'], [11.11, 'opacity:1'], [11.5, 'opacity:1'], [[11.51, D], 'opacity:0']]) }));
  const SUB1 = 'Agent output gets reviewed after the fact.', SUB2 = 'You only see it once it is done.';
  const subY = SY + 86;
  A.push(text(px, subY, SUB1, { size: 12.5, fill: P.muted, sans: true, opacity: 0, class: 'a', style: L.show(5.8, 12.75, 0.3) }));
  A.push(text(px, subY, SUB2, { size: 12.5, fill: P.muted, sans: true, class: 'a', style: L.show(12.9, null, 0.3) }));
  // body: three bullet lines + a small chart
  [[150, 6.0], [124, 6.15], [138, 6.3]].forEach(([w, t0], i) => {
    const y = SY + 116 + i * 20;
    A.push(g(L.sh(t0), el('circle', { cx: px + 2, cy: y + 2.5, r: 2, fill: P.muted }) + el('rect', { x: px + 10, y, width: w, height: 5, rx: 2.5, fill: P.ink })));
  });
  const cb = SY + SH - 24, cx0 = SX + SW - 150;
  [34, 52, 70, 96].forEach((h, i) => {
    const x = cx0 + i * 32;
    const grow = L.on([[[0, 6.4 + i * 0.12], 'transform:scaleY(0)'], [[6.9 + i * 0.12, D], 'transform:scaleY(1)']]);
    A.push(el('rect', { x, y: cb - h, width: 20, height: h, rx: 1.5, fill: P.ink, class: 'a gy', style: grow }));
    A.push(el('rect', { x, y: cb - h, width: 20, height: h, rx: 1.5, fill: 'url(#bar)', class: 'a', style: L.show(7.8 + i * 0.08, null, 0.4) }));
  });
  A.push(el('line', { x1: cx0 - 6, y1: cb + 0.5, x2: cx0 + 122, y2: cb + 0.5, stroke: P.line2, ...L.sh(6.3) }));
  A.push(text(SX + SW - 12, SY + SH - 8, '2', { size: 11, fill: P.faint, anchor: 'end', sans: true, ...L.sh(5.3) }));
  css.push('.gy{transform-box:fill-box;transform-origin:bottom}');

  // the agent touching an element: a dashed ember frame with a tag
  const touch = (x, y, w, h, t0, t1, below = false) => g({ opacity: 0, class: 'a', style: L.show(t0, t1, 0.15) },
    el('rect', { x, y, width: w, height: h, rx: 2, stroke: P.ember, strokeDasharray: '3 2' })
    + el('rect', { x: x + w - 40, y: below ? y + h : y - 15, width: 40, height: 15, rx: 2, fill: P.ember })
    + text(x + w - 20, below ? y + h + 11 : y - 4, 'agent', { size: 11, fill: P.bg, anchor: 'middle', weight: 600 }));
  A.push(touch(px - 6, titleY - 23, 214, 31, 5.45, 6.1));
  A.push(touch(cx0 - 6, cb - 101, 128, 105, 6.35, 7.25));
  A.push(touch(px - 6, subY - 15, 236, 21, 12.45, 13.2, true));

  // chips under the slide
  const chipW = label => textW(label, 11) + 26;
  const chip = (x, color, label, t0) => g(L.sh(t0),
    el('rect', { x: x + 0.5, y: SY + SH + 12.5, width: chipW(label), height: 21, rx: 10.5, stroke: color, opacity: 0.9 })
    + el('circle', { cx: x + 11, cy: SY + SH + 23, r: 2.5, fill: color })
    + text(x + 19, SY + SH + 27, label, { size: 11, fill: color }));
  A.push(chip(SX, P.sand, 'human edit · slide 2 title', 10.6));
  A.push(chip(SX + SW - chipW('agent edit · subtitle'), P.ember, 'agent edit · subtitle', 13.0));

  // the person's cursor
  const P0 = [SX + SW + 10, SY + SH + 30], P1 = [px + 120, titleY - 6], P2 = [px + 255, titleY - 12];
  const tr = ([x, y]) => `transform:translate(${x}px,${y}px)`;
  const cur = g({ transform: `translate(${P2[0]} ${P2[1]})`, class: 'a', style: L.on([
    [[0, 8.6], `${tr(P0)};opacity:0`],
    [8.9, `${tr([P0[0] - 20, P0[1] - 14])};opacity:1;animation-timing-function:cubic-bezier(.4,0,.2,1)`],
    [[9.7, 11.2], `${tr(P1)};opacity:1;animation-timing-function:cubic-bezier(.4,0,.2,1)`],
    [[12.0, D], `${tr(P2)};opacity:1`],
  ]) },
  el('path', { d: 'M0,0V16.5L4.3,12.6L7.1,19L9.7,17.9L6.9,11.6H12.6Z', fill: P.sand, stroke: P.bg, strokeWidth: 1.2, strokeLinejoin: 'round' })
    + el('rect', { x: 12, y: 16, width: 30, height: 16, rx: 3, fill: P.sand })
    + text(27, 28, 'you', { size: 11, fill: P.bg, anchor: 'middle', weight: 600 }));
  A.push(el('circle', { cx: P1[0], cy: P1[1], r: 9, stroke: P.sand, strokeWidth: 1.5, opacity: 0, class: 'a', style: L.on([[[0, 9.8], 'opacity:0;transform:scale(.2)'], [9.85, 'opacity:1;transform:scale(.3)'], [[10.4, D], 'opacity:0;transform:scale(1.2)']]) + ';transform-box:fill-box;transform-origin:center' }));
  A.push(cur);

  // 4. status bar counters
  const sy = H - 9, s0 = 'slide mode · claude-code · ';
  A.push(el('circle', { cx: 18, cy: sy - 4, r: 3, fill: P.ember, class: 'pulse' }));
  css.push('.pulse{animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{50%{opacity:.25}}');
  A.push(text(28, sy, s0, { size: 11.5, fill: P.muted }));
  const cX = 28 + textW(s0, 11.5);
  const files = [[0, 3.4], [1, 5.0], [2, 7.6], [3, D]];
  files.forEach(([n, t1], i) => {
    const label = `${n} file${n === 1 ? '' : 's'}`;
    const last = i === files.length - 1;
    A.push(text(cX, sy, label, { size: 11.5, fill: n ? P.text : P.faint, opacity: last ? undefined : 0, class: 'a', style: last ? L.show(files[i - 1][1], null, 0.1) : L.show(i ? files[i - 1][1] : 0, t1 - 0.1, 0.1) }));
  });
  const eX = cX + textW('3 files · ', 11.5);
  A.push(text(cX + textW('3 files', 11.5), sy, ' · ', { size: 11.5, fill: P.muted }));
  A.push(text(eX, sy, '0 human edits', { size: 11.5, fill: P.faint, opacity: 0, class: 'a', style: L.show(0, 10.5, 0.1) }));
  A.push(text(eX, sy, '1 human edit', { size: 11.5, fill: P.sand, class: 'a', style: L.show(10.6, null, 0.1) }));

  out.push(g(L.wrap(), A.join('')));

  const defs = `<clipPath id="panel"><rect width="${W}" height="${H}" rx="10"/></clipPath>`
    + `<linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ember}"/><stop offset="1" stop-color="${P.sand}"/></linearGradient>`;
  return svg({
    w: W, h: H, title: 'Pneuma, illustrative replay',
    desc: 'Illustrative replay of Pneuma slide mode: a command starts a live player; the agent writes slides while the viewer renders them; a person retitles slide 2 directly in the viewer; the agent sees the edit and updates the subtitle to match. Status: slide mode, claude-code, 3 files, 1 human edit.',
    css: css.join('') + L.css(), defs, body: out.join(''),
  });
}

// ---------- stack: pneuma-craft and pneuma-framework, one lane each, each animating its own idea ----------

function renderStack(theme) {
  const t = THEMES[theme];
  const W = 880, D = 14, LANE = 80, TOP = 34, AX = 360, AR = 856;
  const H = TOP + LANE * 2 + 4;
  const L = new Loop(D);
  const out = [];
  const css = ['.gx{transform-box:fill-box;transform-origin:left}.pop{transform-box:fill-box;transform-origin:center}'];
  const pop = (t0, t1 = null) => L.on(t1 === null
    ? [[[0, t0], 'opacity:0;transform:scale(.3)'], [[t0 + 0.35, D], 'opacity:1;transform:scale(1)']]
    : [[[0, t0], 'opacity:0;transform:scale(.3)'], [[t0 + 0.35, t1], 'opacity:1;transform:scale(1)'], [[t1 + 0.3, D], 'opacity:0;transform:scale(1)']]);
  const dash = (len, t0, dur = 0.6) => L.on([[[0, t0], `stroke-dashoffset:${r1(len)}`], [[t0 + dur, D], 'stroke-dashoffset:0']]);

  // the tree on the left: `tree pneuma`
  out.push(text(24, 20, '~/pneuma', { size: 12.5, fill: t.fg, weight: 600 }));
  const lanes = [
    ['pneuma-craft', 'a tree of variants, not a linear edit', 'command → event → state'],
    ['pneuma-framework', 'a governed loop, fail-closed', 'framework owns the gates; you own effects'],
  ];
  const laneY = i => TOP + i * LANE;
  out.push(el('path', { d: `M30,28V${laneY(lanes.length - 1) + 18}`, stroke: t.line }));
  lanes.forEach(([name, role, meta], i) => {
    const y = laneY(i);
    out.push(el('path', { d: `M30,${y + 18.5}H44`, stroke: t.line }));
    out.push(text(52, y + 23, name, { size: 13, fill: t.fg, weight: 600 }));
    out.push(text(52, y + 42, role, { size: 11.5, fill: t.muted }));
    out.push(text(52, y + 59, meta, { size: 11, fill: t.faint }));
  });

  // lane 1 · pneuma-craft: generate → select → iterate → select → place on the timeline
  {
    const cy = laneY(0) + 32, x0 = AX + 10, x1 = AX + 78, x2 = AX + 146;
    const v = [cy - 20, cy, cy + 20], vv = [cy - 10, cy + 10];
    const edge = (ax, ay, bx, by) => `M${ax},${ay}C${(ax + bx) / 2},${ay} ${(ax + bx) / 2},${by} ${bx},${by}`;
    const elen = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay) * 1.08;
    // root asset
    out.push(el('rect', { x: x0 - 4, y: cy - 4, width: 8, height: 8, fill: t.fg, class: 'a pop', style: pop(0.4) }));
    v.forEach((vy, i) => {
      const len = elen(x0 + 5, cy, x1 - 5, vy);
      out.push(el('path', { d: edge(x0 + 5, cy, x1 - 5, vy), stroke: i === 1 ? t.muted : t.line, strokeDasharray: r1(len), class: 'a', style: dash(len, 1.2 + i * 0.12) }));
      // agent-made variants; the two not picked fade back
      const keep = i === 1;
      const style = keep ? pop(1.6 + i * 0.12)
        : L.on([[[0, 1.6 + i * 0.12], 'opacity:0;transform:scale(.3)'], [[1.95 + i * 0.12, 3.3], 'opacity:1;transform:scale(1)'], [[3.7, D], 'opacity:.35;transform:scale(1)']]);
      out.push(el('circle', { cx: x1, cy: vy, r: 4, fill: t.ember, opacity: keep ? undefined : 0.35, class: 'a pop', style }));
    });
    // human picks v2
    out.push(el('circle', { cx: x1, cy, r: 7.5, stroke: t.sand, strokeWidth: 1.5, class: 'a pop', style: pop(3.2) }));
    vv.forEach((vy, i) => {
      const len = elen(x1 + 8, cy, x2 - 5, vy);
      out.push(el('path', { d: edge(x1 + 8, cy, x2 - 5, vy), stroke: i === 1 ? t.muted : t.line, strokeDasharray: r1(len), class: 'a', style: dash(len, 4.4 + i * 0.12) }));
      const keep = i === 1;
      const style = keep ? pop(4.8 + i * 0.12)
        : L.on([[[0, 4.8], 'opacity:0;transform:scale(.3)'], [[5.15, 6.3], 'opacity:1;transform:scale(1)'], [[6.7, D], 'opacity:.35;transform:scale(1)']]);
      out.push(el('circle', { cx: x2, cy: vy, r: 4, fill: t.ember, opacity: keep ? undefined : 0.35, class: 'a pop', style }));
    });
    out.push(el('circle', { cx: x2, cy: vv[1], r: 7.5, stroke: t.sand, strokeWidth: 1.5, class: 'a pop', style: pop(6.2) }));
    // the composition track; the picked variant lands in the gap
    const tx = AX + 220, ty = cy - 7, clips = [[0, 58], [62, 52], [180, 96]], gap = [118, 58];
    out.push(text(tx, ty - 6, 'composition', { size: 11, fill: t.faint }));
    clips.forEach(([cx, w]) => out.push(el('rect', { x: tx + cx, y: ty, width: w, height: 12, rx: 2, fill: t.soft, stroke: t.line })));
    out.push(el('rect', { x: tx + gap[0] + 0.5, y: ty + 0.5, width: gap[1] - 1, height: 11, rx: 2, stroke: t.line, strokeDasharray: '2 2' }));
    const llen = elen(x2 + 8, vv[1], tx + gap[0] + 2, ty + 12) * 1.1;
    out.push(el('path', { d: `M${x2 + 8},${vv[1]}C${x2 + 60},${vv[1]} ${tx + gap[0] - 40},${ty + 6} ${tx + gap[0] + 2},${ty + 6}`, stroke: t.sand, strokeDasharray: r1(llen), class: 'a', style: dash(llen, 7.4, 0.7) }));
    out.push(el('rect', { x: tx + gap[0], y: ty, width: gap[1], height: 12, rx: 2, fill: 'url(#eg)', class: 'a gx', style: L.on([[[0, 8.0], 'transform:scaleX(0)'], [[8.6, D], 'transform:scaleX(1)']]) }));
    // the event log underneath: every event names its actor
    const events = [
      [0.4, '#01 AssetImported', 'human'],
      [1.2, '#02 VariantGenerated ×3', 'agent'],
      [3.2, '#03 VariantSelected', 'human'],
      [4.4, '#04 VariantGenerated ×2', 'agent'],
      [6.2, '#05 VariantSelected', 'human'],
      [7.4, '#06 ClipPlaced', 'agent'],
    ];
    events.forEach(([t0, ev, actor], i) => {
      const last = i === events.length - 1;
      const t1 = last ? null : events[i + 1][0] - 0.15;
      out.push(text(tx, ty + 30, tspan(ev.padEnd(25), t.muted) + tspan('actor: ', t.faint) + tspan(actor, actor === 'human' ? t.sandText : t.emberText),
        { size: 11, raw: true, opacity: last ? undefined : 0, class: 'a', style: L.show(t0, t1, 0.15) }));
    });
  }

  // lane 2 · pneuma-framework: a change walks the governed loop; verify fails closed once, then passes
  {
    const cy = laneY(1) + 40;
    const stages = ['create', 'preview', 'draft', 'verify', 'propose', 'apply', 'publish'];
    const sx = i => AX + 22 + i * 75;
    out.push(el('path', { d: `M${sx(0)},${cy}H${sx(6)}`, stroke: t.line }));
    stages.forEach((s, i) => {
      const x = sx(i), gate = s === 'verify' || s === 'apply';
      out.push(gate
        ? el('rect', { x: x - 5, y: cy - 5, width: 10, height: 10, fill: theme === 'dark' ? '#0d1117' : '#ffffff', stroke: t.muted, transform: `rotate(45 ${x} ${cy})` })
        : el('circle', { cx: x, cy, r: 3.5, fill: theme === 'dark' ? '#0d1117' : '#ffffff', stroke: t.muted }));
      out.push(text(x, cy + 24, s, { size: 11, fill: gate ? t.fg : t.muted, anchor: 'middle' }));
    });
    // rollback: always one arc away
    const rb = `M${sx(6)},${cy - 7}C${sx(6)},${cy - 34} ${sx(1)},${cy - 34} ${sx(1)},${cy - 7}`;
    out.push(el('path', { d: rb, stroke: t.faint, strokeDasharray: '2 3', opacity: 0.8 }));
    out.push(el('path', { d: `M${sx(1) - 3.5},${cy - 13}L${sx(1)},${cy - 7}L${sx(1) + 3.5},${cy - 13}Z`, fill: t.faint, opacity: 0.8 }));
    out.push(text((sx(1) + sx(6)) / 2, cy - 30, 'rollback', { size: 11, fill: t.faint, anchor: 'middle' }));
    // gate verdicts
    const vx = sx(3), ax = sx(5);
    out.push(text(vx + 9, cy - 8, '✗', { size: 11, fill: t.emberText, opacity: 0, class: 'a', style: L.show(4.2, 5.4, 0.15) }));
    out.push(text(vx + 20, cy - 8, 'fail-closed', { size: 11, fill: t.emberText, opacity: 0, class: 'a', style: L.show(4.3, 5.6, 0.2) }));
    out.push(text(vx + 9, cy - 8, '✓', { size: 11, fill: t.fg, class: 'a', style: L.show(7.0, null, 0.15) }));
    out.push(el('circle', { cx: ax, cy, r: 10, stroke: t.sand, strokeWidth: 1.5, opacity: 0, class: 'a', style: L.on([[[0, 8.6], 'opacity:0'], [8.9, 'opacity:1'], [9.2, 'opacity:.3'], [9.5, 'opacity:1'], [9.8, 'opacity:.3'], [[10.0, D], 'opacity:0']]) }));
    out.push(text(ax + 9, cy - 8, '✓', { size: 11, fill: t.sandText, class: 'a', style: L.show(9.9, null, 0.15) }));
    out.push(text(ax, cy - 15, 'you', { size: 11, fill: t.sandText, anchor: 'middle', opacity: 0, class: 'a', style: L.show(8.7, 10.2, 0.2) }));
    out.push(el('circle', { cx: sx(6), cy, r: 5, fill: t.ember, class: 'a pop', style: pop(10.6) }));
    // the token (the agent's change)
    const pos = [[0.3, 0], [0.9, 0], [1.6, 1], [2.0, 1], [2.7, 2], [3.0, 2], [3.6, 3], [4.6, 3], [5.3, 2], [5.8, 2], [6.4, 3], [7.1, 3], [7.7, 4], [8.0, 4], [8.6, 5], [10.0, 5], [10.6, 6]];
    const frames = [[0, `transform:translateX(${sx(0)}px);opacity:0`]];
    pos.forEach(([tt, s]) => frames.push([tt, `transform:translateX(${sx(s)}px);opacity:1`]));
    frames.push([[10.8, D], `transform:translateX(${sx(6)}px);opacity:0`]);
    out.push(el('circle', { cx: 0, cy, r: 4, fill: t.ember, opacity: 0, class: 'a', style: L.on(frames) }));
  }

  const defs = `<linearGradient id="eg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${t.ember}"/><stop offset="1" stop-color="${t.sand}"/></linearGradient>`;
  return svg({
    w: W, h: H, title: 'pneuma-craft and pneuma-framework',
    desc: 'Two Pneuma repositories, one lane each. pneuma-craft: content as a tree of variants; the agent generates, a person selects, the picked variant is placed on the composition track, and every event in the log names its actor, human or agent. pneuma-framework: a governed, fail-closed loop from create through preview, draft, verify, propose and apply to publish; verify blocks a change once, then passes; apply waits for a person; rollback is always available.',
    css: css.join('') + L.css(), defs, body: out.join(''),
  });
}

// ---------- concept: a sealed app comes apart into capabilities, run as an open loop, forked ----------

function renderConcept(theme) {
  const t = THEMES[theme];
  const W = 880, H = 292, D = 18;
  const L = new Loop(D);
  const bg = theme === 'dark' ? '#0d1117' : '#ffffff';
  const A = [];
  const css = ['.pop{transform-box:fill-box;transform-origin:center}.gy{transform-box:fill-box;transform-origin:bottom}'];
  const pop = t0 => L.on([[[0, t0], 'opacity:0;transform:scale(.3)'], [[t0 + 0.35, D], 'opacity:1;transform:scale(1)']]);
  const draw = (len, t0, dur) => L.on([[[0, t0], `stroke-dashoffset:${r1(len)};animation-timing-function:linear`], [[t0 + dur, D], 'stroke-dashoffset:0']]);
  const node = ([x, y], style) => el('circle', { cx: x, cy: y, r: 4.5, fill: bg, stroke: t.muted, strokeWidth: 1.2, class: 'a pop', style });

  // 1. the sealed app: fixed feature cells in a box. The lid lifts, the walls fall back to a ghost.
  const BX = 24, BY = 72, BW = 152, BH = 120;
  A.push(text(BX, BY - 12, 'app', { size: 11, fill: t.faint }));
  A.push(el('path', { d: `M${BX},${BY}V${BY + BH}H${BX + BW}V${BY}`, stroke: t.muted, strokeWidth: 1.5, opacity: 0, class: 'a', style: L.show(0.2, 1.9, 0.3) }));
  A.push(el('path', { d: `M${BX - 3},${BY}H${BX + BW + 3}`, stroke: t.muted, strokeWidth: 2.5, opacity: 0, class: 'a',
    style: L.on([[[0, 0.2], 'opacity:0;transform:translateY(0)'], [[0.5, 1.3], 'opacity:1;transform:translateY(0)'], [[1.9, D], 'opacity:0;transform:translateY(-12px)']]) }));
  A.push(el('rect', { x: BX + 0.5, y: BY + 0.5, width: BW - 1, height: BH - 1, rx: 2, stroke: t.line, strokeDasharray: '2 4', ...L.sh(1.9) }));
  // where the fixed cells used to sit
  let ghost = '';
  for (let i = 0; i < 12; i++) ghost += `M${BX + 10 + (i % 4) * 36 + 0.5},${BY + 12 + Math.floor(i / 4) * 36 + 0.5}h23v23h-23z`;
  A.push(el('path', { d: ghost, stroke: t.line, strokeDasharray: '1 3', ...L.sh(3.4, null, 0.6) }));

  // 2. the cells come loose and re-form as a capability graph
  const cols = [[268, [112, 168]], [360, [84, 128, 166, 204]], [458, [96, 146, 194]], [556, [92, 140, 186]]];
  const N = cols.flatMap(([x, ys]) => ys.map(y => [x, y]));
  const EDGES = [[0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [3, 6], [4, 7], [4, 8], [5, 8], [6, 9], [6, 10], [7, 10], [8, 10], [8, 11]];
  A.push(el('path', { d: EDGES.map(([a, b]) => `M${N[a][0]},${N[a][1]}L${N[b][0]},${N[b][1]}`).join(''), stroke: t.line, class: 'a',
    style: L.on([[[0, 3.5], 'clip-path:inset(0 100% 0 0);animation-timing-function:linear'], [[4.6, D], 'clip-path:inset(0 0 0 0)']]) }));
  N.forEach(([nx, ny], i) => {
    const c = i % 4, r = Math.floor(i / 4);
    const cx = BX + 22 + c * 36, cy = BY + 24 + r * 36, t0 = 2.0 + i * 0.07;
    A.push(el('rect', { x: cx - 12, y: cy - 12, width: 24, height: 24, rx: 2, fill: t.soft, stroke: t.line, opacity: 0, class: 'a pop', style: L.on([
      [[0, t0], 'opacity:1;transform:translate(0,0) scale(1)'],
      [t0 + 1.1, `opacity:1;transform:translate(${r1(nx - cx)}px,${r1(ny - cy)}px) scale(.3)`],
      [[t0 + 1.3, D], `opacity:0;transform:translate(${r1(nx - cx)}px,${r1(ny - cy)}px) scale(.3)`],
    ]) }));
    A.push(node([nx, ny], pop(t0 + 1.0)));
  });
  A.push(text(190, 280, 'features → capabilities', { size: 11, fill: t.faint, anchor: 'middle', ...L.sh(4.0) }));

  // 3. the agent's trace runs through it; a person touches it at one node and bends the path
  const k = N[7], start = [214, 140], gate = [640, 144];
  const p1 = smoothPoints([start, N[0], N[3], k]), p2 = smoothPoints([k, N[11], gate]);
  const len1 = polyLen(p1), len2 = polyLen(p2);
  A.push(text(start[0], start[1] - 14, 'agent', { size: 11, fill: t.emberText, ...L.sh(4.8) }));
  A.push(el('path', { d: smooth([start, N[0], N[3], k]), stroke: t.ember, strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: r1(len1), class: 'a', style: draw(len1, 5.0, 3.0) }));
  // where it was heading before the person stepped in
  A.push(el('path', { d: `M${k[0] + 5},${k[1] - 3}L${N[9][0] - 6},${N[9][1] + 4}`, stroke: t.ember, strokeDasharray: '2 3', opacity: 0.3, class: 'a',
    style: L.on([[[0, 7.4], 'opacity:0'], [[7.8, 8.9], 'opacity:.75'], [[9.4, D], 'opacity:.3']]) }));
  A.push(el('path', { d: smooth([k, N[11], gate]), stroke: t.ember, strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: r1(len2), class: 'a', style: draw(len2, 9.3, 1.5) }));
  const head = el('circle', { cx: 0, cy: 0, r: 3.5, fill: t.ember, opacity: 0, class: 'a' });
  A.push(head.replace('class="a"', `class="a" style="${L.along(p1, 5.0, 8.0, 9.3)}"`));
  A.push(head.replace('class="a"', `class="a" style="${L.along(p2, 9.3, 10.8, 10.9)}"`));
  // provenance: every node the trace passes keeps a mark of who touched it
  const passAt = (pts, len, t0, dur, q) => {
    let acc = 0, best = Infinity, tt = t0;
    pts.forEach((p, i) => { if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) { best = d; tt = t0 + dur * acc / len; } });
    return tt;
  };
  [[N[0], p1, len1, 5.0, 3.0], [N[3], p1, len1, 5.0, 3.0], [k, p1, len1, 5.0, 3.0], [N[11], p2, len2, 9.3, 1.5]].forEach(([q, pts, len, t0, dur]) =>
    A.push(el('circle', { cx: q[0], cy: q[1], r: 2.2, fill: t.ember, class: 'a pop', style: pop(passAt(pts, len, t0, dur, q)) })));
  const hStart = [404, 44], hEnd = [k[0] - 7, k[1] - 8];
  A.push(text(hStart[0], hStart[1] - 10, 'human', { size: 11, fill: t.sandText, anchor: 'middle', ...L.sh(7.9) }));
  A.push(el('path', { d: `M${hStart[0]},${hStart[1]}L${hEnd[0]},${hEnd[1]}`, stroke: t.sand, strokeDasharray: '1 3', ...L.sh(8.2) }));
  A.push(el('circle', { cx: 0, cy: 0, r: 4, fill: t.sand, transform: `translate(${hEnd[0]} ${hEnd[1]})`, class: 'a', style: L.on([
    [[0, 7.9], `transform:translate(${hStart[0]}px,${hStart[1]}px);opacity:0`],
    [8.0, `transform:translate(${hStart[0]}px,${hStart[1]}px);opacity:1;animation-timing-function:cubic-bezier(.2,.6,.3,1)`],
    [[8.9, D], `transform:translate(${hEnd[0]}px,${hEnd[1]}px);opacity:1`],
  ]) }));
  A.push(el('circle', { cx: k[0], cy: k[1], r: 9, stroke: t.sand, strokeWidth: 1.5, class: 'a pop', style: pop(8.9) }));
  A.push(text(430, 280, 'black box → open loop', { size: 11, fill: t.faint, anchor: 'middle', ...L.sh(9.6) }));

  // 4. what the person wanted settles as sediment: long-horizon preferences, kept up automatically
  const sedY = 244, rnd = rng(3);
  const strip = (x0, x1) => {
    let d = `M${x0},${sedY}`;
    for (let x = x0; x <= x1; x += 10) d += `L${x},${r1(sedY - 3 - rnd() * 4)}`;
    return d + `L${x1},${sedY}Z`;
  };
  [0, 1, 2].forEach(i => {
    const t0 = 9.4 + i * 0.22, to = [k[0] - 10 + i * 10, sedY - 6];
    A.push(el('circle', { cx: 0, cy: 0, r: 1.8, fill: t.sand, opacity: 0, class: 'a', style: L.on([
      [[0, t0], `transform:translate(${k[0]}px,${k[1] + 8}px);opacity:0`],
      [t0 + 0.01, `transform:translate(${k[0]}px,${k[1] + 8}px);opacity:1;animation-timing-function:cubic-bezier(.5,0,.9,.5)`],
      [t0 + 0.75, `transform:translate(${to[0]}px,${to[1]}px);opacity:1`],
      [[t0 + 1.0, D], `transform:translate(${to[0]}px,${to[1]}px);opacity:0`],
    ]) }));
  });
  A.push(el('path', { d: strip(250, 620), fill: t.sand, opacity: 0.5, class: 'a gy', style: L.on([[[0, 10.1], 'transform:scaleY(0)'], [[10.9, D], 'transform:scaleY(1)']]) }));
  A.push(text(240, sedY, 'prefs', { size: 11, fill: t.sandText, anchor: 'end', ...L.sh(10.4) }));

  // 5. a change lands through a gate, then forks into scenario-shaped variants that carry the prefs
  A.push(el('rect', { x: gate[0] - 5, y: gate[1] - 5, width: 10, height: 10, fill: bg, stroke: t.muted, transform: `rotate(45 ${gate[0]} ${gate[1]})`, ...L.sh(4.4) }));
  A.push(text(gate[0] - 12, gate[1] - 8, 'gate', { size: 11, fill: t.faint, anchor: 'end', ...L.sh(4.4) }));
  A.push(text(gate[0], gate[1] - 11, '✓', { size: 11, fill: t.fg, anchor: 'middle', ...L.sh(10.9, null, 0.2) }));
  const VX = 700;
  const variants = [
    { nodes: [[VX, 84], [742, 84], [784, 84], [826, 84]], edges: [[0, 1], [1, 2], [2, 3]] },
    { nodes: [[VX, 144], [746, 144], [792, 124], [806, 144], [792, 164]], edges: [[0, 1], [1, 2], [1, 3], [1, 4]] },
    { nodes: [[VX, 204], [744, 204], [788, 190], [788, 218], [832, 190]], edges: [[0, 1], [1, 2], [1, 3], [2, 4]] },
  ];
  variants.forEach(({ nodes, edges }, i) => {
    const t0 = 11.8 + i * 0.3, root = nodes[0];
    const fl = Math.hypot(root[0] - 6 - gate[0] - 7, root[1] - gate[1]) * 1.1;
    A.push(el('path', { d: `M${gate[0] + 7},${gate[1]}C${gate[0] + 30},${gate[1]} ${root[0] - 30},${root[1]} ${root[0] - 6},${root[1]}`, stroke: t.muted, strokeDasharray: r1(fl), class: 'a', style: draw(fl, t0, 0.5) }));
    A.push(g(L.sh(t0 + 0.45), el('path', { d: edges.map(([a, b]) => `M${nodes[a][0]},${nodes[a][1]}L${nodes[b][0]},${nodes[b][1]}`).join(''), stroke: t.line })
      + nodes.map(n => `<circle cx="${n[0]}" cy="${n[1]}" r="3.5" fill="${bg}" stroke="${t.muted}" stroke-width="1.2"/>`).join('')
      + `<circle cx="${root[0]}" cy="${root[1]}" r="1.8" fill="${t.ember}"/>`));
  });
  A.push(text(VX - 6, 60, 'fork', { size: 11, fill: t.faint, ...L.sh(11.8) }));
  A.push(el('path', { d: strip(692, 856), fill: t.sand, opacity: 0.5, class: 'a gy', style: L.on([[[0, 13.0], 'transform:scaleY(0)'], [[13.8, D], 'transform:scaleY(1)']]) }));
  A.push(text(778, 280, 'app → fork', { size: 11, fill: t.faint, anchor: 'middle', ...L.sh(13.2) }));

  return svg({
    w: W, h: H, title: 'Pneuma, the idea',
    desc: 'Abstract animation of the idea behind Pneuma. A sealed app with fixed feature cells opens; the cells come loose and re-form as a capability graph. An agent trace (ember) runs through the graph and marks each node it touches; a person (sand) steps in at one node and bends the path, and what they wanted settles as a layer of preferences along the base. The change passes a gate, then the graph forks into differently shaped variants that carry the preferences with them. Captions: features → capabilities, black box → open loop, app → fork.',
    css: css.join('') + L.css(), body: g(L.wrap(), A.join('')),
  });
}

// ---------- pkc: sources compiled into a cited library, then asked ----------

function renderPKC(theme) {
  const t = THEMES[theme];
  const W = 880, H = 352, D = 20;
  const L = new Loop(D);
  const bg = theme === 'dark' ? '#0d1117' : '#ffffff';
  const A = [];
  const css = ['.gx{transform-box:fill-box;transform-origin:left}.pop{transform-box:fill-box;transform-origin:center}'];
  const draw = (len, t0, dur) => L.on([[[0, t0], `stroke-dashoffset:${r1(len)};animation-timing-function:linear`], [[t0 + dur, D], 'stroke-dashoffset:0']]);

  const out = [];
  out.push(text(24, 20, 'sources', { size: 11, fill: t.faint }));
  out.push(text(556, 20, 'library', { size: 11, fill: t.faint }));
  out.push(text(856, 20, 'illustrative', { size: 11, fill: t.faint, anchor: 'end' }));

  // 1. typed source records, one per input contract, each with the locator of a span
  const SRC = [
    ['meeting/v1', '00:31:07–00:31:22'],
    ['document-library/v1', '§3.2 ¶4'],
    ['im/v1', 'msg 1187'],
    ['email/v1', 'thread 22 · #3'],
    ['owner-dialogue/v1', 'q 12'],
    ['agent-session/v1', 'claude-code · turn 41'],
  ];
  const rowY = i => 46 + i * 24, SR = 300;
  SRC.forEach(([contract, loc], i) => {
    A.push(g({ class: 'a', style: L.on([[[0, 0.4 + i * 0.3], 'opacity:0;transform:translateX(-8px)'], [[0.8 + i * 0.3, D], 'opacity:1;transform:translateX(0)']]) },
      text(24, rowY(i), contract, { size: 11.5, fill: t.muted }) + text(SR, rowY(i), loc, { size: 11, fill: t.faint, anchor: 'end' })));
  });

  // 2. the compile pass: contract → draft → draft gate (provenance) → git
  const BY = 226, chipH = 20;
  const chip = (x, label, extra = {}) => {
    const w = textW(label, 11) + 16;
    return { x, w, cx: x + w / 2, svg: el('rect', { x: x + 0.5, y: BY - chipH / 2 + 0.5, width: w - 1, height: chipH - 1, rx: 3, fill: bg, stroke: t.line, ...extra }) + text(x + 8, BY + 4, label, { size: 11, fill: t.muted }) };
  };
  const cC = chip(100, 'compile contract'), cD = chip(262, 'draft');
  const gX = 360;
  const cG = chip(600, 'git 3f9a2c1');
  A.push(el('path', { d: `M84,${BY}H${cG.x}`, stroke: t.line }));
  A.push(cC.svg + cD.svg);
  A.push(el('rect', { x: gX - 5, y: BY - 5, width: 10, height: 10, fill: bg, stroke: t.muted, transform: `rotate(45 ${gX} ${BY})` }));
  A.push(text(gX + 14, BY + 4, 'draft gate · provenance', { size: 11, fill: t.muted }));
  A.push(text(gX + 14 + textW('draft gate · provenance ', 11), BY + 4, '✓', { size: 11, fill: t.fg, ...L.sh(10.0, null, 0.2) }));
  // git: the hash ticks when the page lands
  A.push(el('rect', { x: cG.x + 0.5, y: BY - chipH / 2 + 0.5, width: cG.w - 1, height: chipH - 1, rx: 3, fill: bg, stroke: t.line }));
  A.push(text(cG.x + 8, BY + 4, 'git 3f9a2c1', { size: 11, fill: t.muted, opacity: 0, class: 'a', style: L.show(0, 10.4, 0.15) }));
  A.push(text(cG.x + 8, BY + 4, tspan('git ', t.muted) + tspan('8e04b7d', t.fg), { size: 11, raw: true, class: 'a', style: L.show(10.5, null, 0.2) }));
  A.push(text(24, BY + 4, 'steward', { size: 11, fill: t.emberText }));
  // from the sources down into the pass; from git up into the library
  A.push(el('path', { d: `M${cC.cx},${rowY(5) + 10}V${BY - chipH / 2 - 2}m-4,-5l4,5l4,-5`, stroke: t.faint, ...L.sh(2.4) }));
  const upX = cG.cx;
  A.push(el('path', { d: `M${upX},${BY - chipH / 2 - 2}V${190}m-4,5l4,-5l4,5`, stroke: t.faint, ...L.sh(10.6) }));
  // which stage is running
  const lit = (x, w, t0, t1) => el('rect', { x: x + 0.5, y: BY - chipH / 2 + 0.5, width: w - 1, height: chipH - 1, rx: 3, stroke: t.ember, opacity: 0, class: 'a', style: L.show(t0, t1, 0.2) });
  A.push(lit(cC.x, cC.w, 3.4, 4.3), lit(cD.x, cD.w, 4.5, 8.8), lit(cG.x, cG.w, 10.3, 11.0));
  A.push(el('rect', { x: gX - 7, y: BY - 7, width: 14, height: 14, stroke: t.ember, transform: `rotate(45 ${gX} ${BY})`, opacity: 0, class: 'a', style: L.show(9.0, 10.0, 0.2) }));
  // the steward's token
  const stops = [[3.2, 84], [3.5, cC.cx], [4.3, cC.cx], [4.6, cD.cx], [8.8, cD.cx], [9.1, gX], [10.0, gX], [10.4, upX]];
  const tok = [[[0, 3.1], `transform:translateX(84px);opacity:0`]];
  stops.forEach(([tt, x]) => tok.push([tt, `transform:translateX(${r1(x)}px);opacity:1`]));
  tok.push([[10.7, D], `transform:translateX(${r1(upX)}px);opacity:0`]);
  A.push(el('circle', { cx: 0, cy: BY, r: 3.5, fill: t.ember, opacity: 0, class: 'a', style: L.on(tok) }));

  // 3. the page: drafted with claims, each citing an exact span; canonical once committed
  const PX = 556, PW = 300, PY = 34, PH = 150;
  A.push(el('rect', { x: PX + 0.5, y: PY + 0.5, width: PW - 1, height: PH - 1, rx: 4, stroke: t.muted, strokeDasharray: '3 3', opacity: 0, class: 'a', style: L.show(4.6, 10.6, 0.3) }));
  A.push(el('rect', { x: PX + 0.5, y: PY + 0.5, width: PW - 1, height: PH - 1, rx: 4, stroke: t.line, class: 'a', style: L.show(10.6, null, 0.3) }));
  A.push(g(L.sh(4.6), text(PX + 12, PY + 20, 'pages/decisions.md', { size: 11.5, fill: t.fg }) + el('path', { d: `M${PX + 1},${PY + 30.5}H${PX + PW - 1}`, stroke: t.line })));
  A.push(text(PX + PW - 12, PY + 20, 'draft', { size: 11, fill: t.emberText, anchor: 'end', opacity: 0, class: 'a', style: L.show(4.6, 10.5, 0.2) }));
  A.push(text(PX + PW - 12, PY + 20, 'L3 · canonical', { size: 11, fill: t.faint, anchor: 'end', class: 'a', style: L.show(10.7, null, 0.3) }));
  const claims = [[0, 196], [1, 170], [3, 214], [5, 150]];
  const claimY = j => PY + 52 + j * 26;
  claims.forEach(([src, w], j) => {
    const y = claimY(j), t0 = 5.0 + j * 0.9;
    A.push(text(PX + 12, y, `[${j + 1}]`, { size: 11, fill: t.emberText, ...L.sh(t0) }));
    A.push(el('rect', { x: PX + 42, y: y - 7, width: w, height: 5, rx: 2.5, fill: t.muted, opacity: 0.35, class: 'a gx', style: L.on([[[0, t0], 'transform:scaleX(0)'], [[t0 + 0.4, D], 'transform:scaleX(1)']]) }));
    // the thread back to the span it came from
    const [, loc] = SRC[src], sy = rowY(src) - 4;
    const a = [PX - 4, y - 4], b = [SR + 8, sy];
    const c1 = [(a[0] + b[0]) / 2 + 20, a[1]], c2 = [(a[0] + b[0]) / 2 - 20, b[1]];
    const len = polyLen(bezPoints(a, c1, c2, b)) + 2;
    A.push(el('path', { d: `M${r1(a[0])},${r1(a[1])}C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(b[0])},${r1(b[1])}`, stroke: t.ember, strokeWidth: 1.1, strokeDasharray: r1(len), class: 'a', style: draw(len, t0 + 0.3, 0.5) }));
    A.push(el('circle', { cx: a[0], cy: a[1], r: 2, fill: t.ember, ...L.sh(t0 + 0.2) }));
    const lw = textW(loc, 11);
    A.push(el('rect', { x: SR - lw - 3, y: sy - 8, width: lw + 6, height: 15, rx: 2, fill: t.ember, fillOpacity: 0.12, ...L.sh(t0 + 0.8, null, 0.2) }));
    // the gate checks each thread resolves to a span: a quick pulse, in order
    A.push(el('circle', { cx: b[0], cy: b[1], r: 3, stroke: t.ember, opacity: 0, class: 'a pop', style: L.on([[[0, 9.0 + j * 0.2], 'opacity:0;transform:scale(.5)'], [9.15 + j * 0.2, 'opacity:1;transform:scale(1)'], [[9.6 + j * 0.2, D], 'opacity:0;transform:scale(1.6)']]) }));
  });

  // 4. ask: answers carry numbered citations; L3 claims and L0 verbatim spans are both read
  const QY = 286;
  A.push(el('path', { d: `M24,${QY - 26.5}H856`, stroke: t.line, strokeDasharray: '1 3' }));
  const Q = './app.py ask "What is still undecided?" --sources';
  A.push(text(24, QY, '$', { size: 12, fill: t.sandText, ...L.sh(11.4, null, 0.2) }));
  A.push(text(38, QY, Q, { size: 12, fill: t.fg, fit: Q.length * 7.2, class: 'a', style: L.on([[[0, 11.6], `clip-path:inset(0 100% 0 0);animation-timing-function:steps(${Q.length},end)`], [[13.2, D], 'clip-path:inset(0 0 0 0)']]) }));
  [[2, 186], [4, 132]].forEach(([cite, w], i) => {
    const y = QY + 24 + i * 20, t0 = 13.7 + i * 0.4;
    A.push(g(L.sh(t0), text(38, y, String(i + 1), { size: 11, fill: t.faint })
      + el('rect', { x: 56, y: y - 7, width: w, height: 5, rx: 2.5, fill: t.muted, opacity: 0.35 })
      + text(56 + w + 10, y, `[${cite}]`, { size: 11, fill: t.emberText })));
    // the cited claims light up in the page
    A.push(el('rect', { x: PX + 6, y: claimY(cite - 1) - 14, width: PW - 12, height: 20, rx: 3, fill: t.ember, fillOpacity: 0.07, ...L.sh(t0 + 0.1) }));
  });
  const LX = 640, levels = [['L3', 'canonical claims', 14.0], ['L2', 'semantic', null], ['L1', 'lexical', null], ['L0', 'verbatim', 14.6]];
  levels.forEach(([lv, name, on], i) => {
    const y = QY + i * 18;
    A.push(el('rect', { x: LX + 0.5, y: y - 8.5, width: 7, height: 7, rx: 1, stroke: t.line }));
    A.push(text(LX + 16, y, tspan(lv + ' ', t.faint) + tspan(name, t.faint), { size: 11, raw: true }));
    if (on) {
      A.push(el('rect', { x: LX, y: y - 9, width: 8, height: 8, rx: 1, fill: t.ember, ...L.sh(on, null, 0.2) }));
      A.push(text(LX + 16, y, tspan(lv + ' ', t.muted) + tspan(name, t.fg), { size: 11, raw: true, ...L.sh(on, null, 0.2) }));
    }
  });

  out.push(g(L.wrap(), A.join('')));
  return svg({
    w: W, h: H, title: 'pneuma-knowledge-compiler',
    desc: 'Illustrative animation of pneuma-knowledge-compiler. Typed source records arrive through six input contracts: meeting/v1, document-library/v1, im/v1, email/v1, owner-dialogue/v1 and agent-session/v1. The steward runs a compile pass: compile contract, draft, a draft gate that checks provenance, then a Git commit. A library page is drafted with claims, each linked by a thread to the exact span it cites. Then a question is asked with ./app.py ask "What is still undecided?" --sources; the answer carries numbered citations, read from L3 canonical claims and L0 verbatim spans. Access levels: L0 verbatim, L1 lexical, L2 semantic, L3 canonical claims. Citation checks establish traceability, not correctness.',
    css: css.join('') + L.css(), body: out.join(''),
  });
}

// ---------- memory: Nemori's episodic pipeline and the predict–calibrate loop ----------

function renderMemory(theme) {
  const t = THEMES[theme];
  const W = 880, H = 282, D = 16;
  const L = new Loop(D);
  const out = [];
  const css = ['.pop{transform-box:fill-box;transform-origin:center}'];
  const wipe = (t0, t1, steps) => L.on([[[0, t0], `clip-path:inset(0 100% 0 0);animation-timing-function:${steps ? `steps(${steps},end)` : 'linear'}`], [[t1, D], 'clip-path:inset(0 0 0 0)']]);
  const slide = (x0, x1, t0, t1) => L.on([[[0, t0], `transform:translateX(${r1(x0)}px);opacity:0;animation-timing-function:linear`], [t0 + 0.01, `transform:translateX(${r1(x0)}px);opacity:1;animation-timing-function:linear`], [t1, `transform:translateX(${r1(x1)}px);opacity:1`], [[t1 + 0.3, D], `transform:translateX(${r1(x1)}px);opacity:0`]]);
  const hop = (a, b, t0, t1) => L.on([[[0, t0], `transform:translate(${a[0]}px,${a[1]}px);opacity:0`], [t0 + 0.05, `transform:translate(${a[0]}px,${a[1]}px);opacity:1`], [t1, `transform:translate(${b[0]}px,${b[1]}px);opacity:1`], [[t1 + 0.2, D], `transform:translate(${b[0]}px,${b[1]}px);opacity:0`]]);
  const dot = (color, style) => el('circle', { cx: 0, cy: 0, r: 2.5, fill: color, opacity: 0, class: 'a', style });

  // header + column labels
  out.push(text(24, 20, tspan('nemori', t.fg, ' font-weight="600"') + tspan('   self-organising long-term memory for agents', t.muted), { size: 12.5, raw: true }));
  out.push(text(856, 20, 'arXiv 2508.03341', { size: 11.5, fill: t.faint, anchor: 'end' }));
  const AX = 24, BX = 372, BW = 232, CX = 648, CR = 856;
  [[AX, 'conversation'], [BX, 'episodes'], [CX, 'semantic memory']].forEach(([x, s]) => out.push(text(x, 48, s, { size: 11, fill: t.faint })));
  out.push(el('path', { d: `M${AX},54.5H${CR}`, stroke: t.line }));

  // 1. the conversation as a waveform: your turns above the line, the agent's below
  const cy = 110, PIT = 7, N = 42, cuts = [14, 26];
  const rnd = rng(5);
  let up = '', down = '';
  for (let i = 0; i < N; i++) {
    const x = AX + 3 + i * PIT;
    if (i % 2 === 0) up += `M${x},${cy - 3}v-${r1(5 + rnd() * 11)}`;
    else down += `M${x},${cy + 3}v${r1(8 + rnd() * 16)}`;
  }
  const waveR = AX + 3 + (N - 1) * PIT;
  out.push(g({ class: 'a', style: wipe(0.3, 2.9), strokeWidth: 2.5, strokeLinecap: 'round' },
    `<path d="${up}" stroke="${t.muted}"/><path d="${down}" stroke="${t.faint}" opacity=".7"/>`));
  out.push(el('rect', { x: AX, y: cy - 26, width: 1.5, height: 52, fill: t.cool, opacity: 0, class: 'a', style: slide(0, waveR - AX + 4, 0.3, 2.9) }));
  out.push(g(L.sh(0.3), text(waveR + 12, cy - 8, 'you', { size: 11, fill: t.muted }) + text(waveR + 12, cy + 16, 'agent', { size: 11, fill: t.faint })));
  // boundary detection, then the segments it implies
  const bx = c => AX + 3 + c * PIT - PIT / 2;
  cuts.forEach((c, k) => {
    const x = bx(c), t0 = 3.1 + k * 0.35;
    out.push(g({ class: 'a', style: L.on([[[0, t0], 'opacity:0;transform:translateY(-8px)'], [[t0 + 0.4, D], 'opacity:1;transform:translateY(0)']]) },
      el('path', { d: `M${x},${cy - 34}V${cy + 30}`, stroke: t.cool, strokeDasharray: '2 2' })
      + el('path', { d: `M${x - 4},${cy - 40}h8l-4,5z`, fill: t.cool })));
  });
  out.push(text(bx(cuts[0]) - 9, cy - 32, 'topic shift', { size: 11, fill: t.cool, anchor: 'end', ...L.sh(3.3) }));
  const segs = [[0, cuts[0]], [cuts[0], cuts[1]], [cuts[1], N]];
  segs.forEach(([a, b], k) => {
    const x0 = bx(a) + 3, x1 = bx(b) - 3, by = cy + 36;
    out.push(g(L.sh(3.9 + k * 0.2), el('path', { d: `M${x0},${by - 4}V${by}H${x1}V${by - 4}`, stroke: t.cool })
      + text((x0 + x1) / 2, by + 15, `ep.${k + 1}`, { size: 11, fill: t.cool, anchor: 'middle' })));
  });

  // 2. episodes: each segment becomes a narrative with a time anchor
  const eps = [
    ['planning the launch deck', 'oct 14 · 09:12 · 14 turns'],
    ['demo logistics', 'oct 14 · 09:41 · 12 turns'],
    ['review flow in the viewer', 'oct 14 · 10:05 · 16 turns'],
  ];
  const cardY = k => 64 + k * 40, CH = 34;
  out.push(g(L.sh(4.4), el('path', { d: `M${waveR + 48},${cy}H${BX - 10}m-5,-4l5,4l-5,4`, stroke: t.faint })));
  eps.forEach(([title, meta], k) => {
    const y = cardY(k);
    out.push(g({ class: 'a', style: L.on([[[0, 4.6 + k * 0.3], 'opacity:0;transform:translateX(-10px)'], [[5.0 + k * 0.3, D], 'opacity:1;transform:translateX(0)']]) },
      el('rect', { x: BX + 0.5, y: y + 0.5, width: BW, height: CH, rx: 3, stroke: t.line })
      + el('rect', { x: BX, y, width: 2, height: CH + 1, fill: t.cool })
      + text(BX + 12, y + 15, tspan(`ep.${k + 1} `, t.cool) + tspan(title, t.fg), { size: 11.5, raw: true })
      + text(BX + 12, y + 29, meta, { size: 11, fill: t.faint })));
  });

  // 3. semantic memory: facts distilled out of the episodes
  const factY = i => 76 + i * 22;
  out.push(el('rect', { x: CX, y: 62, width: 2, height: 4 * 22 + 4, fill: t.cool, opacity: 0.6 }));
  const facts = [[0, 'prefers short slide titles'], [1, null], [0, 'deck lives in ./launch-deck'], [2, 'steers via the viewer']];
  facts.forEach(([ep, f], i) => {
    const t0 = 6.0 + i * 0.45;
    out.push(dot(t.cool, hop([BX + BW + 4, cardY(ep) + 17], [CX + 12, factY(i) - 4], t0, t0 + 0.5)));
    if (f) out.push(text(CX + 12, factY(i), f, { size: 11.5, fill: t.fg, ...L.sh(t0 + 0.45) }));
  });
  // the fact that gets calibrated
  const F2 = 'launch demo is on ', fx = CX + 12, fy = factY(1);
  out.push(text(fx, fy, F2 + 'friday', { size: 11.5, fill: t.fg, opacity: 0, class: 'a', style: L.show(6.9, 11.6, 0.2) }));
  out.push(text(fx, fy, F2 + 'monday', { size: 11.5, fill: t.fg, class: 'a', style: L.show(11.8, null, 0.25) }));
  const mx = fx + textW(F2, 11.5), mw = textW('monday', 11.5);
  out.push(el('rect', { x: mx - 2, y: fy - 12, width: mw + 4, height: 16, rx: 2, fill: t.ember, fillOpacity: 0.15, opacity: 0, class: 'a', style: L.show(11.8, 13.6, 0.3) }));
  out.push(text(mx, fy, 'monday', { size: 11.5, fill: t.emberText, opacity: 0, class: 'a', style: L.show(11.8, 13.4, 0.25) }));

  // 4. predict → compare → calibrate
  const by = 240, sep = 200;
  out.push(el('path', { d: `M${AX},${sep + 0.5}H${CR}`, stroke: t.line, strokeDasharray: '1 3' }));
  // incoming turns of a new episode
  let inc = '';
  for (let i = 0; i < 10; i++) inc += i % 2 ? `M${AX + 3 + i * PIT},${by + 3}v${r1(7 + rnd() * 10)}` : `M${AX + 3 + i * PIT},${by - 3}v-${r1(4 + rnd() * 8)}`;
  out.push(g({ class: 'a', style: wipe(8.4, 9.4), strokeWidth: 2.5, strokeLinecap: 'round', stroke: t.muted }, `<path d="${inc}"/>`));
  out.push(text(AX, by - 26, 'ep.4 incoming', { size: 11, fill: t.faint, ...L.sh(8.3) }));
  const OX = 130, PX = CX + 12;
  out.push(g(L.sh(9.4), el('path', { d: `M${AX + 76},${by}H${OX - 10}m-5,-4l5,4l-5,4`, stroke: t.faint })
    + text(OX, by - 6, 'observed', { size: 11, fill: t.faint })
    + text(OX, by + 12, tspan('"demo moved to ', t.fg) + tspan('monday', t.emberText) + tspan('"', t.fg), { size: 11.5, raw: true })));
  out.push(g(L.sh(8.6), text(PX, by - 6, 'predicted', { size: 11, fill: t.faint })
    + text(PX, by + 12, '"demo on friday"', { size: 11.5, fill: t.muted })));
  // predict: down out of semantic memory
  const pv = CX + 70;
  out.push(el('path', { d: `M${pv},${factY(3) + 12}V${by - 20}m-4,-5l4,5l4,-5`, stroke: t.cool, ...L.sh(8.2) }));
  out.push(text(pv + 8, (factY(3) + by - 8) / 2 + 2, 'predict', { size: 11, fill: t.cool, ...L.sh(8.2) }));
  out.push(dot(t.cool, hop([pv, factY(3) + 12], [pv, by - 22], 8.2, 8.7)));
  // compare: the gap between the two is where the new fact is
  const oEnd = OX + textW('"demo moved to monday"', 11.5) + 10, dX = (oEnd + PX - 10) / 2;
  out.push(el('path', { d: `M${oEnd},${by + 8}H${dX - 14}M${dX + 14},${by + 8}H${PX - 12}`, stroke: t.ember, strokeDasharray: '2 3', ...L.sh(10.0) }));
  out.push(text(dX, by + 13, 'Δ', { size: 15, fill: t.emberText, anchor: 'middle', weight: 600, class: 'a pop', style: L.on([[[0, 10.2], 'opacity:0;transform:scale(.4)'], [10.5, 'opacity:1;transform:scale(1.25)'], [[10.8, D], 'opacity:1;transform:scale(1)']]) }));
  // calibrate: the gap flows back up into semantic memory
  const ux = CX - 22, cal = `M${dX},${by - 6}V${sep + 30}Q${dX},${sep + 24} ${dX + 6},${sep + 24}H${ux - 6}Q${ux},${sep + 24} ${ux},${sep + 18}V${fy + 2}Q${ux},${fy - 4} ${ux + 6},${fy - 4}H${CX - 6}m-5,-4l5,4l-5,4`;
  const calLen = (by - 6 - sep - 24) + (ux - dX) + (sep + 24 - fy + 4) + 30;
  out.push(el('path', { d: cal, stroke: t.ember, strokeDasharray: r1(calLen), class: 'a', style: L.on([[[0, 10.6], `stroke-dashoffset:${r1(calLen)};animation-timing-function:linear`], [[11.7, D], 'stroke-dashoffset:0']]) }));
  out.push(text(dX + 12, sep + 18, 'calibrate', { size: 11, fill: t.emberText, ...L.sh(10.7) }));

  return svg({
    w: W, h: H, title: 'Nemori: episodic memory for agents',
    desc: 'Nemori, animated: a conversation streams in, boundary detection cuts it at topic shifts into episodes, each episode becomes a narrative with a time anchor, and facts are distilled into semantic memory. Then predict–calibrate: semantic memory predicts the next episode, the gap between prediction and what was observed becomes the new fact, folded back into memory.',
    css: css.join('') + L.css(), body: out.join(''),
  });
}

export function renderVisuals() {
  return [
    ['pneuma-replay.svg', renderReplay()],
    ['pneuma-concept-light.svg', renderConcept('light')],
    ['pneuma-concept-dark.svg', renderConcept('dark')],
    ['pkc-light.svg', renderPKC('light')],
    ['pkc-dark.svg', renderPKC('dark')],
    ['stack-light.svg', renderStack('light')],
    ['stack-dark.svg', renderStack('dark')],
    ['memory-light.svg', renderMemory('light')],
    ['memory-dark.svg', renderMemory('dark')],
  ];
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(ROOT, 'assets');
  mkdirSync(dir, { recursive: true });
  const files = renderVisuals();
  for (const [name, content] of files) writeFileSync(join(dir, name), content);
  console.log(`rendered ${files.length} SVGs`);
}
