#!/usr/bin/env node
// Illustrative animated pieces (no live data): the Pneuma concept, the replay, the knowledge compiler,
// pneuma-craft + pneuma-framework, omne-harness-lite runtime continuity, Fold, Plexus, PneumaSpace, Nemori memory.
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

// ---------- omne: runtimes with their own lifecycles; the process dies, the responsibility doesn't ----------

function renderOmne(theme) {
  const t = THEMES[theme];
  const W = 880, H = 280, D = 20;
  const L = new Loop(D);
  const bg = theme === 'dark' ? '#0d1117' : '#ffffff';
  const A = [];
  const css = ['.gx{transform-box:fill-box;transform-origin:left}.pop{transform-box:fill-box;transform-origin:center}'];
  const pop = t0 => L.on([[[0, t0], 'opacity:0;transform:scale(.3)'], [[t0 + 0.3, D], 'opacity:1;transform:scale(1)']]);
  const draw = (len, t0, dur) => L.on([[[0, t0], `stroke-dashoffset:${r1(len)};animation-timing-function:linear`], [[t0 + dur, D], 'stroke-dashoffset:0']]);
  const lbl = (x, y, s, o = {}) => text(x, y, s, { size: 11, fill: t.faint, ...o });

  // one playhead drives the run; every bar grows exactly under it
  const X0 = 124, X1 = 856;
  const C = { I2: 138, M0: 176, M1: 236, M4: 300, R: 346, RE: 370, M6: 480, ACK: 516, EFF: 556, W0: 600, W1: 700, F4: 760 };
  const HEAD = [[0.5, X0], [1.4, C.M0], [2.2, C.M0], [3.2, C.M1], [4.2, C.M4], [6.0, C.R], [7.0, C.RE], [8.0, C.RE], [9.2, C.M6], [9.8, C.ACK], [10.4, C.EFF], [11.0, C.W0], [12.8, C.W1], [13.8, C.F4], [14.6, X1]];
  const grow = (xa, xb) => {
    const f = [[0, 'transform:scaleX(0)']];
    HEAD.forEach(([tt, x]) => f.push([tt, `transform:scaleX(${r1(Math.max(0, Math.min(1, (x - xa) / (xb - xa))) * 1000) / 1000});animation-timing-function:linear`]));
    f.push([D, 'transform:scaleX(1)']);
    return L.on(f);
  };
  const bar = (xa, xb, y, color, extra = {}) => el('rect', { x: xa, y: y - 1.5, width: xb - xa, height: 3, rx: 1.5, fill: color, class: 'a gx', style: grow(xa, xb), ...extra });

  {
    // checkpoint ruler, with faint guides down through every lane
    const LY = { session: 60, agent: 106, model: 150, tool: 194 }, JY = 232;
    A.push(text(X1, 14, 'illustrative', { size: 11, fill: t.faint, anchor: 'end' }));
    Object.entries({ I2: C.I2, M0: C.M0, M1: C.M1, M4: C.M4, M6: C.M6, F4: C.F4 }).forEach(([k, x]) => {
      A.push(lbl(x, 34, k, { anchor: 'middle', fill: k === 'M4' ? t.emberText : t.faint }));
      A.push(el('path', { d: `M${x},40V${JY - 4}`, stroke: t.line, strokeDasharray: '1 4' }));
    });
    // lanes
    [['session', LY.session], ['agent runtime', LY.agent], ['model runtime', LY.model], ['tool runtime', LY.tool]].forEach(([name, y]) => {
      A.push(text(24, y + 4, name, { size: 11.5, fill: name === 'agent runtime' ? t.emberText : t.muted }));
      A.push(el('path', { d: `M${X0},${y + 0.5}H${X1}`, stroke: t.line }));
    });
    // the journal: solid, quiet, append-only
    A.push(text(24, JY + 12, 'journal', { size: 11.5, fill: t.fg }));
    A.push(el('rect', { x: X0 + 0.5, y: JY + 0.5, width: X1 - X0 - 1, height: 15, rx: 2, fill: t.soft, stroke: t.line }));
    const entry = (x, t0) => el('rect', { x: x - 1.5, y: JY + 3, width: 3, height: 10, rx: 1, fill: t.muted, class: 'a pop', style: pop(t0) });
    A.push(entry(C.M0, 1.4), entry(C.M1, 3.2), entry(C.M6, 9.3), entry(C.ACK, 9.9), entry(C.F4, 13.9));
    A.push(lbl(C.M0, JY + 34, 'request + intent', L.sh(1.6)));
    A.push(lbl(C.M6, JY + 34, 'materials → ack', L.sh(9.6)));
    A.push(lbl(C.F4, JY + 34, 'commit', L.sh(14.0)));

    // session: one lifecycle across the whole run
    A.push(bar(C.I2, X1, LY.session, t.muted));

    // agent runtime, process 1: runs to M4, then SIGKILL
    A.push(g({ opacity: 0.3, class: 'a', style: L.on([[[0, 4.5], 'opacity:1'], [[5.0, D], 'opacity:.3']]) },
      bar(C.I2, C.M4, LY.agent, t.ember) + lbl(X0, LY.agent - 9, 'pid 4182')));
    A.push(text(C.M4, LY.agent + 4.5, '✗', { size: 13, fill: t.fg, anchor: 'middle', weight: 600, class: 'a pop', style: pop(4.3) }));
    A.push(el('circle', { cx: C.M4, cy: LY.agent, r: 10, stroke: t.ember, opacity: 0, class: 'a pop', style: L.on([[[0, 4.25], 'opacity:0;transform:scale(.3)'], [4.4, 'opacity:1;transform:scale(1)'], [[5.0, D], 'opacity:0;transform:scale(1.8)']]) }));
    A.push(lbl(C.M4 - 8, LY.agent + 17, 'SIGKILL', { anchor: 'end', fill: t.muted, ...L.sh(4.4) }));

    // model runtime: the original call stays in flight through the kill
    A.push(bar(C.M0, C.M6, LY.model, t.muted));
    A.push(lbl(C.M0, LY.model - 9, 'call m-17', L.sh(1.5)));
    A.push(lbl(C.R + 8, LY.model + 17, 'in flight', L.sh(4.8)));
    A.push(el('circle', { cx: C.M6, cy: LY.model, r: 3, fill: t.fg, class: 'a pop', style: pop(9.2) }));

    // tool runtime: a write established before the kill is kept
    A.push(el('rect', { x: C.M1 - 3.5, y: LY.tool - 3.5, width: 7, height: 7, rx: 1, fill: t.muted, class: 'a pop', style: pop(3.2) }));
    A.push(lbl(C.M1 + 8, LY.tool - 9, 'write · kept', L.sh(3.4)));

    // agent runtime, process 2: reads the journal and reclaims the original responsibility
    A.push(lbl(C.R, LY.agent - 9, 'pid 5307', { fill: t.emberText, ...L.sh(6.0) }));
    const rl = JY - LY.agent - 8;
    A.push(el('path', { d: `M${C.R},${JY - 1}V${LY.agent + 7}m-4,5l4,-5l4,5`, stroke: t.ember, strokeDasharray: '2 2', ...L.sh(6.0, null, 0.2) }));
    A.push(el('rect', { x: C.R - 1, y: LY.agent + 7, width: 2, height: rl, fill: t.ember, opacity: 0, class: 'a', style: L.on([[[0, 6.0], 'opacity:0'], [6.1, 'opacity:.25'], [[6.6, D], 'opacity:0']]) }));
    A.push(lbl(C.R + 6, JY - 6, 'read', L.sh(6.2)));
    A.push(lbl(C.RE + 2, LY.agent + 17, 'reclaim original responsibility', { fill: t.fg, ...L.sh(6.8) }));
    // ... re-attaching to the same call, by its original reference
    A.push(el('path', { d: `M${C.RE},${LY.agent + 3}V${LY.model - 4}`, stroke: t.ember, strokeWidth: 1.5, strokeDasharray: r1(LY.model - LY.agent - 7), class: 'a', style: draw(LY.model - LY.agent - 7, 7.0, 0.4) }));
    A.push(el('circle', { cx: C.RE, cy: LY.model, r: 3.5, fill: bg, stroke: t.ember, strokeWidth: 1.5, class: 'a pop', style: pop(7.4) }));
    A.push(lbl(C.RE + 8, LY.model - 9, 'original ref · not re-issued', { fill: t.muted, ...L.sh(7.4) }));
    A.push(bar(C.R, C.W0, LY.agent, t.ember));

    // a new effect, submitted once by the replacement; then the wait for its result
    A.push(el('rect', { x: C.EFF - 3.5, y: LY.tool - 3.5, width: 7, height: 7, rx: 1, fill: bg, stroke: t.ember, strokeWidth: 1.5, class: 'a pop', style: pop(10.4) }));
    A.push(lbl(C.EFF - 10, LY.tool - 9, 'effect · submitted once', { anchor: 'end', fill: t.muted, ...L.sh(10.5) }));
    A.push(el('path', { d: `M${C.W0},${LY.agent + 0.5}H${C.W1}`, stroke: t.ember, strokeWidth: 3, strokeDasharray: '3 4', class: 'a gx', style: grow(C.W0, C.W1) }));
    A.push(lbl(C.W0, LY.agent - 9, 'wait · notify lost', { fill: t.muted, ...L.sh(11.2) }));
    // the notification that never arrives
    A.push(el('circle', { cx: 0, cy: 0, r: 2.5, fill: t.muted, opacity: 0, class: 'a', style: L.on([
      [[0, 11.0], `transform:translate(${C.EFF + 6}px,${LY.tool - 6}px);opacity:0`],
      [11.05, `transform:translate(${C.EFF + 6}px,${LY.tool - 6}px);opacity:1;animation-timing-function:linear`],
      [11.7, `transform:translate(612px,140px);opacity:1`],
      [[12.0, D], 'transform:translate(616px,136px);opacity:0'],
    ]) }));
    A.push(text(616, 140, '✗', { size: 11, fill: t.muted, anchor: 'middle', opacity: 0, class: 'a', style: L.show(11.7, 12.4, 0.15) }));
    // re-read the original source; the outcome is not known, so it stays unknown
    const rr = [[680, LY.agent + 4], [672, 160], [C.EFF + 18, LY.tool - 6], [C.EFF + 7, LY.tool - 4]];
    const rrLen = polyLen(bezPoints(...rr)) + 4;
    A.push(el('path', { d: `M${rr[0]}C${rr[1]} ${rr[2]} ${rr[3]}`, stroke: t.ember, strokeDasharray: r1(rrLen), class: 'a', style: draw(rrLen, 12.0, 0.6) }));
    const rrl = 're-read source → reconcile', rrx = 648, rry = LY.model + 23;
    A.push(g(L.sh(12.2), el('rect', { x: rrx - 3, y: rry - 10, width: r1(textW(rrl, 11) + 6), height: 13, fill: bg })
      + lbl(rrx, rry, rrl, { fill: t.muted })));
    const chip = 'outcome: unknown', cw = textW(chip, 11) + 14;
    A.push(g({ class: 'a', style: L.show(12.6, null, 0.3) },
      el('rect', { x: C.EFF - 6.5, y: LY.tool + 9.5, width: cw, height: 17, rx: 8.5, stroke: t.muted, strokeDasharray: '2 2' })
      + lbl(C.EFF + 0.5, LY.tool + 22, chip, { fill: t.muted })));
    A.push(bar(C.W1, C.F4, LY.agent, t.ember));

    // the single terminal commit, then back to idle
    A.push(g({ class: 'a pop', style: pop(13.8) }, el('rect', { x: C.F4 - 5.5, y: LY.agent - 5.5, width: 11, height: 11, fill: bg, stroke: t.ember, strokeWidth: 1.75, transform: `rotate(45 ${C.F4} ${LY.agent})` })
    + el('circle', { cx: C.F4, cy: LY.agent, r: 2, fill: t.ember })));
    A.push(lbl(X1, LY.agent + 17, 'tryFinish · single commit', { anchor: 'end', fill: t.fg, ...L.sh(14.0) }));
    A.push(el('path', { d: `M${C.F4 + 12},${LY.agent + 0.5}H${X1}`, stroke: t.faint, strokeDasharray: '1 3', ...L.sh(14.4) }));
    A.push(lbl(X1, LY.agent - 9, 'idle', { anchor: 'end', ...L.sh(14.5) }));

    // the playhead
    const ph = [[0, `transform:translateX(${X0}px);opacity:0`]];
    HEAD.forEach(([tt, x], i) => ph.push([tt, `transform:translateX(${x}px);opacity:${i === 0 ? 0 : 1};animation-timing-function:linear`]));
    ph.push([[15.0, D], `transform:translateX(${X1}px);opacity:0`]);
    A.push(el('rect', { x: -0.5, y: 40, width: 1, height: JY - 44, fill: t.ember, opacity: 0, class: 'a', style: L.on(ph) }));
  }

  return svg({
    w: W, h: H, title: 'omne-harness-lite: agent runtime continuity',
    desc: 'Illustrative timeline of agent runtime continuity in omne-harness-lite. Session, agent runtime, model runtime and tool runtime run on separate lifecycles above a journal. At M0 the request and its intent are saved to the journal and model call m-17 starts. A write is established at M1 and kept. At M4 the agent runtime process (pid 4182) is killed with SIGKILL; the session, the in-flight model call and the journal carry on. A replacement process (pid 5307) reads the journal, reclaims the original responsibility and re-attaches to the same call by its original reference, without re-issuing it. The result is read, materials are saved and then acknowledged. The replacement submits an effect once; a notification about it is lost, so the agent re-reads the original source, and since the outcome cannot be established it stays unknown. tryFinish is the single terminal commit, then the runtime goes idle.',
    css: css.join('') + L.css(), body: g(L.wrap(), A.join('')),
  });
}

// ---------- fold: many channels in, one budgeted state (B = 64) out, many forms of the same state ----------

function renderFold(theme) {
  const t = THEMES[theme];
  const W = 880, H = 306, D = 20;
  const L = new Loop(D);
  const A = [];
  const css = ['.pop{transform-box:fill-box;transform-origin:center}.gx{transform-box:fill-box;transform-origin:left}'
    + '.vt{transform-box:fill-box;transform-origin:top}.tl{transform-box:fill-box;transform-origin:0 0}'];
  const lbl = (x, y, s, o = {}) => text(x, y, s, { size: 11, fill: t.faint, ...o });
  const hide = { opacity: 0 }; // transient elements: hidden in the still (reduced-motion) frame
  // a value that changes over the loop: one text per state, cross-faded; the last state is the still
  const swap = (x, y, states, o = {}) => states.map(([t0, s, oo = {}], i) => {
    const last = i === states.length - 1;
    return lbl(x, y, s, { ...o, ...oo, ...(last ? {} : hide), ...L.sh(t0, last ? null : states[i + 1][0] - 0.2, 0.2) });
  }).join('');
  // brief highlight windows (several per element allowed)
  const flash = (ts, hold = 0.5) => {
    const f = [[0, 'opacity:0']];
    ts.forEach(t0 => f.push([t0, 'opacity:0'], [t0 + 0.12, 'opacity:1'], [t0 + hold, 'opacity:1'], [t0 + hold + 0.3, 'opacity:0']));
    f.push([D, 'opacity:0']);
    return { class: 'a', style: L.on(f), ...hide };
  };
  const popAt = (t0, extra = '') => L.on([[[0, t0], `opacity:0;transform:${extra}scale(.6)`], [[t0 + 0.3, D], `opacity:1;transform:${extra}scale(1)`]]);

  A.push(text(856, 14, 'illustrative', { size: 11, fill: t.faint, anchor: 'end' }));

  // ---- 1. channels: dense, heterogeneous input; then one uniform input shape, source kept ----
  const RY = i => 52 + i * 20;
  const SX = 186, SW = 114, KMAX = 402, GK = SW / 30;
  const S = [
    { k: 'work', recv: [[3.0, '286']], given: [9, 6], mark: 'tick' },
    { k: 'family', recv: [[3.0, '14']], given: [24, 24], mark: 'dot' },
    { k: 'community', recv: [[3.0, '97']], given: [3, 0], mark: 'dash' },
    { k: 'life', recv: [[3.0, '31'], [9.1, '32']], given: [12, 30], mark: 'cross' },
    { k: 'subscription', recv: [[3.0, '402']], given: [1, 0], mark: 'tick2' },
  ];
  A.push(lbl(24, 30, 'stream'), lbl(136, 30, 'recv', { anchor: 'end' }), lbl(172, 30, 'given', { anchor: 'end' }), lbl(SX, 30, 'inputs'));
  const rnd = rng(11);
  S.forEach((s, i) => {
    const cy = RY(i), n = Math.max(2, Math.round((+s.recv[0][1] / KMAX) * 38)), len = SW * (+s.recv[0][1] / KMAX);
    const xs = Array.from({ length: n }, (_, j) => r1(SX + (j + 0.5 + (rnd() - 0.5) * 0.7) * (len / n)));
    let het = '';
    xs.forEach(x => {
      if (s.mark === 'tick') het += `M${x},${cy + 2}v-${r1(3 + rnd() * 5)}`;
      else if (s.mark === 'tick2') het += `M${x},${cy + 2}v-7`;
      else if (s.mark === 'dot') het += `M${x},${cy - 1.5}h0`;
      else if (s.mark === 'dash') het += `M${x - 2},${cy - 1.5}h4`;
      else het += `M${x - 2},${cy - 3.5}l4,4m0,-4l-4,4`;
    });
    const sq = xs.map(x => `M${r1(x - 1.5)},${cy - 3}h3v3h-3z`).join('');
    A.push(lbl(24, cy + 4, s.k, { fill: t.muted }));
    // pour in (clip wipe), then hand over to the uniform squares
    const w0 = 0.5 + i * 0.22;
    A.push(g({ ...hide, class: 'a', style: L.show(w0, 3.4, 0.2) },
      g({ class: 'a', style: L.on([[[0, w0], 'clip-path:inset(0 100% 0 0);animation-timing-function:linear'], [[w0 + 1.6, D], 'clip-path:inset(0 0 0 0)']]) },
        el('path', { d: het, stroke: t.muted, strokeWidth: s.mark === 'dot' ? 3 : 1.2, strokeLinecap: 'round' }))));
    A.push(el('path', { d: sq, fill: t.muted, class: 'a', style: L.show(3.5, null, 0.5) }));
    A.push(swap(136, cy + 4, s.recv, { anchor: 'end' }));
    // given: grows once the layer is filled, re-settles after the yield
    const [ga, gb] = s.given, gy = cy + 5;
    if (gb > 0) {
      A.push(el('rect', { x: SX, y: gy, width: r1(gb * GK), height: 2.5, fill: t.fg, class: 'a gx',
        style: L.on([[[0, 8.1], 'transform:scaleX(0)'], [[8.6, 10.9], `transform:scaleX(${r1((ga / gb) * 1000) / 1000})`], [[11.5, D], 'transform:scaleX(1)']]) }));
    } else {
      A.push(el('rect', { x: SX, y: gy, width: r1(ga * GK), height: 2.5, fill: t.fg, ...hide, class: 'a gx',
        style: L.on([[[0, 8.1], 'transform:scaleX(0);opacity:1'], [[8.6, 10.9], 'transform:scaleX(1);opacity:1'], [11.5, 'transform:scaleX(0);opacity:1'], [D, 'transform:scaleX(0);opacity:0']]) }));
    }
    A.push(swap(172, cy + 4, ga === gb ? [[8.1, String(gb)]] : [[8.1, String(ga)], [11.2, String(gb)]], { fill: t.fg, anchor: 'end' }));
  });
  // one new input on the life channel, later
  const lifeEnd = SX + SW * (31 / KMAX);
  A.push(el('path', { d: `M${r1(lifeEnd + 2.5)},${RY(3) - 3}h3v3h-3z`, fill: t.fg, class: 'a pop', style: popAt(8.9) }));
  A.push(lbl(24, 160, 'uniform input · provenance kept', L.sh(3.8)));
  A.push(lbl(24, 178, 'received ≠ given', L.sh(8.4)));

  // ---- 2. the agent estimates in context and assigns a tier; shares derive from tier ----
  const TX = 344, TR = 446;
  const TIERS = [['critical', 24], ['high', 12], ['normal', 6], ['low', 3], ['trace', 1]];
  A.push(lbl(TX, 30, 'agent · tier → share', { fill: t.emberText }));
  const tierFlash = { critical: [4.6, 8.9], high: [5.2], normal: [5.8, 9.8], low: [6.4, 7.0], trace: [7.6] };
  TIERS.forEach(([k, v], i) => {
    const cy = RY(i);
    A.push(lbl(TX, cy + 4, k, { fill: t.muted }), lbl(TR, cy + 4, String(v), { anchor: 'end' }));
    A.push(g(flash(tierFlash[k], 0.6), lbl(TX, cy + 4, k, { fill: t.emberText }) + lbl(TR, cy + 4, String(v), { fill: t.emberText, anchor: 'end' })));
  });
  // stream -> tier, one per assignment
  [[4.6, 1, 0], [5.2, 3, 1], [5.8, 0, 2], [6.4, 0, 3], [7.0, 2, 3], [7.6, 4, 4], [8.9, 3, 0]].forEach(([t0, si, ti]) => {
    const p0 = [306, RY(si) - 1.5], p1 = [TX - 6, RY(ti) - 0.5];
    const c1 = [p0[0] + 22, p0[1]], c2 = [p1[0] - 22, p1[1]];
    const len = r1(polyLen(bezPoints(p0, c1, c2, p1)) + 2);
    A.push(el('path', { d: `M${p0}C${c1} ${c2} ${p1}`, stroke: t.ember, strokeWidth: 1.25, strokeDasharray: len, ...hide, class: 'a',
      style: L.on([[[0, t0], `stroke-dashoffset:${len};opacity:1`], [t0 + 0.35, 'stroke-dashoffset:0;opacity:1'], [t0 + 1.0, 'stroke-dashoffset:0;opacity:1'], [[t0 + 1.3, D], 'stroke-dashoffset:0;opacity:0']]) }));
  });

  // ---- 3. the layer: 64 cells, items as blocks sized by share ----
  const GX = 500, GY = 42, P = 22;
  const box = (c, r, cw, rh) => ({ x: GX + c * P, y: GY + r * P, width: cw * P - 1, height: rh * P - 1 });
  let cells = '';
  for (let c = 0; c < 16; c++) for (let r = 0; r < 4; r++) cells += `M${GX + c * P + 0.5},${GY + r * P + 0.5}h20v20h-20z`;
  A.push(el('path', { d: cells, stroke: t.line }));
  A.push(lbl(GX, 30, 'layer · B = 64', { fill: t.muted }));
  A.push(swap(851, 30, [[0.3, 'Σ 0 / 64'], [4.9, 'Σ 24 / 64'], [5.5, 'Σ 36 / 64'], [6.1, 'Σ 42 / 64'], [6.7, 'Σ 45 / 64'], [7.3, 'Σ 48 / 64'], [7.9, 'Σ 49 / 64'],
    [9.2, 'Σ 73 > 64', { fill: t.fg, weight: 600 }], [11.3, 'Σ 60 / 64 · 4 empty']], { anchor: 'end', fill: t.muted }));
  const blockRect = (b, extra = {}) => el('rect', { ...b, fill: t.soft, stroke: t.faint, ...extra });
  const id = (b, s, extra = {}) => lbl(b.x + 5, b.y + 14, s, { fill: t.fg, ...extra });
  const tag = (b, s, extra = {}) => lbl(b.x + 5, b.y + 28, s, { fill: t.muted, ...extra });
  const share = (b, line, s, extra = {}) => lbl(b.x + b.width - 4, b.y + (line === 1 ? 14 : 28), s, { anchor: 'end', ...extra });
  const outline = (b, t0) => el('rect', { x: b.x - 1.5, y: b.y - 1.5, width: b.width + 3, height: b.height + 3, stroke: t.ember, strokeWidth: 1.5, ...flash([t0], 0.4) });

  // boiler (family) critical 24 - stays
  const bB = box(0, 0, 6, 4);
  A.push(g({ class: 'a pop', style: popAt(4.9) }, blockRect(bB) + id(bB, 'boiler') + tag(bB, 'family') + share(bB, 2, '24')), outline(bB, 4.9));
  // lease (life) high 12 -> steps down to normal 6, moves to make room
  const bL = box(12, 0, 3, 2), dxL = -6 * P;
  A.push(g({ class: 'a pop', style: L.on([[[0, 5.2], `opacity:0;transform:translate(${dxL}px,0) scale(.6)`], [[5.5, 10.6], `opacity:1;transform:translate(${dxL}px,0) scale(1)`], [[10.9, D], 'opacity:1;transform:translate(0,0) scale(1)']]) },
    el('rect', { ...bL, fill: t.soft, stroke: t.faint, vectorEffect: 'non-scaling-stroke', class: 'a vt',
      style: L.on([[[0, 9.8], `transform:scaleY(${r1((4 * P - 1) / (2 * P - 1) * 1000) / 1000})`], [[10.2, D], 'transform:scaleY(1)']]) })
    + id(bL, 'lease') + tag(bL, 'life') + swap(bL.x + bL.width - 4, bL.y + 28, [[5.2, '12'], [9.9, '6']], { anchor: 'end' })), outline(box(6, 0, 3, 4), 5.5));
  // relnotes (work) normal 6 + ci-main (work) low 3 -> merged into release, normal 6
  const bR = box(12, 2, 3, 2), dR = [-3 * P, -2 * P];
  A.push(g({ class: 'a pop', style: L.on([[[0, 6.1], `opacity:0;transform:translate(${dR[0]}px,${dR[1]}px) scale(.6)`], [[6.4, 10.3], `opacity:1;transform:translate(${dR[0]}px,${dR[1]}px) scale(1)`], [[10.6, D], 'opacity:1;transform:translate(0,0) scale(1)']]) },
    blockRect(bR) + swap(bR.x + 5, bR.y + 14, [[6.1, 'relnotes'], [9.9, 'release']], { fill: t.fg }) + swap(bR.x + 5, bR.y + 28, [[6.1, 'work'], [9.9, 'merged']], { fill: t.muted })
    + share(bR, 2, '6')), outline(box(9, 0, 3, 2), 6.1));
  const bC = box(9, 2, 3, 1);
  A.push(g({ ...hide, class: 'a pop', style: L.on([[[0, 6.7], 'opacity:0;transform:translate(0,0) scale(.6)'], [[7.0, 9.8], 'opacity:1;transform:translate(0,0) scale(1)'], [10.1, `opacity:0;transform:translate(0,-${P}px) scale(1)`], [D, `opacity:0;transform:translate(0,-${P}px) scale(1)`]]) },
    blockRect(bC) + id(bC, 'ci-main') + share(bC, 1, '3')), outline(bC, 6.7));
  // forum (community) low 3, newsletter (subscription) trace 1 -> withdrawn
  const bF = box(9, 3, 3, 1), bN = box(12, 0, 1, 1);
  const gone = (t0, t1) => L.on([[[0, t0], 'opacity:0;transform:scale(.6)'], [[t0 + 0.3, t1], 'opacity:1;transform:scale(1)'], [[t1 + 0.3, D], 'opacity:0;transform:scale(1)']]);
  A.push(g({ ...hide, class: 'a pop', style: gone(7.3, 9.8) }, blockRect(bF) + id(bF, 'forum') + share(bF, 1, '3')), outline(bF, 7.3));
  A.push(g({ ...hide, class: 'a pop', style: gone(7.9, 9.9) }, blockRect(bN) + lbl(bN.x + 10.5, bN.y + 14.5, '1', { anchor: 'middle' })), outline(bN, 7.9));
  // visa-docs (life) critical 24 arrives with the layer full: held outside, then placed
  const bV = box(6, 0, 6, 4), dyV = 4 * P + 12;
  A.push(g({ class: 'a', style: L.on([[[0, 9.0], `opacity:0;transform:translate(0,${dyV}px)`], [[9.3, 10.9], `opacity:1;transform:translate(0,${dyV}px)`], [[11.3, D], 'opacity:1;transform:translate(0,0)']]) },
    blockRect(bV, { class: 'a', style: L.show(11.1, null, 0.25) })
    + el('rect', { ...bV, stroke: t.ember, strokeWidth: 1.25, strokeDasharray: '3 3', ...hide, class: 'a', style: L.show(9.0, 11.1, 0.25) })
    + id(bV, 'visa-docs') + tag(bV, 'life') + share(bV, 2, '24')
    + lbl(bV.x + bV.width + 8, bV.y + 28, '+24', { fill: t.emberText, ...hide, ...L.sh(9.2, 10.8, 0.2) })));
  A.push(lbl(851, 156, 'withdrawn: forum, newsletter', { anchor: 'end', ...L.sh(11.4) }));

  // ---- 4. the person comes back: annotation saved -> acknowledged on the next pass ----
  const note = '"tue morning ok"', nW = 18 + textW(note, 11) + 8;
  A.push(g(L.sh(12.0), el('path', { d: `M${GX + 40},${GY + 4 * P}V${GY + 4 * P + 9}`, stroke: t.sand })
    + el('rect', { x: GX, y: GY + 4 * P + 9, width: r1(nW), height: 17, rx: 8.5, stroke: t.sand })
    + el('circle', { cx: GX + 9, cy: GY + 4 * P + 17.5, r: 3, fill: t.sand })
    + lbl(GX + 18, GY + 4 * P + 21.5, note, { fill: t.fg })));
  const sy = GY + 4 * P + 40;
  let sx = GX;
  const seg = (s, fill, t0) => { const out = lbl(sx, sy, s, { fill, ...L.sh(t0) }); sx += textW(s, 11) + 6.6; return out; };
  A.push(seg('ann-1', t.faint, 12.0), seg('saved', t.sandText, 12.4), seg('→', t.faint, 13.4), seg('acknowledged', t.emberText, 13.4), seg('≠ action done', t.faint, 13.8));
  A.push(el('rect', { x: GX - 3.5, y: GY - 3.5, width: 16 * P + 6, height: 4 * P + 6, rx: 3, stroke: t.ember, strokeWidth: 1.5, ...flash([13.1], 0.5) }));

  // ---- 5. one state, several forms ----
  A.push(text(24, 240, '1 state · 12 forms', { size: 12, fill: t.fg, ...L.sh(14.5) }), lbl(24, 257, '4 shown', L.sh(14.7)));
  const FB = [[180, 196, 150, 84], [372, 194, 86, 92], [494, 196, 88, 88], [620, 204, 231, 70]];
  FB.forEach(([x, y, w, h], k) => {
    const sx_ = w / (16 * P - 1), sy_ = h / (4 * P - 1);
    A.push(el('rect', { x: GX, y: GY, width: 16 * P - 1, height: 4 * P - 1, stroke: t.faint, strokeDasharray: '3 3', vectorEffect: 'non-scaling-stroke', ...hide, class: 'a tl',
      style: L.on([[[0, 14.2], 'opacity:0;transform:translate(0,0) scale(1)'], [14.25, 'opacity:.9;transform:translate(0,0) scale(1)'],
        [15.0 + k * 0.12, `opacity:.9;transform:translate(${x - GX}px,${y - GY}px) scale(${r1(sx_ * 1000) / 1000},${r1(sy_ * 1000) / 1000})`],
        [[15.4 + k * 0.12, D], `opacity:0;transform:translate(${x - GX}px,${y - GY}px) scale(${r1(sx_ * 1000) / 1000},${r1(sy_ * 1000) / 1000})`]]) }));
  });
  const fShow = k => L.sh(15.0 + k * 0.25, null, 0.4);
  // treemap: area = share
  {
    const [x, y, w, h] = FB[0], u = w * h / 64, cw = (24 * u) / h, rw = w - 2 * cw;
    const rr = (a, b, c, d, s, dash) => el('rect', { x: r1(a + 1), y: r1(b + 1), width: r1(c - 2), height: r1(d - 2), fill: dash ? 'none' : t.soft, stroke: dash ? t.faint : t.faint, strokeDasharray: dash ? '2 2' : null })
      + (s ? lbl(a + c / 2, b + d / 2 + 4, s, { anchor: 'middle', fill: t.muted }) : '');
    const h6 = (6 * u) / rw, h4 = (4 * u) / rw;
    A.push(g(fShow(0), rr(x, y, cw, h, '24') + rr(x + cw, y, cw, h, '24') + rr(x + 2 * cw, y, rw, h6, '6') + rr(x + 2 * cw, y + h6, rw, h6, '6') + rr(x + 2 * cw, y + 2 * h6, rw, h4, '', true)
      + lbl(x + w / 2, 298, 'treemap', { anchor: 'middle' })));
  }
  // phone home: the top 3 asks, by rank (same share -> needs-you -> newer first)
  {
    const [x, y, w, h] = FB[1];
    let s = el('rect', { x, y, width: w, height: h, rx: 11, stroke: t.muted }) + el('path', { d: `M${x + w / 2 - 9},${y + 6}h18`, stroke: t.faint, strokeWidth: 2, strokeLinecap: 'round' });
    ['visa-docs', 'boiler', 'lease'].forEach((n, i) => {
      s += el('rect', { x: x + 7, y: y + 14 + i * 24, width: w - 14, height: 20, rx: 4, fill: t.soft }) + lbl(x + 12, y + 28 + i * 24, n, { fill: t.fg });
    });
    A.push(g(fShow(1), s + lbl(x + w / 2, 298, 'phone home', { anchor: 'middle' })));
  }
  // watch glance: the 64 as a ring, open asks in the middle
  {
    const [x, y, w] = FB[2], cx = x + w / 2, cy = y + w / 2, R = 33;
    const arc = (a0, a1) => {
      const p = a => [r1(cx + R * Math.cos((a - 90) * Math.PI / 180)), r1(cy + R * Math.sin((a - 90) * Math.PI / 180))];
      return `M${p(a0)}A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
    };
    let a = 0, s = el('circle', { cx, cy, r: w / 2, stroke: t.line });
    [24, 24, 6, 6, 4].forEach((v, i) => {
      const span = (v / 64) * 360;
      s += el('path', { d: arc(a + 2, a + span - 2), stroke: i === 4 ? t.line : t.muted, strokeWidth: i === 4 ? 2 : 6, strokeDasharray: i === 4 ? '2 2' : null });
      a += span;
    });
    s += text(cx, cy + 3, '3', { size: 13, fill: t.fg, anchor: 'middle', weight: 600 }) + lbl(cx, cy + 17, 'asks', { anchor: 'middle' });
    A.push(g(fShow(2), s + lbl(cx, 298, 'watch glance', { anchor: 'middle' })));
  }
  // timeline: due dates from now
  {
    const [x, y, w] = FB[3], ay = y + 44, x0 = x + 16, day = (w - 30) / 9.6;
    let s = el('path', { d: `M${x + 8},${ay}H${x + w}`, stroke: t.line }) + el('path', { d: `M${x0},${ay - 8}V${ay + 8}`, stroke: t.muted }) + lbl(x0, ay + 22, 'now', { anchor: 'middle' });
    [['boiler', 2, 9], ['visa-docs', 5, 9], ['lease', 9, 5]].forEach(([n, d, sz]) => {
      const mx = r1(x0 + d * day);
      s += el('rect', { x: r1(mx - sz / 2), y: r1(ay - sz / 2), width: sz, height: sz, fill: t.muted }) + lbl(mx, ay - 12, n, { anchor: 'middle', fill: t.fg }) + lbl(mx, ay + 22, `+${d}d`, { anchor: 'middle' });
    });
    A.push(g(fShow(3), s + lbl(x + w / 2, 298, 'timeline', { anchor: 'middle' })));
  }

  return svg({
    w: W, h: H, title: 'Fold: one attention budget, one state, many forms',
    desc: 'Illustrative, with invented counts. Five channels (work, family, community, life, subscription) pour in inputs at very different rates; each becomes one uniform input shape that keeps its source. The agent estimates each item in context and assigns a tier; the share derives from the tier (critical 24, high 12, normal 6, low 3, trace 1) inside a layer budget of B = 64. Received is not given: subscription sends 402 inputs and ends with no share, family sends 14 and holds 24. When a new critical item (visa-docs) arrives with the layer full, others yield: lease steps down from high to normal, relnotes and ci-main merge into release, forum and newsletter are withdrawn, and 4 cells stay empty. The person comes back and leaves an annotation; it is saved, then acknowledged on the next pass, which is not the same as the action being done. The same state is then shown as four of its twelve forms: a treemap, a phone home screen with the top three asks, a watch glance and a timeline.',
    css: css.join('') + L.css(), body: g(L.wrap(), A.join('')),
  });
}

// ---------- plexus: local apps sliced into capability facets behind one self-describing endpoint ----------

function renderPlexus(theme) {
  const t = THEMES[theme];
  const W = 880, H = 306, D = 23;
  const L = new Loop(D);
  const A = [];
  const css = ['.pop{transform-box:fill-box;transform-origin:center}'];
  const lbl = (x, y, s, o = {}) => text(x, y, s, { size: 11, fill: t.faint, ...o });
  const hide = { opacity: 0 };
  const win = (ts, f = 0.2) => { // visible in each [t0, t1] window
    const fr = [[0, 'opacity:0']];
    ts.forEach(([a, b]) => fr.push([a, 'opacity:0'], [a + f, 'opacity:1'], [b, 'opacity:1'], [b + f, 'opacity:0']));
    fr.push([D, 'opacity:0']);
    return { class: 'a', style: L.on(fr), ...hide };
  };
  const swap = (x, y, states, o = {}) => states.map(([t0, s, oo = {}], i) => {
    const last = i === states.length - 1;
    return lbl(x, y, s, { ...o, ...oo, ...(last ? {} : hide), ...L.sh(t0, last ? null : states[i + 1][0] - 0.2, 0.2) });
  }).join('');
  const dot = (pts, t0, t1, hideAt) => el('circle', { cx: 0, cy: 0, r: 2.5, fill: t.ember, ...hide, class: 'a', style: L.along(pts, t0, t1, hideAt) });

  A.push(text(856, 14, 'illustrative', { size: 11, fill: t.faint, anchor: 'end' }));

  // ---- the gateway: one self-describing endpoint, loopback ----
  const GXL = 287, GW = 6, GXc = GXL + GW / 2, GT = 34, GB = 168;
  A.push(el('rect', { x: GXL, y: GT, width: GW, height: GB - GT, rx: 3, fill: t.soft, stroke: t.line }));
  A.push(lbl(300, 24, 'GET /.well-known/plexus', { fill: t.muted }), lbl(300, 38, '127.0.0.1:7077'));
  A.push(lbl(300, 24, 'GET /.well-known/plexus', { fill: t.emberText, ...win([[3.9, 4.6]]) }));

  // ---- local apps, closed; then sliced into capability facets, each with its verb ----
  const FY = i => 60 + i * 20;
  const FX = 358, CHX = 530, AX = 660;
  const F = [
    ['obsidian.vault.read', 'read', 'std'],
    ['workspace.read', 'read', 'std'],
    ['workspace.write', 'write', 'ask'],
    ['claudecode.run', 'execute', 'ask'],
    ['codex.run', 'execute', 'ask'],
    ['apple-notes.notes.create', 'write', 'off'],
  ];
  const APPS = [['Obsidian', 0, 1], ['Workspace', 1, 2], ['Claude Code', 3, 1], ['Codex', 4, 1], ['Apple Notes', 5, 1]];
  APPS.forEach(([n, r0, rows], k) => {
    const y = FY(r0) - 9, h = rows * 20 - 2;
    A.push(g({ class: 'a pop', style: L.on([[[0, 0.4 + k * 0.15], 'opacity:0;transform:scale(.9)'], [[0.8 + k * 0.15, D], 'opacity:1;transform:scale(1)']]) },
      el('rect', { x: AX, y, width: 856 - AX, height: h, rx: 3, fill: t.soft, stroke: t.faint }) + lbl(AX + 10, y + h / 2 + 4, n, { fill: t.fg })));
  });
  F.forEach(([id, verb, st], i) => {
    const y = FY(i), cw = textW(verb, 11) + 10, t0 = 1.7 + i * 0.2;
    const peel = [[[0, t0], 'opacity:0;transform:translateX(150px)'], [t0 + 0.6, 'opacity:1;transform:translateX(0)']];
    if (st === 'off') peel.push([4.3, 'opacity:1;transform:translateX(0)'], [[4.7, D], 'opacity:.4;transform:translateX(0)']);
    else peel.push([D, 'opacity:1;transform:translateX(0)']);
    A.push(g({ class: 'a', style: L.on(peel), opacity: st === 'off' ? 0.4 : null },
      lbl(FX, y + 4, id, { fill: t.fg })
      + el('rect', { x: CHX, y: y - 7.5, width: r1(cw), height: 15, rx: 7.5, stroke: t.line }) + lbl(CHX + 5, y + 4, verb, { fill: t.muted })
      + el('path', { d: `M${r1(CHX + cw + 4)},${y}H${AX - 4}`, stroke: t.line })));
    const hit = ({ 0: [[7.0, 7.5]], 1: [[20.0, 20.5]], 2: [[10.95, 11.45]], 3: [[14.45, 14.95]] })[i];
    if (hit) A.push(lbl(FX, y + 4, id, { fill: t.emberText, ...win(hit) }));
  });
  // gateway -> facet: solid = standing, dashed = approval per use, none = outside the agent's subset
  const conn = (i, dash, style, extra = {}) => el('path', { d: `M${GXL + GW + 1},${FY(i)}H${FX - 6}`, stroke: dash ? t.faint : t.muted, strokeWidth: dash ? 1 : 1.5, strokeDasharray: dash ? '3 3' : null, class: 'a', style, ...extra });
  const from = (t0) => L.show(t0, null, 0.35);
  A.push(conn(0, false, from(4.3)), conn(1, false, from(4.4)), conn(3, true, from(4.6)), conn(4, true, from(4.7)));
  A.push(conn(2, true, L.on([[[0, 4.5], 'opacity:0'], [[4.8, 10.6], 'opacity:1'], [[10.8, 18.2], 'opacity:0'], [[18.5, D], 'opacity:1']])));
  A.push(conn(2, false, L.on([[[0, 10.6], 'opacity:0'], [[10.8, 17.9], 'opacity:1'], [[18.2, D], 'opacity:0']]), hide));
  A.push(text((GXL + GW + FX - 6) / 2, FY(2) + 4, '✕', { size: 11, fill: t.sandText, anchor: 'middle', ...win([[17.9, 18.6]]) }));

  // ---- the agent, through its launcher: DISCOVER -> UNDERSTAND -> GRANTED -> CALL ----
  const PH = [['DISCOVER', [3.2, 4.3]], ['UNDERSTAND', [4.3, 5.2]], ['GRANTED', [5.2, 6.0]], ['CALL', [6.0, 21.5]]];
  let px = 24;
  PH.forEach(([w, ws], k) => {
    A.push(lbl(px, 24, w, { fill: t.muted }), lbl(px, 24, w, { fill: t.emberText, ...win([ws]) }));
    px += textW(w, 11);
    if (k < 3) { A.push(lbl(px + 6.6, 24, '→')); px += 3 * 6.6; }
  });
  A.push(el('circle', { cx: 28, cy: 51, r: 3.5, fill: t.ember }), lbl(37, 55, 'agent a1', { fill: t.emberText }), lbl(100, 55, '· launcher plexus-a1'));
  A.push(el('rect', { x: 24, y: 63, width: 258, height: 42, rx: 4, stroke: t.line }));
  const CMD = [[3.2, 'list'], [6.0, 'obsidian.vault.read'], [8.6, 'workspace.write'], [12.4, 'claudecode.run'], [15.8, 'apple-notes.notes.create'], [19.0, 'workspace.read']];
  CMD.forEach(([t0, c], k) => {
    const s = `$ plexus-a1 ${c}`, last = k === CMD.length - 1, t1 = last ? null : CMD[k + 1][0] - 0.2;
    A.push(g({ ...(last ? {} : hide), ...L.sh(t0, t1, 0.15) },
      lbl(32, 80, s, { fill: t.fg, class: 'a', style: L.on([[[0, t0 + 0.05], `clip-path:inset(0 100% 0 0);animation-timing-function:steps(${s.length - 11},end)`], [[t0 + 0.5, D], 'clip-path:inset(0 0 0 0)']]) })));
  });
  const RES = [[4.5, 5.8, '2 standing · 3 need approval'], [7.6, 8.4, 'ok'], [9.5, 11.35, 'pending · owner approval'], [11.55, 12.2, 'ok · granted 1h'],
    [13.3, 14.85, 'pending · owner approval'], [15.05, 15.6, 'ok · approved once'], [16.9, 18.8, 'denied · not in authorized subset'], [20.6, null, 'ok']];
  RES.forEach(([t0, t1, r]) => A.push(lbl(32, 97, r, { fill: r.startsWith('denied') ? t.fg : t.muted, ...(t1 === null ? {} : hide), ...L.sh(t0, t1, 0.2) })));

  // calls: launcher -> gateway -> facet, and back
  const P0 = [282, 76], G = i => [GXc, FY(i)], Fp = i => [FX - 8, FY(i)];
  A.push(dot([P0, [GXc, GT + 4]], 3.6, 3.95, 4.0));
  const round = (i, t0, tg = null, tc = null) => {
    if (tg === null) {
      A.push(dot([P0, G(i), Fp(i)], t0, t0 + 0.5, t0 + 0.55), dot([Fp(i), G(i), P0], t0 + 0.65, t0 + 1.1, t0 + 1.15));
    } else {
      A.push(dot([P0, G(i)], t0, t0 + 0.3, tc), dot([G(i), Fp(i)], tc, tc + 0.25, tc + 0.3), dot([Fp(i), G(i), P0], tc + 0.45, tc + 0.85, tc + 0.9));
      A.push(el('circle', { cx: GXc, cy: FY(i), r: 7, stroke: t.muted, strokeDasharray: '2 2', ...win([[tg, tc]]) }));
    }
  };
  round(0, 6.5);
  round(2, 9.1, 9.4, 10.7);
  round(3, 12.9, 13.2, 14.2);
  round(1, 19.5);
  // off-subset: bounces at the gateway
  A.push(dot([P0, G(5)], 16.4, 16.7, 16.75), dot([G(5), [250, FY(5) - 8]], 16.75, 17.1, 17.2));
  A.push(text(GXc - 10, FY(5) + 4, '✗', { size: 12, fill: t.fg, anchor: 'end', ...win([[16.7, 17.7]]) }));

  // ---- the owner approves: write with a trust window, execute per call ----
  A.push(el('circle', { cx: 28, cy: 124, r: 3.5, fill: t.sand }), lbl(37, 128, 'owner', { fill: t.sandText }), lbl(77, 128, '· trust window'));
  const TW = ['once', '1h', '1d', '7d', 'until-revoked'];
  let cx = 24;
  const chip = {};
  TW.forEach(w => {
    const cw = textW(w, 11) + 10;
    chip[w] = [cx, cw];
    A.push(el('rect', { x: r1(cx), y: 136, width: r1(cw), height: 15, rx: 7.5, stroke: t.line }), lbl(cx + 5, 147, w, { fill: t.muted }));
    cx += cw + 4;
  });
  const pick = (w, ws) => { const [x, cw] = chip[w]; A.push(g(win(ws), el('rect', { x: r1(x), y: 136, width: r1(cw), height: 15, rx: 7.5, fill: t.sand, fillOpacity: 0.18, stroke: t.sand }) + lbl(x + 5, 147, w, { fill: t.sandText }))); };
  pick('1h', [[9.9, 10.9]]);
  pick('once', [[13.5, 14.4]]);
  const appr = (i, t0) => {
    const d = `M${r1(cx + 2)},143.5C${r1(cx + 20)},143.5 ${GXL - 18},${FY(i)} ${GXL - 2},${FY(i)}`;
    A.push(el('path', { d, stroke: t.sand, strokeWidth: 1.25, ...win([[t0, t0 + 0.8]]) }));
  };
  appr(2, 10.1);
  appr(3, 13.6);

  // ---- authorization and audit as their own lanes ----
  const LY0 = 208, LS = 13;
  A.push(lbl(24, 186, 'GET /grants', { fill: t.muted }), el('path', { d: 'M24,191.5H360', stroke: t.line }));
  const GR = [[5.2, 'obsidian.vault.read', 'read', '7d', 'standing'], [5.4, 'workspace.read', 'read', '1d', 'standing'], [10.6, 'workspace.write', 'write', '1h', null]];
  GR.forEach(([t0, id, verb, w, st], k) => {
    const y = LY0 + k * LS;
    A.push(g(L.sh(t0), lbl(24, y, id, { fill: t.fg }) + lbl(186, y, verb, { fill: t.muted }) + lbl(232, y, w, { fill: t.muted })
      + (st ? lbl(262, y, st, { fill: t.muted }) : swap(262, y, [[t0, 'approved'], [17.9, 'revoked', { fill: t.fg }]], { fill: t.muted }))));
  });
  const ry = LY0 + 2 * LS - 4;
  A.push(el('path', { d: `M24,${ry}H252`, stroke: t.muted, class: 'gx a', style: L.on([[[0, 17.8], 'transform:scaleX(0)'], [[18.2, D], 'transform:scaleX(1)']]) }));
  A.push(text(318, LY0 + 2 * LS, '✕', { size: 11, fill: t.sandText, class: 'a pop', style: L.on([[[0, 17.6], 'opacity:0;transform:scale(.4)'], [[17.9, D], 'opacity:1;transform:scale(1)']]) }));
  css.push('.gx{transform-box:fill-box;transform-origin:left}');

  A.push(lbl(400, 186, 'audit', { fill: t.muted }), el('path', { d: 'M400,191.5H856', stroke: t.line }));
  const AU = [[4.5, 'list', 'ok'], [7.6, 'obsidian.vault.read', 'ok · standing'], [9.5, 'workspace.write', 'pending'], [11.55, 'workspace.write', 'approved 1h · ok'],
    [15.05, 'claudecode.run', 'approved once · ok'], [16.9, 'apple-notes.notes.create', 'denied · off-subset'], [18.0, 'workspace.write', 'grant revoked'], [20.6, 'workspace.read', 'ok · standing']];
  AU.forEach(([t0, id, res], k) => {
    const y = LY0 + k * LS;
    A.push(g(L.sh(t0, null, 0.25), lbl(400, y, String(k + 1).padStart(2, '0')) + lbl(424, y, id, { fill: t.fg }) + lbl(600, y, res, { fill: res.startsWith('denied') ? t.fg : t.muted })));
  });

  return svg({
    w: W, h: H, title: 'Plexus: a local capability gateway for agents',
    desc: 'Illustrative. Local apps (Obsidian, a workspace folder, Claude Code, Codex, Apple Notes) appear as closed boxes, then Plexus slices each into capability facets with a verb: obsidian.vault.read (read), workspace.read (read), workspace.write (write), claudecode.run (execute), codex.run (execute), apple-notes.notes.create (write). One self-describing endpoint, GET /.well-known/plexus, on loopback 127.0.0.1:7077. An agent goes DISCOVER, UNDERSTAND, GRANTED, CALL through its launcher plexus-a1: list shows two standing reads and three capabilities that need approval; apple-notes.notes.create is outside its authorized subset. A read flows on its standing grant. A write pends until the owner approves it with a 1h trust window. An execute is approved once, per call. A call outside the subset bounces at the gateway. The owner revokes the workspace.write grant and only that grant goes; the next read still flows. The grants ledger (GET /grants) and the audit log append as each of these happens.',
    css: css.join('') + L.css(), body: g(L.wrap(), A.join('')),
  });
}

// ---------- space: one host, a field of small apps, almost all asleep; publish, wake, sleep, quarantine ----------

function renderSpace(theme) {
  const t = THEMES[theme];
  const W = 880, H = 304, D = 25;
  const L = new Loop(D);
  const A = [];
  const bg = theme === 'dark' ? '#0d1117' : '#ffffff';
  const css = ['.pop{transform-box:fill-box;transform-origin:center}'];
  const lbl = (x, y, s, o = {}) => text(x, y, s, { size: 11, fill: t.faint, ...o });
  const hide = { opacity: 0 }; // transient: hidden in the still (reduced-motion) frame
  const win = (ts, f = 0.2) => {
    const fr = [[0, 'opacity:0']];
    ts.forEach(([a, b]) => fr.push([a, 'opacity:0'], [a + f, 'opacity:1'], [b, 'opacity:1'], [b + f, 'opacity:0']));
    fr.push([D, 'opacity:0']);
    return { class: 'a', style: L.on(fr), ...hide };
  };
  // a dot carried through timed waypoints [[t, x, y], ...], visible only while moving
  const mover = (pts, color, r = 2.5) => {
    const at = (x, y) => `transform:translate(${r1(x)}px,${r1(y)}px)`;
    const [t0, x0, y0] = pts[0], [t1, x1, y1] = pts.at(-1);
    const fr = [[[0, t0 - 0.01], `${at(x0, y0)};opacity:0`]];
    pts.forEach(([tt, x, y]) => fr.push([tt, `${at(x, y)};opacity:1;animation-timing-function:linear`]));
    fr.push([[t1 + 0.12, D], `${at(x1, y1)};opacity:0`]);
    return el('circle', { cx: 0, cy: 0, r, fill: color, ...hide, class: 'a', style: L.on(fr) });
  };
  const ring = (c, t0, color) => el('rect', { x: c.x - 3, y: c.y - 3, width: 16, height: 16, rx: 2, stroke: color, strokeWidth: 1.5, ...hide, class: 'a pop',
    style: L.on([[[0, t0], 'opacity:0;transform:scale(.6)'], [t0 + 0.25, 'opacity:1;transform:scale(1)'], [[t0 + 0.9, D], 'opacity:0;transform:scale(1.5)']]) });
  // a name tag laid over the field while something happens to a cell
  const tag = (x, y, s, ws, end = false) => {
    const w = textW(s, 11) + 8, x0 = end ? x - w : x;
    return g(win(ws), el('rect', { x: r1(x0), y: y - 11, width: r1(w), height: 15, rx: 2, fill: bg, stroke: t.line }) + lbl(x0 + 4, y, s, { fill: t.fg }));
  };

  A.push(text(856, 14, 'illustrative', { size: 11, fill: t.faint, anchor: 'end' }));

  // ---- the host: one machine, a field of app cells ----
  const X0 = 290, Y0 = 52, P = 14, COLS = 23, ROWS = 12;
  const cell = (c, r) => ({ x: X0 + c * P, y: Y0 + r * P, cx: X0 + c * P + 5, cy: Y0 + r * P + 5 });
  A.push(text(280, 34, tspan('one host', t.fg) + tspan(' · 127.0.0.1:8080/apps/<name>/', t.faint), { size: 11, raw: true }));
  A.push(el('rect', { x: 280, y: 40, width: 338, height: 188, rx: 4, stroke: t.line }));
  const board = cell(0, 11), pulse = cell(9, 8), docs = cell(4, 4), spin = cell(16, 3), survey = cell(15, 3), ttt = cell(17, 3), held = cell(20, 9);
  const key = c => `${c.x},${c.y}`;
  const named = new Set([board, pulse, docs, spin, survey, ttt, held].map(key));
  const rnd = rng(23);
  const all = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push(cell(c, r));
  const free = all.filter(c => !named.has(key(c)));
  const pick = n => Array.from({ length: n }, () => free.splice(Math.floor(rnd() * free.length), 1)[0]);
  const statics = [docs, ...pick(16)], blink = pick(12);
  const staticSet = new Set(statics.map(key));
  const outline = cs => { let d = '', px = 0, py = 0; cs.forEach((c, i) => { d += i ? `m${c.x - px},${c.y - py}h9v9h-9z` : `M${c.x + 0.5},${c.y + 0.5}h9v9h-9z`; px = c.x; py = c.y; }); return d; };
  A.push(el('path', { d: outline(all.filter(c => !staticSet.has(key(c)) && key(c) !== key(board))), stroke: t.line }));
  A.push(el('path', { d: outline(statics), stroke: t.line, strokeDasharray: '2 1.5' }));
  const fill = (c, o) => el('rect', { x: c.x, y: c.y, width: 10, height: 10, fill: t.muted, ...o });
  // other visitors: a few cells wake and sleep; one stays awake on an open connection
  blink.forEach((c, i) => {
    const a = 0.8 + rnd() * 17, b = a + 1.2 + rnd() * 1.8;
    const ws = [[a, b]];
    if (i % 3 === 0) { const a2 = b + 2 + rnd() * 2; if (a2 + 1.5 < 21.4) ws.push([a2, a2 + 1.5]); }
    A.push(fill(c, { fillOpacity: 0.55, ...win(ws, 0.3) }));
  });
  A.push(fill(held, {}));

  // ---- shared services under the host ----
  const SV = [['kv · redis', 280], ['object · s3', 366], ['db() · sqlite|postgres', 459]].map(([s, x]) => ({ s, x, w: textW(s, 11) + 12 }));
  A.push(lbl(272, 258, 'shared · a name per app', { anchor: 'end' }));
  SV.forEach(v => A.push(el('rect', { x: v.x, y: 246, width: r1(v.w), height: 16, rx: 3, stroke: t.line }), lbl(v.x + 6, 258, v.s, { fill: t.muted })));
  const svHi = (v, ws) => A.push(g(win(ws), el('rect', { x: v.x, y: 246, width: r1(v.w), height: 16, rx: 3, stroke: t.fg, strokeWidth: 1.25 }) + lbl(v.x + 6, 258, v.s, { fill: t.fg })));
  const LIT = [[4.5, 6.8], [8.95, 10.2]];
  // board's declared capability edges: always bound, lit while it is awake
  SV.forEach(v => {
    const ex = r1(v.x + v.w / 2), d = `M${board.cx},${board.y + 10}C${board.cx},234 ${ex},232 ${ex},246`;
    A.push(el('path', { d, stroke: t.line }), el('path', { d, stroke: t.muted, strokeWidth: 1.5, ...win(LIT) }));
  });
  svHi(SV[0], LIT); svHi(SV[2], LIT); svHi(SV[1], [[4.5, 8.7], [9.0, 10.2]]);

  // ---- the gateway: every request takes the same path ----
  const GX = 200, GC = 231, STG = [['ingress', 52], ['identity', 74], ['static', 96], ['wake', 118]];
  A.push(lbl(GX, 34, 'gateway'));
  STG.forEach(([s, cy]) => A.push(el('rect', { x: GX, y: cy - 8, width: 62, height: 16, rx: 3, stroke: t.line }), lbl(GC, cy + 4, s, { anchor: 'middle', fill: t.muted })));
  A.push(el('rect', { x: GX, y: 134, width: 62, height: 16, rx: 3, stroke: t.line, strokeDasharray: '2 2' }), lbl(GC, 146, 'Guard', { anchor: 'middle' }));
  const hiWins = { ingress: [], identity: [], static: [], wake: [] };

  // ---- the visitor's requests ----
  A.push(el('circle', { cx: 28, cy: 48, r: 3.5, fill: t.sand }), lbl(37, 52, 'visitor', { fill: t.sandText }));
  const S0 = [162, 66];
  const REQ = [
    { c: board, n: 'board', t: 3.1, wake: [3.7, 4.0], to: 4.3 },
    { c: board, n: 'board', t: 8.2, wake: [8.6, 8.65], to: 8.9 },
    { c: pulse, n: 'pulse-go', t: 9.6, wake: [10.2, 10.4], to: 10.7 },
    { c: docs, n: 'docs', t: 11.1, stat: true },
    { c: spin, n: 'spin', t: 12.6, wake: [13.2, 13.3], to: 13.6 },
    { c: survey, n: 'survey', t: 17.8, wake: [18.4, 18.45], to: 18.7 },
    { c: ttt, n: 'ttt', t: 18.6, wake: [19.2, 19.25], to: 19.5 },
  ];
  REQ.forEach((q, k) => {
    const s = `GET /apps/${q.n}/`, t0 = q.t - 0.45, last = k === REQ.length - 1, t1 = last ? null : REQ[k + 1].t - 0.65;
    A.push(g({ ...(last ? {} : hide), ...L.sh(t0, t1, 0.15) },
      lbl(24, 70, s, { fill: t.fg, class: 'a', style: L.on([[[0, t0 + 0.05], `clip-path:inset(0 100% 0 0);animation-timing-function:steps(${s.length},end)`], [[t0 + 0.4, D], 'clip-path:inset(0 0 0 0)']]) })));
    const pts = [[q.t, ...S0], [q.t + 0.15, GC, 52], [q.t + 0.3, GC, 74], [q.t + 0.45, GC, 96]];
    hiWins.ingress.push([q.t + 0.08, q.t + 0.3]); hiWins.identity.push([q.t + 0.23, q.t + 0.45]);
    if (q.stat) {
      pts.push([q.t + 0.6, GC, 96], [q.t + 0.85, GC, 52], [q.t + 1.0, ...S0]);
      hiWins.static.push([q.t + 0.38, q.t + 0.85]);
    } else {
      pts.push([q.wake[0], GC, 118], [q.wake[1], GC, 118], [q.wake[1] + 0.05, 262, 118], [q.to, q.c.cx, q.c.cy]);
      hiWins.static.push([q.t + 0.38, q.t + 0.55]); hiWins.wake.push([q.wake[0] - 0.07, q.wake[1] + 0.1]);
    }
    A.push(mover(pts, t.sand));
  });
  STG.forEach(([s, cy]) => A.push(g(win(hiWins[s], 0.08), el('rect', { x: GX, y: cy - 8, width: 62, height: 16, rx: 3, stroke: t.fg, strokeWidth: 1.25 }) + lbl(GC, cy + 4, s, { anchor: 'middle', fill: t.fg }))));

  // ---- the agent publishes a directory: an upload, no image build ----
  A.push(el('circle', { cx: 28, cy: 150, r: 3.5, fill: t.ember }), lbl(37, 154, 'agent', { fill: t.emberText }));
  A.push(lbl(24, 172, 'board/', { fill: t.fg, ...hide, ...L.sh(0.6, 19.6, 0.2) }), lbl(24, 172, 'spin/', { fill: t.fg, ...L.sh(19.8, null, 0.2) }));
  A.push(lbl(24, 186, '├ pneuma-space.json', { fill: t.muted, ...L.sh(0.8) }), lbl(24, 200, '└ src/server.ts', { fill: t.muted, ...L.sh(1.0) }));
  A.push(lbl(24, 218, 'upload · no image build', { fill: t.emberText, ...L.sh(1.3) }), lbl(24, 232, 'scaffold: live in 6.9 s', L.sh(1.5)));
  const pubPath = (c, t0, t1, via) => {
    const pts = bezPoints([156, 188], via[0], via[1], [c.cx, c.cy], 14);
    A.push(el('circle', { cx: 0, cy: 0, r: 2.5, fill: t.ember, ...hide, class: 'a', style: L.along(pts, t0, t1, t1 + 0.05) }));
  };
  pubPath(board, 1.4, 2.2, [[210, 192], [262, 211]]);
  A.push(el('rect', { x: board.x + 0.5, y: board.y + 0.5, width: 9, height: 9, stroke: t.line, class: 'a pop',
    style: L.on([[[0, 2.2], 'opacity:0;transform:scale(.3)'], [[2.5, D], 'opacity:1;transform:scale(1)']]) }));
  A.push(ring(board, 2.2, t.ember));
  A.push(tag(board.x - 4, board.y - 6, 'board · asleep until visited', [[2.4, 3.6]]));

  // ---- board: first wake, capabilities lit, ws held open; bytes skip it; then asleep, data kept ----
  A.push(fill(board, win([[4.3, 7.0], [8.9, 10.2]], 0.35)));
  A.push(tag(board.x - 4, board.y - 6, 'awake · db kv object ws', [[4.4, 6.6]]));
  A.push(el('path', { d: `M262,118C282,132 292,180 ${board.cx},${board.y}`, stroke: t.sand, strokeDasharray: '3 3', ...win([[4.6, 6.6]]) }));
  A.push(el('rect', { x: board.cx - 2, y: board.cy - 2, width: 4, height: 4, fill: t.muted, class: 'a', style: L.show(7.3) }));
  A.push(lbl(272, board.cy + 4, 'data kept', { anchor: 'end', fill: t.muted, ...L.sh(7.3) }));
  // presigned PUT: browser -> bucket, past the app and the gateway
  const obj = SV[1], ox = r1(obj.x + obj.w / 2);
  const route = [[22, 60], [14, 72], [14, 274], [ox, 274], [ox, 263]];
  A.push(el('path', { d: `M${route.map(p => p.join(',')).join('L')}`, stroke: t.sand, strokeDasharray: '2 3', ...win([[5.2, 8.5]]) }));
  for (let k = 0; k < 5; k++) A.push(el('circle', { cx: 0, cy: 0, r: 2, fill: t.sand, ...hide, class: 'a', style: L.along(route, 5.3 + k * 0.45, 6.8 + k * 0.45, 6.85 + k * 0.45) }));
  A.push(lbl(280, 292, 'presigned PUT · bytes skip app and gateway', { fill: t.muted, ...win([[5.3, 8.6]]) }));

  // ---- container wakes, static answers with nothing woken ----
  A.push(fill(pulse, win([[10.7, 12.6]], 0.3)), tag(pulse.x - 4, pulse.y - 6, 'pulse-go · container', [[10.7, 11.9]]));
  A.push(tag(docs.x - 4, docs.y - 6, 'docs · static, no process', [[11.5, 12.8]]));

  // ---- a hung worker: stopped, quarantined by the Guard; neighbours keep answering; release 2 ----
  A.push(fill(spin, win([[13.6, 13.8]], 0.1)));
  A.push(el('rect', { x: spin.x, y: spin.y, width: 10, height: 10, fill: t.fg, ...win([[13.8, 17.3]], 0.1) }));
  const pf = [[[0, 13.85], 'opacity:0;transform:scale(1)']];
  for (let k = 0; k < 4; k++) { const a = 13.9 + k * 0.85; pf.push([a, 'opacity:.9;transform:scale(1)'], [a + 0.7, 'opacity:0;transform:scale(1.9)']); }
  pf.push([[17.3, D], 'opacity:0;transform:scale(1)']);
  A.push(el('rect', { x: spin.x - 1, y: spin.y - 1, width: 12, height: 12, rx: 1, stroke: t.fg, ...hide, class: 'a pop', style: L.on(pf) }));
  A.push(tag(spin.x + 14, spin.y - 6, 'busy loop holds its worker', [[13.8, 17.2]], true));
  A.push(g(win([[17.6, 21.0]]), el('path', { d: `M${spin.x + 0.5},${spin.y + 0.5}h9v9h-9zm0,0l9,9m0,-9l-9,9`, stroke: t.fg, strokeWidth: 1.25 })));
  A.push(tag(spin.x + 14, spin.y - 6, 'stopped · quarantined', [[17.5, 20.8]], true));
  A.push(g(win([[17.5, 21.0]]), el('rect', { x: GX, y: 134, width: 62, height: 16, rx: 3, stroke: t.fg, strokeWidth: 1.25 }) + lbl(GC, 146, 'Guard', { anchor: 'middle', fill: t.fg })));
  A.push(el('path', { d: `M262,142C380,142 470,124 ${spin.x - 2},${spin.cy + 2}`, stroke: t.fg, strokeDasharray: '2 3', ...win([[17.6, 18.6]]) }));
  A.push(fill(survey, win([[18.7, 20.6]], 0.3)), fill(ttt, win([[19.5, 21.2]], 0.3)));
  pubPath(spin, 20.0, 20.9, [[230, 176], [300, 120]]);
  A.push(ring(spin, 20.9, t.ember), tag(spin.x + 14, spin.y - 6, 'release 2 · data kept', [[21.0, 22.4]], true));

  // ---- events, as the console's lifecycle stream would list them ----
  A.push(lbl(636, 34, 'events'));
  const EV = [
    [2.3, 'publish', 'board', 'no image build'], [4.3, 'wake', 'board', 'first 460–700 ms'], [7.2, 'sleep', 'board', 'idle, data kept'],
    [8.9, 'wake', 'board', 'again 62–87 ms'], [10.7, 'wake', 'pulse-go', 'about 260 ms'], [11.6, 'static', 'docs', 'nothing woken'],
    [13.8, 'hang', 'spin', 'busy loop'], [17.3, 'stop', 'spin', '3.5–4 s after'], [17.3, '', '', 'stuck request'], [17.6, 'guard', 'spin', 'quarantined'],
    [18.7, '200', 'survey', 'unaffected'], [19.5, '200', 'ttt', 'unaffected'], [21.1, 'publish', 'spin', 'release 2'],
  ];
  EV.forEach(([t0, v, n, d], k) => {
    const y = 60 + k * 14;
    A.push(g(L.sh(t0, null, 0.25), (v ? lbl(636, y, v, { fill: v === 'publish' ? t.emberText : v === 'guard' ? t.fg : t.muted }) : '')
      + (n ? lbl(688.8, y, n, { fill: t.fg }) : '') + lbl(748.2, y, d, { fill: t.muted })));
  });
  // legend
  A.push(el('rect', { x: 636.5, y: 243.5, width: 9, height: 9, stroke: t.line }), lbl(651, 252, 'asleep'));
  A.push(el('rect', { x: 712, y: 243, width: 10, height: 10, fill: t.muted }), lbl(727, 252, 'awake'));
  A.push(el('rect', { x: 636.5, y: 259.5, width: 9, height: 9, stroke: t.line, strokeDasharray: '2 1.5' }), lbl(651, 268, 'static'));
  A.push(el('path', { d: 'M712.5,259.5h9v9h-9zm0,0l9,9m0,-9l-9,9', stroke: t.muted }), lbl(727, 268, 'quarantined'));

  A.push(lbl(280, 292, 'calm · nearly all asleep · every address valid · all data kept', { fill: t.muted, ...L.sh(22.0) }));

  return svg({
    w: W, h: H, title: 'PneumaSpace: one host, many sleeping apps',
    desc: 'Illustrative. One host at 127.0.0.1:8080/apps/<name>/ holds a field of small app cells, almost all asleep; dashed cells are static sites with no process. An agent publishes a directory (pneuma-space.json and src/server.ts) as an upload with no image build (the isolate scaffold is live 6.9 s after publish), and a new cell, board, appears asleep until visited. A visitor request passes the gateway stages ingress, identity, static and wake, and wakes board for the first time (460 to 700 ms); its db, kv and object edges light to the shared services (Redis, an S3 store, SQLite or PostgreSQL behind db()) and a WebSocket stays open through the gateway. Object bytes go from the browser straight to the bucket with a presigned PUT, past the app and the gateway, while board goes idle and sleeps with its data kept. It wakes again in 62 to 87 ms; a container app, pulse-go, wakes in about 260 ms; a static site, docs, is answered by the gateway with nothing woken. Then spin hangs in a busy loop that holds its worker; it is stopped 3.5 to 4 s after the stuck request and the Guard quarantines it, while its neighbours survey and ttt keep answering. A new release of spin replaces it with its data kept. The field is calm again: nearly all asleep, every address valid, all data kept.',
    css: css.join('') + L.css(), body: g(L.wrap(), A.join('')),
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
    ['omne-light.svg', renderOmne('light')],
    ['omne-dark.svg', renderOmne('dark')],
    ['fold-light.svg', renderFold('light')],
    ['fold-dark.svg', renderFold('dark')],
    ['plexus-light.svg', renderPlexus('light')],
    ['plexus-dark.svg', renderPlexus('dark')],
    ['space-light.svg', renderSpace('light')],
    ['space-dark.svg', renderSpace('dark')],
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
