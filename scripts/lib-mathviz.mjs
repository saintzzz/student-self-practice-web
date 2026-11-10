// CR-132: deterministic SVG diagrams for math-vi questions.
// Each renderer takes a semantic spec and returns an SVG string.
// Style: flat, clean, own-brand - amber accent (math-vi tone), ink text.
const INK = '#1e293b';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const GREEN = '#10b981';
const RED = '#ef4444';
const PAPER = '#ffffff';
const LINE = '#e2e8f0';

const W = 360, H = 220;

function wrap(inner, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><rect width="${W}" height="${H}" rx="14" fill="${PAPER}" stroke="${LINE}" stroke-width="2"/>${inner}</svg>`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (x, y, s, size = 16, anchor = 'middle', fill = INK, weight = 600) =>
  `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

// ---- analog clock: {type:'clock', h, m} ----
export function clock({ h, m }) {
  const cx = W / 2, cy = H / 2, r = 82;
  let ticks = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ticks += txt(cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20) + 6, i, 16);
  }
  const ma = (m / 60) * Math.PI * 2 - Math.PI / 2;
  const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const hand = (a, len, w, c) =>
    `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * len}" y2="${cy + Math.sin(a) * len}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  // m < 0: blank face (no hands) - clock-reading questions must not leak
  const hands = m < 0 ? '' : hand(ha, 42, 7, INK) + hand(ma, 64, 5, BLUE) +
    `<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  return wrap(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff7ed" stroke="${AMBER}" stroke-width="4"/>` +
    ticks + hands,
    m < 0 ? 'Mặt đồng hồ' : `Đồng hồ chỉ ${h} giờ ${m > 0 ? m + ' phút' : 'đúng'}`,
  );
}

// ---- labeled shape: {type:'shape', shape:'rect'|'square'|'triangle'|'circle'|'box', a, b, c} ----
export function shape({ shape, a, b, c }) {
  if (shape === 'rect') {
    const rw = 200, rh = 120, x = (W - rw) / 2, y = (H - rh) / 2;
    return wrap(
      `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="6" fill="#eff6ff" stroke="${BLUE}" stroke-width="4"/>` +
      txt(x + rw / 2, y - 12, `${b} ${c ?? 'cm'}`, 17) +
      txt(x - 26, y + rh / 2 + 5, `${a} ${c ?? 'cm'}`, 17),
      `Hình chữ nhật chiều dài ${b} ${c ?? 'cm'}, chiều rộng ${a} ${c ?? 'cm'}`,
    );
  }
  if (shape === 'square') {
    const s = 130, x = (W - s) / 2, y = (H - s) / 2;
    return wrap(
      `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="6" fill="#ecfdf5" stroke="${GREEN}" stroke-width="4"/>` +
      txt(x + s / 2, y + s + 24, `${a} ${b ?? 'cm'}`, 17),
      `Hình vuông cạnh ${a} ${b ?? 'cm'}`,
    );
  }
  if (shape === 'triangle') {
    // right-ish triangle with base a and height b
    const bw = 200, th = 130, x1 = (W - bw) / 2, y1 = 170;
    return wrap(
      `<polygon points="${x1},${y1} ${x1 + bw},${y1} ${x1 + bw * 0.35},${y1 - th}" fill="#fff7ed" stroke="${AMBER}" stroke-width="4"/>` +
      `<line x1="${x1 + bw * 0.35}" y1="${y1}" x2="${x1 + bw * 0.35}" y2="${y1 - th}" stroke="${RED}" stroke-width="3" stroke-dasharray="6 5"/>` +
      txt(x1 + bw * 0.35 - 12, y1 - th / 2, `${b} cm`, 15, 'end', RED) +
      txt(x1 + bw / 2, y1 + 26, `${a} cm`, 17),
      `Hình tam giác đáy ${a} cm, chiều cao ${b} cm`,
    );
  }
  if (shape === 'circle') {
    return wrap(
      `<circle cx="${W / 2}" cy="${H / 2}" r="70" fill="#fdf2f8" stroke="#ec4899" stroke-width="4"/>`,
      'Hình tròn',
    );
  }
  if (shape === 'box') {
    const bx = 95, by = 75, bw = 170, bh = 95, dx = 42, dy = 34;
    return wrap(
      `<polygon points="${bx},${by} ${bx + dx},${by - dy} ${bx + bw + dx},${by - dy} ${bx + bw},${by}" fill="#f0fdf4" stroke="${GREEN}" stroke-width="3"/>` +
      `<polygon points="${bx + bw},${by} ${bx + bw + dx},${by - dy} ${bx + bw + dx},${by + bh - dy} ${bx + bw},${by + bh}" fill="#dcfce7" stroke="${GREEN}" stroke-width="3"/>` +
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#ecfdf5" stroke="${GREEN}" stroke-width="3"/>` +
      txt(bx + bw / 2, by + bh + 24, `dài ${a}, rộng ${b}, cao ${c} (dm)`, 15),
      `Hình hộp chữ nhật dài ${a} dm, rộng ${b} dm, cao ${c} dm`,
    );
  }
  // name-only shapes for g1/g2 recognition questions
  const poly = { 'tam giác': '180,170 90,60 270,60', 'vuông': '', 'tròn': '', 'chữ nhật': '', 'tứ giác': '110,150 120,70 240,60 250,160' };
  if (shape === 'tam giác' || shape === 'tứ giác') {
    return wrap(`<polygon points="${poly[shape]}" fill="#eff6ff" stroke="${BLUE}" stroke-width="4"/>`, `Hình ${shape}`);
  }
  if (shape === 'vuông') {
    const s = 110, x = (W - s) / 2;
    return wrap(`<rect x="${x}" y="55" width="${s}" height="${s}" fill="#eff6ff" stroke="${BLUE}" stroke-width="4"/>`, 'Hình vuông');
  }
  if (shape === 'tròn') {
    return wrap(`<circle cx="${W / 2}" cy="${H / 2}" r="62" fill="#fdf2f8" stroke="#ec4899" stroke-width="4"/>`, 'Hình tròn');
  }
  if (shape === 'chữ nhật') {
    return wrap(`<rect x="80" y="70" width="200" height="90" fill="#eff6ff" stroke="${BLUE}" stroke-width="4"/>`, 'Hình chữ nhật');
  }
  return wrap('', `Hình ${shape}`);
}

// ---- countable objects: {type:'groups', a, b, emoji} or {type:'count', n, emoji} ----
const EMOJI = {
  'quả táo': '🍎', 'quả cam': '🍊', 'viên bi': '🔵', 'cái kẹo': '🍬',
  'bông hoa': '🌸', 'con gà': '🐔', 'quyển vở': '📗', 'cây bút': '✏️',
  'quyển sách': '📕', 'nhãn vở': '🏷️',
  // short noun forms used by the generator's ITEMS short names
  cam: '🍊', 'kẹo': '🍬', 'vở': '📗', 'bi': '🔵', 'bút': '✏️',
  'sách': '📕', 'hoa': '🌸', 'gà': '🐔', 'lít': '💧', 'táo': '🍎',
};
export function emojiFor(short) { return EMOJI[short] ?? '🔵'; }

function rowOfEmojis(n, emoji, y, startX = 0, gap = 42) {
  let out = '';
  const perRow = 8;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const rowN = Math.min(n - row * perRow, perRow);
    const w = rowN * gap;
    out += `<text x="${startX + (W - w) / 2 + col * gap + gap / 2}" y="${y + row * 48}" font-size="34" text-anchor="middle">${emoji}</text>`;
  }
  return out;
}

export function groups({ a, b, emoji }) {
  const e = emojiFor(emoji);
  const mid = W / 2;
  return wrap(
    `<line x1="${mid}" y1="30" x2="${mid}" y2="185" stroke="${LINE}" stroke-width="2" stroke-dasharray="5 5"/>` +
    // left group: a items within left half
    halfRow(a, e, 0) + halfRow(b, e, mid),
    `${a} và ${b} ${emoji}`,
  );
}
function halfRow(n, emoji, x0) {
  const perRow = 4, gap = 40, w2 = W / 2;
  let out = '';
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const rowN = Math.min(n - row * perRow, perRow);
    out += `<text x="${x0 + (w2 - rowN * gap) / 2 + col * gap + gap / 2}" y="${80 + row * 55}" font-size="32" text-anchor="middle">${emoji}</text>`;
  }
  return out;
}
export function count({ n, emoji }) {
  return wrap(rowOfEmojis(n, emojiFor(emoji), 65), `${n} ${emoji}`);
}

// ---- money: {type:'money', bills:[vnd,...]} ----
export function money({ bills }) {
  const bw = 120, bh = 56;
  let out = '';
  bills.slice(0, 6).forEach((v, i) => {
    const x = 40 + i * 46, y = 60 - i * 6;
    out += `<g transform="rotate(-6 ${x + bw / 2} ${y + bh / 2})"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="#ecfdf5" stroke="${GREEN}" stroke-width="3"/>${txt(x + bw / 2, y + bh / 2 + 7, `${v >= 1000 ? v / 1000 + 'k' : v}`, 18, 'middle', '#047857', 700)}</g>`;
  });
  return wrap(out, `${bills.length} tờ tiền`);
}

// ---- fraction pie: {type:'fraction', num, den} ----
export function fraction({ num, den }) {
  const cx = W / 2, cy = H / 2, r = 78;
  let slices = '';
  for (let i = 0; i < den; i++) {
    const a1 = (i / den) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
    const large = den % 2 && i === den - 1 ? 0 : 0;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
    const fill = i < num ? AMBER : '#fde68a';
    slices += `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${fill}" stroke="#fff" stroke-width="2"/>`;
  }
  return wrap(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fef3c7" stroke="${AMBER}" stroke-width="3"/>` + slices +
    txt(cx, cy + r + 0, '', 1),
    `Phân số ${num}/${den} của hình tròn`,
  );
}

// ---- bar model (tape diagram) - Singapore Math canonical model ----
// {type:'bar', kind:'partWhole'|'compare'|'ratio'|'equalParts', ...}
// Givens are labeled, the unknown is drawn as '?' - teaches the model.
const BAR = '#f59e0b', BAR2 = '#fbbf24', BAR3 = '#38bdf8';

function barPartWhole({ a, b, unit }) {
  const tot = a + b;
  const wA = Math.round(220 * (a / tot)), wB = 220 - wA;
  const y = 70, hh = 48;
  return wrap(
    `<rect x="70" y="${y}" width="${wA}" height="${hh}" fill="${BAR}" stroke="#b45309" stroke-width="2" rx="4"/>` +
    `<rect x="${70 + wA}" y="${y}" width="${wB}" height="${hh}" fill="${BAR2}" stroke="#b45309" stroke-width="2" rx="4"/>` +
    txt(70 + wA / 2, y + hh / 2 + 7, a, 18, 'middle', '#78350f', 700) +
    txt(70 + wA + wB / 2, y + hh / 2 + 7, b, 18, 'middle', '#78350f', 700) +
    `<path d="M70 ${y + hh + 12} v-6 h220 v6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    txt(180, y + hh + 36, `? ${unit ?? ''}`, 18),
    `Sơ đồ đoạn thẳng: ${a} và ${b}`,
  );
}

function barCompare({ a, b, unit }) {
  // a >= b guaranteed by the matcher; shorter bar + '?' gap
  const scale = 220 / a;
  const wA = 220, wB = Math.round(b * scale);
  const y1 = 60, y2 = 130, hh = 44;
  const gapX = 70 + wB;
  return wrap(
    `<rect x="70" y="${y1}" width="${wA}" height="${hh}" fill="${BAR}" stroke="#b45309" stroke-width="2" rx="4"/>` +
    txt(70 + wA / 2, y1 + hh / 2 + 7, a, 18, 'middle', '#78350f', 700) +
    `<rect x="70" y="${y2}" width="${wB}" height="${hh}" fill="${BAR3}" stroke="#0369a1" stroke-width="2" rx="4"/>` +
    txt(70 + wB / 2, y2 + hh / 2 + 7, b, 18, 'middle', '#082f49', 700) +
    `<rect x="${gapX}" y="${y2}" width="${wA - wB}" height="${hh}" fill="none" stroke="${RED}" stroke-width="2" stroke-dasharray="5 4" rx="4"/>` +
    txt(gapX + (wA - wB) / 2, y2 + hh / 2 + 7, `?${unit ? ' ' + unit : ''}`, 17, 'middle', RED, 700),
    `Sơ đồ so sánh: ${a} và ${b}`,
  );
}

function barRatio({ total, ratio, unit }) {
  // total split into (ratio+1) equal parts; the small part is '?'
  const segs = ratio + 1;
  const gap = 6, w = Math.min(230, segs * 46);
  const sw = (w - (segs - 1) * gap) / segs;
  const y = 85, hh = 46;
  let out = '';
  for (let i = 0; i < segs; i++) {
    const last = i === segs - 1;
    out += `<rect x="${70 + i * (sw + gap)}" y="${y}" width="${sw}" height="${hh}" fill="${last ? BAR3 : BAR}" stroke="${last ? '#0369a1' : '#b45309'}" stroke-width="2" rx="4"/>` +
      txt(70 + i * (sw + gap) + sw / 2, y + hh / 2 + 6, last ? '?' : (segs <= 6 ? '1' : ''), last ? 20 : 15, 'middle', last ? '#082f49' : '#78350f', 700);
  }
  out += `<path d="M70 ${y + hh + 12} v-6 h${w} v6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    txt(70 + w / 2, y + hh + 36, `${total} ${unit ?? ''}`, 17);
  return wrap(out, `Sơ đồ tỉ số: tổng ${total}, gấp ${ratio} lần`);
}

function barEqualParts({ total, parts, unit }) {
  // division: total split into `parts` equal segments, each '?'
  const gap = 5, w = 230;
  const sw = (w - (parts - 1) * gap) / parts;
  const y = 85, hh = 46;
  let out = '';
  for (let i = 0; i < parts; i++) {
    out += `<rect x="${65 + i * (sw + gap)}" y="${y}" width="${sw}" height="${hh}" fill="${BAR3}" stroke="#0369a1" stroke-width="2" rx="4"/>` +
      txt(65 + i * (sw + gap) + sw / 2, y + hh / 2 + 6, '?', 18, 'middle', '#082f49', 700);
  }
  out += `<path d="M65 ${y - 10} v6 h${w} v-6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    txt(65 + w / 2, y - 20, `${total} ${unit ?? ''}`, 17);
  return wrap(out, `Sơ đồ chia đều: ${total} chia ${parts} phần`);
}

function barSubtract({ whole, part, unit }) {
  // whole bar = whole; `part` segment shaded; remainder is '?'
  const wWhole = 230, wPart = Math.max(40, Math.round(wWhole * (part / whole)));
  const x = 65, y = 85, hh = 48;
  return wrap(
    `<rect x="${x}" y="${y}" width="${wPart}" height="${hh}" fill="${BAR3}" stroke="#0369a1" stroke-width="2" rx="4"/>` +
    `<rect x="${x + wPart}" y="${y}" width="${wWhole - wPart}" height="${hh}" fill="#f1f5f9" stroke="${RED}" stroke-width="2" stroke-dasharray="5 4" rx="4"/>` +
    txt(x + wPart / 2, y + hh / 2 + 7, part, 18, 'middle', '#082f49', 700) +
    txt(x + wPart + (wWhole - wPart) / 2, y + hh / 2 + 7, `?${unit ? ' ' + unit : ''}`, 18, 'middle', RED, 700) +
    `<path d="M${x} ${y - 10} v6 h${wWhole} v-6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    txt(x + wWhole / 2, y - 20, `${whole} ${unit ?? ''}`, 17),
    `Sơ đồ: ${whole} bớt ${part}`,
  );
}

function barMultiply({ n, unitPrice, unit }) {
  // n equal segments each labeled unitPrice, whole is '?'
  const gap = 5, w = 230;
  const sw = (w - (n - 1) * gap) / n;
  const y = 85, hh = 46;
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<rect x="${65 + i * (sw + gap)}" y="${y}" width="${sw}" height="${hh}" fill="${BAR}" stroke="#b45309" stroke-width="2" rx="4"/>` +
      txt(65 + i * (sw + gap) + sw / 2, y + hh / 2 + 7, unitPrice, sw < 52 ? 12 : 15, 'middle', '#78350f', 700);
  }
  out += `<path d="M65 ${y + hh + 12} v-6 h${w} v6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    txt(65 + w / 2, y + hh + 36, `? ${unit ?? ''}`, 18);
  return wrap(out, `Sơ đồ nhân: ${n} lần ${unitPrice}`);
}

function bar({ kind, ...rest }) {
  if (kind === 'partWhole') return barPartWhole(rest);
  if (kind === 'compare') return barCompare(rest);
  if (kind === 'ratio') return barRatio(rest);
  if (kind === 'subtract') return barSubtract(rest);
  if (kind === 'multiply') return barMultiply(rest);
  return barEqualParts(rest);
}

// ---- number bond - part-part-whole circles (g1-2) ----
// whole on top, parts on leaves; any slot may be '?' (the unknown)
function numberBond({ a = '?', b = '?', whole = '?' }) {
  const cx = W / 2;
  const bond = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="3"/>`;
  const slot = (x, y, v, unknown) =>
    `<circle cx="${x}" cy="${y}" r="30" fill="${unknown ? '#fff7ed' : '#eff6ff'}" stroke="${unknown ? BAR : BLUE}" stroke-width="3"/>` +
    txt(x, y + 7, v, 20, 'middle', unknown ? '#b45309' : BLUE, 700);
  return wrap(
    bond(cx, 62, cx - 80, 140) + bond(cx, 62, cx + 80, 140) +
    slot(cx, 55, whole, whole === '?') +
    slot(cx - 80, 155, a, a === '?') +
    slot(cx + 80, 155, b, b === '?'),
    `Sơ đồ tách gộp số`,
  );
}

// ---- dispatch ----
export function renderViz(spec) {
  switch (spec.type) {
    case 'clock': return clock(spec);
    case 'shape': return shape(spec);
    case 'groups': return groups(spec);
    case 'count': return count(spec);
    case 'money': return money(spec);
    case 'fraction': return fraction(spec);
    case 'bar': return bar(spec);
    case 'numberBond': return numberBond(spec);
    default: return wrap('', 'diagram');
  }
}
export function vizLabel(spec) {
  switch (spec.type) {
    case 'clock': return spec.m < 0 ? 'Mặt đồng hồ' : `Đồng hồ chỉ ${spec.h} giờ ${spec.m > 0 ? spec.m + ' phút' : 'đúng'}`;
    case 'shape': return `Hình ${spec.shape}`;
    case 'groups': return `Nhóm đồ vật để đếm`;
    case 'count': return `${spec.n} ${spec.emoji} để đếm`;
    case 'money': return `Các tờ tiền`;
    case 'fraction': return `Phân số ${spec.num}/${spec.den}`;
    case 'bar': return 'Sơ đồ đoạn thẳng (bar model)';
    case 'numberBond': return 'Sơ đồ tách gộp số';
    default: return 'hình minh họa';
  }
}
