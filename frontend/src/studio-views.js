// The 13 design views: the artwork built from the template for each design, kept in sync with the
// state (syncView), laid out (measure) and drawn every frame (draw). The canvas artwork comes from
// src/designs/; this module owns the DOM around it: text, badges, codes, borders and effects.
import { studioContinuousShow, studioNarrativePose, studioNarrativeTime, studioPhase, studioTotalDuration } from './timeline.ts';
import { informationMotionPose, marqueeOffset } from './information-motion.ts';
import { badgeCatalog as catalog } from './studio-state.ts';
import assets from './badge-assets.json';
import { designPalette, designs, paintExploration } from './designs/index.ts';
import { applyStudioTypography, studioTypographyFontSize, studioTypographyStyle } from './studio-text.js';
import { studioTypographyLayoutChanged, studioTypographyValue } from './typography.ts';
import { drawStudioNarrative } from './studio-narrative.js';
import { createIcon } from './icons.ts';
import { studioLayerConfig } from './obs-layer-sync.js';
import { currentSeries, images, motionClock, reduced, root, state } from './studio-session.js';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n)), lerp = (a, b, p) => a + (b - a) * p;

// Fills each section[data-design] from the artwork template.
export function createViews() {
  const template = document.getElementById('direction-view-template');
  const views = [...root.querySelectorAll('[data-design]')].map(section => {
    section.append(template.content.cloneNode(true));
    for (const el of section.querySelectorAll('i[data-lucide]')) el.replaceWith(createIcon(el.dataset.lucide));
    const art = section.querySelector('.design-art'), composition = art.querySelector('.composition'), canvas = art.querySelector('.field-canvas');
    art.dataset.kind = section.dataset.design;
    // Dual sets the handle and the technical shelf side by side, under its own wrapper.
    if (section.dataset.design === 'dual') {
      const information = document.createElement('div');
      information.className = 'dual-information';
      information.append(art.querySelector('.dual-handle'), art.querySelector('.technical'));
      composition.append(information);
    }
    art.setAttribute('aria-label', section.dataset.variant + ' · 角色背景');
    return {
      section, art, composition, canvas, ctx: canvas.getContext('2d'), key: section.dataset.design,
      name: art.querySelector('.hero-name'), stack: art.querySelector('.name-stack'),
      badgeKey: null, codeKey: '', qrKey: null, qrError: false, w: 0, h: 0, px: 0, py: 0, sx: 0, sy: 0,
    };
  });
  template.remove();
  return views;
}

function glyph(b) {
  const holder = document.createElement('span');
  holder.className = 'badge-symbol';
  const src = ['vrcft', 'liltoon', 'poiyomi'].includes(b.id) ? assets[b.id]?.dataUri : null;
  if (src) {
    const mark = document.createElement('span');
    mark.className = 'badge-official';
    mark.setAttribute('aria-hidden', 'true');
    mark.style.maskImage = `url("${src}")`;
    mark.style.webkitMaskImage = `url("${src}")`;
    holder.append(mark);
  } else holder.append(createIcon(b.icon));
  return holder;
}
function renderBadges(view) {
  const key = state.badges.join('|');
  if (view.badgeKey === key) return;
  view.badgeKey = key;
  view.informationItems = null;
  view.art.querySelectorAll('.compatibility').forEach(x => x.remove());
  const row = view.art.querySelector('.marks'), qr = row.querySelector('.qr-mark');
  for (const b of catalog.filter(x => state.badges.includes(x.id))) {
    const item = document.createElement('div');
    item.className = 'compatibility';
    item.dataset.badge = b.id;
    item.dataset.layer = 'badge-' + b.id;
    item.setAttribute('aria-label', b.name + ' ' + (b.description || b.sub || 'Shader'));
    const label = document.createElement('strong');
    label.className = 'badge-name';
    label.textContent = b.name;
    item.append(glyph(b), label);
    if (b.sub) {
      const sub = document.createElement('span');
      sub.className = 'badge-compatible';
      sub.textContent = b.sub;
      item.append(sub);
    }
    row.insertBefore(item, qr);
  }
}
function renderCodes(view) {
  const e = currentSeries(), id = (e.prefix || 'ID') + '-' + (e.serial || '001');
  if (view.codeKey !== id) {
    view.codeKey = id;
    JsBarcode(view.art.querySelector('.barcode'), id, { format: 'CODE128', displayValue: false, lineColor: '#000', background: '#fff', margin: 5, marginTop: 2, marginBottom: 2, height: 32, width: 2 });
  }
  const slot = view.art.querySelector('.qr-mark');
  slot.classList.toggle('has-image', !!images.qr);
  if (images.qr) slot.querySelector('img').src = images.qr;
  const barcode = view.art.querySelector('.barcode-slot');
  barcode.classList.toggle('has-image', !!images.barcode);
  if (images.barcode) barcode.querySelector('img').src = images.barcode;
  if (view.qrKey !== state.qrUrl) {
    view.qrKey = state.qrUrl;
    view.qrError = false;
    slot.classList.remove('has-code');
    if (state.qrUrl.trim()) {
      try {
        const url = new URL(state.qrUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw Error('url');
        const qr = qrcode(0, 'M');
        qr.addData(url.href);
        qr.make();
        const n = qr.getModuleCount(), unit = 5, quiet = 4, c = slot.querySelector('canvas'), ctx = c.getContext('2d');
        c.width = c.height = (n + quiet * 2) * unit;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#000';
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect((x + quiet) * unit, (y + quiet) * unit, unit, unit);
        slot.classList.add('has-code');
      } catch {
        view.qrError = true;
      }
    }
  }
}

function rgba(hex, alpha) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`; }
function blendHex(a, b, p) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return '#' + [16, 8, 0].map(shift => Math.round(((x >> shift) & 255) * (1 - p) + ((y >> shift) & 255) * p).toString(16).padStart(2, '0')).join('');
}
// Surface and ink colours of a design's badges.
export function badgeColors(v) {
  if (v.badgePalette === 'custom') return [v.badgeColor, v.badgeInk];
  if (v.badgePalette === 'mono') return ['#000000', '#ffffff'];
  const key = Object.keys(state.variants).find(key => state.variants[key] === v), p = designPalette(key, v.background === 'dark');
  if (p) return [blendHex(p.paper, v.accent, v.background === 'dark' ? .13 : .10), p.ink];
  return v.background === 'dark' ? ['#363d41', '#d5d9d3'] : ['#dce2d5', '#405045'];
}

// CSS colours, grade, atmosphere and shadows of a view's artwork.
function effects(view) {
  const v = state.variants[view.key], e = v.effects, dark = v.background === 'dark', art = view.art;
  const palette = designPalette(view.key, dark) || (view.key === 'dual' ? { ink: dark ? '#eef0df' : '#232b24', paper: dark ? '#171e1b' : '#eeefdf' } : { ink: dark ? '#f3f0e5' : '#212a24', paper: dark ? '#141b20' : '#eff1e8' });
  art.dataset.background = v.background;
  art.style.setProperty('--accent', v.accent);
  art.style.setProperty('--ink', palette.ink);
  art.style.setProperty('--paper', palette.paper);
  art.style.setProperty('--language-muted', palette.muted || palette.ink);
  art.style.setProperty('--ornament-alpha', v.cutStrength);
  art.dataset.typeface = v.typeface;
  art.dataset.badgeStyle = v.badgeStyle;
  const [badgeColor, badgeInk] = badgeColors(v);
  art.style.setProperty('--badge-surface', rgba(badgeColor, v.badgeOpacity));
  art.style.setProperty('--badge-ink', badgeInk);
  const rgb = v.accent.match(/[0-9a-f]{2}/gi).map(s => parseInt(s, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  art.style.setProperty('--accent-contrast', rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .27 ? '#16201a' : '#fff8ea');

  const strength = e.gradeEnabled ? e.gradeStrength : 0;
  const grades = { original: [1, 1, 1, 0, 0], chrome: [1.02, 1.24, .12, .03, 0], cold: [.99, 1.14, .78, .20, 155], warm: [1.07, 1.05, .85, .31, -12], faded: [1.13, .8, .7, .14, 0], vivid: [1.03, 1.17, 1.35, 0, 0] }, g = grades[e.grade];
  const filter = `brightness(${lerp(1, g[0], strength)}) contrast(${lerp(1, g[1], strength)}) saturate(${lerp(1, g[2], strength)}) sepia(${g[3] * strength}) hue-rotate(${g[4] * strength}deg)`;
  art.style.setProperty('--field-filter', filter);
  art.style.setProperty('--model-grade', e.gradeModel ? filter : 'none');

  const ac = rgba(v.accent, .9), bc = rgba(e.gradientColor, .9), x = state.ratio === 'portrait' ? '50%' : state.swapped ? '33%' : '67%';
  const fills = {
    none: 'none',
    spotlight: `radial-gradient(ellipse at 92% 6%,${ac},transparent 65%)`,
    diagonal: `linear-gradient(125deg,${ac},transparent 48%,${bc})`,
    halo: `radial-gradient(ellipse at ${x} 52%,${bc},transparent 64%)`,
    aurora: `radial-gradient(ellipse at 80% 10%,${ac},transparent 58%),radial-gradient(ellipse at 25% 90%,${bc},transparent 60%)`,
  };
  art.style.setProperty('--atmosphere', fills[e.gradient]);
  art.style.setProperty('--wash-alpha', e.gradient === 'none' ? 0 : e.gradientStrength);
  art.style.setProperty('--grain', e.grain);
  art.style.setProperty('--vignette', e.vignette);
  art.style.setProperty('--title-fill', e.titleGradient ? `linear-gradient(125deg,color-mix(in srgb,${v.accent},#fff 20%),${v.accent} 45%,color-mix(in srgb,${v.accent},#111 24%))` : v.accent);

  const active = e.shadowEnabled && e.shadowStrength > 0 && e.shadowDepth > 0, s = e.shadowStrength, d = e.shadowDepth, soft = e.shadowStyle === 'soft';
  const unit = n => (n * d).toFixed(3) + 'cqw', ink = rgba(e.shadowColor, s * (soft ? .6 : .75)), ambient = rgba(e.shadowColor, s * .4);
  const cast = soft
    ? `drop-shadow(${unit(.3)} ${unit(.8)} ${unit(1.05)} ${ambient}) drop-shadow(0 ${unit(.12)} ${unit(.18)} ${ink})`
    : `drop-shadow(${unit(.65)} ${unit(.8)} 0 ${ink}) drop-shadow(0 ${unit(.2)} ${unit(.3)} ${ambient})`;
  art.style.setProperty('--name-cast', active && v.shadows.title ? cast : 'none');
  art.style.setProperty('--mark-cast', active && v.shadows.badges ? `${unit(soft ? .2 : .36)} ${unit(soft ? .55 : .46)} ${unit(soft ? .65 : 0)} ${ink},0 ${unit(.3)} ${unit(.5)} ${ambient}` : 'none');
  art.style.setProperty('--character-cast', active && v.shadows.model ? `drop-shadow(${unit(.65)} ${unit(1.1)} ${unit(soft ? 1.2 : .3)} ${ink})` : 'none');
}
// A fixed noise texture; its strength is the --grain CSS variable.
export function paintGrain(view) {
  const c = view.art.querySelector('.grain-canvas');
  c.width = 192;
  c.height = 108;
  const ctx = c.getContext('2d'), image = ctx.createImageData(c.width, c.height);
  let seed = 2718;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = seed >>> 24;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

// Pushes the caption and subtitle below the name block for designs that skew or enlarge it, and for
// changed typography. Uses unanimated layout coordinates, so the clearance never chases moving text.
function fitPosterCopy(view) {
  if (!designs[view.key]?.copyBelowTitle && !studioTypographyLayoutChanged(state.typography)) return;
  const title = view.name, caption = view.art.querySelector('.copy-caption'), subtitle = view.art.querySelector('.copy-subtitle');
  caption.style.removeProperty('top');
  subtitle.style.removeProperty('top');
  if (!title.offsetWidth || !caption.offsetHeight) return;
  const transform = (point, css) => {
    const [ox, oy] = css.transformOrigin.split(' ').map(parseFloat), m = new DOMMatrix(css.transform === 'none' ? undefined : css.transform);
    return { x: m.a * (point.x - ox) + m.c * (point.y - oy) + m.e + ox, y: m.b * (point.x - ox) + m.d * (point.y - oy) + m.f + oy };
  };
  const corners = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const css = getComputedStyle(title), points = corners(0, 0, title.offsetWidth, title.offsetHeight);
  for (const pseudo of ['::before', '::after']) {
    const s = getComputedStyle(title, pseudo);
    if (s.content === 'none' || s.display === 'none') continue;
    const n = value => parseFloat(value) || 0, w = n(s.width), h = n(s.height);
    if (!w || !h) continue;
    const x = s.left === 'auto' ? title.offsetWidth - n(s.right) - w : n(s.left), y = s.top === 'auto' ? title.offsetHeight - n(s.bottom) - h : n(s.top);
    for (const p of corners(0, 0, w, h)) { const q = transform(p, s); points.push({ x: q.x + x, y: q.y + y }); }
  }
  const v = state.variants[view.key], e = v.effects, shadow = e.shadowEnabled && v.shadows.title && e.shadowStrength > 0 ? view.w / 100 * e.shadowDepth * (e.shadowStyle === 'soft' ? 2.9 : 1.4) : 0;
  const motion = v.textMotion ? clamp(view.w / 736, .6, 2.4) * v.textMotionAmount * 8 : 0, gap = Math.max(4, view.w * .012) + motion;
  const bottom = view.stack.offsetTop + title.offsetTop + Math.max(...points.map(p => transform(p, css).y)) + shadow;
  const c = getComputedStyle(caption), relative = corners(0, 0, caption.offsetWidth, caption.offsetHeight).map(p => transform(p, c).y), top = Math.max(caption.offsetTop, bottom + gap - Math.min(...relative));
  caption.style.top = top.toFixed(3) + 'px';
  if (subtitle.offsetHeight) subtitle.style.top = Math.max(subtitle.offsetTop, top + Math.max(...relative) + Math.max(3, view.w * .007) + motion * .5).toFixed(3) + 'px';
}
// Shrinks the name, caption and subtitle to fit their boxes, then lays out the copy and the badges.
function fitText(view) {
  if (!view.w) return;
  for (const [key, el] of [['name', view.name], ['caption', view.art.querySelector('.copy-caption')], ['subtitle', view.art.querySelector('.copy-subtitle')]]) {
    el.style.fontSize = '';
    el.style.whiteSpace = '';
    el.style.overflowWrap = '';
    if (key === 'subtitle' && !studioTypographyLayoutChanged({ subtitle: state.typography.subtitle })) continue;
    studioTypographyStyle(el, key);
    const base = studioTypographyFontSize(el, key), style = getComputedStyle(el), ctx = view.ctx;
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${base}px ${style.fontFamily}`;
    const text = el.textContent, width = ctx.measureText(text).width + (Array.from(text).length - 1) * (parseFloat(style.letterSpacing) || 0), usable = el.clientWidth * .97;
    if (width > usable && usable > 0) {
      const target = base * usable / width;
      el.style.fontSize = Math.max(11, target) + 'px';
      if (target < 11) {
        el.style.whiteSpace = 'normal';
        el.style.overflowWrap = 'anywhere';
      }
    }
  }
  fitPosterCopy(view);
  const compact = state.ratio === 'portrait' && view.w < 340;
  view.art.classList.toggle('compact-portrait', compact);
  for (const b of catalog) {
    const label = view.art.querySelector(`[data-badge="${b.id}"] .badge-name`);
    if (label) label.textContent = state.ratio === 'portrait' && view.w < 390 && b.id === 'poiyomi' ? 'POI' : b.name;
  }
}

// The scrolling border text: two identical cycles per side, so the marquee wraps seamlessly.
function edgeColumn(lines) {
  const unit = document.createElement('span');
  unit.className = 'edge-unit';
  const column = document.createElement('span');
  column.className = 'edge-column';
  for (const [text, className] of lines) {
    const line = document.createElement('span');
    line.className = 'edge-line ' + (className || '');
    line.textContent = text;
    column.append(line);
  }
  unit.append(column);
  return unit;
}
function renderEdgeContent(view) {
  const e = currentSeries(), edition = (e.label || 'EDITION') + ' / ' + (e.prefix || 'ID') + '-' + (e.serial || '001'), key = JSON.stringify([state.brand, state.topText, state.name, state.modelCredit, state.bottomText, state.designCredit, edition]);
  if (view.edgeKey === key && view.edgeLogo === images.logo) return;
  view.edgeKey = key;
  view.edgeLogo = images.logo;
  view.edgeTracks = {};
  for (const side of ['top', 'bottom']) {
    const edge = view.art.querySelector('.edge.' + side), track = edge.querySelector('.edge-track'), cycle = document.createElement('div');
    cycle.className = 'edge-cycle';
    const first = side === 'top' ? edgeColumn([[state.brand, ''], [state.topText, 'edge-small']]) : edgeColumn([[state.modelCredit, ''], [state.bottomText, 'edge-small']]);
    if (side === 'top' && images.logo) {
      const line = first.querySelector('.edge-line');
      line.textContent = '';
      const logo = document.createElement('img');
      logo.className = 'edge-marquee-logo';
      logo.alt = '';
      logo.onload = () => { measureEdgeTracks(view); drawBorderMotion(view); };
      logo.src = images.logo;
      line.append(logo);
    }
    const second = side === 'top' ? edgeColumn([[edition, 'edge-highlight'], [state.name, 'edge-small']]) : edgeColumn([[state.designCredit, 'edge-highlight']]);
    for (const item of [first, second]) {
      cycle.append(item);
      const separator = document.createElement('span');
      separator.className = 'edge-separator';
      separator.textContent = '✦';
      cycle.append(separator);
    }
    track.replaceChildren(cycle, cycle.cloneNode(true));
    view.edgeTracks[side] = { edge, track, cycle, width: 0 };
  }
}
function measureEdgeTracks(view) {
  if (!view.edgeTracks || state.frame === 'none') return;
  const lane = state.frame === 'vertical' ? view.art.offsetHeight : view.art.offsetWidth;
  for (const part of Object.values(view.edgeTracks)) {
    for (const cycle of part.track.children) cycle.style.minWidth = lane + 'px';
    part.width = parseFloat(getComputedStyle(part.cycle).width) || lane;
  }
}
function drawBorderMotion(view) {
  if (!view.edgeTracks) return;
  for (const side of ['top', 'bottom']) {
    const part = view.edgeTracks[side], active = state.edges[side].direction !== 'still' && !reduced.matches;
    part.edge.classList.toggle('is-scrolling', active);
    part.track.style.transform = `translateX(${marqueeOffset(motionClock.edges[side], part.width).toFixed(3)}px)`;
  }
}

// Text entrance and idle motion: each information item has its own index in the stagger.
function informationItems(view) {
  if (view.informationItems) return view.informationItems;
  const items = [['.art-edition', 0, 1], ['.copy-caption', 1, 1], ['.copy-subtitle', 2, .6], ['.formats', 3, 1], ['.art-credit', 7, .6]].map(([selector, index, alpha]) => ({ el: view.art.querySelector(selector), index, alpha }));
  view.art.querySelectorAll('.compatibility').forEach((el, index) => items.push({ el, index: 4 + index * .22, alpha: 1 }));
  // Codes fade in but never move, so they stay scannable.
  items.push({ el: view.art.querySelector('.qr-mark'), index: 6.1, alpha: 1, code: true }, { el: view.art.querySelector('.archive-line'), index: 7, alpha: 1, code: true });
  view.informationItems = items;
  return items;
}
function drawInformationMotion(view) {
  const v = state.variants[view.key], np = studioNarrativePose(state.time, state.introDuration, state.narrative), active = v.textMotion && !reduced.matches && v.textMotionAmount > 0, phase = motionClock.texts[view.key], scale = clamp(view.w / 736, .6, 2.4), title = view.name;
  view.art.querySelector('.technical').style.opacity = active ? '1' : '';
  if (active) {
    const pose = informationMotionPose(studioNarrativeTime(state.time, state.introDuration), phase, -1, v.textMotionStyle, v.textMotionAmount * .6);
    title.style.translate = `${(pose.x * scale).toFixed(3)}px ${(pose.y * scale).toFixed(3)}px`;
    title.style.scale = pose.scale.toFixed(5);
  } else {
    title.style.removeProperty('translate');
    title.style.removeProperty('scale');
  }
  for (const item of informationItems(view)) {
    const { el, index, alpha } = item;
    if (!active) {
      for (const property of ['translate', 'scale', 'opacity']) el.style.removeProperty(property);
      continue;
    }
    const pose = informationMotionPose(studioNarrativeTime(state.time, state.introDuration), phase, index, v.textMotionStyle, v.textMotionAmount), entrance = (1 - pose.entry) * v.textMotionAmount * scale;
    el.style.opacity = (pose.entry * alpha * np.info).toFixed(4);
    if (item.code) {
      el.style.removeProperty('translate');
      el.style.removeProperty('scale');
      continue;
    }
    const x = pose.x * scale - (v.textMotionStyle === 'refined' ? 6 * entrance : 0), y = pose.y * scale + (v.textMotionStyle === 'refined' ? 0 : 8 * entrance);
    el.style.translate = `${x.toFixed(3)}px ${y.toFixed(3)}px`;
    el.style.scale = pose.scale.toFixed(5);
  }
}

// Lays out a visible view at its logical size and sizes its canvas. In clean output the layout
// reads untransformed offsets, never the scaled DOM bounds.
export function measure(view) {
  if (view.section.hidden) return;
  const output = !!view.outputScale, outer = output ? { width: view.art.offsetWidth, height: view.art.offsetHeight } : view.art.getBoundingClientRect();
  if (!outer.width) return;
  const frame = state.frame === 'none' ? 0 : Math.max(32, Math.min(66, outer.width * .048));
  view.art.style.setProperty('--frame-thickness', frame + 'px');
  view.art.style.setProperty('--outer-height', outer.height + 'px');
  view.art.style.setProperty('--safe-x', state.frame === 'vertical' ? frame + 'px' : '0px');
  view.art.style.setProperty('--safe-y', state.frame === 'horizontal' ? frame + 'px' : '0px');
  const rect = output ? { width: view.composition.clientWidth, height: view.composition.clientHeight } : view.composition.getBoundingClientRect(), dpr = Math.min((devicePixelRatio || 1) * (output ? Math.max(1, view.outputScale) : 1), 2);
  view.w = rect.width;
  view.h = rect.height;
  const width = Math.round(view.w * dpr), height = Math.round(view.h * dpr);
  if (view.canvas.width !== width || view.canvas.height !== height) {
    view.canvas.width = width;
    view.canvas.height = height;
  }
  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fitText(view);
  measureEdgeTracks(view);
}

// Brings a view's artwork in line with the state, then measures and draws it.
export function syncView(view) {
  const { art, section, key } = view, v = state.variants[key], e = currentSeries(), design = designs[key];
  art.classList.toggle('is-portrait', state.ratio === 'portrait');
  art.classList.toggle('is-swapped', state.swapped);
  art.classList.toggle('has-frame', state.frame !== 'none');
  art.classList.toggle('no-type', !state.type);
  art.classList.toggle('is-dense', state.badges.length > 5);
  if (key === 'dual') {
    art.classList.toggle('dual-guides', v.dualGuides);
    art.style.setProperty('--dual-split', (v.dualSplit * 100) + '%');
  }
  art.dataset.frame = state.frame;
  for (const kind of ['logo', 'model', 'portrait']) art.classList.toggle('has-' + (kind === 'model' ? 'character' : kind), !!images[kind]);
  if (images.logo) art.querySelectorAll('.brand-image').forEach(img => img.src = images.logo);
  if (images.model) art.querySelector('.character-image').src = images.model;
  if (images.portrait) art.querySelector('.portrait-crop img').src = images.portrait;

  art.querySelector('.language-note').textContent = design?.note || '';
  if (design?.hello) art.querySelector('.hello').textContent = design.hello;
  art.querySelector('.field-canvas').setAttribute('aria-label', (section.dataset.variant || '角色展示') + ' · 动态背景与开放展示空间');

  view.name.textContent = studioTypographyValue(state.typography, 'name', state.name.trim() || 'NOVA');
  art.querySelector('.edition-label').textContent = e.label || 'EDITION';
  art.querySelectorAll('.edition-number,.serial').forEach(el => el.textContent = (e.prefix || 'ID') + '-' + (e.serial || '001'));
  art.querySelectorAll('.brand-word').forEach(el => el.textContent = state.brand);
  for (const [selector, value] of Object.entries({ '.copy-caption': studioTypographyValue(state.typography, 'caption', e.caption), '.copy-subtitle': studioTypographyValue(state.typography, 'subtitle', e.subtitle), '.model-credit': state.modelCredit, '.design-credit': state.designCredit })) art.querySelector(selector).textContent = value;
  for (const span of art.querySelectorAll('[data-edge]')) {
    const key = span.dataset.edge;
    span.textContent = key === 'edition' ? (e.label || 'EDITION') + ' / ' + (e.prefix || 'ID') + '-' + (e.serial || '001') : key === 'name' ? state.name || 'NOVA' : state[key];
  }
  art.querySelectorAll('[data-format-item]').forEach(el => el.hidden = !state.formats[el.dataset.formatItem]);

  renderBadges(view);
  renderCodes(view);
  effects(view);
  applyStudioTypography(view);
  renderEdgeContent(view);
  drawBorderMotion(view);
  measure(view);
  draw(view);
}

// Draws one frame of a visible view: narrative, text and border motion, the canvas artwork, and
// the playback readouts. Everything here is a function of the state and the motion clock.
export function draw(view) {
  if (view.section.hidden || !view.w) return;
  const v = state.variants[view.key], np = studioNarrativePose(state.time, state.introDuration, state.narrative), p = np.geometry, t = motionClock.elapsed, a = t / 12 * Math.PI * 2;
  // A separate OBS layer draws only its own part.
  if (studioLayerConfig?.layer === 'borders') { drawBorderMotion(view); return; }
  drawStudioNarrative(view, np);
  if (studioLayerConfig?.layer === 'effects') return;
  view.canvas.style.opacity = .68 + .32 * p;
  drawInformationMotion(view);
  drawBorderMotion(view);

  // The name block starts centred and enlarged, and moves into place during the intro.
  const dx = (view.w * .5 - (view.stack.offsetLeft + view.stack.offsetWidth * .5)) * (1 - np.titleMove), dy = (view.h * (state.ratio === 'portrait' ? .42 : .48) - (view.stack.offsetTop + view.stack.offsetHeight * .5)) * (1 - np.titleMove);
  view.stack.style.transform = `translate(${dx}px,${dy}px) scale(${1 + .48 * (1 - np.titleMove)})`;

  const e = v.effects, move = e.gradientMotion && !reduced.matches ? 1 : 0;
  view.art.style.setProperty('--wash-x', Math.sin(a) * 1.7 * move + '%');
  view.art.style.setProperty('--wash-y', Math.cos(a) * 1.2 * move + '%');
  const parallax = v.parallax && !reduced.matches ? 1 : 0;
  view.art.querySelector('.character-layer').style.transform = `translate(${view.sx * view.w * .008 * parallax}px,${(Math.sin(a * 2) * view.h * .003 + view.sy * view.h * .005) * parallax}px) scale(${v.modelScale})`;
  view.art.querySelector('.portrait-layer').style.transform = view.key === 'dual' ? `translateY(${Math.sin(a) * view.h * .003 * parallax}px)` : `translateY(${Math.sin(a) * view.h * .006 * parallax}px) rotate(${-4 + Math.sin(a) * parallax}deg)`;

  paintExploration(view.ctx, view.w, view.h, t, view.key, {
    ...v,
    transparent: root.classList.contains('is-transparent-output'),
    ringTime: motionClock.rings[view.key],
    introProgress: p,
    ringStyle: v.geometryBySeries[state.series],
    intensity: clamp(v.gridOpacity * 10, .05, 1.5),
    pattern: v.grid ? v.pattern : 'none',
    portrait: state.ratio === 'portrait',
    swapped: state.swapped,
    motion: true,
    shadow: e.shadowEnabled && v.shadows.geometry,
    shadowStyle: e.shadowStyle,
    shadowStrength: e.shadowStrength,
    shadowDepth: e.shadowDepth,
    shadowColor: e.shadowColor,
    floor: e.shadowEnabled && v.shadows.floor,
    px: view.sx * parallax,
    py: view.sy * parallax,
  });

  // Playback readouts change every frame, so they are written here rather than rendered by React.
  const continuous = studioContinuousShow(state.narrative), showing = state.time >= state.introDuration;
  const seek = view.section.querySelector('[data-seek]');
  seek.value = state.time;
  seek.setAttribute('aria-valuetext', continuous && showing ? '展示页持续播放，拖动可预览入场' : state.time.toFixed(1) + ' 秒，' + ({ intro: '引入', show: '展示', outro: '片尾' }[studioPhase(state.time, state.introDuration, state.narrative)]));
  view.section.querySelector('[data-time]').textContent = continuous && showing ? Math.max(0, motionClock.elapsed - state.introDuration).toFixed(1) + ' s / ∞' : state.time.toFixed(1).padStart(4, '0') + ' / ' + studioTotalDuration(state.introDuration, state.narrative).toFixed(1) + ' s';
  const phase = np.story?.active ? (np.story.main > 0 ? '转入主展示' : np.story.role === 'character' ? '第一幕 · 角色镜头' : '第二幕 · 作者镜头') : { intro: '引入 · 连续过渡', show: continuous ? '展示 · 持续播放' : '展示 · 连续动态', outro: '片尾 · 品牌落版' }[studioPhase(state.time, state.introDuration, state.narrative)];
  if (root.querySelector('[data-phase]').textContent !== phase) root.querySelector('[data-phase]').textContent = phase;
}
