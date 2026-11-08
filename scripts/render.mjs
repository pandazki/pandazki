#!/usr/bin/env node
// Fetches contribution data with the gh CLI and renders every profile SVG into assets/.
//   node scripts/render.mjs            fetch from GitHub, then render
//   node scripts/render.mjs --offline  render from data/stats.json
// Data-driven pieces (hero, momentum) are drawn here; the illustrative ones come from visuals.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, fmt, r1, text, tspan, el, svg, helix, textW } from './svg.mjs';
import { renderVisuals } from './visuals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = 'pandazki';
const START_YEAR = 2024;
const TOP_REPOS = 9;

// Facts that don't come from the contribution API. Update by hand when they change.
const PNEUMA_MODES = 22; // pneuma-skills modes/ directory
const AGENT_BACKENDS = 3; // Claude Code, Codex, Kimi Code

// ---------- data ----------

function gql(query) {
  const out = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8' });
  return JSON.parse(out).data;
}

function fetchStats() {
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.toISOString().slice(0, 7);
  const yearFields = [];
  for (let y = START_YEAR; y <= thisYear; y++) {
    yearFields.push(`y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { contributionCalendar { weeks { contributionDays { date contributionCount } } } }`);
  }
  const data = gql(`{ user(login: "${LOGIN}") {
    ${yearFields.join('\n')}
    last: contributionsCollection {
      totalCommitContributions totalPullRequestContributions restrictedContributionsCount
      commitContributionsByRepository(maxRepositories: 50) {
        repository { name owner { login } isPrivate }
        contributions { totalCount }
      }
    }
  } }`).user;

  // Monthly totals. The month in progress is left out so the chart doesn't end on a false drop.
  const byMonth = new Map();
  for (let y = START_YEAR; y <= thisYear; y++) {
    for (const week of data[`y${y}`].contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        const m = day.date.slice(0, 7);
        if (m >= thisMonth || !m.startsWith(String(y))) continue;
        byMonth.set(m, (byMonth.get(m) ?? 0) + day.contributionCount);
      }
    }
  }
  const last = data.last;
  return {
    asOf: now.toISOString().slice(0, 10),
    months: [...byMonth].sort((a, b) => a[0].localeCompare(b[0])).map(([month, total]) => ({ month, total })),
    lastYear: {
      commits: last.totalCommitContributions,
      prs: last.totalPullRequestContributions,
      private: last.restrictedContributionsCount,
      repos: last.commitContributionsByRepository
        .filter(r => !r.repository.isPrivate)
        .map(r => ({ owner: r.repository.owner.login, name: r.repository.name, commits: r.contributions.totalCount })),
    },
  };
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yearOf = m => Number(m.month.slice(0, 4));

// ---------- hero: name, line, the breath helix, a few live numbers ----------

function renderHero(stats, theme) {
  const t = THEMES[theme];
  const W = 880, H = 238;
  const { months } = stats;
  const year = yearOf(months.at(-1));
  const yearTotal = months.filter(m => yearOf(m) === year).reduce((a, m) => a + m.total, 0);
  const lastM = months.at(-1);
  const out = [];
  const css = [];

  // name, typed once, then a breathing ember cursor
  const NAME = 'Pandazki', NS = 34;
  const nameW = textW(NAME, NS);
  out.push(text(24, 54, NAME, { size: NS, fill: t.fg, weight: 600, cls: 'type' }));
  out.push(el('rect', { x: 24 + nameW + 6, y: 27, width: 12, height: 30, fill: t.ember, class: 'cur' }));
  css.push(`.type{animation:type .9s steps(${NAME.length},end) .2s both}`
    + '@keyframes type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}'
    + `.cur{animation:cur .9s steps(${NAME.length},end) .2s both,blink 1.2s step-end 1.1s infinite}@keyframes cur{from{transform:translateX(-${r1(nameW)}px)}}@keyframes blink{50%{opacity:0}}`
    + '.fi{animation:fi .8s ease-out both}@keyframes fi{from{opacity:0}}');

  // tagline doubles as the legend: humans = sand strand, code agents = ember strand
  out.push(text(24, 84,
    tspan('building co-creation infrastructure for ', t.muted) + tspan('humans', t.sandText) + tspan(' × ', t.muted) + tspan('code agents', t.emberText),
    { size: 14, raw: true, cls: 'fi', style: 'animation-delay:.7s' }));

  // top right, on the name's baseline: what it's about
  out.push(text(856, 54, 'agents · memory · co-creation', { size: 12, fill: t.faint, anchor: 'end', cls: 'fi', style: 'animation-delay:.9s' }));

  // the helix: two intertwined strands (human, agent) plus two quiet companions, drifting
  // one wavelength per PERIOD while the envelope breathes. Morphed with SMIL so the
  // spindle shape stays put and only the phase moves.
  const geo = { x0: 24, x1: 856, cy: 144, amp: 33, waves: 3.25, lean: 0.8 };
  const strands = [
    { phi: Math.PI / 2, scale: 0.7, n: 18, stroke: 'url(#hx)', w: 1, op: 0.5 },
    { phi: -Math.PI / 2, scale: 0.7, n: 18, stroke: 'url(#hx)', w: 1, op: 0.5 },
    { phi: 0, n: 28, stroke: t.sand, w: 1.9, op: 1 },
    { phi: Math.PI, n: 28, stroke: t.ember, w: 1.9, op: 1 },
  ];
  const FRAMES = 10, PERIOD = 14;
  const frames = [];
  for (let f = 0; f <= FRAMES; f++) {
    const th = (2 * Math.PI * f) / FRAMES;
    frames.push(helix({ ...geo, strands, phase: -th, breathe: 1 + 0.12 * Math.sin(th) }));
  }
  const defs = `<linearGradient id="hx" gradientUnits="userSpaceOnUse" x1="${geo.x0}" x2="${geo.x1}" y1="0" y2="0"><stop offset="0" stop-color="${t.ember}"/><stop offset="1" stop-color="${t.sand}"/></linearGradient>`
    + `<linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".08" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<mask id="ends"><rect x="${geo.x0}" y="${geo.cy - 10}" width="${geo.x1 - geo.x0}" height="20" fill="url(#fade)"/></mask>`;

  // a faint graticule on the axis, like a scope trace
  const lam = (geo.x1 - geo.x0) / geo.waves;
  let ticks = '';
  for (let x = geo.x0, i = 0; x <= geo.x1 + 0.1; x += lam / 4, i++) ticks += `M${r1(x)},${geo.cy - (i % 4 ? 2 : 4)}v${i % 4 ? 4 : 8}`;
  out.push(el('path', { d: ticks, stroke: t.line, opacity: 0.9 }));
  out.push(el('line', { x1: geo.x0, y1: geo.cy, x2: geo.x1, y2: geo.cy, stroke: t.line, strokeDasharray: '1 3' }));

  css.push('.draw{stroke-dasharray:1000;animation:draw 2.4s cubic-bezier(.45,0,.2,1) .5s both}@keyframes draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}');
  strands.forEach((s, i) => {
    const values = frames.map(fr => fr[i]).join(';');
    out.push(`<path d="${frames[0][i]}" stroke="${s.stroke}" stroke-width="${s.w}" opacity="${s.op}" stroke-linecap="round" pathLength="1000" class="draw">`
      + `<animate attributeName="d" dur="${PERIOD}s" repeatCount="indefinite" values="${values}"/></path>`);
  });

  // where the two strands meet: always on the axis, sliding with the phase
  let dots = '';
  for (let x = geo.x0 - lam / 2; x <= geo.x1 + 0.1; x += lam / 2) dots += `<circle cx="${r1(x)}" cy="${geo.cy}" r="2.2"/>`;
  out.push(`<g mask="url(#ends)" class="fi" style="animation-delay:2.4s"><g fill="${t.fg}">${dots}`
    + `<animateTransform attributeName="transform" type="translate" from="0 0" to="${r1(lam / 2)} 0" dur="${PERIOD / 2}s" repeatCount="indefinite"/></g></g>`);

  // numbers
  out.push(el('line', { x1: 24, y1: 196.5, x2: 856, y2: 196.5, stroke: t.line }));
  const items = [
    [fmt(yearTotal), ` contributions in ${year}`],
    [fmt(lastM.total), ` in ${MON[Number(lastM.month.slice(5)) - 1]}`],
    [String(PNEUMA_MODES), ' pneuma modes'],
    [String(AGENT_BACKENDS), ' agent backends'],
  ];
  const S = 12.5;
  let x = 24;
  items.forEach(([n, label], i) => {
    out.push(text(x, 220, tspan(n, t.fg, ' font-weight="600"') + tspan(label, t.muted), { size: S, raw: true, cls: 'fi', style: `animation-delay:${(1.4 + i * 0.15).toFixed(2)}s` }));
    x += textW(n + label, S) + 30;
  });
  out.push(text(856, 220, `as of ${stats.asOf}`, { size: S, fill: t.faint, anchor: 'end', cls: 'fi', style: 'animation-delay:2s' }));

  const desc = `Pandazki: building co-creation infrastructure for humans × code agents. ${fmt(yearTotal)} contributions in ${year}, ${fmt(lastM.total)} in ${MON[Number(lastM.month.slice(5)) - 1]}, ${PNEUMA_MODES} Pneuma modes, ${AGENT_BACKENDS} agent backends.`;
  return svg({ w: W, h: H, title: 'Pandazki', desc, css: css.join(''), defs, body: out.join('') });
}

// ---------- momentum: monthly contributions + where the last 12 months of commits went ----------

function renderMomentum(stats, theme) {
  const t = THEMES[theme];
  const W = 880;
  const { months } = stats;
  const out = [];
  const css = ['.gy{transform-box:fill-box;transform-origin:bottom;animation:gy .8s cubic-bezier(.3,1,.4,1) both}@keyframes gy{from{transform:scaleY(0)}}'
    + '.fi{animation:fi .6s ease-out both}@keyframes fi{from{opacity:0}}'
    + '.wipe{animation-name:wipe;animation-fill-mode:both}@keyframes wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}'];
  const wait = s => `animation-delay:${s.toFixed(2)}s`;

  // ---- monthly contributions: an LED-meter histogram ----
  const x0 = 24, x1 = 856, xr = x1 - 44, base = 166, top = 52; // bars end at xr; axis values sit right of it
  const col = (xr - x0) / months.length, bw = Math.min(14, col * 0.58);
  const cx = i => x0 + col * i + col / 2;
  const lastYear = yearOf(months.at(-1));
  const peakIdx = months.reduce((b, m, i) => (m.total > months[b].total ? i : b), 0);
  const peak = months[peakIdx];
  const scale = (base - top) / peak.total;
  const [peakY, peakM] = peak.month.split('-').map(Number);

  out.push(text(x0, 20, tspan('contributions / month', t.fg, ' font-weight="600"') + tspan(`   ${months[0].month} → ${months.at(-1).month}`, t.faint), { size: 12.5, raw: true }));
  out.push(text(x1, 20, 'the month in progress is left out', { size: 11.5, fill: t.faint, anchor: 'end' }));
  // light grid with values on the right
  const stepV = peak.total > 1200 ? 500 : peak.total > 400 ? 200 : 50;
  for (let v = stepV; v < peak.total; v += stepV) {
    const y = r1(base - v * scale) + 0.5;
    out.push(el('path', { d: `M${x0},${y}H${xr + 4}`, stroke: t.line, strokeDasharray: '1 3' }));
    out.push(text(x1, y + 4, fmt(v), { size: 11, fill: t.faint, anchor: 'end' }));
  }
  let bars = '';
  months.forEach((m, i) => {
    const h = Math.max(1.5, m.total * scale);
    const hot = yearOf(m) === lastYear;
    const delay = i === peakIdx ? 1.0 : 0.1 + i * 0.025;
    bars += el('rect', { x: r1(cx(i) - bw / 2), y: r1(base - h), width: r1(bw), height: r1(h), fill: hot ? 'url(#heat)' : t.faint, opacity: hot ? undefined : 0.55, class: 'gy', style: wait(delay) + (i === peakIdx ? ';animation-duration:1.3s' : '') });
  });
  out.push(`<g mask="url(#led)">${bars}</g>`);
  out.push(el('path', { d: `M${x0},${base + 0.5}H${xr + 4}`, stroke: t.line }));
  out.push(text(x1, base + 4, '0', { size: 11, fill: t.faint, anchor: 'end' }));

  // peak callout, set in the quiet space to its left
  const px = cx(peakIdx);
  const ax = x0 + 4, ay = 58;
  out.push(text(ax, ay, tspan(fmt(peak.total), t.emberText, ' font-weight="600"') + tspan(` in ${MON[peakM - 1]} ${peakY}`, t.fg), { size: 13, raw: true, cls: 'fi', style: wait(1.8) }));
  const lx = ax + textW(`${fmt(peak.total)} in ${MON[peakM - 1]} ${peakY}`, 13) + 10;
  out.push(el('path', { d: `M${r1(lx)},${ay - 4.5}H${r1(px - bw / 2 - 6)}`, stroke: t.ember, strokeDasharray: '1 3', class: 'fi', style: wait(2.1) }));

  // year spans under the axis
  for (const year of [...new Set(months.map(yearOf))]) {
    const idx = months.map((m, i) => (yearOf(m) === year ? i : -1)).filter(i => i >= 0);
    const total = idx.reduce((a, i) => a + months[i].total, 0);
    const lastM = Number(months[idx.at(-1)].month.slice(5));
    const ex0 = x0 + col * idx[0] + 3, ex1 = x0 + col * (idx.at(-1) + 1) - 3, ey = base + 10;
    const hot = year === lastYear;
    out.push(el('path', { d: `M${r1(ex0)},${ey}V${ey + 4}H${r1(ex1)}V${ey}`, stroke: hot ? t.ember : t.line }));
    const span = lastM < 12 ? ` (Jan–${MON[lastM - 1]})` : '';
    out.push(text((ex0 + ex1) / 2, ey + 20, tspan(String(year), hot ? t.emberText : t.fg, ' font-weight="600"') + tspan(`  ${fmt(total)}${span}`, t.muted), { size: 11.5, raw: true, anchor: 'middle' }));
  }

  // ---- where the last 12 months of commits went: git diff --stat ----
  const ly = stats.lastYear;
  const total = ly.repos.reduce((a, r) => a + r.commits, 0) || 1;
  const NW = 33, S = 12, CWp = S * 0.6, MAXP = 54;
  // like git, long paths lose their head: owner/name -> .../name -> ...tail
  const short = (owner, name) => {
    const full = owner === LOGIN ? name : `${owner}/${name}`;
    if (full.length <= NW) return full;
    return name.length + 4 <= NW ? `.../${name}` : `...${name.slice(-(NW - 3))}`;
  };
  const rows = ly.repos.slice(0, TOP_REPOS).map(r => ({ ...r, mine: r.owner === LOGIN, label: short(r.owner, r.name) }));
  const rest = ly.repos.slice(TOP_REPOS);
  if (rest.length) rows.push({ other: true, label: `${rest.length} others`, commits: rest.reduce((a, r) => a + r.commits, 0) });
  const max = Math.max(...rows.map(r => r.commits));
  const sy0 = 222, pitch = 16.5;
  out.push(text(x0, sy0, tspan('commits by repository', t.fg, ' font-weight="600"') + tspan('   last 12 months, public', t.faint), { size: 12.5, raw: true }));
  out.push(text(x1, sy0, `≈ git log --stat --since="12 months ago"`, { size: 11.5, fill: t.faint, anchor: 'end' }));
  rows.forEach((r, i) => {
    const y = sy0 + 22 + i * pitch;
    const n = Math.max(1, Math.round((r.commits / max) * MAXP));
    let name;
    if (r.other) name = tspan(r.label.padEnd(NW), t.muted);
    else if (r.mine || r.label.startsWith('...')) name = tspan(r.label.padEnd(NW), r.mine ? t.fg : t.muted);
    else { const [o, ...rest2] = r.label.split('/'); name = tspan(o + '/', t.faint) + tspan(rest2.join('/').padEnd(NW - o.length - 1), t.muted); }
    const head = `${' '.repeat(NW)} | ${String(r.commits).padStart(4)} `;
    out.push(text(x0, y, name + tspan(` | `, t.faint) + tspan(String(r.commits).padStart(4), r.mine ? t.fg : t.muted), { size: S, raw: true, fit: (head.length - 1) * CWp }));
    const plusX = x0 + head.length * CWp;
    out.push(text(plusX, y, '+'.repeat(n), { size: S, fill: r.mine ? t.emberText : t.faint, fit: n * CWp, cls: 'wipe', style: `animation-duration:${(0.25 + n * 0.012).toFixed(2)}s;animation-timing-function:steps(${n},end);${wait(0.4 + i * 0.09)}` }));
    out.push(text(x1, y, `${Math.round((r.commits / total) * 100) || '<1'}%`, { size: 11, fill: t.faint, anchor: 'end', cls: 'fi', style: wait(1 + i * 0.09) }));
  });
  const sumY = sy0 + 22 + rows.length * pitch + 8;
  const nRepos = ly.repos.length;
  out.push(text(x0, sumY, tspan(` ${nRepos} repos changed, `, t.muted) + tspan(fmt(ly.commits), t.fg, ' font-weight="600"') + tspan(' commits(+), ', t.muted)
    + tspan(fmt(ly.prs), t.fg, ' font-weight="600"') + tspan(' pull requests, ', t.muted) + tspan(fmt(ly.private), t.fg, ' font-weight="600"') + tspan(' more in private repos', t.muted),
    { size: S, raw: true, cls: 'fi', style: wait(1.6) }));
  const H = sumY + 14;

  const defs = `<linearGradient id="heat" x1="0" y1="${top}" x2="0" y2="${base}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.ember}"/><stop offset="1" stop-color="${t.sand}"/></linearGradient>`
    + `<pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse" y="${r1((base - 2.2) % 3)}"><rect width="4" height="2.2" fill="#fff"/></pattern>`
    + `<mask id="led" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${base + 1}"><rect width="${W}" height="${base + 1}" fill="url(#scan)"/></mask>`;
  const desc = `Contributions per month since ${months[0].month}: ${[...new Set(months.map(yearOf))].map(y => `${y}: ${fmt(months.filter(m => yearOf(m) === y).reduce((a, m) => a + m.total, 0))}`).join(', ')}. Peak ${fmt(peak.total)} in ${MON[peakM - 1]} ${peakY}. Public commits by repository over the last 12 months: ${rows.map(r => `${r.other ? r.label : r.name} ${r.commits}`).join(', ')}. ${fmt(ly.commits)} commits, ${fmt(ly.prs)} pull requests, ${fmt(ly.private)} contributions in private repos.`;
  return svg({ w: W, h: H, title: 'Activity', desc, css: css.join(''), defs, body: out.join('') });
}

// ---------- main ----------

const statsPath = join(ROOT, 'data', 'stats.json');
let stats;
if (process.argv.includes('--offline')) {
  stats = JSON.parse(readFileSync(statsPath, 'utf8'));
} else {
  stats = fetchStats();
  mkdirSync(dirname(statsPath), { recursive: true });
  writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n');
}

const assets = join(ROOT, 'assets');
mkdirSync(assets, { recursive: true });
const written = [];
const write = (name, content) => { writeFileSync(join(assets, name), content); written.push(name); };
for (const theme of ['light', 'dark']) {
  write(`hero-${theme}.svg`, renderHero(stats, theme));
  write(`momentum-${theme}.svg`, renderMomentum(stats, theme));
}
if (!process.argv.includes('--data-only')) for (const [name, content] of renderVisuals()) write(name, content);
console.log(`rendered ${written.length} SVGs (data as of ${stats.asOf})`);
