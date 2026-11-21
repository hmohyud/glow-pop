/* Model Pops Label Studio
 *
 * One design model (JSON) -> one SVG renderer (buildDesign). The inline SVG on screen, the print PDF,
 * the SVG and PNG exports and the 3D mockup texture all come from that same markup, so what you see
 * is exactly the file you send. Every word is live vector type; the pop is the real product picture.
 *
 * Classic script on purpose: it has to work when index.html is double-clicked (file://).
 */
(function () {
  'use strict';

  /* =========================================================================================
   * 0. Small helpers
   * ======================================================================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PT = 25.4 / 72;                                   // millimetres per point
  const MM_PX = 96 / 25.4;                                // CSS px per mm at 100 %
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const n = (v, p = 3) => { const k = Math.pow(10, p); const r = Math.round(v * k) / k; return Object.is(r, -0) ? 0 : r; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = p => p + '-' + Math.random().toString(36).slice(2, 9);
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
  function debounce(fn, ms) { let t; const d = function () { clearTimeout(t); t = setTimeout(fn, ms); }; d.flush = () => { clearTimeout(t); fn(); }; return d; }
  function deepMerge(base, over) {
    if (!isObj(over)) return base;
    for (const k of Object.keys(over)) {
      if (isObj(base[k]) && isObj(over[k])) deepMerge(base[k], over[k]);
      else if (over[k] !== undefined) base[k] = clone(over[k]);
    }
    return base;
  }
  function slug(s) {
    return String(s || 'design').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'design';
  }
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hexToRgb(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return [0, 0, 0]; const v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function normHex(v) { v = String(v || '').trim(); if (/^#?[0-9a-f]{3}$/i.test(v)) { v = v.replace('#', ''); v = '#' + v.split('').map(c => c + c).join(''); } if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v; return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null; }
  function bytesToB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function utf8ToB64(str) { return bytesToB64(new TextEncoder().encode(str)); }
  function dataURLtoBlob(url) {
    const i = url.indexOf(','); const meta = url.slice(5, i); const isB64 = /;base64/i.test(meta);
    const type = meta.split(';')[0] || 'application/octet-stream';
    if (!isB64) return new Blob([decodeURIComponent(url.slice(i + 1))], { type });
    const bin = atob(url.slice(i + 1)); const u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    return new Blob([u8], { type });
  }
  function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Could not read that picture')); im.src = src; }); }
  function readFile(file, as = 'dataURL') {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); as === 'text' ? r.readAsText(file) : r.readAsDataURL(file); });
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 20000);
  }
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

  /* =========================================================================================
   * 1. Icons (uniform outlined line icons, never emoji)
   * ======================================================================================= */
  const ICONS = {
    pop: '<circle cx="12" cy="8.6" r="5.6"/><path d="M12 14.2V22"/><path d="M8.6 6.6c1.3-1.4 3.6-1.7 5.2-.5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    folder: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    save: '<path d="M12 4v10.5"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
    export: '<path d="M12 14.5V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13.5v5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-5"/>',
    minus: '<path d="M5.5 12h13"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    fit: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    bleed: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke-dasharray="2.6 2.4"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
    safe: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><rect x="7.5" y="7.5" width="9" height="9" rx="1" stroke-dasharray="2 2"/>',
    seal: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M5 7.5h14M5 16.5h14"/>',
    compare: '<rect x="3.5" y="4.5" width="7" height="15" rx="1.5"/><rect x="13.5" y="4.5" width="7" height="15" rx="1.5"/>',
    cube: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3.5 3.5l17 17"/><path d="M10.4 5.6c.5-.1 1-.1 1.6-.1 6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-2.7 3.5M6.7 6.8C4.1 8.5 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3.1-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    text: '<path d="M5.5 7V5h13v2M12 5v14M9 19h6"/>',
    logo: '<path d="M5 18V6.5l7 8 7-8V18"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-9.7A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5c0 5.3-7.5 9.7-7.5 9.7z"/>',
    sparkle: '<path d="M12 3.5c.6 4.3 3.2 6.9 7.5 7.5-4.3.6-6.9 3.2-7.5 7.5-.6-4.3-3.2-6.9-7.5-7.5 4.3-.6 6.9-3.2 7.5-7.5z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="m20.5 16-5-5-9 8.5"/>',
    background: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M3.5 13.5c3.5-2.6 6.5-2.6 8.5 0s5 2.6 8.5 0"/>',
    upload: '<path d="M12 16V4.5"/><path d="m7.5 9 4.5-4.5L16.5 9"/><path d="M5 19.5h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    up: '<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>',
    down: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
    shuffle: '<path d="M4 7h3c4.5 0 5 10 9.5 10H20M4 17h3c1.5 0 2.5-1.1 3.3-2.8M16.5 7c-1.5 0-2.5 1.1-3.3 2.8M16.5 7H20M17.6 4.6 20 7l-2.4 2.4M17.6 14.6 20 17l-2.4 2.4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4.5 20.5 19h-17z"/><path d="M12 10v4M12 16.8h.01"/>',
    center: '<path d="M12 3.5v17M8 8h8M6 12.5h12M8.5 17h7"/>',
    pdf: '<path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4"/><path d="M9 12.5h6M9 15.5h6M9 18.5h3.5"/>',
    svg: '<path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4"/><path d="m10 12-2 2.5 2 2.5M14 12l2 2.5-2 2.5"/>',
    png: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="m20.5 15.5-4.5-4.5-8 8.5"/>',
    json: '<path d="M9 4.5c-2 0-2.5 1-2.5 2.5v2c0 1.5-.8 2.5-2 3 1.2.5 2 1.5 2 3v2c0 1.5.5 2.5 2.5 2.5M15 4.5c2 0 2.5 1 2.5 2.5v2c0 1.5.8 2.5 2 3-1.2.5-2 1.5-2 3v2c0 1.5-.5 2.5-2.5 2.5"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7.5" rx="1.5"/><path d="M7 14h10v6H7z"/>',
    wand: '<path d="m4 20 10.5-10.5M13 5.5V3M18.5 11H21M16.8 7.2l1.7-1.7M13 9l2 2"/>',
    table: '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M4 8h16M4 12h16M4 16h16M14 8v12.5"/>',
    dieline: '<rect x="3.5" y="5.5" width="17" height="13" rx="1" stroke-dasharray="3 2.2"/><path d="M8.5 5.5v13M15.5 5.5v13"/>',
    layout: '<rect x="2.5" y="6" width="5.5" height="12" rx="1"/><rect x="9.25" y="6" width="5.5" height="12" rx="1"/><rect x="16" y="6" width="5.5" height="12" rx="1"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.5H8"/>',
    arrowL: '<path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>',
    arrowR: '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
    // AI on your GPU (gpu.js)
    chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx=".8"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l.9 12.2h8.6L17.2 7"/><path d="M10.2 10.5v5.5M13.8 10.5v5.5"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  };
  function icon(name, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; }

  /* =========================================================================================
   * 2. Fonts (Google Fonts only), formats, colours
   * ======================================================================================= */
  const FONTS = [
    { id: 'bodoni', family: 'Bodoni Moda', kind: 'Didone serif', group: 'Serif', spec: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900', vw: [400, 900], italic: true, opsz: true, generic: 'serif' },
    { id: 'playfair', family: 'Playfair Display', kind: 'Display serif', group: 'Serif', spec: 'Playfair+Display:ital,wght@0,400..900;1,400..900', vw: [400, 900], italic: true, generic: 'serif' },
    { id: 'dmserif', family: 'DM Serif Display', kind: 'Soft Didone', group: 'Serif', spec: 'DM+Serif+Display:ital@0;1', sw: [400], italic: true, generic: 'serif' },
    { id: 'italiana', family: 'Italiana', kind: 'Hairline Didone', group: 'Serif', spec: 'Italiana', sw: [400], italic: false, generic: 'serif' },
    { id: 'cormorant', family: 'Cormorant Garamond', kind: 'Garamond', group: 'Serif', spec: 'Cormorant+Garamond:ital,wght@0,300..700;1,300..700', vw: [300, 700], italic: true, generic: 'serif' },
    { id: 'poppins', family: 'Poppins', kind: 'Geometric sans', group: 'Sans', spec: 'Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700', sw: [300, 400, 500, 600, 700, 800, 900], swi: [400, 500, 600, 700], italic: true, generic: 'sans-serif' },
    { id: 'figtree', family: 'Figtree', kind: 'Friendly sans', group: 'Sans', spec: 'Figtree:ital,wght@0,300..900;1,300..900', vw: [300, 900], italic: true, generic: 'sans-serif' },
    { id: 'montserrat', family: 'Montserrat', kind: 'Wide sans', group: 'Sans', spec: 'Montserrat:ital,wght@0,100..900;1,100..900', vw: [300, 900], italic: true, generic: 'sans-serif' },
    { id: 'nunito', family: 'Nunito', kind: 'Rounded sans', group: 'Sans', spec: 'Nunito:ital,wght@0,200..1000;1,200..1000', vw: [300, 1000], italic: true, generic: 'sans-serif' },
    // clean, Arial-metric sans for the Supplement Facts panel and the back-panel words (like the client's label)
    { id: 'arimo', family: 'Arimo', kind: 'Clean sans (facts)', group: 'Sans', spec: 'Arimo:ital,wght@0,400..700;1,400..700', vw: [400, 700], italic: true, generic: 'sans-serif' },
    { id: 'greatvibes', family: 'Great Vibes', kind: 'Script', group: 'Script', spec: 'Great+Vibes', sw: [400], italic: false, generic: 'cursive' },
  ];
  const FONT = {}; FONTS.forEach(f => { FONT[f.id] = f; });
  const fontOf = id => FONT[id] || FONT.poppins;
  const fontStack = f => "'" + f.family + "', " + f.generic;
  const fontCSSURL = f => 'https://fonts.googleapis.com/css2?family=' + f.spec + '&display=swap';
  const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black', 1000: 'Ultra' };
  function weightsOf(f, italic) {
    if (f.vw) { const out = []; for (let w = 100; w <= 1000; w += 100) if (w >= f.vw[0] && w <= f.vw[1]) out.push(w); return out; }
    return (italic && f.swi) ? f.swi : f.sw;
  }
  function nearestWeight(f, w, italic) { const ws = weightsOf(f, italic); return ws.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a, ws[0]); }

  // Names only: every size, seal, zip, notch and gusset comes from window.MPItems (items.js), the one source of
  // truth for the 2D guides, the print layout and the 3D pack. A design keeps only its own edits to those numbers.
  const FORMATS = {
    wrapper: { label: 'Single-pop wrapper', short: 'Wrapper', slug: 'single-wrapper', mock: 'wrapper', guides: 'Seals' },
    bag: { label: 'Stand-up bag', short: 'Bag', slug: 'standup-bag', mock: 'bag', guides: 'Seals / zip' },
    sleeve3: { label: '3-pack sleeve', short: '3-pack', slug: '3pack-sleeve', mock: 'sleeve3', guides: '' },
  };
  const SIDES = { front: 'Front', back: 'Back' };
  const INTERIM_NOTE = 'from your drafts: replace with the printer’s dieline';
  function itemsReady() { return !!(window.MPItems && window.MPItems.wrapper && window.MPItems.bag); }
  // the plain numbers of an MPItems entry (functions and descriptions stay in items.js)
  function specDefaults(fmt) {
    const it = window.MPItems[fmt] || window.MPItems.wrapper;
    const s = JSON.parse(JSON.stringify(it));
    ['label', 'construction', 'interim', 'source', 'sides'].forEach(k => { delete s[k]; });
    return s;
  }
  // the effective spec of a design: the draft values from items.js plus the design's own edits
  function specOf(m) { return deepMerge(specDefaults(m.format), m.specEdits || {}); }
  // the entry handed to the 3D pack (MPMockup setSpec): the MPItems entry itself (its web() etc.) with the edits
  function specFor3D(m) { return Object.assign({}, window.MPItems[m.format], clone(specOf(m))); }
  // trim / bleed / safe are kept on the model as mirrors of the spec (the renderer reads them everywhere)
  function syncSpec(m) {
    const s = specOf(m);
    m.trim = { w: Number(s.flat.w), h: Number(s.flat.h) }; m.bleed = Number(s.bleed); m.safe = Number(s.safe);
    return s;
  }
  // the print web of a flow wrap, from MPItems.wrapper.web() run on the design's own numbers
  function wrapperWeb(m) { return window.MPItems.wrapper.web.call(specOf(m)); }
  // Item-spec fields shown (and editable) in the Format panel. [path, label, unit, step, min, max]
  const SPEC_FIELDS = {
    wrapper: [['flat.w', 'Flat width', 'mm', 0.5, 20, 400], ['flat.h', 'Flat height', 'mm', 0.5, 20, 600],
      ['endSeal.top', 'End seal top', 'mm', 0.1, 0, 40], ['endSeal.bottom', 'End seal bottom', 'mm', 0.1, 0, 40], ['endSeal.ribs', 'Ribs per seal', '', 1, 0, 30],
      ['finSeal.width', 'Fin seal (back)', 'mm', 0.5, 0, 30], ['finSeal.clear', 'Fin keep-clear', 'mm', 0.5, 0, 15], ['bulge', 'Body pull-in (3D)', '×', 0.01, 0, 0.3],
      ['bleed', 'Bleed', 'mm', 0.5, 0, 10], ['safe', 'Safe', 'mm', 0.5, 0, 30]],
    bag: [['flat.w', 'Flat width', 'mm', 0.5, 20, 600], ['flat.h', 'Flat height', 'mm', 0.5, 20, 800],
      ['cornerRadius', 'Top corner radius', 'mm', 0.1, 0, 40], ['topSeal', 'Top seal', 'mm', 0.5, 0, 40],
      ['zip.top', 'Zip from top', 'mm', 0.1, 0, 200], ['zip.bottom', 'Zip to', 'mm', 0.1, 0, 200],
      ['tearNotch.fromTop', 'Tear notch', 'mm', 0.1, 0, 200], ['tearNotch.depth', 'Notch depth', 'mm', 0.1, 0, 20],
      ['sideSeal', 'Side seals', 'mm', 0.5, 0, 30], ['gusset.depth', 'Bottom gusset', 'mm', 0.5, 0, 200],
      ['bleed', 'Bleed', 'mm', 0.5, 0, 10], ['safe', 'Safe', 'mm', 0.5, 0, 30]],
    sleeve3: [['flat.w', 'Flat width', 'mm', 0.5, 20, 600], ['flat.h', 'Flat height', 'mm', 0.5, 20, 600], ['depth', 'Depth', 'mm', 0.5, 0, 200],
      ['bleed', 'Bleed', 'mm', 0.5, 0, 10], ['safe', 'Safe', 'mm', 0.5, 0, 30]],
  };

  const SWATCHES = [
    ['#de0a66', 'Hot pink'], ['#f25c9b', 'Bag pink'], ['#f9b1d3', 'Blush'], ['#fbc2dc', 'Petal'], ['#b0105a', 'Raspberry'], ['#8a0b45', 'Deep raspberry'],
    ['#ffffff', 'White'], ['#f7efdd', 'Cream'], ['#f2d98a', 'Pale gold'], ['#f4b622', 'Gold'],
    ['#13843f', 'Emerald'], ['#0f5a2c', 'Deep green'], ['#2fa84f', 'Leaf'], ['#c8f07a', 'Lime'], ['#e6f7c6', 'Pale lime'], ['#2a2125', 'Ink'],
  ];
  // The client's pictures. `flat`: the same draft unwarped onto the flat panel (its filled-pack bulge taken out,
  // measured with code), so it can be laid exactly over the design in Compare (overlay / difference).
  const REFS = {
    wrapper: { src: 'assets/ref/individual-wrapper-current.png', flat: 'assets/ref/individual-wrapper-current-flat.png', format: 'wrapper', label: 'Current single wrapper (client draft)' },
    bag: { src: 'assets/ref/bag-100g-current.png', flat: 'assets/ref/bag-100g-current-flat.png', format: 'bag', label: 'Current 100 g bag (client draft)' },
    greenbag: { src: 'assets/ref/green-bag-draft-top.png', label: 'Client draft: green bag (top crop)' },
    backlabel: { src: 'assets/ref/back-label-current.png', label: 'Client’s new back label (photo)' },
  };

  const EL_INFO = {
    logo: { label: 'Logo', icon: 'logo' },
    badge: { label: 'Heart badge', icon: 'heart' },
    productLine: { label: 'Product line', icon: 'text' },
    tagline: { label: 'Tagline', icon: 'text' },
    count: { label: 'Count', icon: 'text' },
    flavor: { label: 'Flavour', icon: 'text' },
    identity: { label: 'Statement of identity', icon: 'text' },
    netWeight: { label: 'Net weight', icon: 'text' },
    pop: { label: 'The pop', icon: 'pop' },
    backTitle: { label: 'Brand line', icon: 'text' },
    backTagline: { label: 'Tagline', icon: 'text' },
    facts: { label: 'Supplement Facts', icon: 'table' },
    ingredients: { label: 'Ingredients', icon: 'text' },
    claims: { label: 'Claims', icon: 'check' },
    warning: { label: 'Warning', icon: 'alert' },
  };
  const SVG_IDS = { logo: 'logo', badge: 'heart-badge', productLine: 'product-line', tagline: 'tagline', count: 'count', flavor: 'flavour', identity: 'statement-of-identity', netWeight: 'net-weight', pop: 'pop',
    backTitle: 'brand-line', backTagline: 'back-tagline', facts: 'supplement-facts', ingredients: 'ingredients', claims: 'claims', warning: 'warning' };
  const TEXT_KEYS = ['productLine', 'tagline', 'count', 'flavor', 'identity', 'netWeight', 'backTitle', 'backTagline'];
  const BLOCK_KEYS = ['facts', 'ingredients', 'claims', 'warning'];    // back-panel blocks (a box, rules, wrapped words)
  const DEFAULT_ORDER = ['pop', 'badge', 'productLine', 'tagline', 'count', 'flavor', 'identity', 'netWeight', 'logo'];
  const BACK_ORDER = ['facts', 'ingredients', 'claims', 'warning', 'backTitle', 'backTagline'];
  const ORDERS = { front: DEFAULT_ORDER, back: BACK_ORDER };

  // The client's own new back label (photo, 2026-11-20), word for word. Never edited here: the studio copies it.
  const LABEL = {
    title: 'MODEL POPS', tagline: 'Your supermodel routine',
    servings: '1',
    rows: [
      { name: 'Calories', amount: '16', dv: '', indent: 0, rule: 'hair' },
      { name: 'Total Carbohydrate', amount: '8 g', dv: '3%', indent: 0, rule: 'hair' },
      { name: 'Total Sugars', amount: '0 g', dv: '†', indent: 1, rule: 'hair' },
      { name: 'Includes 0 g Added Sugars', amount: '', dv: '0%', indent: 2, rule: 'hair' },
      { name: 'Sugar Alcohol (Isomalt)', amount: '8 g', dv: '†', indent: 1, rule: 'hair' },
      { name: 'Protein', amount: '0.5 g', dv: '1%', indent: 0, rule: 'hair' },
      { name: 'Vitamin C (as Ascorbic Acid)', amount: '60 mg', dv: '67%', indent: 0, rule: 'hair' },
      { name: 'Biotin (Vitamin B7)', amount: '5,000 mcg', dv: '16,667%', indent: 0, rule: 'bar' },
      { name: 'Hydrolyzed Collagen Peptides\n(Types I and III)', amount: '500 mg', dv: '†', indent: 0, rule: 'hair' },
      { name: 'Hyaluronic Acid', amount: '10 mg', dv: '†', indent: 0, rule: 'bar' },
    ],
    footnote: '† Daily Value not established.',
    ingredients: 'Isomalt, Hydrolyzed Collagen Peptides (Type I & III), Ascorbic Acid, Hyaluronic Acid, Citric Acid, DL-Malic Acid, Natural Strawberry Flavor, Natural Color (Beet Root Powder), Stevia Leaf Extract, Lecithin.',
    claims: 'GMO FREE\nSugar Free · Gluten Free',
    zinc: 'Zinc Free',
    warning: 'WARNING: Biotin may interfere with certain laboratory test results. If you are pregnant, nursing, taking medication, have a medical condition, or are scheduled for lab tests, consult your healthcare practitioner before use.\nCHOKING HAZARD: Small parts. Not for children under 3 years of age.\nKEEP OUT OF REACH OF CHILDREN.',
  };
  const BACK = { pink: '#f74293', warnBox: '#fff2f9', warnInk: '#4a0923', ink: '#000000' };

  // shapes, all centred on 0,0 (heart: width 1, height 0.89 / sparkle: radius 1)
  const HEART_D = 'M0,0.44C-0.05,0.415 -0.5,0.17 -0.5,-0.16C-0.5,-0.345 -0.37,-0.45 -0.225,-0.45C-0.115,-0.45 -0.035,-0.385 0,-0.29C0.035,-0.385 0.115,-0.45 0.225,-0.45C0.37,-0.45 0.5,-0.345 0.5,-0.16C0.5,0.17 0.05,0.415 0,0.44Z';
  const HEART_H = 0.89;
  const SPARKLE_D = 'M0,-1C0.09,-0.36 0.36,-0.09 1,0C0.36,0.09 0.09,0.36 0,1C-0.09,0.36 -0.36,0.09 -1,0C-0.36,-0.09 -0.09,-0.36 0,-1Z';
  // the wrapper draft's stars: fuller arms (the waist at 0.47 of the tip radius instead of 0.42)
  const SPARKLE_PLUMP_D = 'M0,-1C0.14,-0.42 0.42,-0.14 1,0C0.42,0.14 0.14,0.42 0,1C-0.14,0.42 -0.42,0.14 -1,0C-0.42,-0.14 -0.14,-0.42 0,-1Z';

  /* =========================================================================================
   * 3. Assets (bundled pops as data URLs + uploads)
   * ======================================================================================= */
  const ASSETS = {};
  const BUNDLED = new Set();
  function registerAsset(a) {
    ASSETS[a.id] = Object.assign({ kind: 'image', name: a.id }, a);
    return ASSETS[a.id];
  }
  function assetHref(id, mode) {
    const a = ASSETS[id]; if (!a) return '';
    if (mode === 'data') return a.src;
    if (!a.blob) { try { a.blob = URL.createObjectURL(dataURLtoBlob(a.src)); } catch (e) { a.blob = a.src; } }
    return a.blob;
  }
  async function imageSize(src) {
    const im = await loadImage(src);
    let w = im.naturalWidth, h = im.naturalHeight;
    if ((!w || !h) && /^data:image\/svg/i.test(src)) {
      try { const txt = /;base64,/i.test(src) ? new TextDecoder().decode(Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0))) : decodeURIComponent(src.split(',')[1]); const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(txt); if (vb) { w = +vb[1]; h = +vb[2]; } } catch (e) { /* ignore */ }
    }
    return { w: w || 300, h: h || 150 };
  }
  function isPinkBundled(id) { return id === 'pop-gold' || id === 'pop-white'; }

  /* =========================================================================================
   * 4. Design model, defaults and presets
   * ======================================================================================= */
  function textEl(o) {
    return Object.assign({ visible: true, text: '', font: 'poppins', weight: 500, italic: false, size: 8, color: '#b0105a', align: 'center', tracking: 0, leading: 1.15, x: 40, y: 100, pill: false, pillColor: '#ffffff' }, o || {});
  }
  function blankBg(c1, c2, W, H) {
    return {
      mode: 'solid', c1, c2,
      wave: { y: H * 0.5, depth: 8, center: 0.5, tilt: 0 },
      image: { src: null, zoom: 1, ox: 0, oy: 0 },
      // clear: no pattern shape sits behind the logo or the words (like the client's bag). points: hearts placed
      // exactly as on a draft (u, v in panel fractions, s = size factor); empty = a scattered pattern from the seed
      pattern: { kind: 'none', color: '#ffffff', opacity: 0.25, size: 6, spacing: 18, seed: 7, jitter: 0.45, clear: true, points: [] },
    };
  }
  function blankFront(W, H) {
    return {
      bg: Object.assign(blankBg('#de0a66', '#f9b1d3', W, H), { ribs: true, ribStrength: 1 }),
      els: {
        logo: { visible: true, style: 'wrapper', text: 'MODEL\nPOPS', font: 'bodoni', weight: 500, italic: false, opsz: 20, size: 36, tracking: 10, leading: 0.84, align: 'center', indent: 0, x: W / 2, y: H * 0.22, fill: 'white', fillColor: '#ffffff', sparkles: { on: true, layout: 'mirror', shape: 'slim', color: '#f2d98a', scale: 1, spread: 1, points: [] }, upload: { src: null, w: W * 0.6 } },
        badge: { visible: true, text: 'COLLAGEN\nPEPTIDES', font: 'poppins', weight: 600, italic: false, size: 6, color: '#b0105a', tracking: 0, leading: 1.18, heartColor: '#fbc2dc', w: 22, x: W * 0.75, y: H * 0.42, rotate: 0, shadow: true },
        productLine: textEl({ visible: false, text: 'COLLAGEN\nLOLLIPOPS', weight: 700, size: 24, align: 'left', x: 10, y: H * 0.5, leading: 0.9 }),
        tagline: textEl({ visible: false, text: 'Your supermodel routine', weight: 500, size: 8, x: W / 2, y: H * 0.6 }),
        // no count was supplied by the client: a visible blank (___) to fill in, never an invented number
        count: textEl({ visible: false, text: '___ LOLLIPOPS', weight: 600, size: 8, tracking: 120, x: W / 2, y: H * 0.7 }),
        flavor: textEl({ text: 'Strawberry', weight: 600, size: 10, x: W / 2, y: H * 0.8 }),
        identity: textEl({ text: 'Dietary Supplement', weight: 500, size: 7, x: W / 2, y: H * 0.85 }),
        netWeight: textEl({ text: '', grams: 10, auto: true, weight: 500, size: 7, x: W / 2, y: H * 0.89 }),
        pop: { visible: true, src: 'pop-gold', x: W / 2, y: H * 0.3, h: H * 0.45, repeat: 1, gap: 2, shadow: { on: true, opacity: 0.26, blur: 1.1, dx: 0.9, dy: 1.4, color: '#3d0a1f' } },
      },
      order: DEFAULT_ORDER.slice(),
    };
  }
  // The back: the client's own back label (MODEL POPS / Your supermodel routine, Supplement Facts, Ingredients,
  // claims, Warning), rebuilt as vector type. `servings` null leaves Servings Per Container blank (a flagged ___).
  // Sizes are in pt and positions in mm, proportioned like the client's label for the panel's width.
  // Back layouts per format, at the item spec's draft size (mm / pt): the client's label stacked in its own order
  // (brand, facts, ingredients, claims, warning), clear of the seals and the zip, with equal gaps (fitted from the
  // real block heights: .studio-qa/fix2/backfit.mjs). The wrapper's keeps the type that matters clear of every
  // place the fin seal can lie (finBand: 22.5-42.5 mm while the fold side is not known): the facts names left of
  // it and the numbers right; the ingredients, claims and warning in a column either side; the brand line stacked
  // in the column left of it (MODEL POPS over the tagline, as on the client's label).
  const BACK_LAYOUT = {
    wrapper: { at: [65, 127], title: [7, 11.71], tag: [4.4, 14.46], titleX: 12.85, tagX: 12.85, facts: { x: 3.2, y: 17.41, w: 58.6, size: 4.6, titleSize: 6, leading: 1.42 },
      ing: { x: 3.6, y: 65.28, w: 57.8, size: 5.8, headSize: 7.2, leading: 1.22 }, claims: { y: 94.33, size: 7.4, size2: 5.8 }, warn: { x: 3.2, y: 99.61, w: 58.6, size: 4.4, leading: 1.08 } },
    bag: { at: [150, 189.2], title: [15, 40.52], tag: [12.5, 47.37], facts: { x: 27, y: 53.77, w: 96, size: 7.6, titleSize: 12, leading: 1.4 },
      ing: { x: 27, y: 120.58, w: 96, size: 8.6, headSize: 11.5, leading: 1.24 }, claims: { y: 150.78, size: 12, size2: 9.5 }, warn: { x: 27, y: 161.45, w: 96, size: 7.2, leading: 1.1 } },
    sleeve3: { at: [165, 110], title: [11, 13.5], tag: [9, 19.5], titleX: 123.5, facts: { x: 8, y: 14, w: 72, size: 6.6, titleSize: 10, leading: 1.45 },
      ing: { x: 90, y: 26, w: 67, size: 6.6, headSize: 8.4, leading: 1.24 }, claims: { x: 123.5, y: 62, size: 8.6, size2: 6.8 }, warn: { x: 90, y: 82, w: 67, size: 5.4, leading: 1.1 } },
  };
  function blankBack(fmt, W, H, servings) {
    const Lb = BACK_LAYOUT[fmt] || BACK_LAYOUT.wrapper;
    const sx = W / Lb.at[0], sy = H / Lb.at[1], s = Math.min(sx, sy);    // (a design whose size differs from the draft's)
    const fc = fmt === 'wrapper';
    const facts = {
      visible: true, x: Lb.facts.x * sx, y: Lb.facts.y * sy, w: Lb.facts.w * sx, font: 'arimo', size: Lb.facts.size * s, color: BACK.ink, box: '#ffffff', line: BACK.ink,
      showTitle: true, title: 'Supplement Facts', titleSize: Lb.facts.titleSize * s,
      servingSizeOn: false, servingSize: 'Serving Size ___',
      servingsLabel: 'Servings Per Container', servings: servings == null ? '' : String(servings),
      showHead: true, headAmount: 'Amount Per Serving', headDV: '% Daily Value',
      rows: clone(LABEL.rows), footnote: LABEL.footnote, amountCol: 0.79, leading: Lb.facts.leading, finClear: fc,
    };
    const tx = (Lb.titleX || Lb.at[0] / 2) * sx, gx = (Lb.tagX || Lb.titleX || Lb.at[0] / 2) * sx;
    return {
      bg: Object.assign(blankBg(BACK.pink, '#f9b1d3', W, H), { ribs: true, ribStrength: 1 }),
      els: {
        backTitle: textEl({ text: LABEL.title, font: 'arimo', weight: 700, size: Lb.title[0] * s, color: '#ffffff', align: 'center', x: tx, y: Lb.title[1] * sy }),
        backTagline: textEl({ text: LABEL.tagline, font: 'arimo', weight: 700, size: Lb.tag[0] * s, color: '#ffffff', align: 'center', x: gx, y: Lb.tag[1] * sy }),
        facts,
        ingredients: { visible: true, x: Lb.ing.x * sx, y: Lb.ing.y * sy, w: Lb.ing.w * sx, font: 'montserrat', weight: 500, size: Lb.ing.size * s, leading: Lb.ing.leading, tracking: 30, color: '#ffffff',
          heading: 'Ingredients', headWeight: 700, headSize: Lb.ing.headSize * s, rule: true, text: LABEL.ingredients, finClear: fc },
        claims: { visible: true, x: (Lb.claims.x || Lb.at[0] / 2) * sx, y: Lb.claims.y * sy, font: 'montserrat', weight: 800, size: Lb.claims.size * s, size2: Lb.claims.size2 * s, leading: 1.25, color: '#ffffff', text: LABEL.claims, zinc: false, finClear: fc },
        warning: { visible: true, x: Lb.warn.x * sx, y: Lb.warn.y * sy, w: Lb.warn.w * sx, font: 'arimo', weight: 700, size: Lb.warn.size * s, leading: Lb.warn.leading, color: BACK.warnInk, box: true, boxColor: BACK.warnBox, text: LABEL.warning, finClear: fc },
      },
      order: BACK_ORDER.slice(),
    };
  }
  function blankModel(format) {
    const fmt = FORMATS[format] ? format : 'wrapper';
    const m = { app: 'model-pops-label-studio', version: 2, name: 'Untitled design', format: fmt, preset: null, theme: 'pink', ref: null, specEdits: {} };
    syncSpec(m);
    const W = m.trim.w, H = m.trim.h;
    // the per-bag count is not confirmed for the bag or the 3-pack, so their back leaves it blank (flagged)
    m.panels = { front: blankFront(W, H), back: blankBack(fmt, W, H, fmt === 'wrapper' ? '1' : null) };
    return m;
  }
  const OLD_TRIM = { wrapper: { w: 80, h: 120 }, bag: { w: 150, h: 190 }, sleeve3: { w: 165, h: 110 } };   // the placeholder formats of version 1
  // lost (optional): collects the pictures the design refers to that are not here any more. They are never
  // swapped for another picture: the slot is left empty (the editor shows an outline) and a notice asks for it.
  function normalizeModel(raw, lost) {
    raw = isObj(raw) ? clone(raw) : {};
    const fmt = FORMATS[raw.format] ? raw.format : 'wrapper';
    if (!isObj(raw.panels)) {
      // version 1: one front panel at the top level, on the old placeholder sizes. It becomes the front panel; a
      // standard trim moves onto the item spec (the layout moves with it), a custom trim stays as the design's edit.
      raw.panels = { front: { bg: raw.bg, els: raw.els, order: raw.order } };
      const old = raw.trim, std = OLD_TRIM[fmt];
      raw.specEdits = {};
      if (isObj(old) && std && !(Math.abs(old.w - std.w) < 0.01 && Math.abs(old.h - std.h) < 0.01)) raw.specEdits.flat = { w: Number(old.w), h: Number(old.h) };
      if (raw.bleed !== undefined && Number(raw.bleed) !== 3) raw.specEdits.bleed = Number(raw.bleed);
      raw._fromTrim = isObj(old) ? { w: Number(old.w), h: Number(old.h) } : null;
      delete raw.bg; delete raw.els; delete raw.order; delete raw.seal; delete raw.safe;
    }
    const m = blankModel(fmt);
    const keep = ['name', 'preset', 'theme', 'ref'];
    keep.forEach(k => { if (raw[k] !== undefined) m[k] = raw[k]; });
    m.specEdits = isObj(raw.specEdits) ? clone(raw.specEdits) : {};
    syncSpec(m);
    const W = m.trim.w, H = m.trim.h;
    if (m.trim.w !== blankModel(fmt).trim.w || m.trim.h !== blankModel(fmt).trim.h) {
      m.panels = { front: blankFront(W, H), back: blankBack(fmt, W, H, fmt === 'wrapper' ? '1' : null) };
    }
    ['front', 'back'].forEach(side => {
      const P = isObj(raw.panels[side]) ? raw.panels[side] : null;
      if (!P) return;
      const base = m.panels[side];
      if (isObj(P.bg)) deepMerge(base.bg, P.bg);
      if (isObj(P.els)) Object.keys(base.els).forEach(k => { if (isObj(P.els[k])) deepMerge(base.els[k], P.els[k]); });
      // arrays are replaced whole, never merged item by item (the facts rows, the pattern points, the sparkles)
      if (isObj(P.els) && isObj(P.els.facts) && Array.isArray(P.els.facts.rows)) base.els.facts.rows = clone(P.els.facts.rows);
      if (isObj(P.bg) && isObj(P.bg.pattern) && Array.isArray(P.bg.pattern.points)) base.bg.pattern.points = clone(P.bg.pattern.points);
      if (isObj(P.els) && isObj(P.els.logo) && isObj(P.els.logo.sparkles) && Array.isArray(P.els.logo.sparkles.points)) base.els.logo.sparkles.points = clone(P.els.logo.sparkles.points);
      const known = new Set(ORDERS[side]);
      base.order = (Array.isArray(P.order) ? P.order : []).filter(k => known.has(k));
      ORDERS[side].forEach(k => { if (!base.order.includes(k)) base.order.push(k); });
    });
    if (raw._fromTrim && (Math.abs(raw._fromTrim.w - W) > 0.01 || Math.abs(raw._fromTrim.h - H) > 0.01)) remapPanel(m.panels.front, raw._fromTrim.w, raw._fromTrim.h, W, H);
    // saved on other item numbers (items.js has changed since, e.g. the bag 193.3 -> 189.2 mm): the layout moves onto
    // today's numbers, as the presets do
    else if (!raw._fromTrim && isObj(raw.trim) && Number(raw.trim.w) > 0 && Number(raw.trim.h) > 0 && (Math.abs(raw.trim.w - W) > 0.01 || Math.abs(raw.trim.h - H) > 0.01)) {
      ['front', 'back'].forEach(sd => remapPanel(m.panels[sd], Number(raw.trim.w), Number(raw.trim.h), W, H));
      m._movedFrom = { w: Number(raw.trim.w), h: Number(raw.trim.h) };
    }
    const F = m.panels.front;
    const gone = id => !!id && !ASSETS[id];
    if (gone(F.els.pop.src)) { if (lost) lost.pop = true; F.els.pop.src = null; }
    if (gone(F.bg.image.src)) { if (lost) lost.background = true; F.bg.image.src = null; }
    if (gone(F.els.logo.upload.src)) { if (lost) lost.logo = true; F.els.logo.upload.src = null; }
    if (gone(m.panels.back.bg.image.src)) { if (lost) lost.background = true; m.panels.back.bg.image.src = null; }
    return m;
  }

  // ---- presets: exact rebuilds of the client's two drafts (every element measured with code from the drafts,
  // .studio-qa/items2d/measure.py), the green versions on the same item specs, and the 3-pack ----
  const PINK = { hot: '#de0a66', blush: '#f9b1d3', rasp: '#b0105a', petal: '#fbc2dc', bag: '#f25c9b', bagText: '#b3084b', paleGold: '#f2d98a', cream: '#f7e5a2', gold: '#f4b622' };
  const GREEN = { emerald: '#13843f', bag: '#168a3a', paleLime: '#dcf2b0', lime: '#c8f07a', deep: '#0f5a2c', heart: '#ecf9d0' };
  // the 35 hearts of the 100 g bag draft: centre (u, v) as fractions of the flat panel, s = size / pattern size,
  // measured on the draft laid onto the flat panel through the 3D pack's own front-view geometry (fix2/build_flat.py)
  const BAG_HEARTS = [
    [0.83333, 0.03435, 0.974], [0.285, 0.03567, 0.974], [0.54833, 0.03831, 0.9425], [0.11, 0.06737, 1.0054], [0.42333, 0.07926, 1.0054],
    [0.70333, 0.07662, 0.974], [0.22, 0.1638, 1.0054], [0.56167, 0.16645, 0.9111], [0.42, 0.18362, 0.9425], [0.88333, 0.18362, 1.0368],
    [0.10167, 0.19022, 0.9111], [0.68667, 0.23514, 1.0054], [0.78167, 0.31176, 1.0682], [0.575, 0.34214, 1.0368], [0.43333, 0.37781, 1.0054],
    [0.07667, 0.38838, 1.0682], [0.9, 0.38838, 1.1311], [0.26333, 0.40687, 0.9425], [0.695, 0.40555, 0.974], [0.05167, 0.57199, 1.0682],
    [0.95833, 0.60502, 0.974], [0.57667, 0.70145, 0.9425], [0.83333, 0.70013, 1.0996], [0.085, 0.75826, 1.0682], [0.695, 0.75561, 1.0368],
    [0.44833, 0.77675, 1.0368], [0.89167, 0.7926, 1.1625], [0.23833, 0.80053, 1.0054], [0.585, 0.83487, 0.9425], [0.355, 0.84676, 0.9425],
    [0.78167, 0.85337, 0.974], [0.10833, 0.85601, 1.0054], [0.465, 0.95773, 0.9425], [0.185, 0.96697, 0.9425], [0.78667, 0.96565, 0.9425],
  ];
  // the logo's four sparkles as on each draft: [dx, dy, r] in units of the logo's cap height, from the logo anchor
  const WRAP_SPARKLES = [[-3.1351, -0.0984, 0.169], [-2.7048, 0.3166, 0.1433], [2.7509, 0.3166, 0.132], [3.1582, -0.1214, 0.1644]];
  const BAG_SPARKLES = [[-0.7287, -0.4007, 0.2428], [-0.4751, 0.0071, 0.1813], [4.8948, -0.522, 0.2108], [5.3138, -0.1031, 0.1838]];

  // The presets are fitted at the drafts' interim sizes (BACK_LAYOUT[fmt].at, the sizes items.js has today). If items.js
  // carries other numbers (the printer's dieline), the front layout is moved onto them, as the back's already is.
  function fitPreset(m) {
    const at = (BACK_LAYOUT[m.format] || {}).at;
    if (at && (Math.abs(m.trim.w - at[0]) > 1e-6 || Math.abs(m.trim.h - at[1]) > 1e-6)) remapPanel(m.panels.front, at[0], at[1], m.trim.w, m.trim.h);
    return m;
  }
  function presetWrapper(green) {
    const m = blankModel('wrapper');
    Object.assign(m, { name: green ? 'Green wrapper' : 'Current wrapper', preset: green ? 'green-wrapper' : 'wrapper', theme: green ? 'green' : 'pink', ref: green ? null : 'wrapper' });
    const F = m.panels.front; const ink = green ? GREEN.deep : PINK.rasp;
    // every position, size and spacing below is fitted to the client's draft (to within 0.4 % of the panel, about one
    // pixel of the draft; see the README): measured on the draft laid onto the flat panel through the 3D pack's own
    // front-view geometry, so the art wrapped onto the 3D pack gives the draft back (.studio-qa/fix2: build_flat.py, fit.py)
    F.bg = deepMerge(F.bg, { mode: 'two-tone', c1: green ? GREEN.emerald : PINK.hot, c2: green ? GREEN.paleLime : PINK.blush, wave: { y: 56.57, depth: 11.59, center: 0.6175, tilt: 2.65 }, pattern: { kind: 'none' }, ribs: true });
    deepMerge(F.els.logo, { style: 'wrapper', text: 'MODEL\nPOPS', font: 'playfair', weight: 600, italic: false, opsz: 16, size: 32.473, tracking: -18.79, tracking2: -0.45, leading: 0.8487, align: 'center', x: 32.5, y: 20.8, fill: 'white', sparkles: { on: true, layout: 'draft', shape: 'plump', color: PINK.cream, scale: 1, spread: 1 } });
    F.els.logo.sparkles.points = clone(WRAP_SPARKLES);
    deepMerge(F.els.badge, { visible: true, text: green ? 'GREEN\nSUPERFOOD' : 'COLLAGEN\nPEPTIDES', font: 'poppins', weight: 600, size: green ? 6.8 : 8.107, color: ink, tracking: green ? -10 : -6.74, tracking2: green ? -10 : -7.02, leading: 1.0874, ty: -0.866, heartColor: green ? GREEN.heart : PINK.petal, w: 18.522, x: 51.262, y: 39.928, rotate: 0, shadow: true });
    // green: no picture of the green pop exists yet, so the slot stays empty (an outline in the editor only)
    deepMerge(F.els.pop, { visible: true, src: green ? (state.greenPop || null) : 'pop-gold', x: 31.562, y: 35.399, h: 64.256, repeat: 1, shadow: { on: true, color: green ? '#0b3a1c' : '#3d0a1f' } });
    deepMerge(F.els.flavor, { visible: true, text: green ? 'Flavour ___' : 'Strawberry', font: 'montserrat', weight: 700, size: 13.131, tracking: -10.89, color: ink, align: 'center', x: 32.638, y: 104.387 });
    deepMerge(F.els.identity, { visible: true, text: 'Dietary Supplement', font: 'montserrat', weight: 600, size: 9.258, tracking: -26.38, color: ink, align: 'center', x: 32.575, y: 111.263 });
    deepMerge(F.els.netWeight, { visible: true, auto: true, grams: green ? '' : 10, font: 'montserrat', weight: 600, size: 9.475, tracking: -8.99, color: ink, align: 'center', x: 32.964, y: 115.792 });
    if (green) F.els.productLine.text = 'GREEN SUPERFOOD\nLOLLIPOPS';
    F.els.productLine.visible = false; F.els.tagline.visible = false; F.els.count.visible = false;
    if (green) greenBack(m.panels.back);
    return fitPreset(m);
  }
  function presetBag(green) {
    const m = blankModel('bag');
    Object.assign(m, { name: green ? 'Green bag' : 'Current bag', preset: green ? 'green-bag' : 'bag', theme: green ? 'green' : 'pink', ref: green ? 'greenbag' : 'bag' });
    const F = m.panels.front;
    // every position, size and spacing below is fitted to the client's draft (within 1 % of the panel; see the README);
    // the hearts sit exactly where the draft has them
    F.bg = deepMerge(F.bg, { mode: 'solid', c1: green ? GREEN.bag : PINK.bag, c2: green ? GREEN.paleLime : PINK.blush, ribs: false, pattern: { kind: 'hearts', color: green ? '#e4f9c2' : '#ffffff', opacity: green ? 0.14 : 0.24, size: 7.161, spacing: 22, seed: 11, jitter: 0.55, clear: !!green } });
    F.bg.pattern.points = green ? [] : clone(BAG_HEARTS);
    deepMerge(F.els.logo, { style: 'bag', text: 'MODEL\nPOPS', font: 'bodoni', weight: 600, italic: true, opsz: 22, size: 42.846, tracking: -14.68, tracking2: 13.88, leading: 0.8737, align: 'left', indent: -1.109, x: 20.511, y: 52.03, fill: 'white', sparkles: { on: true, layout: green ? 'diagonal' : 'draft', color: green ? PINK.paleGold : PINK.gold, scale: 1, spread: 1 } });
    F.els.logo.sparkles.points = green ? [] : clone(BAG_SPARKLES);
    F.els.badge.visible = false;
    // green: the client's draft words (GREEN SUPERFOOD LOLLIPOPS / DELICIOUS TASTE / 60 LOLLIPOPS) as a text
    // column on the left, and a tall slot for the real green pop on the right
    deepMerge(F.els.productLine, { visible: true, text: green ? 'GREEN\nSUPERFOOD\nLOLLIPOPS' : 'COLLAGEN\nLOLLIPOPS', font: 'poppins', weight: green ? 700 : 800, size: green ? 32 : 68.409, tracking: green ? -14 : -33.36, tracking2: green ? null : -21.3, leading: green ? 0.98 : 0.8829, indent: green ? 0 : 1.001, color: green ? GREEN.lime : PINK.bagText, align: 'left', x: 14.15, y: 102.38 });
    deepMerge(F.els.flavor, { visible: !green, text: green ? 'Flavour ___' : 'Strawberry', font: 'poppins', weight: 600, size: 24.47, tracking: 15.63, color: '#ffffff', align: 'left', x: 17.449, y: 133.87 });
    deepMerge(F.els.identity, { visible: true, text: 'Dietary Supplement', font: 'poppins', weight: 400, size: 13.461, tracking: -2.57, color: '#ffffff', align: 'left', x: 18.249, y: 173.7 });
    deepMerge(F.els.netWeight, { visible: true, auto: true, grams: green ? '' : 100, font: 'poppins', weight: 400, size: 13.461, tracking: 22, color: '#ffffff', align: 'right', x: 133.151, y: 174.075 });
    if (green) {
      deepMerge(F.els.productLine, { y: 87.6 });
      deepMerge(F.els.tagline, { visible: true, text: 'DELICIOUS TASTE', font: 'poppins', weight: 600, size: 13, tracking: 140, color: '#ffffff', align: 'left', x: 15.5, y: 128.2 });
      deepMerge(F.els.count, { visible: true, text: '60 LOLLIPOPS', font: 'poppins', weight: 600, size: 13, tracking: 140, color: '#ffffff', align: 'left', x: 15.5, y: 137.6 });
      deepMerge(F.els.pop, { visible: true, src: state.greenPop || null, x: 116, y: 44, h: 103.8, shadow: { on: true, color: '#0b3a1c' } });
      deepMerge(F.els.identity, { x: 18.249, y: 168.9 }); deepMerge(F.els.netWeight, { align: 'left', x: 18.249, y: 175 });
      greenBack(m.panels.back);
    } else {
      F.els.tagline.visible = false; F.els.count.visible = false; F.els.pop.visible = false;
    }
    return fitPreset(m);
  }
  // The green pop's facts are not the client's Collagen Boost label: its back keeps the same layout, but every
  // number and word that would describe the green pop is a blank to fill in (so its files say DRAFT).
  function greenBack(P) {
    P.bg.c1 = GREEN.bag;
    const f = P.els.facts;
    f.servings = '';
    f.rows = [{ name: 'Calories', amount: '___', dv: '', indent: 0, rule: 'hair' }, { name: '___', amount: '___', dv: '___', indent: 0, rule: 'bar' }];
    P.els.ingredients.text = '___';
    P.els.claims.text = '___';
    P.els.warning.text = 'WARNING: ___\nCHOKING HAZARD: Small parts. Not for children under 3 years of age.\nKEEP OUT OF REACH OF CHILDREN.';
    P.els.warning.color = GREEN.deep; P.els.warning.boxColor = '#f1fae3';
  }
  function presetSleeve() {
    const m = blankModel('sleeve3');
    Object.assign(m, { name: '3-pack sleeve', preset: 'sleeve3', theme: 'pink', ref: 'wrapper' });
    const F = m.panels.front;
    F.bg = deepMerge(F.bg, { mode: 'two-tone', c1: PINK.hot, c2: PINK.blush, ribs: false, wave: { y: 58, depth: 9, center: 0.6, tilt: -4 }, pattern: { kind: 'none' } });
    deepMerge(F.els.logo, { style: 'wrapper', text: 'MODEL\nPOPS', font: 'bodoni', weight: 500, italic: false, opsz: 18, size: 36, tracking: 6, leading: 0.82, align: 'center', x: 43, y: 30.5, fill: 'white', sparkles: { on: true, layout: 'mirror', color: PINK.paleGold, scale: 1, spread: 1 } });
    deepMerge(F.els.badge, { visible: true, text: 'COLLAGEN\nPEPTIDES', font: 'poppins', weight: 600, size: 7.2, color: PINK.rasp, heartColor: PINK.petal, w: 22, x: 148.5, y: 20.4, shadow: true });
    deepMerge(F.els.pop, { visible: true, src: 'pop-gold', x: 111, y: 30.5, h: 56, repeat: 3, gap: -4, shadow: { on: true } });
    // the count and the weight of a 3-pack were never supplied: blanks (___) to fill in
    deepMerge(F.els.count, { visible: true, text: '___ LOLLIPOPS', font: 'poppins', weight: 700, size: 10.5, tracking: 160, color: PINK.rasp, align: 'center', x: 43, y: 73.4, pill: true, pillColor: '#ffffff' });
    deepMerge(F.els.flavor, { visible: true, text: 'Strawberry', font: 'poppins', weight: 600, size: 14, color: PINK.rasp, align: 'center', x: 43, y: 88.6 });
    deepMerge(F.els.identity, { visible: true, text: 'Dietary Supplement', font: 'poppins', weight: 500, size: 8.8, color: PINK.rasp, align: 'center', x: 43, y: 95 });
    deepMerge(F.els.netWeight, { visible: true, auto: true, grams: '', font: 'poppins', weight: 500, size: 8.8, color: PINK.rasp, align: 'center', x: 43, y: 100 });
    F.els.productLine.visible = false; F.els.tagline.visible = false;
    return fitPreset(m);
  }
  function presetSub(fmt, lead) { const s = specDefaults(fmt); return lead + ' · ' + n(s.flat.w, 1) + ' × ' + n(s.flat.h, 1) + ' mm'; }
  const PRESETS = [
    { id: 'wrapper', name: 'Current wrapper', fmt: 'wrapper', lead: 'Single pop', ref: 'wrapper', sw: [PINK.hot, PINK.blush], build: () => presetWrapper(false) },
    { id: 'bag', name: 'Current bag', fmt: 'bag', lead: '100 g bag', ref: 'bag', sw: [PINK.bag, PINK.bag], build: () => presetBag(false) },
    { id: 'green-wrapper', name: 'Green wrapper', fmt: 'wrapper', lead: 'Green pop', ref: null, sw: [GREEN.emerald, GREEN.paleLime], build: () => presetWrapper(true) },
    { id: 'green-bag', name: 'Green bag', fmt: 'bag', lead: 'Green pop', ref: 'greenbag', sw: [GREEN.bag, GREEN.bag], build: () => presetBag(true) },
    { id: 'sleeve3', name: '3-pack sleeve', fmt: 'sleeve3', lead: 'Wrapper look', ref: null, sw: [PINK.hot, PINK.blush], land: true, build: presetSleeve },
  ];

  /* =========================================================================================
   * 5. State, history, autosave
   * ======================================================================================= */
  // lost: pictures of the last design that could not be restored ({ pop, logo, background }), so the notice
  // can say so instead of swapping in something else
  // side: the panel being edited (front / back); ui.view adds the read-only print-layout view
  const state = { model: null, sel: null, side: 'front', greenPop: null, lost: {}, warnedQuota: false };
  const ui = { showBleed: true, showSafe: true, showGuides: true, compare: false, compareMode: 'side', compareOpacity: 0.5, view: 'front', zoomMode: 'fit', k: 4, snapX: null, hover: null, dragging: false, dieline: null, lastPrint: { crop: false, layout: false, dieline: false, side: 'front' } };
  const hist = { stack: [], i: -1 };
  const AUTOSAVE_KEY = 'model-pops-label-studio:autosave:v1';

  function commit() {
    const s = JSON.stringify(state.model);
    if (hist.stack[hist.i] === s) return;
    hist.stack = hist.stack.slice(0, hist.i + 1); hist.stack.push(s);
    if (hist.stack.length > 120) hist.stack.shift();
    hist.i = hist.stack.length - 1;
    updateUndoButtons();
    autosave();
  }
  function undo() { if (hist.i > 0) { hist.i--; state.model = JSON.parse(hist.stack[hist.i]); afterModelReplaced(); } }
  function redo() { if (hist.i < hist.stack.length - 1) { hist.i++; state.model = JSON.parse(hist.stack[hist.i]); afterModelReplaced(); } }
  function updateUndoButtons() { $('#btn-undo').disabled = hist.i <= 0; $('#btn-redo').disabled = hist.i >= hist.stack.length - 1; }

  function usedAssetIds(m, includeBundled) {
    const ids = new Set();
    const F = m.panels.front, B = m.panels.back;
    if (F.els.pop && F.els.pop.src) ids.add(F.els.pop.src);
    [F, B].forEach(P => { if (P.bg.image && P.bg.image.src) ids.add(P.bg.image.src); });
    if (F.els.logo.upload && F.els.logo.upload.src) ids.add(F.els.logo.upload.src);
    if (state.greenPop) ids.add(state.greenPop);
    return [...ids].filter(id => ASSETS[id] && (includeBundled || !BUNDLED.has(id)));
  }
  function assetRecord(id) { const a = ASSETS[id]; return { id, src: a.src, w: a.w, h: a.h, name: a.name, short: a.short, kind: a.kind, opaque: !!a.opaque }; }
  function serialize(includeBundled) {
    const m = state.model; const assets = {};
    usedAssetIds(m, includeBundled).forEach(id => { assets[id] = assetRecord(id); });
    return { app: 'model-pops-label-studio', version: 2, savedAt: new Date().toISOString(), greenPop: state.greenPop || null, model: m, assets };
  }

  // Autosave: the design goes to localStorage (small); uploaded pictures go to IndexedDB, which has room for
  // full-size photos (localStorage holds only ~5 MB). If neither can keep a picture, the studio says so.
  const IDB = { name: 'model-pops-label-studio', store: 'assets', db: null, p: null, broken: false, saved: new Set() };
  function idbOpen() {
    if (IDB.db) return Promise.resolve(IDB.db);
    if (IDB.broken || !window.indexedDB) return Promise.reject(new Error('IndexedDB is not available'));
    if (!IDB.p) {
      IDB.p = new Promise((res, rej) => {
        let q; try { q = indexedDB.open(IDB.name, 1); } catch (e) { IDB.broken = true; rej(e); return; }
        q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(IDB.store)) q.result.createObjectStore(IDB.store); };
        q.onsuccess = () => { IDB.db = q.result; res(IDB.db); };
        q.onerror = () => { IDB.broken = true; IDB.p = null; rej(q.error || new Error('IndexedDB failed')); };
        q.onblocked = () => { IDB.p = null; rej(new Error('IndexedDB is blocked')); };
      });
    }
    return IDB.p;
  }
  // runs fn(store) in one transaction; resolves with the result of the request fn returns (if any)
  function idbTx(mode, fn) {
    return idbOpen().then(db => new Promise((res, rej) => {
      const tx = db.transaction(IDB.store, mode); const r = fn(tx.objectStore(IDB.store));
      tx.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('aborted'));
    }));
  }
  async function idbSync(ids) {
    const want = new Set(ids); const put = ids.filter(id => !IDB.saved.has(id));
    if (put.length) { await idbTx('readwrite', st => { put.forEach(id => st.put(assetRecord(id), id)); }); put.forEach(id => IDB.saved.add(id)); }
    const keys = await idbTx('readonly', st => st.getAllKeys());
    const stale = (keys || []).filter(k => !want.has(k));
    if (stale.length) { await idbTx('readwrite', st => { stale.forEach(k => st.delete(k)); }); stale.forEach(k => IDB.saved.delete(k)); }
  }
  function idbGetAll(ids) {
    const reqs = [];
    return idbTx('readonly', st => { ids.forEach(id => reqs.push(st.get(id))); }).then(() => reqs.map(r => r.result).filter(Boolean));
  }
  let saveChain = Promise.resolve();
  async function doAutosave() {
    const m = state.model; if (!m) return;
    const ids = usedAssetIds(m, false);
    let inIDB = false;
    try { await idbSync(ids); inIDB = true; } catch (e) { inIDB = false; }
    const data = { app: 'model-pops-label-studio', version: 2, savedAt: new Date().toISOString(), greenPop: state.greenPop || null, model: m, assets: {}, idb: inIDB ? ids : [] };
    if (!inIDB) ids.forEach(id => { data.assets[id] = assetRecord(id); });
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data)); }
    catch (e) {
      try { data.assets = {}; data.idb = []; localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data)); } catch (e2) { return; /* storage unavailable */ }
      if (ids.length && !state.warnedQuota) { state.warnedQuota = true; toast('Your picture is too large to keep in this browser between visits. Use Save design (.json) to keep it.', true); }
    }
  }
  const autosave = debounce(() => { saveChain = saveChain.then(doAutosave).catch(() => {}); }, 900);
  function readAutosave() { try { const s = localStorage.getItem(AUTOSAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  async function loadDesignData(data) {
    if (!data || !isObj(data) || !isObj(data.model)) throw new Error('This is not a Model Pops design file.');
    const assets = isObj(data.assets) ? data.assets : {};
    for (const id of Object.keys(assets)) {
      const a = assets[id]; if (!a || typeof a.src !== 'string' || !/^data:image\//i.test(a.src)) continue;
      if (BUNDLED.has(id)) continue;
      let w = a.w, h = a.h; if (!(w > 0 && h > 0)) { const d = await imageSize(a.src); w = d.w; h = d.h; }
      const kind = a.kind || 'image';
      const opaque = typeof a.opaque === 'boolean' ? a.opaque : (kind === 'pop' ? await edgeOpaque(a.src) : false);
      const nm = a.name || id;
      registerAsset({ id, src: a.src, w, h, name: nm, short: a.short || (nm.length > 18 ? nm.slice(0, 17) + '…' : nm), kind, opaque });
    }
    state.greenPop = data.greenPop && ASSETS[data.greenPop] ? data.greenPop : null;
    const lost = {};
    state.model = normalizeModel(data.model, lost);
    state.lost = lost;
    state.sel = null;
    const mv = state.model._movedFrom; delete state.model._movedFrom;
    if (mv) { const t = state.model.trim; setTimeout(() => toast('This design was saved on the earlier item size (' + n(mv.w, 1) + ' × ' + n(mv.h, 1) + ' mm): its layout has been moved onto today’s ' + n(t.w, 1) + ' × ' + n(t.h, 1) + ' mm. Re-apply a preset for the replica as it is now.'), 600); }
  }

  /* =========================================================================================
   * 6. Text measurement (hidden SVG, same engine and fonts as the design)
   * ======================================================================================= */
  const mCache = new Map();
  const capCache = new Map();
  const MEASURE_PX = 200;
  function measureWidth(f, weight, italic, sizeMM, trackEm, opsz, str) {
    if (!str) return 0;
    const key = f.id + '|' + weight + '|' + (italic ? 1 : 0) + '|' + trackEm + '|' + (opsz || '') + '|' + str;
    let w1 = mCache.get(key);
    if (w1 === undefined) {
      const t = $('#measure-text');
      t.setAttribute('font-family', fontStack(f)); t.setAttribute('font-size', MEASURE_PX);
      t.setAttribute('font-weight', weight); t.setAttribute('font-style', italic ? 'italic' : 'normal');
      t.setAttribute('letter-spacing', trackEm * MEASURE_PX);
      t.style.fontVariationSettings = opsz ? '"opsz" ' + opsz : 'normal';
      t.textContent = str;
      let w = 0; try { w = t.getComputedTextLength(); } catch (e) { w = str.length * MEASURE_PX * 0.55; }
      w1 = Math.max(0, w - trackEm * MEASURE_PX) / MEASURE_PX;   // drop the spacing after the last letter
      mCache.set(key, w1);
    }
    return w1 * sizeMM;
  }
  function capRatio(f, weight, italic) {
    const key = f.id + '|' + weight + '|' + (italic ? 1 : 0);
    if (capCache.has(key)) return capCache.get(key);
    let r = 0.7;
    try {
      const c = document.createElement('canvas').getContext('2d');
      c.font = (italic ? 'italic ' : '') + weight + ' 200px ' + fontStack(f);
      const mt = c.measureText('H');
      if (mt.actualBoundingBoxAscent > 20) r = mt.actualBoundingBoxAscent / 200;
    } catch (e) { /* keep default */ }
    if (document.fonts && document.fonts.check && !document.fonts.check((italic ? 'italic ' : '') + weight + ' 20px ' + fontStack(f))) return r;
    capCache.set(key, r);
    return r;
  }
  function clearMeasureCache() { mCache.clear(); capCache.clear(); }

  /* =========================================================================================
   * 7. The renderer: model -> SVG markup (shared by editor, print, SVG, PNG and 3D)
   * ======================================================================================= */
  function netWeightText(el) {
    if (!el.auto) return el.text || '';
    const g = parseFloat(el.grams);
    if (!(g > 0)) return 'Net Wt. ___ oz (___ g)';
    const oz = (g / 28.3495).toFixed(2);
    return 'Net Wt. ' + oz + ' oz (' + (Math.round(g * 100) / 100) + ' g)';
  }
  function elText(key, el) { return key === 'netWeight' ? netWeightText(el) : (el.text || ''); }
  function opszFor(f, el) { return f.opsz ? clamp(Number(el.opsz) || Number(el.size) || 12, 6, 96) : null; }
  function fontAttrs(f, weight, italic, fs, trackEm, opsz) {
    let s = ' font-family="' + esc(fontStack(f)) + '" font-size="' + n(fs, 4) + '" font-weight="' + weight + '"';
    if (italic) s += ' font-style="italic"';
    if (trackEm) s += ' letter-spacing="' + n(trackEm * fs, 4) + '"';
    if (opsz) s += ' style="' + esc('font-variation-settings:"opsz" ' + n(opsz, 1)) + '"';
    return s;
  }
  // geometry of a block of lines: per-line extents, cap height, first baseline
  function textGeometry(el, str, opts) {
    opts = opts || {};
    const f = fontOf(el.font); const fs = el.size * PT; const trackEm = (el.tracking || 0) / 1000;
    const italic = !!el.italic && f.italic !== false ? true : !!el.italic;
    const opsz = opszFor(f, el);
    const lines = String(str).split('\n');
    const lh = (el.leading || 1.15) * fs;
    const cap = capRatio(f, el.weight, italic) * fs;
    const align = el.align || 'center';
    // tracking2 (optional): the letter-spacing of the second and later lines, for an optically matched lock-up
    const t2 = el.tracking2 === null || el.tracking2 === undefined || el.tracking2 === '' ? null : Number(el.tracking2) / 1000;
    // indent (mm, left-aligned type only): where the second and later lines start, relative to the first
    const ind = opts.indent !== undefined ? Number(opts.indent) || 0 : align === 'left' ? Number(el.indent) || 0 : 0;
    const out = lines.map((t, i) => {
      const tr = i > 0 && t2 !== null && isFinite(t2) ? t2 : trackEm;
      const w = measureWidth(f, el.weight, italic, fs, tr, opsz, t);
      const x0 = el.x + (i > 0 ? ind : 0);
      const x1 = align === 'left' ? x0 : align === 'right' ? x0 - w : x0 - w / 2;
      return { t, w, x: x0, x1, x2: x1 + w, base: el.y + i * lh, tr };
    });
    return { f, fs, trackEm, italic, opsz, lines: out, lh, cap, align };
  }
  function textMarkup(g, fill, extraAttrs) {
    const anchor = g.align === 'left' ? 'start' : g.align === 'right' ? 'end' : 'middle';
    const shift = g.align === 'center' ? g.trackEm * g.fs / 2 : g.align === 'right' ? g.trackEm * g.fs : 0;   // trailing letter-spacing
    let s = '<text' + fontAttrs(g.f, g.weight, g.italic, g.fs, g.trackEm, g.opsz) + ' fill="' + esc(fill) + '" text-anchor="' + anchor + '" xml:space="preserve"' + (extraAttrs || '') + '>';
    g.lines.forEach(l => {
      if (!l.t) return;
      const own = l.tr !== undefined && Math.abs(l.tr - g.trackEm) > 1e-9;          // a line with its own letter-spacing
      const sh = own ? (g.align === 'center' ? l.tr * g.fs / 2 : g.align === 'right' ? l.tr * g.fs : 0) : shift;
      s += '<tspan x="' + n(l.x + sh) + '" y="' + n(l.base) + '"' + (own ? ' letter-spacing="' + n(l.tr * g.fs, 4) + '"' : '') + '>' + esc(l.t) + '</tspan>';
    });
    return s + '</text>';
  }
  function grpOpen(key, env, extra) {
    return '<g id="' + env.idp + SVG_IDS[key] + '"' + (env.editor ? ' class="mp-el" data-el="' + key + '"' : '') + (extra || '') + '>';
  }
  // A panel of the design as the renderer sees it: the model's sizes and spec, plus that panel's background,
  // elements and stacking order. Every render function takes this view in place of the model.
  function panelView(m, side) {
    side = side === 'back' ? 'back' : 'front';
    const P = m.panels[side];
    return Object.assign({}, m, { side, bg: P.bg, els: P.els, order: P.order });
  }
  // The fin seal of a flow wrap (MPItems wrapper.finSeal), one model for the print web, these guides and the 3D
  // pack: the two film edges are sealed together at the seam (the fin's root), which runs down the back centre
  // line (MPItems.wrapper.web() turns both fin allowances up there), and the sealed fin is then laid flat to one
  // side: fold 'left' / 'right' (seen looking at the back) or 'either' (not known yet). The keep-clear band is
  // every place the laid fin can cover, plus the clear margin; type that matters stays out of it.
  function finFold(fs) { return fs && (fs.fold === 'left' || fs.fold === 'right') ? fs.fold : 'either'; }
  function finBand(v) {
    if (!v || v.format !== 'wrapper' || v.side !== 'back') return null;
    const s = specOf(v); const fs = s.finSeal || {}; const fw = Number(fs.width) || 0;
    if (!(fw > 0)) return null;
    const c = Number(fs.clear); const clear = isFinite(c) ? Math.max(0, c) : 2;
    const fold = finFold(fs), seam = v.trim.w / 2;
    const L = fold !== 'right', R = fold !== 'left';               // the side(s) the fin can lie on
    const covers = []; if (L) covers.push([seam - fw, seam]); if (R) covers.push([seam, seam + fw]);
    return { x1: seam - (L ? fw : 0) - clear, x2: seam + (R ? fw : 0) + clear, fin: fw, clear, fold, seam, covers };
  }
  // greedy word wrap to maxW mm ('\n' always breaks); a single word wider than maxW keeps its own line
  function wrapLines(str, f, weight, italic, fs, trackEm, opsz, maxW) {
    const out = [];
    String(str == null ? '' : str).split('\n').forEach(par => {
      const words = par.split(/ +/).filter(w => w.length); let line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(w => {
        const t = line ? line + ' ' + w : w;
        if (line && measureWidth(f, weight, italic, fs, trackEm, opsz, t) > maxW + 1e-6) { out.push(line); line = w; }
        else line = t;
      });
      out.push(line);
    });
    return out;
  }
  // one <text> with a tspan per line; lines: [{ t, x, y }]; anchor start | middle | end
  function textBlock(f, weight, italic, fs, trackEm, opsz, fill, anchor, lines, extra) {
    const shift = anchor === 'middle' ? trackEm * fs / 2 : anchor === 'end' ? trackEm * fs : 0;   // trailing letter-spacing
    let s = '<text' + fontAttrs(f, weight, italic, fs, trackEm, opsz) + ' fill="' + esc(fill) + '" text-anchor="' + anchor + '" xml:space="preserve"' + (extra || '') + '>';
    let any = false;
    lines.forEach(l => { if (l.t) { any = true; s += '<tspan x="' + n(l.x + shift) + '" y="' + n(l.y) + '">' + esc(l.t) + '</tspan>'; } });
    return any ? s + '</text>' : '';
  }
  // text columns for a block from x0 to x1: one column, or (keeping clear of the fin seal) two, either side of it
  function blockColumns(v, el, x0, x1) {
    const band = el.finClear ? finBand(v) : null;
    if (band && band.x1 < x1 && band.x2 > x0 && band.x1 - x0 > 4 && x1 - band.x2 > 4) return [[x0, band.x1], [band.x2, x1]];
    return [[x0, x1]];
  }
  // lines into columns: each column gets an equal share (the first one the extra line), reading down then across
  function splitColumns(lines, cols) {
    if (cols.length < 2) return [lines];
    const k = Math.ceil(lines.length / 2);
    return [lines.slice(0, k), lines.slice(k)];
  }

  function renderBackground(m, env, defs) {
    const W = m.trim.w, H = m.trim.h, b = m.bleed + 0.6;
    const x0 = -b, y0 = -b, bw = W + 2 * b, bh = H + 2 * b;
    const bg = m.bg;
    let s = '<g id="' + env.idp + 'background"' + (env.editor ? ' class="' + (bg.mode === 'image' ? 'mp-el' : 'mp-bgpick') + '" data-el="background"' : '') + '>';
    s += '<rect x="' + n(x0) + '" y="' + n(y0) + '" width="' + n(bw) + '" height="' + n(bh) + '" fill="' + esc(bg.c1) + '"/>';
    if (bg.mode === 'image' && bg.image.src && ASSETS[bg.image.src]) {
      const a = ASSETS[bg.image.src];
      const sc = Math.max(bw / a.w, bh / a.h) * Math.max(1, Number(bg.image.zoom) || 1);
      const dw = a.w * sc, dh = a.h * sc;
      const dx = x0 + (bw - dw) / 2 + (Number(bg.image.ox) || 0), dy = y0 + (bh - dh) / 2 + (Number(bg.image.oy) || 0);
      s += '<image x="' + n(dx) + '" y="' + n(dy) + '" width="' + n(dw) + '" height="' + n(dh) + '" preserveAspectRatio="none" xlink:href="' + env.href(bg.image.src) + '"/>';
    } else if (bg.mode === 'two-tone') {
      s += '<path d="' + wavePath(m) + '" fill="' + esc(bg.c2) + '"/>';
    }
    s += renderPattern(m, env, defs);
    return s + '</g>';
  }
  function wavePath(m) {
    const W = m.trim.w, H = m.trim.h, b = m.bleed + 1;
    const wv = m.bg.wave;
    const yl = Number(wv.y), yr = yl + (Number(wv.tilt) || 0), yt = yl + (Number(wv.depth) || 0);
    const tx = clamp(Number(wv.center), 0.05, 0.95) * W;
    const xL = -b, xR = W + b, k = 0.52;
    return 'M' + n(xL) + ',' + n(yl) + 'C' + n(xL + (tx - xL) * k) + ',' + n(yl) + ' ' + n(tx - (tx - xL) * k) + ',' + n(yt) + ' ' + n(tx) + ',' + n(yt) +
      'C' + n(tx + (xR - tx) * k) + ',' + n(yt) + ' ' + n(xR - (xR - tx) * k) + ',' + n(yr) + ' ' + n(xR) + ',' + n(yr) +
      'L' + n(xR) + ',' + n(H + b) + 'L' + n(xL) + ',' + n(H + b) + 'Z';
  }
  function renderPattern(m, env, defs) {
    const p = m.bg.pattern; if (!p || p.kind === 'none') return '';
    const W = m.trim.w, H = m.trim.h, b = m.bleed;
    const sp = Math.max(4, Number(p.spacing) || 18), sz = Math.max(0.5, Number(p.size) || 6);
    const rand = mulberry32((Number(p.seed) || 1) * 7919);
    const jit = clamp(Number(p.jitter) || 0, 0, 1);
    const dy = sp * 0.866;
    const cols = Math.ceil((W + 2 * b) / sp) + 2, rows = Math.ceil((H + 2 * b) / dy) + 2;
    const id = env.idp + 'pattern-' + p.kind;
    if (p.kind === 'hearts') defs.push('<path id="' + id + '" d="' + HEART_D + '"/>');
    else if (p.kind === 'sparkles') defs.push('<path id="' + id + '" d="' + SPARKLE_D + '"/>');
    else defs.push('<circle id="' + id + '" cx="0" cy="0" r="0.5"/>');
    const k = p.kind === 'sparkles' ? 0.5 : 1;
    const keepOut = p.clear === false ? [] : wordBoxes(m, 2);   // the logo and the words stay clear of the pattern
    let s = '<g fill="' + esc(p.color) + '" opacity="' + n(clamp(Number(p.opacity), 0, 1), 3) + '">';
    if (Array.isArray(p.points) && p.points.length) {
      // placed exactly as on the client's draft: [u, v, size factor, tilt] (u, v = fractions of the panel)
      p.points.forEach(q => {
        const x = Number(q[0]) * W, y = Number(q[1]) * H, s1 = sz * (Number(q[2]) || 1) * k;
        const rr = s1 * (p.kind === 'sparkles' ? 1 : 0.6);
        if (keepOut.some(o => x + rr > o.x1 && x - rr < o.x2 && y + rr > o.y1 && y - rr < o.y2)) return;
        s += '<use xlink:href="#' + id + '" transform="translate(' + n(x, 3) + ' ' + n(y, 3) + ')' + (q[3] ? ' rotate(' + n(Number(q[3]), 1) + ')' : '') + ' scale(' + n(s1, 4) + ')"/>';
      });
      return s + '</g>';
    }
    for (let r = -1; r < rows; r++) for (let c = -1; c < cols; c++) {
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand(), r5 = rand();
      const x = -b + c * sp + ((r & 1) ? sp / 2 : 0) + (r1 - 0.5) * sp * jit;
      const y = -b + r * dy + (r2 - 0.5) * sp * jit * 0.8;
      const s1 = sz * (0.84 + r3 * 0.32) * k;
      const rr = s1 * (p.kind === 'sparkles' ? 1 : 0.6);
      if (keepOut.some(q => x + rr > q.x1 && x - rr < q.x2 && y + rr > q.y1 && y - rr < q.y2)) continue;
      const rot = p.kind === 'dots' ? 0 : (r4 - 0.5) * 34;
      const op = 0.62 + r5 * 0.38;
      s += '<use xlink:href="#' + id + '" transform="translate(' + n(x, 2) + ' ' + n(y, 2) + ') rotate(' + n(rot, 1) + ') scale(' + n(s1, 3) + ')" opacity="' + n(op, 2) + '"/>';
    }
    return s + '</g>';
  }
  // boxes (mm, padded) around the logo and every visible line of words
  function wordBoxes(m, pad) {
    const out = [];
    const add = (g, ex, ey) => {
      const ls = g.lines.filter(l => l.t); if (!ls.length) return;
      out.push({ x1: Math.min.apply(null, ls.map(l => l.x1)) - ex - pad, x2: Math.max.apply(null, ls.map(l => l.x2)) + ex + pad,
        y1: ls[0].base - g.cap * 1.15 - ey - pad, y2: ls[ls.length - 1].base + g.fs * 0.24 + ey + pad });
    };
    for (const key of m.order) {
      const el = m.els[key]; if (!el || !el.visible) continue;
      if (key === 'logo') {
        if (el.style === 'upload') {
          const a = ASSETS[el.upload.src]; if (!a) continue;
          const w = Math.max(1, Number(el.upload.w) || 40), h = w * a.h / a.w;
          out.push({ x1: el.x - w / 2 - pad, x2: el.x + w / 2 + pad, y1: el.y - pad, y2: el.y + h + pad });
          continue;
        }
        const g = logoGeometry(el); const S = el.sparkles || {};
        add(g, S.on ? g.cap * (0.95 * (Number(S.spread) || 1) + 0.25 * (Number(S.scale) || 1)) + (g.italic ? g.cap * 0.2 : 0) : 0, S.on ? g.cap * 0.1 : 0);
      } else if (TEXT_KEYS.includes(key)) {
        const str = elText(key, el); if (!String(str).trim()) continue;
        const g = textGeometry(el, str);
        add(g, el.pill ? g.cap * 0.95 : 0, el.pill ? g.cap * 0.62 : 0);
      } else if (BLOCK_KEYS.includes(key)) {
        const b = blockLayout(key, el, m).bbox;
        out.push({ x1: b.x1 - pad, x2: b.x2 + pad, y1: b.y1 - pad, y2: b.y2 + pad });
      }
    }
    return out;
  }

  function renderTextEl(key, el, m, env, defs) {
    const str = elText(key, el); if (!String(str).trim()) return '';
    const g = textGeometry(el, str); g.weight = el.weight;
    let pill = '';
    if (el.pill) {
      const xs1 = Math.min.apply(null, g.lines.map(l => l.x1)), xs2 = Math.max.apply(null, g.lines.map(l => l.x2));
      const top = g.lines[0].base - g.cap, bottom = g.lines[g.lines.length - 1].base;
      const px = g.cap * 0.95, py = g.cap * 0.62;
      const h = bottom - top + 2 * py;
      pill = '<rect x="' + n(xs1 - px) + '" y="' + n(top - py) + '" width="' + n(xs2 - xs1 + 2 * px) + '" height="' + n(h) + '" rx="' + n(Math.min(h / 2, g.cap * 1.2)) + '" fill="' + esc(el.pillColor || '#ffffff') + '"/>';
    }
    return grpOpen(key, env) + pill + textMarkup(g, el.color) + '</g>';
  }

  function logoFont(el) {
    if (el.style === 'wrapper') return { font: el.font === 'playfair' ? 'playfair' : 'bodoni', italic: false };
    if (el.style === 'bag') return { font: el.font === 'playfair' ? 'playfair' : 'bodoni', italic: true };
    return { font: el.font, italic: !!el.italic };
  }
  function logoGeometry(el) {
    const lf = logoFont(el);
    const tel = Object.assign({}, el, { font: lf.font, italic: lf.italic, align: el.style === 'bag' ? 'left' : el.align });
    const g = textGeometry(tel, el.text, { indent: tel.align === 'left' ? Number(el.indent) || 0 : 0 }); g.weight = el.weight;
    return g;
  }
  // Editor-only stand-in for a picture that is not there yet: a dashed outline in the guide colour. It is
  // never exported (the files leave the space empty), so nothing is ever drawn in place of the product.
  function placeholderMarkup(x, y, w, h, lines, shape) {
    const hair = ' vector-effect="non-scaling-stroke"';
    const st = ' fill="rgba(255,255,255,0.38)" stroke="#1f5fc9" stroke-width="1.25" stroke-dasharray="5 4"' + hair;
    let s = '';
    let ty = y + h / 2;
    if (shape === 'pop') {
      const r = w * 0.47, cy = y + w * 0.5;
      s += '<line x1="' + n(x + w / 2) + '" y1="' + n(cy + r) + '" x2="' + n(x + w / 2) + '" y2="' + n(y + h * 0.985) + '" stroke="#1f5fc9" stroke-width="1.25" stroke-dasharray="5 4"' + hair + '/>';
      s += '<circle cx="' + n(x + w / 2) + '" cy="' + n(cy) + '" r="' + n(r) + '"' + st + '/>';
      ty = cy;
    } else {
      s += '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" rx="' + n(Math.min(w, h) * 0.06) + '"' + st + '/>';
    }
    const fs = clamp(Math.min(w, h) * 0.085, 1.4, 4.2), lh = fs * 1.3;
    lines.forEach((t, i) => {
      s += '<text x="' + n(x + w / 2) + '" y="' + n(ty + (i - (lines.length - 1) / 2) * lh + fs * 0.35) + '" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="' + (i ? 500 : 650) + '" font-size="' + n(fs, 2) + '" fill="#1f5fc9">' + esc(t) + '</text>';
    });
    return s;
  }
  function renderLogo(el, m, env, defs) {
    if (el.style === 'upload') {
      const a = ASSETS[el.upload.src];
      const w = Math.max(1, Number(el.upload.w) || 40);
      if (!a) return env.editor ? grpOpen('logo', env) + placeholderMarkup(el.x - w / 2, el.y, w, w * 0.4, ['Logo file', 'upload it in the Logo panel']) + '</g>' : '';
      const h = w * a.h / a.w;
      return grpOpen('logo', env) + '<image x="' + n(el.x - w / 2) + '" y="' + n(el.y) + '" width="' + n(w) + '" height="' + n(h) + '" preserveAspectRatio="xMidYMid meet" xlink:href="' + env.href(el.upload.src) + '"/></g>';
    }
    const g = logoGeometry(el);
    if (!g.lines.some(l => l.t)) return '';
    let fill = '#ffffff';
    if (el.fill === 'cream') fill = '#f7efdd';
    else if (el.fill === 'custom') fill = el.fillColor || '#ffffff';
    else if (el.fill === 'gold') {
      const xs1 = Math.min.apply(null, g.lines.map(l => l.x1)), xs2 = Math.max.apply(null, g.lines.map(l => l.x2));
      const y1 = g.lines[0].base - g.cap, y2 = g.lines[g.lines.length - 1].base;
      const gid = env.idp + 'logo-gold';
      defs.push('<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + n(xs1) + '" y1="' + n(y1) + '" x2="' + n(xs2) + '" y2="' + n(y2) + '">' +
        '<stop offset="0" stop-color="#a8792a"/><stop offset="0.22" stop-color="#e3bd62"/><stop offset="0.42" stop-color="#fbeab0"/><stop offset="0.58" stop-color="#d7a945"/><stop offset="0.8" stop-color="#a6741f"/><stop offset="1" stop-color="#e2bd5f"/></linearGradient>');
      fill = 'url(#' + gid + ')';
    }
    let sp = '';
    const S = el.sparkles || {};
    if (S.on && g.lines[0] && g.lines[0].t) {
      const L = g.lines[0], ch = g.cap, k = Number(S.spread) || 1, sc = Number(S.scale) || 1;
      const slant = g.italic ? ch * 0.2 : 0;
      let pts;
      if (S.layout === 'draft' && Array.isArray(S.points) && S.points.length) {
        pts = S.points.map(q => [el.x + Number(q[0]) * ch * k, el.y + Number(q[1]) * ch, Number(q[2])]);
      } else if (S.layout === 'diagonal') {
        pts = [[L.x1 - 0.75 * ch * k + slant, L.base - 0.45 * ch, 0.22], [L.x1 - 0.4 * ch * k + slant * 0.4, L.base + 0.04 * ch, 0.165],
          [L.x2 + 0.5 * ch * k + slant, L.base - 0.52 * ch, 0.22], [L.x2 + 0.95 * ch * k + slant * 0.4, L.base - 0.02 * ch, 0.165]];
      } else {
        pts = [[L.x1 - 0.74 * ch * k, L.base - 0.1 * ch, 0.25], [L.x1 - 0.3 * ch * k, L.base + 0.33 * ch, 0.18],
          [L.x2 + 0.74 * ch * k, L.base - 0.1 * ch, 0.25], [L.x2 + 0.3 * ch * k, L.base + 0.33 * ch, 0.18]];
      }
      const spd = S.shape === 'plump' ? SPARKLE_PLUMP_D : SPARKLE_D;
      sp = '<g fill="' + esc(S.color || '#f2d98a') + '">' + pts.map(p => '<path d="' + spd + '" transform="translate(' + n(p[0]) + ' ' + n(p[1]) + ') scale(' + n(p[2] * ch * sc, 4) + ')"/>').join('') + '</g>';
    }
    return grpOpen('logo', env) + textMarkup(g, fill) + sp + '</g>';
  }

  // the words of the heart badge, centred on the heart (heart centre = 0,0; mm)
  function badgeTextGeometry(el) {
    const w = Math.max(4, Number(el.w) || 20), h = w * HEART_H;
    const str = String(el.text || '');
    const tel = Object.assign({}, el, { x: 0, y: 0, align: 'center' });
    const g0 = textGeometry(tel, str);
    const total = (g0.lines.length - 1) * g0.lh + g0.cap;
    const cy = -h * 0.045 + (Number(el.ty) || 0);                // optical centre of a heart sits a little high (ty: the words' own nudge, mm)
    const firstBase = cy - total / 2 + g0.cap;
    const g = textGeometry(Object.assign({}, tel, { y: firstBase }), str); g.weight = el.weight;
    return g;
  }
  // true when a line of words reaches outside the heart (a small margin is kept)
  let heartProbe = null;
  function badgeOverflow(el) {
    if (!String(el.text || '').trim()) return false;
    const w = Math.max(4, Number(el.w) || 20);
    const g = badgeTextGeometry(el);
    try {
      if (!heartProbe) { heartProbe = document.createElementNS('http://www.w3.org/2000/svg', 'path'); heartProbe.setAttribute('d', HEART_D); $('#measure').appendChild(heartProbe); }
      const inside = (x, y) => heartProbe.isPointInFill(new DOMPoint(x / w, y / w));
      for (const l of g.lines) {
        if (!l.t) continue;
        const mx = Math.max(0.4, g.cap * 0.2), top = l.base - g.cap;
        if (!inside(l.x1 - mx, top) || !inside(l.x2 + mx, top) || !inside(l.x1 - mx, l.base) || !inside(l.x2 + mx, l.base)) return true;
      }
    } catch (e) { return false; }
    return false;
  }
  function renderBadge(el, m, env, defs) {
    const w = Math.max(4, Number(el.w) || 20), h = w * HEART_H;
    let s = grpOpen('badge', env) + '<g transform="translate(' + n(el.x) + ' ' + n(el.y) + ')' + (el.rotate ? ' rotate(' + n(el.rotate, 2) + ')' : '') + '">';
    if (el.shadow) {
      // the blur is set in mm on an unscaled group (the heart path inside carries its own scale), and the
      // filter region leaves room for the whole blur, so the shadow fades out softly on every side
      const fid = env.idp + 'badge-shadow';
      defs.push('<filter id="' + fid + '" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + n(w * 0.035, 3) + '"/></filter>');
      s += '<g filter="url(#' + fid + ')" opacity="0.18"><path d="' + HEART_D + '" transform="translate(0 ' + n(h * 0.035) + ') scale(' + n(w, 4) + ')" fill="#2a0012"/></g>';
    }
    s += '<path d="' + HEART_D + '" transform="scale(' + n(w, 4) + ')" fill="' + esc(el.heartColor) + '"/>';
    if (String(el.text || '').trim()) s += textMarkup(badgeTextGeometry(el), el.color);
    return s + '</g></g>';
  }

  function renderPop(el, m, env, defs) {
    const a = ASSETS[el.src];
    const ref = a || ASSETS['pop-gold']; if (!ref) return '';             // (no picture yet: the slot keeps a pop's shape)
    const h = Math.max(2, Number(el.h) || 40), w = h * ref.w / ref.h;      // natural aspect: never stretched
    const count = clamp(Math.round(Number(el.repeat) || 1), 1, 6), gap = Number(el.gap) || 0;
    const xs = [];
    for (let i = 0; i < count; i++) xs.push({ i, cx: el.x + (i - (count - 1) / 2) * (w + gap), d: Math.abs(i - (count - 1) / 2) });
    xs.sort((p, q) => q.d - p.d || p.i - q.i);                         // outer pops first, centre pop on top
    if (!a) {
      // no real picture yet: an outline in the editor, nothing at all in the files (the product is never invented)
      if (!env.editor) return '';
      let s = grpOpen('pop', env);
      xs.forEach(p => { s += placeholderMarkup(p.cx - w / 2, el.y, w, h, [m.theme === 'green' ? 'Real green pop' : 'Real pop', 'photo goes here'], 'pop'); });
      return s + '</g>';
    }
    // the picture is stored once and re-used (shadow + every pop), so files stay small
    const pid = env.idp + 'pop-picture';
    defs.push('<image id="' + pid + '" x="0" y="0" width="' + n(w) + '" height="' + n(h) + '" preserveAspectRatio="xMidYMid meet" xlink:href="' + env.href(el.src) + '"/>');
    let s = grpOpen('pop', env);
    const sh = el.shadow || {};
    if (sh.on && !a.opaque) {                                            // (a photo with its background would cast a box)
      const fid = env.idp + 'pop-shadow';
      const rgb = hexToRgb(sh.color || '#3d0a1f').map(v => n(v / 255, 4));
      defs.push('<filter id="' + fid + '" x="-40%" y="-20%" width="180%" height="140%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ' + rgb[0] + ' 0 0 0 0 ' + rgb[1] + ' 0 0 0 0 ' + rgb[2] + ' 0 0 0 ' + n(clamp(Number(sh.opacity) || 0.25, 0, 1), 3) + ' 0"/><feGaussianBlur stdDeviation="' + n(Math.max(0.05, Number(sh.blur) || 1), 3) + '"/></filter>');
      xs.forEach(p => { s += '<use xlink:href="#' + pid + '" x="' + n(p.cx - w / 2 + (Number(sh.dx) || 0)) + '" y="' + n(el.y + (Number(sh.dy) || 0)) + '" filter="url(#' + fid + ')"/>'; });
    }
    xs.forEach(p => { s += '<use xlink:href="#' + pid + '" x="' + n(p.cx - w / 2) + '" y="' + n(el.y) + '"/>'; });
    return s + '</g>';
  }

  /* ---- back-panel blocks: Supplement Facts, Ingredients, claims, Warning ----
   * Each layout returns { bbox, rects, texts } in mm: rects [{ x, y, w, h, fill, stroke, sw, opacity }],
   * texts [{ f, weight, fs, tr, fill, anchor, lines: [{ t, x, y, w }] }]. The same layout draws the block, keeps
   * the pattern clear of it and checks it against the fin seal. */
  function TL(f, weight, fs, tr, fill, anchor) { return { f, weight, fs, tr: tr || 0, fill, anchor, lines: [] }; }
  function lineSpan(L, l) { return L.anchor === 'end' ? [l.x - l.w, l.x] : L.anchor === 'middle' ? [l.x - l.w / 2, l.x + l.w / 2] : [l.x, l.x + l.w]; }
  function addLine(L, t, x, y) { if (!t) return; L.lines.push({ t, x, y, w: measureWidth(L.f, L.weight, false, L.fs, L.tr, null, t) }); }
  function layoutBBox(lay, x1, y1, x2, y2) {
    lay.bbox = { x1, y1, x2, y2 };
    lay.texts.forEach(L => L.lines.forEach(l => {
      const s = lineSpan(L, l);
      lay.bbox.x1 = Math.min(lay.bbox.x1, s[0]); lay.bbox.x2 = Math.max(lay.bbox.x2, s[1]);
      lay.bbox.y1 = Math.min(lay.bbox.y1, l.y - L.fs * 0.8); lay.bbox.y2 = Math.max(lay.bbox.y2, l.y + L.fs * 0.25);
    }));
    return lay;
  }
  function layoutMarkup(lay) {
    let s = '';
    lay.rects.forEach(r => {
      s += '<rect x="' + n(r.x) + '" y="' + n(r.y) + '" width="' + n(Math.max(0, r.w)) + '" height="' + n(Math.max(0, r.h)) + '" fill="' + esc(r.fill || 'none') + '"' +
        (r.stroke ? ' stroke="' + esc(r.stroke) + '" stroke-width="' + n(r.sw, 3) + '"' : '') + (r.opacity !== undefined && r.opacity < 1 ? ' opacity="' + n(r.opacity, 3) + '"' : '') + '/>';
    });
    lay.texts.forEach(L => { s += textBlock(L.f, L.weight, false, L.fs, L.tr, null, L.fill, L.anchor, L.lines); });
    return s;
  }

  function factsLayout(el, v) {
    const f = fontOf(el.font);
    const fs = Math.max(0.5, Number(el.size) || 5) * PT;
    const tfs = Math.max(0.5, Number(el.titleSize) || (Number(el.size) || 5) * 1.45) * PT;
    const sfs = fs;                                     // headings and footnote: the row size (never smaller)
    const ink = el.color || '#000000', rule = el.line || ink;
    const pad = fs * 0.62;
    const x0 = Number(el.x) || 0, w = Math.max(10, Number(el.w) || 50), x1 = x0 + w;
    const ix0 = x0 + pad, ix1 = x1 - pad;
    const lh = fs * clamp(Number(el.leading) || 1.38, 1, 2.4), lh2 = fs * 1.12;
    const hair = Math.max(0.09, fs * 0.055), bar = fs * 0.24, heavy = fs * 0.4;
    const unit = fs * 0.75;
    const rows = Array.isArray(el.rows) ? el.rows : [];
    const mw = (t, wt, size) => measureWidth(f, wt, false, size, 0, null, String(t || ''));
    const maxAmt = Math.max(0, ...rows.map(r => mw(r.amount, 400, fs)));
    const maxDV = Math.max(0, ...rows.map(r => mw(r.dv, 400, fs)));
    const gap = fs * 0.7;
    const band = el.finClear ? finBand(v) : null;
    const crosses = !!(band && band.x1 < ix1 && band.x2 > ix0);
    let amtR = ix0 + (ix1 - ix0) * clamp(Number(el.amountCol) || 0.79, 0.35, 0.97);
    if (crosses) amtR = Math.min(Math.max(amtR, band.x2 + maxAmt), ix1 - maxDV - gap);
    const nameLimit = crosses ? band.x1 : amtR - maxAmt - gap;
    const fullW = (crosses ? band.x1 : ix1) - ix0;
    const lay = { rects: [], texts: [], crosses, band };
    const reg = TL(f, 400, fs, 0, ink, 'start'), num = TL(f, 400, fs, 0, ink, 'end');
    const bold = TL(f, 700, tfs, 0, ink, 'start'), head = TL(f, 700, sfs, 0, ink, 'start'), headR = TL(f, 700, sfs, 0, ink, 'end'), small = TL(f, 400, sfs, 0, ink, 'start');
    let y = Number(el.y) + pad * 0.7;
    if (el.showTitle && String(el.title || '').trim()) {
      wrapLines(el.title, f, 700, false, tfs, 0, null, fullW).forEach(t => { addLine(bold, t, ix0, y + tfs * 0.84); y += tfs * 1.02; });
      y += fs * 0.12;
    }
    const textRow = (L, str, x, limit, y0) => { const ls = wrapLines(str, f, L.weight, false, L.fs, 0, null, limit); ls.forEach((t, i) => addLine(L, t, x, y0 + i * lh2)); return ls.length; };
    if (el.servingSizeOn && String(el.servingSize || '').trim()) {
      const k = textRow(reg, el.servingSize, ix0, fullW, y + fs * 1.0); y += lh + (k - 1) * lh2;
    }
    const sv = String(el.servings == null ? '' : el.servings).trim() || '___';
    if (crosses) {
      const k = textRow(reg, el.servingsLabel || 'Servings Per Container', ix0, band.x1 - ix0, y + fs * 1.0);
      addLine(num, sv, amtR, y + fs * 1.0); y += lh + (k - 1) * lh2;
    } else {
      const k = textRow(reg, (el.servingsLabel || 'Servings Per Container') + ' ' + sv, ix0, ix1 - ix0, y + fs * 1.0); y += lh + (k - 1) * lh2;
    }
    lay.rects.push({ x: ix0, y, w: ix1 - ix0, h: heavy, fill: rule }); y += heavy;
    if (el.showHead) {
      y += fs * 0.08;
      addLine(head, el.headAmount || '', ix0, y + sfs * 1.02); addLine(headR, el.headDV || '', ix1, y + sfs * 1.02);
      y += sfs * 1.36;
      lay.rects.push({ x: ix0, y, w: ix1 - ix0, h: hair, fill: rule }); y += hair;
    }
    rows.forEach(r => {
      const ind = clamp(Math.round(Number(r.indent) || 0), 0, 3) * unit;
      const hasAmt = !!String(r.amount || '').trim();
      const lim = crosses ? band.x1 : hasAmt ? nameLimit : ix1 - mw(r.dv, 400, fs) - gap;
      const parts = String(r.name || '').split('\n');
      const names = [];
      parts.forEach((p, pi) => {
        const x = ix0 + ind + (pi > 0 ? unit : 0);
        wrapLines(p, f, 400, false, fs, 0, null, Math.max(4, lim - x)).forEach((t, li) => names.push({ t, x: li > 0 && pi === 0 ? x + unit : x }));
      });
      const b1 = y + fs * 1.05;
      names.forEach((nm, i) => addLine(reg, nm.t, nm.x, b1 + i * lh2));
      if (hasAmt) addLine(num, String(r.amount), amtR, b1);
      if (String(r.dv || '').trim()) addLine(num, String(r.dv), ix1, b1);
      y += lh + Math.max(0, names.length - 1) * lh2;
      const rh = r.rule === 'none' ? 0 : r.rule === 'bar' ? bar : r.rule === 'heavy' ? heavy : hair;
      if (rh) { lay.rects.push({ x: ix0, y, w: ix1 - ix0, h: rh, fill: rule }); y += rh; }
    });
    if (String(el.footnote || '').trim()) {
      y += fs * 0.22;
      wrapLines(el.footnote, f, 400, false, sfs, 0, null, fullW).forEach(t => { addLine(small, t, ix0, y + sfs * 0.95); y += sfs * 1.2; });
    }
    y += pad * 0.75;
    const y0 = Number(el.y);
    lay.rects.unshift({ x: x0, y: y0, w, h: y - y0, fill: el.box || '#ffffff', stroke: rule, sw: Math.max(0.18, fs * 0.1) });
    lay.texts.push(bold, reg, num, head, headR, small);
    return layoutBBox(lay, x0, y0, x1, y);
  }

  function ingredientsLayout(el, v) {
    const f = fontOf(el.font);
    const fs = Math.max(0.5, Number(el.size) || 6) * PT, hfs = Math.max(0.5, Number(el.headSize) || (Number(el.size) || 6) * 1.3) * PT;
    const tr = (Number(el.tracking) || 0) / 1000;
    const x0 = Number(el.x) || 0, x1 = x0 + Math.max(8, Number(el.w) || 40);
    const cols = blockColumns(v, el, x0, x1);
    const lay = { rects: [], texts: [], crosses: cols.length > 1 };
    let y = Number(el.y) || 0;
    if (String(el.heading || '').trim()) {
      const H = TL(f, Number(el.headWeight) || 700, hfs, tr, el.color, 'start');
      wrapLines(el.heading, f, H.weight, false, hfs, tr, null, cols[0][1] - cols[0][0]).forEach(t => { addLine(H, t, x0, y + hfs * 0.82); y += hfs * 1.1; });
      lay.texts.push(H);
      y += hfs * 0.12;
    }
    if (el.rule) { lay.rects.push({ x: x0, y, w: x1 - x0, h: Math.max(0.12, fs * 0.07), fill: el.color, opacity: 0.8 }); y += fs * 0.75; }
    const P = TL(f, Number(el.weight) || 500, fs, tr, el.color, 'start');
    const colW = Math.min(...cols.map(c => c[1] - c[0]));
    const lines = wrapLines(el.text, f, P.weight, false, fs, tr, null, colW);
    const lh = fs * clamp(Number(el.leading) || 1.3, 0.8, 3);
    splitColumns(lines, cols).forEach((ls, ci) => ls.forEach((t, i) => addLine(P, t, cols[ci][0], y + fs * 0.82 + i * lh)));
    lay.texts.push(P);
    const nMax = Math.max(...splitColumns(lines, cols).map(ls => ls.length), 0);
    return layoutBBox(lay, x0, Number(el.y) || 0, x1, y + fs * 0.82 + Math.max(0, nMax - 1) * lh + fs * 0.3);
  }

  // the claim lines: the first line large, the rest smaller; "Zinc Free" only when switched on, placed as the
  // client's label prints it ("Sugar Free · Zinc Free" on one line, "Gluten Free" on the next)
  function claimItems(el) {
    const ls = String(el.text || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (el.zinc) {
      const i = ls.findIndex(l => /^Sugar Free\s*·\s*Gluten Free$/.test(l));
      if (i >= 0) ls.splice(i, 1, 'Sugar Free · ' + LABEL.zinc, 'Gluten Free');
      else if (ls.length > 1) ls[1] = ls[1] + ' · ' + LABEL.zinc; else ls.push(LABEL.zinc);
    }
    return ls;
  }
  // wrap one claim line to maxW at its "·" separators (each claim kept whole, the separator kept at the line end);
  // a single claim wider than the column falls back to wrapping at its spaces
  function wrapClaims(str, f, wt, fs, maxW) {
    const parts = String(str || '').split(/\s*·\s*/).map(t => t.trim()).filter(Boolean);
    const units = parts.map((t, i) => i < parts.length - 1 ? t + ' ·' : t);
    const out = []; let line = '';
    units.forEach(u => {
      const t = line ? line + ' ' + u : u;
      if (measureWidth(f, wt, false, fs, 0, null, t) <= maxW + 1e-6) { line = t; return; }
      if (line) out.push(line);
      if (measureWidth(f, wt, false, fs, 0, null, u) <= maxW + 1e-6) line = u;
      else { const w = wrapLines(u, f, wt, false, fs, 0, null, maxW); line = w.pop(); w.forEach(x => out.push(x)); }
    });
    if (line) out.push(line);
    return out;
  }
  function claimsLayout(el, v) {
    const f = fontOf(el.font); const wt = Number(el.weight) || 700;
    const fs1 = Math.max(0.5, Number(el.size) || 8) * PT, fs2 = Math.max(0.5, Number(el.size2) || (Number(el.size) || 8) * 0.8) * PT;
    const lead = clamp(Number(el.leading) || 1.25, 0.8, 3);
    const items = claimItems(el);
    const lay = { rects: [], texts: [], crosses: false };
    const x = Number(el.x) || 0, y = Number(el.y) || 0;
    const A = TL(f, wt, fs1, 0, el.color, 'middle'), B = TL(f, wt, fs2, 0, el.color, 'middle');
    const W = v.trim.w, sf = v.safe;
    const band = el.finClear ? finBand(v) : null;
    const wide = items.map((t, i) => measureWidth(f, wt, false, i ? fs2 : fs1, 0, null, t));
    const span = Math.max(0, ...wide);
    if (band && x - span / 2 < band.x2 && x + span / 2 > band.x1) {
      // keep clear of the fin seal: the first claim in the column left of it, the others in the column right of
      // it, each line wrapped to its column after a "·" (every word and separator as the client wrote it)
      lay.crosses = true;
      const cL = [sf, band.x1], cR = [band.x2, W - sf];
      const left = wrapClaims(items[0], f, wt, fs1, cL[1] - cL[0]);
      const right = [];
      items.slice(1).forEach(t => wrapClaims(t, f, wt, fs2, cR[1] - cR[0]).forEach(l => right.push(l)));
      const hL = (left.length - 1) * fs1 * lead + fs1 * 0.72, hR = right.length ? (right.length - 1) * fs2 * lead + fs2 * 0.72 : 0;
      // the optional Zinc Free line grows the block both ways: its centre is where it is without that line
      let hR0 = hR;
      if (el.zinc) { const r0 = []; claimItems(Object.assign({}, el, { zinc: false })).slice(1).forEach(t => wrapClaims(t, f, wt, fs2, cR[1] - cR[0]).forEach(l => r0.push(l))); hR0 = r0.length ? (r0.length - 1) * fs2 * lead + fs2 * 0.72 : 0; }
      const top = y - fs1 * 0.72, mid = top + Math.max(hL, hR0) / 2;
      left.forEach((t, i) => addLine(A, t, (cL[0] + cL[1]) / 2, mid - hL / 2 + fs1 * 0.72 + i * fs1 * lead));
      right.forEach((t, i) => addLine(B, t, (cR[0] + cR[1]) / 2, mid - hR / 2 + fs2 * 0.72 + i * fs2 * lead));
    } else {
      // (the optional Zinc Free line adds one line: the block moves up by half of it, so it grows both ways)
      const extra = el.zinc ? (items.length - claimItems(Object.assign({}, el, { zinc: false })).length) * fs2 * lead : 0;
      let yy = y - extra / 2;
      items.forEach((t, i) => {
        if (i === 0) { addLine(A, t, x, yy); yy += (i + 1 < items.length ? fs2 : fs1) * lead + (fs1 - fs2) * 0.35; }
        else { addLine(B, t, x, yy); yy += fs2 * lead; }
      });
    }
    lay.texts.push(A, B);
    return layoutBBox(lay, x, y - fs1 * 0.72, x, y);
  }

  function warningLayout(el, v) {
    const f = fontOf(el.font); const wt = Number(el.weight) || 700;
    const fs = Math.max(0.5, Number(el.size) || 4.5) * PT, lh = fs * clamp(Number(el.leading) || 1.1, 0.8, 3);
    const pad = fs * 0.8;
    const x0 = Number(el.x) || 0, w = Math.max(8, Number(el.w) || 40), x1 = x0 + w, y0 = Number(el.y) || 0;
    const cols = blockColumns(v, el, x0 + pad, x1 - pad);
    const colW = Math.min(...cols.map(c => c[1] - c[0]));
    const lines = wrapLines(el.text, f, wt, false, fs, 0, null, colW);
    const parts = splitColumns(lines, cols);
    const T = TL(f, wt, fs, 0, el.color, 'start');
    parts.forEach((ls, ci) => ls.forEach((t, i) => addLine(T, t, cols[ci][0], y0 + pad + fs * 0.74 + i * lh)));
    const nMax = Math.max(0, ...parts.map(p => p.length));
    const h = pad * 2 + fs * 0.74 + Math.max(0, nMax - 1) * lh + fs * 0.22;
    const lay = { rects: el.box ? [{ x: x0, y: y0, w, h, fill: el.boxColor || '#ffffff' }] : [], texts: [T], crosses: cols.length > 1 };
    return layoutBBox(lay, x0, y0, x1, y0 + h);
  }
  function blockLayout(key, el, v) {
    if (key === 'facts') return factsLayout(el, v);
    if (key === 'ingredients') return ingredientsLayout(el, v);
    if (key === 'claims') return claimsLayout(el, v);
    if (key === 'warning') return warningLayout(el, v);
    return null;
  }
  function renderBlock(key, el, v, env) {
    const lay = blockLayout(key, el, v); if (!lay) return '';
    return grpOpen(key, env) + layoutMarkup(lay) + '</g>';
  }
  // the words that would sit under the fin seal (a quiet check; the layout keeps them clear when it can)
  function finOverlaps(m) {
    const v = panelView(m, 'back'); const band = finBand(v); if (!band) return [];
    const out = [];
    const inBand = (a, b) => a < band.x2 - 0.05 && b > band.x1 + 0.05;
    v.order.forEach(key => {
      const el = v.els[key]; if (!el || !el.visible) return;
      let hit = false;
      if (BLOCK_KEYS.includes(key)) {
        const lay = blockLayout(key, el, v);
        hit = lay.texts.some(L => L.lines.some(l => { const s = lineSpan(L, l); return inBand(s[0], s[1]); }));
      } else if (TEXT_KEYS.includes(key)) {
        hit = textGeometry(el, elText(key, el)).lines.some(l => l.t && inBand(l.x1, l.x2));
      }
      if (hit) out.push(EL_INFO[key].label);
    });
    return out;
  }

  // Where type must not go on a panel (mm, 1 mm clear of each seal): the wrapper's end seals; the bag's top seal,
  // zip track, side seals and tear notches. (The fin seal has its own band, finBand.)
  const SEAL_CLEAR = 1;
  function sealZones(v) {
    const s = specOf(v); const W = v.trim.w, H = v.trim.h, c = SEAL_CLEAR, out = [];
    const z = (name, x1, y1, x2, y2) => { if (x2 > x1 && y2 > y1) out.push({ name, x1, y1, x2, y2 }); };
    if (v.format === 'wrapper') {
      const es = s.endSeal || {}, t = Number(es.top) || 0, b = Number(es.bottom) || 0;
      if (t > 0) z('end seal', -99, -99, W + 99, t + c);
      if (b > 0) z('end seal', -99, H - b - c, W + 99, H + 99);
    } else if (v.format === 'bag') {
      const ts = Number(s.topSeal) || 0, ss = Number(s.sideSeal) || 0, zp = s.zip || {}, tn = s.tearNotch || {};
      if (ts > 0) z('top seal', -99, -99, W + 99, ts + c);
      if (Number(zp.bottom) > Number(zp.top)) z('zip', -99, Number(zp.top) - c, W + 99, Number(zp.bottom) + c);
      if (ss > 0) { z('side seal', -99, -99, ss + c, H + 99); z('side seal', W - ss - c, -99, W + 99, H + 99); }
      const d = Number(tn.depth) || 0, ny = Number(tn.fromTop) || 0;
      if (d > 0) { z('tear notch', -99, ny - d - c, d + c, ny + d + c); z('tear notch', W - d - c, ny - d - c, W + 99, ny + d + c); }
    }
    return out;
  }
  // every visible line of words (and the logo, the heart badge) of a panel as a box in mm
  function typeBoxes(v) {
    const out = [];
    const line = (key, x1, x2, y1, y2) => out.push({ key, x1, x2, y1, y2 });
    v.order.forEach(key => {
      const el = v.els[key]; if (!el || !el.visible) return;
      if (BLOCK_KEYS.includes(key)) {
        blockLayout(key, el, v).texts.forEach(L => L.lines.forEach(l => { const sp = lineSpan(L, l); line(key, sp[0], sp[1], l.y - L.fs * 0.75, l.y + L.fs * 0.22); }));
      } else if (key === 'badge') {
        const w = Math.max(4, Number(el.w) || 20), hh = w * HEART_H;
        line(key, el.x - w / 2, el.x + w / 2, el.y - hh / 2, el.y + hh / 2);
      } else if (key === 'logo' && el.style === 'upload') {
        const a = ASSETS[el.upload.src]; if (!a) return;
        const w = Math.max(1, Number(el.upload.w) || 40); line(key, el.x - w / 2, el.x + w / 2, el.y, el.y + w * a.h / a.w);
      } else if (key === 'logo' || TEXT_KEYS.includes(key)) {
        const str = key === 'logo' ? el.text : elText(key, el); if (!String(str || '').trim()) return;
        const g = key === 'logo' ? logoGeometry(el) : textGeometry(el, str);
        g.lines.forEach(l => { if (l.t) line(key, l.x1, l.x2, l.base - g.cap * 1.05, l.base + g.fs * 0.22); });
      }
    });
    return out;
  }
  // the words that sit on a seal, the zip or a tear notch: [{ side, label, where }]
  function sealOverlaps(m) {
    const out = [];
    ['front', 'back'].forEach(side => {
      const v = panelView(m, side); const zones = sealZones(v); if (!zones.length) return;
      const seen = {};
      typeBoxes(v).forEach(b => zones.forEach(zn => {
        if (b.x1 < zn.x2 && b.x2 > zn.x1 && b.y1 < zn.y2 && b.y2 > zn.y1) {
          const k = b.key + '|' + zn.name; if (seen[k]) return; seen[k] = 1;
          out.push({ side, key: b.key, label: EL_INFO[b.key].label, where: zn.name });
        }
      }));
    });
    return out;
  }

  // The end seals of a flow wrap (MPItems wrapper.endSeal): ribbed bands printed in the panel's own colours, with
  // straight cut edges. The ribs run on into the bleed so the cut is clean.
  function renderSeals(v, env) {
    if (v.format !== 'wrapper' || v.bg.ribs === false) return '';
    const s = specOf(v); const es = s.endSeal || {};
    const nR = Math.max(0, Math.round(Number(es.ribs) || 0)); if (!nR) return '';
    const W = v.trim.w, H = v.trim.h, b = v.bleed + 1;
    const st = clamp(Number(v.bg.ribStrength) || 1, 0, 2);
    let out = '<g id="' + env.idp + 'seal-ribs" pointer-events="none">';
    const band = (y0, y1, from, dir) => {
      const h = y1 - y0; if (!(h > 0)) return '';
      const p = h / nR;
      let g = '<rect x="' + n(-b) + '" y="' + n(dir > 0 ? y0 - b : y0) + '" width="' + n(W + 2 * b) + '" height="' + n(h + b) + '" fill="#000000" opacity="' + n(0.05 * st, 3) + '"/>';
      const lines = [];
      for (let i = -Math.ceil(b / p) - 1; i < nR + Math.ceil(b / p) + 1; i++) {
        const c = from + dir * (i + 0.5) * p;                       // rib centre, counted from the cut edge inwards
        if (dir > 0 ? (c < y0 - b || c > y1) : (c > y1 + b || c < y0)) continue;
        lines.push(c);
      }
      lines.forEach(c => {
        g += '<rect x="' + n(-b) + '" y="' + n(c - p * 0.17) + '" width="' + n(W + 2 * b) + '" height="' + n(p * 0.3) + '" fill="#000000" opacity="' + n(0.17 * st, 3) + '"/>';
        g += '<rect x="' + n(-b) + '" y="' + n(c + p * 0.2) + '" width="' + n(W + 2 * b) + '" height="' + n(p * 0.2) + '" fill="#ffffff" opacity="' + n(0.13 * st, 3) + '"/>';
      });
      return g;
    };
    const top = Number(es.top) || 0, bot = Number(es.bottom) || 0;
    if (top > 0) out += band(0, top, 0, 1);
    if (bot > 0) out += band(H - bot, H, H, -1);
    return out + '</g>';
  }
  function renderEl(key, el, m, env, defs) {
    if (key === 'logo') return renderLogo(el, m, env, defs);
    if (key === 'badge') return renderBadge(el, m, env, defs);
    if (key === 'pop') return renderPop(el, m, env, defs);
    if (BLOCK_KEYS.includes(key)) return renderBlock(key, el, m, env);
    return renderTextEl(key, el, m, env, defs);
  }
  // env: { idp: id prefix, editor: bool, href(assetId) }
  // over (mm, at most 0.6): the artwork runs this far past the bleed, for renders whose edge sits exactly on
  // the bleed line (so the edge pixels are solid). The background art keeps the same fit in every file.
  function buildDesign(m, env, over, side) {
    const v = panelView(m, side || 'front');
    const W = v.trim.w, H = v.trim.h, b = v.bleed + (over || 0);
    const defs = [];
    defs.push('<clipPath id="' + env.idp + 'clip-bleed"><rect x="' + n(-b) + '" y="' + n(-b) + '" width="' + n(W + 2 * b) + '" height="' + n(H + 2 * b) + '"/></clipPath>');
    let body = renderBackground(v, env, defs) + renderSeals(v, env);
    for (const key of v.order) {
      const el = v.els[key]; if (!el || !el.visible) continue;
      body += renderEl(key, el, v, env, defs);
    }
    return { defs: defs.join(''), body: '<g id="' + env.idp + 'artwork" clip-path="url(#' + env.idp + 'clip-bleed)">' + body + '</g>' };
  }

  /* =========================================================================================
   * 8. Fonts: page loading + embedding for exports
   * ======================================================================================= */
  const fontLinks = {};
  function addFontLinks() {
    FONTS.forEach(f => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = fontCSSURL(f);
      fontLinks[f.id] = new Promise(res => { l.onload = () => res(true); l.onerror = () => res(false); setTimeout(() => res(false), 6000); });
      document.head.appendChild(l);
    });
  }
  // the fonts (family, style, weights, characters) a design uses; sides: which panels (default: both);
  // extra: [[fontId, weight, text]] for type outside the panels (the print layout's title block)
  function fontUses(m, sides, extra) {
    const uses = new Map();
    const add = (fontId, weight, italic, str) => {
      if (!str) return;
      const f = fontOf(fontId); const style = italic ? 'italic' : 'normal'; const key = f.id + '|' + style;
      if (!uses.has(key)) uses.set(key, { f, style, weights: new Set(), chars: new Set() });
      const u = uses.get(key); u.weights.add(Number(weight) || 400);
      for (const ch of String(str)) { const cp = ch.codePointAt(0); if (cp >= 0x20) u.chars.add(cp); }   // line breaks are not glyphs
    };
    (sides || ['front', 'back']).forEach(side => {
      const v = panelView(m, side);
      for (const key of v.order) {
        const el = v.els[key]; if (!el || !el.visible) continue;
        if (key === 'pop') continue;
        if (key === 'logo') { if (el.style !== 'upload') { const lf = logoFont(el); add(lf.font, el.weight, lf.italic, el.text); } continue; }
        if (key === 'facts') {
          add(el.font, 700, false, (el.showTitle ? el.title : '') + (el.showHead ? (el.headAmount || '') + (el.headDV || '') : ''));
          add(el.font, 400, false, (el.servingSizeOn ? el.servingSize : '') + (el.servingsLabel || '') + ' ' + (el.servings || '___') + (el.footnote || '') + (el.rows || []).map(r => (r.name || '') + (r.amount || '') + (r.dv || '')).join(''));
          continue;
        }
        if (key === 'ingredients') { add(el.font, el.headWeight || 700, false, el.heading); add(el.font, el.weight, false, el.text); continue; }
        if (key === 'claims') { add(el.font, el.weight, false, claimItems(el).join(' ')); continue; }
        if (key === 'warning') { add(el.font, el.weight, false, el.text); continue; }
        add(el.font, el.weight, el.italic, elText(key, el));
      }
    });
    (extra || []).forEach(x => add(x[0], x[1], false, x[2]));
    return uses;
  }
  const loadedFontKeys = new Set();
  async function ensureFonts(m, timeout, extra) {
    if (!document.fonts || !document.fonts.load) return;
    const uses = fontUses(m, null, extra); const jobs = [];
    for (const u of uses.values()) {
      await fontLinks[u.f.id];
      for (const w of u.weights) {
        const spec = (u.style === 'italic' ? 'italic ' : '') + w + ' 24px ' + fontStack(u.f);
        const text = String.fromCodePoint.apply(null, [...u.chars].slice(0, 200));
        const key = spec + '|' + text;
        if (loadedFontKeys.has(key)) continue;
        jobs.push(document.fonts.load(spec, text).then(() => { loadedFontKeys.add(key); }).catch(() => {}));
      }
    }
    if (!jobs.length) return;
    await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, timeout || 5000))]);
  }
  function missingFonts(m) {
    const out = [];
    if (!document.fonts) return out;
    const loaded = new Set();
    document.fonts.forEach(ff => { if (ff.status === 'loaded') loaded.add(String(ff.family).replace(/["']/g, '') + '|' + ff.style); });
    for (const u of fontUses(m).values()) if (!loaded.has(u.f.family + '|' + u.style)) out.push(u.f.family + (u.style === 'italic' ? ' Italic' : ''));
    return out;
  }
  const faceCache = new Map(), binCache = new Map();
  function parseFaces(css) {
    const faces = []; const re = /@font-face\s*\{([^}]*)\}/g; let mm;
    while ((mm = re.exec(css))) {
      const body = mm[1];
      const get = k => { const r = new RegExp('(?:^|;|\\s)' + k + '\\s*:\\s*([^;]+);').exec(body); return r ? r[1].trim() : ''; };
      const family = get('font-family').replace(/^['"]|['"]$/g, '');
      const style = get('font-style') || 'normal';
      const weight = get('font-weight') || '400';
      const ws = weight.split(/\s+/).map(Number);
      const url = (/url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(get('src')) || [])[1];
      const ur = get('unicode-range');
      if (url) faces.push({ family, style, weight, wmin: ws[0], wmax: ws[1] || ws[0], url, ur, ranges: parseRanges(ur) });
    }
    return faces;
  }
  function parseRanges(ur) {
    if (!ur) return [[0, 0x10ffff]];
    return ur.split(',').map(s => s.trim().replace(/^U\+/i, '')).filter(Boolean).map(s => {
      if (s.indexOf('-') > 0) { const p = s.split('-'); return [parseInt(p[0], 16), parseInt(p[1], 16)]; }
      if (s.indexOf('?') >= 0) return [parseInt(s.replace(/\?/g, '0'), 16), parseInt(s.replace(/\?/g, 'F'), 16)];
      const v = parseInt(s, 16); return [v, v];
    });
  }
  function facesFor(f) {
    if (!faceCache.has(f.id)) {
      faceCache.set(f.id, fetch(fontCSSURL(f)).then(r => { if (!r.ok) throw new Error('Google Fonts answered ' + r.status); return r.text(); }).then(parseFaces)
        .catch(e => { faceCache.delete(f.id); throw e; }));
    }
    return faceCache.get(f.id);
  }
  function fontData(url) {
    if (!binCache.has(url)) {
      binCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error('font file ' + r.status); return r.arrayBuffer(); })
        .then(buf => 'data:font/woff2;base64,' + bytesToB64(new Uint8Array(buf))).catch(e => { binCache.delete(url); throw e; }));
    }
    return binCache.get(url);
  }
  // Embeds exactly the font files the page uses (same Google Fonts CSS, same woff2), limited to the
  // unicode subsets and styles the design actually needs, so the SVG renders identically anywhere.
  async function embeddedFontCSS(m, sides, extra) {
    const uses = fontUses(m, sides, extra); let css = ''; const families = [];
    for (const u of uses.values()) {
      const faces = await facesFor(u.f);
      let any = false;
      for (const face of faces) {
        if (face.family !== u.f.family || face.style !== u.style) continue;
        if (![...u.weights].some(w => w >= face.wmin && w <= face.wmax)) continue;
        if (![...u.chars].some(cp => face.ranges.some(r => cp >= r[0] && cp <= r[1]))) continue;
        const data = await fontData(face.url);
        css += "@font-face{font-family:'" + face.family + "';font-style:" + face.style + ';font-weight:' + face.weight + ';src:url(' + data + ") format('woff2');" + (face.ur ? 'unicode-range:' + face.ur + ';' : '') + '}\n';
        any = true;
      }
      if (any) families.push(u.f.family + (u.style === 'italic' ? ' Italic' : '') + ' ' + [...u.weights].sort().join('/'));
    }
    return { css, families };
  }

  /* =========================================================================================
   * 9. Exports: SVG, PNG (300 dpi + pHYs), print PDF, design JSON, 3D render
   * ======================================================================================= */
  // file names: format_design-name_date[_DRAFT]_suffix. DRAFT while the design has open items (a blank, or a
  // missing or stand-in picture), so an unfinished file can never pass for the final one.
  function sideOf(side) { return side === 'back' ? 'back' : side === 'front' ? 'front' : state.side; }
  // file names: format_design-name_date[_DRAFT]_side_suffix. DRAFT while that panel (or, for the print layout and
  // the design file, any panel) has an open item: a blank, a missing or stand-in picture.
  function fileBase(suffix, side) {
    const m = state.model; const F = FORMATS[m.format];
    const draft = side === 'front' || side === 'back' ? isDraft(m, side) : isDraft(m);
    return F.slug + '_' + slug(m.name) + '_' + today() + (draft ? '_DRAFT' : '') + (side ? '_' + side : '') + (suffix ? '_' + suffix : '');
  }
  function sizeLabel(m, withBleed) {
    const b = withBleed ? m.bleed : 0;
    return n(m.trim.w + 2 * b, 2) + ' × ' + n(m.trim.h + 2 * b, 2) + ' mm';
  }
  async function buildExportSVG(opts) {
    opts = opts || {};
    const m = opts.model || state.model; const W = m.trim.w, H = m.trim.h; const b = opts.bleed ? m.bleed : 0;
    const side = sideOf(opts.side);
    await ensureFonts(m, 4000);
    const env = { idp: opts.idp || 'mp-', editor: false, href: id => assetHref(id, 'data') };
    const d = buildDesign(m, env, opts.pxW ? 0.5 : 0, side);   // pixel renders: solid edge pixels at the bleed line
    let fontCSS = '', families = [], fontsOK = true, fontErr = '';
    if (opts.embedFonts !== false) {
      try { const r = await embeddedFontCSS(m, [side]); fontCSS = r.css; families = r.families; }
      catch (e) { fontsOK = false; fontErr = e && e.message || String(e); }
    }
    const vb = n(-b) + ' ' + n(-b) + ' ' + n(W + 2 * b) + ' ' + n(H + 2 * b);
    const size = opts.pxW ? 'width="' + opts.pxW + '" height="' + opts.pxH + '"' : 'width="' + n(W + 2 * b) + 'mm" height="' + n(H + 2 * b) + 'mm"';
    const F = FORMATS[m.format];
    const title = 'MODEL POPS · ' + m.name + ' · ' + F.label + ' · ' + SIDES[side] + ' panel';
    const desc = 'Trim ' + sizeLabel(m, false) + (b ? ', with ' + b + ' mm bleed (' + sizeLabel(m, true) + ')' : ' (no bleed)') + '. 1 unit = 1 mm. Item spec INTERIM: proportions from client drafts. Made with Model Pops Label Studio, ' + today() + '. Fonts: ' + (families.join(', ') || 'none embedded') + '.';
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ' + size + ' viewBox="' + vb + '" text-rendering="geometricPrecision">' +
      '<title>' + esc(title) + '</title><desc>' + esc(desc) + '</desc>' +
      (fontCSS ? '<style><![CDATA[\n' + fontCSS + ']]></style>' : '') +
      '<defs>' + d.defs + '</defs>' + d.body + '</svg>';
    return { svg, fontsOK, fontErr, families, side };
  }
  async function svgToCanvas(svg, pxW, pxH) {
    const img = await loadImage('data:image/svg+xml;base64,' + utf8ToB64(svg));
    try { await img.decode(); } catch (e) { /* already decoded */ }
    const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, pxW, pxH);
    return c;
  }
  // --- PNG pHYs (dots per inch) ---
  const CRC_T = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  function crc32(u8, start, end) { let c = 0xFFFFFFFF; for (let i = start; i < end; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function withPHYs(png, dpi) {
    const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const ppm = Math.round(dpi / 0.0254);
    const chunk = new Uint8Array(21); const cv = new DataView(chunk.buffer);
    cv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); cv.setUint32(8, ppm); cv.setUint32(12, ppm); chunk[16] = 1;
    cv.setUint32(17, crc32(chunk, 4, 17));
    const parts = [png.subarray(0, 8)]; let off = 8; let inserted = false;
    while (off < png.length) {
      const len = dv.getUint32(off); const type = String.fromCharCode(png[off + 4], png[off + 5], png[off + 6], png[off + 7]);
      const end = off + 12 + len;
      if (type !== 'pHYs') parts.push(png.subarray(off, end));
      if (type === 'IHDR' && !inserted) { parts.push(chunk); inserted = true; }
      off = end;
    }
    const total = parts.reduce((a, p) => a + p.length, 0); const out = new Uint8Array(total); let o = 0;
    parts.forEach(p => { out.set(p, o); o += p.length; });
    return out;
  }
  async function renderPNG(opts) {
    const m = state.model; const dpi = opts.dpi || 300; const b = opts.bleed ? m.bleed : 0;
    const side = sideOf(opts.side);
    const pxW = Math.round((m.trim.w + 2 * b) / 25.4 * dpi), pxH = Math.round((m.trim.h + 2 * b) / 25.4 * dpi);
    const r = await buildExportSVG({ bleed: !!opts.bleed, pxW, pxH, side });
    const c = await svgToCanvas(r.svg, pxW, pxH);
    const blob = await new Promise((res, rej) => c.toBlob(bl => bl ? res(bl) : rej(new Error('PNG encoding failed')), 'image/png'));
    const png = withPHYs(new Uint8Array(await blob.arrayBuffer()), dpi);
    return { blob: new Blob([png], { type: 'image/png' }), pxW, pxH, fontsOK: r.fontsOK, side };
  }
  async function exportSVGFile(bleed, side) {
    side = sideOf(side);
    const r = await buildExportSVG({ bleed: !!bleed, side });
    const name = fileBase(bleed ? 'bleed' : 'trim', side) + '.svg';
    download(new Blob([r.svg], { type: 'image/svg+xml' }), name);
    toast(r.fontsOK ? 'Saved ' + name + ' (fonts embedded)' : 'Saved ' + name + ', but the fonts could not be embedded (offline?). Reconnect and export again.', !r.fontsOK);
    return name;
  }
  async function exportPNGFile(bleed, side) {
    side = sideOf(side);
    const r = await renderPNG({ dpi: 300, bleed: !!bleed, side });
    const name = fileBase('300dpi' + (bleed ? '-bleed' : ''), side) + '.png';
    download(r.blob, name);
    if (r.fontsOK) toast('Saved ' + name + ' · ' + r.pxW + ' × ' + r.pxH + ' px at 300 dpi');
    else toast('Saved ' + name + ', but the fonts could not be fetched (offline?), so stand-in fonts were used. Reconnect and export again.', true);
    return name;
  }
  function saveDesignFile() {
    const name = fileBase() + '.json';
    download(new Blob([JSON.stringify(serialize(true), null, 1)], { type: 'application/json' }), name);
    toast('Saved ' + name + ' (pictures included)');
    return name;
  }
  async function openDesignFile(file) {
    try {
      const txt = await readFile(file, 'text');
      await loadDesignData(JSON.parse(txt));
      hist.stack = []; hist.i = -1; commit();
      afterModelReplaced(true);
      toast('Opened ' + file.name);
    } catch (e) { toast('Could not open that file: ' + (e.message || e), true); }
  }

  /* ---- the print layout (production): every panel of the item on one sheet + a separate dieline layer ----
   * Wrapper: the flow-wrap web, left to right [fin allowance + back half | front | back half + fin allowance]
   *   (MPItems.wrapper.web(): width 2 W + 2 fin, repeat = the flat height). Seen from outside, as printed: the
   *   allowances carry the back's art on past the centre, so the fin reads as one with the back whichever way it folds.
   * Bag: front | back side by side, the bottom gusset panel below. 3-pack: front | back.
   * Layout coordinates in mm; (0, 0) = top-left of the layout's trim (bleed outside). */
  const DIE = { cut: '#ec008c', fold: '#ec008c', seal: '#00a3e0', zip: '#ec008c', bleed: '#ec008c', text: '#ec008c' };
  function layoutGeometry(m) {
    const s = specOf(m); const W = m.trim.w, H = m.trim.h, b = m.bleed;
    if (m.format === 'wrapper') {
      const web = wrapperWeb(m); const fin = Number(s.finSeal && s.finSeal.width) || 0;
      const P = web.panels;
      return { kind: 'web', w: web.w, h: web.repeat, W, H, b, fin, web,
        pieces: [
          { side: 'back', x: P[0].x, y: 0, w: P[0].w, h: H, src: W - P[0].w, bl: b, br: 0, label: '½ BACK' },
          { side: 'front', x: P[1].x, y: 0, w: P[1].w, h: H, src: 0, bl: 0, br: 0, label: 'FRONT' },
          { side: 'back', x: P[2].x, y: 0, w: P[2].w, h: H, src: 0, bl: 0, br: b, label: '½ BACK' }] };
    }
    const G = 2 * b;
    if (m.format === 'bag') {
      const gd = Math.max(0, Number(s.gusset && s.gusset.depth) || 0);
      const w = 2 * W + G, h = H + (gd > 0 ? G + gd : 0);
      const pieces = [{ side: 'front', x: 0, y: 0, w: W, h: H, src: 0, bl: b, br: b, label: 'FRONT' }, { side: 'back', x: W + G, y: 0, w: W, h: H, src: 0, bl: b, br: b, label: 'BACK' }];
      if (gd > 0) pieces.push({ side: 'gusset', x: (w - W) / 2, y: H + G, w: W, h: gd, src: 0, bl: b, br: b, label: 'BOTTOM GUSSET' });
      return { kind: 'pouch', w, h, W, H, b, G, gd, pieces };
    }
    const strip = 16;     // an info strip under the panels (the title block lives there)
    return { kind: 'sheet', w: 2 * W + G, h: H + G + strip, W, H, b, G, strip,
      pieces: [{ side: 'front', x: 0, y: 0, w: W, h: H, src: 0, bl: b, br: b, label: 'FRONT' }, { side: 'back', x: W + G, y: 0, w: W, h: H, src: 0, bl: b, br: b, label: 'BACK' }] };
  }
  function titleBlockLines(m, L) {
    const s = specOf(m); const F = FORMATS[m.format];
    const a = ['MODEL POPS · ' + m.name + ' · ' + F.label + ' · print layout (all panels)'];
    if (L.kind === 'web') {
      const fold = finFold(s.finSeal);
      a.push('Flow-wrap web ' + n(L.w, 1) + ' mm wide × ' + n(L.h, 1) + ' mm repeat · panel ' + n(L.W, 1) + ' × ' + n(L.H, 1) + ' mm · bleed ' + n(L.b, 1) + ' mm · end seals ' + n(s.endSeal.top, 1) + ' / ' + n(s.endSeal.bottom, 1) + ' mm, ' + s.endSeal.ribs + ' ribs · sides folded');
      a.push('Fin seal ' + n(L.fin, 1) + ' mm: both allowances meet at the seam on the back centre line; fin laid ' + (fold === 'either' ? 'left or right per converter (type kept clear of both sides)' : 'to the ' + fold + ', seen from the back'));
      a.push('Eye mark (the wrapping machine’s cut register): position per converter');
    } else if (L.kind === 'pouch') {
      const tn = s.tearNotch || {};
      a.push('Front + back ' + n(L.W, 1) + ' × ' + n(L.H, 1) + ' mm · bottom gusset ' + n(L.W, 1) + ' × ' + n(L.gd, 1) + ' mm (round bottom, folded in the middle) · bleed ' + n(L.b, 1) + ' mm');
      a.push('Top corners R' + n(s.cornerRadius, 1) + ' · zip ' + n(s.zip.top, 1) + '–' + n(s.zip.bottom, 1) + ' mm from the top · tear notches ' + n(tn.fromTop, 1) + ' mm from the top, ' + (tn.shape === 'round' ? 'round R' : 'V ') + n(tn.depth, 1) + ' · top seal ' + n(s.topSeal, 1) + ' / side seals ' + n(s.sideSeal, 1) + ' / gusset: assumptions');
      a.push('Panels ' + n(L.G, 1) + ' mm apart (bleed + bleed): layout spacing only, not a converter dimension');
    } else {
      a.push('Front + back ' + n(L.W, 1) + ' × ' + n(L.H, 1) + ' mm · depth ' + n(s.depth, 1) + ' mm · bleed ' + n(L.b, 1) + ' mm · no dieline yet');
    }
    a.push(today() + ' · INTERIM: proportions from client drafts. Replace with the printer’s dieline.');
    a.push('Dieline (non-printing, never on the artwork page): ' + (L.kind === 'web' ? 'solid = cut · dashed = fold · tint = seal (end seals, fin allowances) · dotted = bleed'
      : L.kind === 'pouch' ? 'solid = cut · dashed = fold · tint = seal · dash-dot = zip · notch = tear notch · dotted = bleed' : 'solid = cut · dotted = bleed'));
    return a;
  }
  function notchPath(xl, xr, ny, d, shape) {
    if (shape === 'round') return 'M' + n(xl) + ',' + n(ny - d) + 'A' + n(d) + ',' + n(d) + ' 0 0 1 ' + n(xl) + ',' + n(ny + d) + 'M' + n(xr) + ',' + n(ny - d) + 'A' + n(d) + ',' + n(d) + ' 0 0 0 ' + n(xr) + ',' + n(ny + d);
    return 'M' + n(xl) + ',' + n(ny - d * 0.6) + 'L' + n(xl + d) + ',' + n(ny) + 'L' + n(xl) + ',' + n(ny + d * 0.6) + 'M' + n(xr) + ',' + n(ny - d * 0.6) + 'L' + n(xr - d) + ',' + n(ny) + 'L' + n(xr) + ',' + n(ny + d * 0.6);
  }
  // the dieline layer of a print layout (all in DIE colours, thin lines; seals as a flat translucent tint: plain
  // vector, so nothing in it is rasterised in a PDF)
  function dielineMarkup(m, L, idp) {
    const s = specOf(m); const W = L.W, H = L.H, b = L.b;
    const sw = 0.1, dash = 'stroke-dasharray="1.4 0.9"', dashdot = 'stroke-dasharray="2.2 0.7 0.4 0.7"', dot = 'stroke-dasharray="0.35 0.6"';
    const line = (x1, y1, x2, y2, col, extra) => '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + col + '" stroke-width="' + sw + '" fill="none"' + (extra ? ' ' + extra : '') + '/>';
    const rect = (x, y, w, h, col, extra) => '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" stroke="' + col + '" stroke-width="' + sw + '" fill="none"' + (extra ? ' ' + extra : '') + '/>';
    const tint = 'fill="' + DIE.seal + '" fill-opacity="0.2"';
    const seal = (x, y, w, h) => w > 0 && h > 0 ? '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" ' + tint + '/>' : '';
    const label = (t, x, y, size, anchor, rot) => '<text x="' + n(x) + '" y="' + n(y) + '" font-family="Arimo, Arial, sans-serif" font-weight="700" font-size="' + n(size, 3) + '" fill="' + DIE.text + '" text-anchor="' + (anchor || 'middle') + '"' + (rot ? ' transform="rotate(' + rot + ' ' + n(x) + ' ' + n(y) + ')"' : '') + '>' + esc(t) + '</text>';
    let cut = '', fold = '', seals = '', zip = '', notch = '', bleed = '', labels = '';
    const defs = '';
    if (L.kind === 'web') {
      const es = s.endSeal, fin = L.fin;
      cut += rect(0, 0, L.w, L.h, DIE.cut);
      bleed += rect(-b, -b, L.w + 2 * b, L.h + 2 * b, DIE.bleed, dot);
      [L.pieces[1].x, L.pieces[2].x].forEach(x => { fold += line(x, 0, x, L.h, DIE.fold, dash); });
      if (fin > 0) { fold += line(fin, 0, fin, L.h, DIE.fold, dash) + line(L.w - fin, 0, L.w - fin, L.h, DIE.fold, dash); seals += seal(0, 0, fin, L.h) + seal(L.w - fin, 0, fin, L.h); }
      seals += seal(0, 0, L.w, Number(es.top) || 0) + seal(0, L.h - (Number(es.bottom) || 0), L.w, Number(es.bottom) || 0);
      const ty = Math.max(1.6, (Number(es.top) || 4) * 0.62);
      L.pieces.forEach(p => { labels += label(p.label, p.x + (p === L.pieces[0] ? fin : 0) + (p.w - (p === L.pieces[1] ? 0 : fin)) / 2, ty, 1.7); });
      if (fin > 0) { labels += label('FIN', fin / 2, ty, 1.5) + label('FIN', L.w - fin / 2, ty, 1.5); }
      // title block: up the left fin allowance (a narrow strip with room for it). It is part of the dieline, which never
      // prints: in the PDF it is only on the separate dieline page, in the SVG only in the dieline layer
      const tl = titleBlockLines(m, L); const fsz = clamp(fin / (tl.length + 0.4), 0.9, 1.5);
      tl.forEach((t, i) => { labels += label(t, fin * 0.05 + (i + 0.9) * fsz, L.h - (Number(es.bottom) || 0) - 2, fsz * 0.86, 'start', -90); });
    } else {
      L.pieces.forEach(p => {
        bleed += rect(p.x - b, p.y - b, p.w + 2 * b, p.h + 2 * b, DIE.bleed, dot);
        labels += label(p.label + (p.side === 'gusset' ? ' · FRONT HALF' : ''), p.x + p.w / 2, p.y + (p.side === 'gusset' ? p.h * 0.25 + 1.2 : Math.max(3.2, (Number(s.topSeal) || 0) * 0.6)), 2.2);
        if (p.side === 'gusset') labels += label('BACK HALF', p.x + p.w / 2, p.y + p.h * 0.75 + 1.2, 2.2);
        if (L.kind === 'pouch' && p.side !== 'gusset') {
          const r = clamp(Number(s.cornerRadius) || 0, 0, Math.min(p.w, p.h) / 2), x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
          cut += '<path d="M' + n(x0) + ',' + n(y1) + 'V' + n(y0 + r) + (r ? 'A' + n(r) + ',' + n(r) + ' 0 0 1 ' + n(x0 + r) + ',' + n(y0) : '') + 'H' + n(x1 - r) + (r ? 'A' + n(r) + ',' + n(r) + ' 0 0 1 ' + n(x1) + ',' + n(y0 + r) : '') + 'V' + n(y1) + 'Z" stroke="' + DIE.cut + '" stroke-width="' + sw + '" fill="none"/>';
          const ts = Number(s.topSeal) || 0, ss = Number(s.sideSeal) || 0, gd = Number(s.gusset && s.gusset.depth) || 0;
          seals += seal(x0, y0, p.w, ts) + seal(x0, y0 + ts, ss, p.h - ts) + seal(x1 - ss, y0 + ts, ss, p.h - ts);
          if (gd > 0) {     // round-bottom gusset: the corners are sealed to the gusset along an arc (indicative)
            const g = gd / 2;
            seals += '<path d="M' + n(x0 + ss) + ',' + n(y1 - g) + 'Q' + n(x0 + ss) + ',' + n(y1) + ' ' + n(x0 + ss + g * 1.25) + ',' + n(y1) + 'H' + n(x0 + ss) + 'Z" ' + tint + '/>';
            seals += '<path d="M' + n(x1 - ss) + ',' + n(y1 - g) + 'Q' + n(x1 - ss) + ',' + n(y1) + ' ' + n(x1 - ss - g * 1.25) + ',' + n(y1) + 'H' + n(x1 - ss) + 'Z" ' + tint + '/>';
          }
          const z = s.zip || {};
          if (z.bottom > z.top) { zip += line(x0 + ss, y0 + Number(z.top), x1 - ss, y0 + Number(z.top), DIE.zip, dashdot) + line(x0 + ss, y0 + Number(z.bottom), x1 - ss, y0 + Number(z.bottom), DIE.zip, dashdot); labels += label('ZIP', x1 - ss - 1.2, y0 + (Number(z.top) + Number(z.bottom)) / 2 + 0.6, 1.6, 'end'); }
          const tn = s.tearNotch || {}; const d = Number(tn.depth) || 0, ny = y0 + (Number(tn.fromTop) || 0);
          if (d > 0) notch += '<path d="' + notchPath(x0, x1, ny, d, tn.shape) + '" stroke="' + DIE.cut + '" stroke-width="' + sw + '" fill="none"/>';
        } else if (p.side === 'gusset') {
          cut += rect(p.x, p.y, p.w, p.h, DIE.cut);
          fold += line(p.x, p.y + p.h / 2, p.x + p.w, p.y + p.h / 2, DIE.fold, dash);
          const ss = Number(s.sideSeal) || 0;
          seals += seal(p.x, p.y, ss, p.h) + seal(p.x + p.w - ss, p.y, ss, p.h);
        } else {
          cut += rect(p.x, p.y, p.w, p.h, DIE.cut);
        }
      });
      const tl = titleBlockLines(m, L);
      if (L.kind === 'pouch') {
        const gx = L.pieces[2] ? L.pieces[2].x + L.pieces[2].w + L.G : L.w * 0.55, gy = L.H + L.G;
        const bw = L.w - gx, fsz = clamp(Math.min(bw / 62, 2.1), 1.1, 2.1);
        tl.forEach((t, i) => { labels += label(t, gx + 1, gy + 2.5 + i * fsz * 1.35, fsz * (i ? 0.78 : 0.92), 'start'); });
      } else {
        const fsz = clamp(L.strip / (tl.length + 1.2), 1.1, 2.2);
        tl.forEach((t, i) => { labels += label(t, 0, L.H + L.G + fsz * 1.2 + i * fsz * 1.15, fsz * (i ? 0.8 : 0.95), 'start'); });
      }
    }
    const grp = (id, name, inner) => inner ? '<g id="' + id + '" data-name="' + name + '">' + inner + '</g>' : '';
    return { defs, body: grp('dieline-seal', 'Seals (non-printing tint)', seals) + grp('dieline-bleed', 'Bleed', bleed) + grp('dieline-fold', 'Folds', fold) + grp('dieline-zip', 'Zip', zip) +
      grp('dieline-notch', 'Tear notches', notch) + grp('dieline-cut', 'Cut / trim', cut) + grp('dieline-title', 'Title block', labels) };
  }
  // art + dieline of the print layout. opts: { env (href), idp, over (mm of extra art past the outer bleed) }
  function buildLayout(m, opts) {
    opts = opts || {};
    const L = layoutGeometry(m); const b = L.b, over = opts.over || 0;
    const idp = opts.idp || 'ly-';
    const href = opts.href || (id => assetHref(id, 'data'));
    const defs = []; let art = '';
    L.pieces.forEach((p, i) => {
      const cid = idp + 'piece-' + i;
      // outer edges get the bleed (and the page's extra), inner joins of the web none
      const atL = p.x <= 1e-6, atR = Math.abs(p.x + p.w - L.w) < 1e-6, atT = p.y <= 1e-6, atB = Math.abs(p.y + p.h - L.h) < 1e-6;
      const bl = p.bl ? p.bl + (atL ? over : 0) : 0, br = p.br ? p.br + (atR ? over : 0) : 0, bt = b + (atT ? over : 0), bb = b + (atB ? over : 0);
      defs.push('<clipPath id="' + cid + '"><rect x="' + n(p.x - bl) + '" y="' + n(p.y - bt) + '" width="' + n(p.w + bl + br) + '" height="' + n(p.h + bt + bb) + '"/></clipPath>');
      if (p.side === 'gusset') {
        // folded in the middle: the half next to the panels joins the front, the far half the back (plain colours:
        // each panel's colour at its bottom edge)
        const col = side => { const bg = m.panels[side].bg; return bg.mode === 'two-tone' ? bg.c2 : bg.c1; };
        const mid = p.y + p.h / 2;
        art += '<g id="' + idp + 'gusset" clip-path="url(#' + cid + ')"><rect x="' + n(p.x - bl) + '" y="' + n(p.y - bt) + '" width="' + n(p.w + bl + br) + '" height="' + n(mid - (p.y - bt)) + '" fill="' + esc(col('front')) + '"/>' +
          '<rect x="' + n(p.x - bl) + '" y="' + n(mid) + '" width="' + n(p.w + bl + br) + '" height="' + n(p.y + p.h + bb - mid) + '" fill="' + esc(col('back')) + '"/></g>';
        return;
      }
      const env = { idp: idp + i + '-', editor: false, href };
      const d = buildDesign(m, env, over, p.side);
      defs.push(d.defs);
      art += '<g id="' + idp + 'panel-' + i + '-' + p.side + '" clip-path="url(#' + cid + ')"><g transform="translate(' + n(p.x - p.src) + ' ' + n(p.y) + ')">' + d.body + '</g></g>';
    });
    const die = dielineMarkup(m, L, idp);
    return { L, defs: defs.join('') + die.defs, art, dieline: die.body };
  }
  const INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape';
  async function buildLayoutSVG(opts) {
    opts = opts || {};
    const m = state.model; const withDie = !!opts.dieline;
    const L0 = layoutGeometry(m); const tl = titleBlockLines(m, L0);
    const extra = withDie ? [['arimo', 700, tl.join(' ') + 'FRONT BACK ½ FIN ZIP BOTTOM GUSSET']] : [];
    await ensureFonts(m, 4000, extra);
    const Ly = buildLayout(m, { idp: 'ly-' }); const L = Ly.L, b = L.b;
    let fontCSS = '', families = [], fontsOK = true;
    if (opts.embedFonts !== false) {
      try { const r = await embeddedFontCSS(m, ['front', 'back'], extra); fontCSS = r.css; families = r.families; } catch (e) { fontsOK = false; }
    }
    const F = FORMATS[m.format];
    const W2 = L.w + 2 * b, H2 = L.h + 2 * b;
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="' + INKSCAPE_NS + '" version="1.1" width="' + n(W2) + 'mm" height="' + n(H2) + 'mm" viewBox="' + n(-b) + ' ' + n(-b) + ' ' + n(W2) + ' ' + n(H2) + '" text-rendering="geometricPrecision">' +
      '<title>' + esc('MODEL POPS · ' + m.name + ' · ' + F.label + ' · print layout (all panels)') + '</title>' +
      '<desc>' + esc('Layout ' + n(L.w, 2) + ' × ' + n(L.h, 2) + ' mm + ' + n(b, 2) + ' mm bleed = ' + n(W2, 2) + ' × ' + n(H2, 2) + ' mm. 1 unit = 1 mm. ' + (withDie ? 'The dieline is the separate group "dieline" (non-printing). ' : 'Exported without the dieline. ') + 'INTERIM: proportions from client drafts; replace with the printer’s dieline. Fonts: ' + (families.join(', ') || 'none embedded') + '.') + '</desc>' +
      (fontCSS ? '<style><![CDATA[\n' + fontCSS + ']]></style>' : '') +
      '<defs>' + Ly.defs + '</defs>' +
      '<g id="artwork" inkscape:groupmode="layer" inkscape:label="Artwork">' + Ly.art + '</g>' +
      (withDie ? '<g id="dieline" inkscape:groupmode="layer" inkscape:label="Dieline (non-printing)">' + Ly.dieline + '</g>' : '') + '</svg>';
    return { svg, fontsOK, families, w: L.w, h: L.h, b, pageW: W2, pageH: H2 };
  }
  // dieline: false (default) = artwork only; true = the dieline as a separate, named layer on top
  async function exportLayoutSVG(dieline) {
    const r = await buildLayoutSVG({ dieline: !!dieline });
    const name = fileBase(dieline ? 'print-layout-with-dieline' : 'print-layout', 'layout') + '.svg';
    download(new Blob([r.svg], { type: 'image/svg+xml' }), name);
    toast(r.fontsOK ? 'Saved ' + name + ' · ' + n(r.pageW, 1) + ' × ' + n(r.pageH, 1) + ' mm' : 'Saved ' + name + ', but the fonts could not be embedded (offline?).', !r.fontsOK);
    return name;
  }
  // --- print PDF: a print-only sheet, @page sized in mm, margin 0 ---
  // Chrome's PDF writer rounds a page size to whole points and then to whole 1/300 inch, so pageGrid() picks
  // a size on that grid (it passes through both roundings unchanged: the page we ask for is the page we get).
  // Chrome also clips what it paints to whole CSS pixels, rounded to the nearest one; a page whose pixel size
  // rounds down would keep a white hairline (< 0.13 mm) at its right / bottom edge, so such sizes are skipped.
  // Result: the smallest clean size that is at least `mm` (in practice up to ~0.7 mm larger: more bleed).
  function pageGrid(mm) {
    let first = 0;
    for (let p = Math.max(1, Math.floor(mm / PT) - 1); p < 100000; p++) {
      const q = Math.round(p * 300 / 72) / 300 * 25.4;
      if (q < mm - 1e-6) continue;
      if (!first) first = q;
      const px = q / 25.4 * 96, fr = px - Math.floor(px);
      if (fr >= 0.5 || fr < 0.004 || q - first > 1.5) return q;
    }
    return mm;
  }
  // the real print page: trim (or the whole print layout) centred, bleed (or crop-mark margin) a hair over the
  // nominal size on every side
  function printPage(m, crop, layout) {
    let W = m.trim.w, H = m.trim.h;
    if (layout) { const L = layoutGeometry(m); W = L.w; H = L.h; crop = false; }
    const b = m.bleed, M = crop ? 10 : 0;
    const pw = pageGrid(W + 2 * (b + M)), ph = pageGrid(H + 2 * (b + M));
    return { pw, ph, M, W, H, ox: (pw - W) / 2, oy: (ph - H) / 2, bleedX: crop ? b : (pw - W) / 2, bleedY: crop ? b : (ph - H) / 2, layout: !!layout };
  }
  let pageStyle = null; let savedTitle = null; let textCtx = null;
  function setPrintSheet(svg, P, title, pages) {
    const sheet = $('#print-sheet'); pages = pages || 1;
    sheet.innerHTML = svg; sheet.style.width = n(P.pw, 4) + 'mm'; sheet.style.height = n(P.ph * pages, 4) + 'mm';
    sheet.classList.toggle('multi', pages > 1); document.documentElement.classList.toggle('mp-print-multi', pages > 1);
    if (!pageStyle) { pageStyle = document.createElement('style'); pageStyle.id = 'print-page-style'; document.head.appendChild(pageStyle); }
    pageStyle.textContent = '@page { size: ' + n(P.pw, 4) + 'mm ' + n(P.ph, 4) + 'mm; margin: 0; }';
    if (savedTitle === null) savedTitle = document.title;
    document.title = title;
  }
  // opts: { crop, side } for one panel, or { layout: true, dieline } for the print layout (all panels). The print
  // layout's page 1 is always the artwork alone (the page to print); with the dieline, page 2 repeats the artwork
  // with the dieline on top (for checking; it never prints over the artwork).
  function preparePrint(opts) {
    opts = opts || {};
    ui.lastPrint = { crop: !!opts.crop, layout: !!opts.layout, dieline: !!opts.dieline, side: sideOf(opts.side) };   // Ctrl+P repeats the last choice
    const m = state.model;
    if (opts.layout) {
      const P = printPage(m, false, true);
      const over = Math.max(P.ox, P.oy) - m.bleed + 0.2;
      const vb = n(-P.ox, 4) + ' ' + n(-P.oy, 4) + ' ' + n(P.pw, 4) + ' ' + n(P.ph, 4);
      const page = (Ly, inner) => '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + n(P.pw, 4) + 'mm" height="' + n(P.ph, 4) + 'mm" viewBox="' + vb + '" text-rendering="geometricPrecision"><defs>' + Ly.defs + '</defs>' + inner + '</svg>';
      const L1 = buildLayout(m, { idp: 'pl-', over });
      let svg = page(L1, '<g id="pl-artwork">' + L1.art + '</g>'), pages = 1;
      if (ui.lastPrint.dieline) {
        const L2 = buildLayout(m, { idp: 'pd-', over });      // (own ids: two pages in one document)
        svg = '<div class="pg" style="height:' + n(P.ph, 4) + 'mm">' + svg + '</div><div class="pg" style="height:' + n(P.ph, 4) + 'mm">' + page(L2, '<g id="pd-artwork">' + L2.art + '</g><g id="pd-dieline">' + L2.dieline + '</g>') + '</div>';
        pages = 2;
      }
      const title = fileBase(ui.lastPrint.dieline ? 'print-layout-with-dieline' : 'print-layout', 'layout');
      setPrintSheet(svg, P, title, pages);
      return { pw: P.pw, ph: P.ph, layoutW: P.W, layoutH: P.H, bleedX: P.bleedX, bleedY: P.bleedY, title, layout: true, dieline: ui.lastPrint.dieline, pages };
    }
    const side = ui.lastPrint.side;
    const W = m.trim.w, H = m.trim.h, b = m.bleed;
    const P = printPage(m, !!opts.crop); const M = P.M;
    const env = { idp: 'pr-', editor: false, href: id => assetHref(id, 'data') };
    // no crop marks: the artwork runs just past the page edge (the page clips it), so no hairline is left
    const d = buildDesign(m, env, opts.crop ? 0 : Math.max(P.ox, P.oy) - b + 0.2, side);
    let marks = '';
    if (opts.crop) {
      const o = b + 1.5, L = 6.5, sw = 0.12;
      const seg = (x1, y1, x2, y2) => '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '"/>';
      marks += '<g stroke="#000000" stroke-width="' + sw + '" fill="none">';
      [[0, 0, -1, -1], [W, 0, 1, -1], [0, H, -1, 1], [W, H, 1, 1]].forEach(c => {
        const [x, y, sx, sy] = c;
        marks += seg(x + sx * o, y, x + sx * (o + L), y) + seg(x, y + sy * o, x, y + sy * (o + L));
      });
      marks += '</g>';
      // the slug line sits between the two bottom crop marks (inside the trim's width), in the margin
      const F = FORMATS[m.format];
      const info = 'Model Pops | ' + m.name + ' | ' + F.label + ' ' + SIDES[side].toLowerCase() + ' panel | trim ' + sizeLabel(m, false).replace(' × ', ' x ') + ' | bleed ' + n(b, 2) + ' mm | ' + today();
      let em = info.length * 0.6;
      // measured at a small size: Inter's optical-size axis makes its small text (as here) wider than its large text
      try { if (!textCtx) textCtx = document.createElement('canvas').getContext('2d'); textCtx.font = '12px Inter, Arial, sans-serif'; em = textCtx.measureText(info).width / 12 || em; } catch (e) { /* estimate */ }
      const fsz = clamp((W - 3) / em, 0.8, 1.6);
      marks += '<text x="1" y="' + n(H + b + M - 1.4) + '" font-family="Inter, Arial, sans-serif" font-size="' + n(fsz, 3) + '" fill="#000000">' + esc(info) + '</text>';
    }
    const vb = n(-P.ox, 4) + ' ' + n(-P.oy, 4) + ' ' + n(P.pw, 4) + ' ' + n(P.ph, 4);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + n(P.pw, 4) + 'mm" height="' + n(P.ph, 4) + 'mm" viewBox="' + vb + '" text-rendering="geometricPrecision"><defs>' + d.defs + '</defs>' + d.body + marks + '</svg>';
    const title = fileBase(opts.crop ? 'print-marks' : 'print', side);
    setPrintSheet(svg, P, title);
    return { pw: P.pw, ph: P.ph, bleedX: P.bleedX, bleedY: P.bleedY, title, side };
  }
  // Ctrl+P / the browser's own Print: always print the current design (as the last print-PDF choice set it)
  window.addEventListener('beforeprint', () => { try { if (state.model) preparePrint(ui.lastPrint); } catch (e) { console.warn('[label-studio] print sheet:', e); } });
  window.addEventListener('afterprint', () => { if (savedTitle !== null) { document.title = savedTitle; savedTitle = null; } });
  async function printPDF(opts) {
    opts = opts || {};
    const extra = opts.layout ? [['arimo', 700, titleBlockLines(state.model, layoutGeometry(state.model)).join(' ') + 'FRONT BACK ½ FIN ZIP BOTTOM GUSSET']] : null;
    await ensureFonts(state.model, 8000, extra);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const miss = missingFonts(state.model);
    if (miss.length) { toast('Not printed: the font ' + miss.join(', ') + ' has not loaded (offline?). Connect to the internet and try again, so the PDF carries the real fonts.', true); return; }
    preparePrint(opts);
    await nextFrame(); await nextFrame();
    window.print();
  }

  /* =========================================================================================
   * 10. Editor stage (flat view, guides, selection, drag)
   * ======================================================================================= */
  const stage = () => $('#stage');
  const isLayoutView = () => ui.view === 'layout';
  function curView() { return panelView(state.model, state.side); }
  function stageGeometry() {
    const m = state.model; const b = m.bleed;
    let W = m.trim.w, H = m.trim.h;
    if (isLayoutView()) { const L = layoutGeometry(m); W = L.w; H = L.h; }
    const pad = Math.max(6, Math.min(W, H) * 0.07);
    return { W, H, b, pad, vx: -b - pad, vy: -b - pad, vw: W + 2 * (b + pad), vh: H + 2 * (b + pad) };
  }
  // the client's picture to show beside (or over) the current view: the drafts are fronts, the photo is the back
  function compareRef() {
    const m = state.model; if (!m || isLayoutView()) return null;
    if (state.side === 'back') return REFS.backlabel;
    return m.ref && REFS[m.ref] ? REFS[m.ref] : null;
  }
  // the flat (unwarped) draft lies exactly over the panel when it is a draft of this very format
  function overlayRef() { const r = compareRef(); return r && r.flat && r.format === state.model.format ? r : null; }
  function stageRoom() {
    const wrap = $('#stage-wrap');
    const availW = Math.max(120, wrap.clientWidth - 56), availH = Math.max(120, wrap.clientHeight - 64);
    const side = ui.compare && compareRef() && !(ui.compareMode !== 'side' && overlayRef());
    return { availW, availH, wShare: side ? (availW - 28) * 0.5 : availW };
  }
  function fitK() {
    const g = stageGeometry(); const r = stageRoom();
    return Math.max(0.5, Math.min(r.wShare / g.vw, r.availH / g.vh));
  }
  function layoutStage() {
    if (!state.model) return;                  // (resize / font events can arrive while a saved design loads)
    const g = stageGeometry();
    if (ui.zoomMode === 'fit') ui.k = fitK();
    const s = stage();
    s.setAttribute('viewBox', n(g.vx) + ' ' + n(g.vy) + ' ' + n(g.vw) + ' ' + n(g.vh));
    s.setAttribute('width', Math.round(g.vw * ui.k)); s.setAttribute('height', Math.round(g.vh * ui.k));
    $('#zoom-val').textContent = Math.round(ui.k / MM_PX * 100) + '%';
    const ref = compareRef();
    const cmp = $('#compare'); const show = ui.compare && !!ref && !(ui.compareMode !== 'side' && overlayRef());
    cmp.classList.toggle('on', show);
    if (show) {
      const img = $('#compare-img');
      if (img.getAttribute('src') !== ref.src) { img.onload = () => { if (ui.compare) layoutStage(); }; img.src = ref.src; }
      // as tall as the design, but never wider than its half of the stage (wide crops shrink to fit)
      let hpx = Math.round(g.vh * ui.k);
      const nw = img.naturalWidth, nh = img.naturalHeight;
      if (nw && nh) hpx = Math.min(hpx, Math.floor(stageRoom().wShare * nh / nw));
      img.style.height = Math.max(40, hpx) + 'px'; img.style.width = 'auto';
      $('#compare-cap').textContent = ref.label;
    }
  }
  // die-cut outline of a panel (the bag's top corners are rounded)
  function trimPath(v, x0, y0) {
    x0 = x0 || 0; y0 = y0 || 0;
    const W = v.trim.w, H = v.trim.h;
    const r = v.format === 'bag' ? clamp(Number(specOf(v).cornerRadius) || 0, 0, Math.min(W, H) / 2) : 0;
    if (!r) return 'M' + n(x0) + ',' + n(y0) + 'h' + n(W) + 'v' + n(H) + 'h' + n(-W) + 'Z';
    return 'M' + n(x0) + ',' + n(y0 + H) + 'V' + n(y0 + r) + 'A' + n(r) + ',' + n(r) + ' 0 0 1 ' + n(x0 + r) + ',' + n(y0) + 'H' + n(x0 + W - r) + 'A' + n(r) + ',' + n(r) + ' 0 0 1 ' + n(x0 + W) + ',' + n(y0 + r) + 'V' + n(y0 + H) + 'Z';
  }
  // editor guides from the item spec (never exported): seals, ribs, the fin seal band, zip, notches, gusset
  function guidesMarkup(v) {
    const s = specOf(v); const W = v.trim.w, H = v.trim.h;
    const hair = 'vector-effect="non-scaling-stroke"';
    const fsz = clamp(Math.min(W, H) * 0.028, 1.3, 3);
    const lab = (t, x, y, size, rot, anchor) => '<text x="' + n(x) + '" y="' + n(y) + '" text-anchor="' + (anchor || 'middle') + '"' + (rot ? ' transform="rotate(' + rot + ' ' + n(x) + ' ' + n(y) + ')"' : '') + ' font-family="Inter, sans-serif" font-weight="600" font-size="' + n(size || fsz, 2) + '" letter-spacing="0.15" fill="#1f5fc9" stroke="#ffffff" stroke-width="' + n((size || fsz) * 0.18, 3) + '" stroke-linejoin="round" paint-order="stroke">' + esc(t) + '</text>';
    const band = (x, y, w, h, fill) => w > 0 && h > 0 ? '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" fill="' + (fill || 'url(#ed-hatch)') + '"/>' : '';
    const ln = (x1, y1, x2, y2, dash, op) => '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="#1f5fc9" stroke-width="1"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + (op ? ' opacity="' + op + '"' : '') + ' ' + hair + '/>';
    let g = '';
    if (v.format === 'wrapper') {
      const es = s.endSeal || {}; const t = Number(es.top) || 0, bt = Number(es.bottom) || 0;
      if (t > 0) g += band(0, 0, W, t) + ln(0, t, W, t) + lab('END SEAL ' + n(t, 1) + ' mm · ' + (es.ribs || 0) + ' ribs', W / 2, t / 2 + fsz * 0.36);
      if (bt > 0) g += band(0, H - bt, W, bt) + ln(0, H - bt, W, H - bt) + lab('END SEAL ' + n(bt, 1) + ' mm', W / 2, H - bt / 2 + fsz * 0.36);
      g += ln(0, t, 0, H - bt, '2 3', 0.9) + ln(W, t, W, H - bt, '2 3', 0.9);           // the sides are folds, not cuts
      g += lab('FOLD', -fsz * 0.55, H / 2, fsz * 0.8, -90) + lab('FOLD', W + fsz * 0.55, H / 2, fsz * 0.8, 90);
      const fb = finBand(v);
      if (fb) {
        // keep-clear band (hatched, dashed edges); where the laid fin can lie (tinted); the seam (dash-dot)
        g += band(fb.x1, t, fb.x2 - fb.x1, H - t - bt, 'url(#ed-hatch-fin)') + ln(fb.x1, t, fb.x1, H - bt, '4 3') + ln(fb.x2, t, fb.x2, H - bt, '4 3');
        fb.covers.forEach(c => { g += band(c[0], t, c[1] - c[0], H - t - bt, 'rgba(31,95,201,0.07)'); });
        g += ln(fb.seam, t, fb.seam, H - bt, '6 2 1 2');
        const side = fb.fold === 'either' ? 'laid left or right (ask the converter)' : 'laid to the ' + fb.fold;
        g += lab('FIN SEAL ' + n(fb.fin, 1) + ' mm · seam on the centre line · ' + side + ' · ' + n(fb.clear, 1) + ' mm clear · keep type out', fb.seam - fsz * 0.45, H * 0.6, fsz * 0.8, -90);
      }
    } else if (v.format === 'bag') {
      const ts = Number(s.topSeal) || 0, ss = Number(s.sideSeal) || 0, z = s.zip || {}, tn = s.tearNotch || {}, gd = Number(s.gusset && s.gusset.depth) || 0;
      if (ts > 0) g += band(0, 0, W, ts) + ln(0, ts, W, ts) + lab('TOP SEAL ' + n(ts, 1) + ' mm', W / 2, ts / 2 + fsz * 0.36);
      if (ss > 0) g += band(0, ts, ss, H - ts) + band(W - ss, ts, ss, H - ts) + ln(ss, ts, ss, H, '3 3', 0.8) + ln(W - ss, ts, W - ss, H, '3 3', 0.8) + lab('SIDE SEAL ' + n(ss, 1) + ' mm', ss / 2 + fsz * 0.35, H * 0.55, fsz * 0.85, -90);
      if (Number(z.bottom) > Number(z.top)) g += band(ss, Number(z.top), W - 2 * ss, Number(z.bottom) - Number(z.top), 'url(#ed-hatch-zip)') + ln(ss, Number(z.top), W - ss, Number(z.top), '6 2 1 2') + ln(ss, Number(z.bottom), W - ss, Number(z.bottom), '6 2 1 2') + lab('ZIP ' + n(z.top, 1) + '–' + n(z.bottom, 1) + ' mm', W / 2, (Number(z.top) + Number(z.bottom)) / 2 + fsz * 0.36);
      const d = Number(tn.depth) || 0, ny = Number(tn.fromTop) || 0;
      if (d > 0) g += '<path d="' + notchPath(0, W, ny, d, tn.shape) + '" fill="rgba(31,95,201,0.25)" stroke="#1f5fc9" stroke-width="1" ' + hair + '/>' + lab('TEAR NOTCH', d + fsz * 0.5, ny + fsz * 0.36, fsz * 0.8, 0, 'start');
      if (gd > 0) {
        const gh = gd / 2;
        g += '<path d="M' + n(ss) + ',' + n(H - gh) + 'Q' + n(ss) + ',' + n(H) + ' ' + n(ss + gh * 1.25) + ',' + n(H) + 'H' + n(ss) + 'Z M' + n(W - ss) + ',' + n(H - gh) + 'Q' + n(W - ss) + ',' + n(H) + ' ' + n(W - ss - gh * 1.25) + ',' + n(H) + 'H' + n(W - ss) + 'Z" fill="url(#ed-hatch)" stroke="#1f5fc9" stroke-width="1" ' + hair + '/>';
        g += lab('GUSSET SEAL', ss + gh * 0.45, H - fsz * 0.5, fsz * 0.7, 0, 'middle') + lab('GUSSET SEAL', W - ss - gh * 0.45, H - fsz * 0.5, fsz * 0.7, 0, 'middle');
      }
    }
    return g;
  }
  function renderStage() {
    const m = state.model; const g = stageGeometry(); const { W, H, b } = g;
    const hair = 'vector-effect="non-scaling-stroke"';
    let s = '<defs>' +
      '<pattern id="ed-hatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.2" height="2.2" fill="rgba(31,95,201,0.07)"/><line x1="0" y1="0" x2="0" y2="2.2" stroke="rgba(31,95,201,0.45)" stroke-width="0.35"/></pattern>' +
      '<pattern id="ed-hatch-fin" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="2.2" height="2.2" fill="rgba(31,95,201,0.05)"/><line x1="0" y1="0" x2="0" y2="2.2" stroke="rgba(31,95,201,0.3)" stroke-width="0.25"/></pattern>' +
      '<pattern id="ed-hatch-zip" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><rect width="1.6" height="1.6" fill="rgba(31,95,201,0.06)"/><line x1="0" y1="0.8" x2="1.6" y2="0.8" stroke="rgba(31,95,201,0.4)" stroke-width="0.25"/></pattern>' +
      '<filter id="ed-paper" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="0.6" stdDeviation="1.4" flood-color="#2a2125" flood-opacity="0.18"/></filter>';
    s += '<rect class="mp-pasteboard" x="' + n(g.vx) + '" y="' + n(g.vy) + '" width="' + n(g.vw) + '" height="' + n(g.vh) + '" fill="transparent"/>';
    if (isLayoutView()) {
      // the print layout, read-only: every panel as it will print, with the dieline on top; click a panel to edit it
      const Ly = buildLayout(m, { idp: 'ev-', href: id => assetHref(id, 'blob') }); const L = Ly.L;
      s = s.replace('<rect class="mp-pasteboard"', Ly.defs + '</defs><rect class="mp-pasteboard"');
      s += '<rect x="' + n(-b) + '" y="' + n(-b) + '" width="' + n(L.w + 2 * b) + '" height="' + n(L.h + 2 * b) + '" fill="#fff" filter="url(#ed-paper)"/>';
      s += Ly.art + '<g pointer-events="none">' + Ly.dieline + '</g>';
      L.pieces.forEach(p => { if (p.side !== 'gusset') s += '<rect class="mp-piece" data-side="' + p.side + '" x="' + n(p.x) + '" y="' + n(p.y) + '" width="' + n(p.w) + '" height="' + n(p.h) + '" fill="transparent"><title>Edit the ' + p.side + '</title></rect>'; });
      s += dielineOverlay(0, 0, L.w, L.h);
      stage().innerHTML = s + '<g id="ed-sel" pointer-events="none"></g>';
      return;
    }
    const v = curView();
    const env = { idp: 'ed-', editor: true, href: id => assetHref(id, 'blob') };
    const d = buildDesign(m, env, 0, state.side);
    s = s.replace('<rect class="mp-pasteboard"', d.defs + '<clipPath id="ed-clip-trim"><path d="' + trimPath(v) + '"/></clipPath></defs><rect class="mp-pasteboard"');
    const box = ui.showBleed ? { x: -b, y: -b, w: W + 2 * b, h: H + 2 * b } : { x: 0, y: 0, w: W, h: H };
    s += '<rect x="' + n(box.x) + '" y="' + n(box.y) + '" width="' + n(box.w) + '" height="' + n(box.h) + '" fill="#fff" filter="url(#ed-paper)"/>';
    s += '<g' + (ui.showBleed ? '' : ' clip-path="url(#ed-clip-trim)"') + '>' + d.body + '</g>';
    // the client's flat draft laid exactly over the panel (Compare: overlay / difference)
    const ov = ui.compare && ui.compareMode !== 'side' ? overlayRef() : null;
    if (ov) s += '<image class="mp-ref-overlay" href="' + ov.flat + '" x="0" y="0" width="' + n(W) + '" height="' + n(H) + '" preserveAspectRatio="none" pointer-events="none" opacity="' + n(ui.compareMode === 'diff' ? 1 : ui.compareOpacity, 2) + '"' + (ui.compareMode === 'diff' ? ' style="mix-blend-mode:difference"' : '') + '/>';
    // guides (editor only, never exported)
    s += '<g class="mp-guides" pointer-events="none">';
    if (ui.showBleed) {
      s += '<path d="M' + n(-b) + ',' + n(-b) + 'h' + n(W + 2 * b) + 'v' + n(H + 2 * b) + 'h' + n(-(W + 2 * b)) + 'Z ' + trimPath(v) + '" fill="rgba(255,255,255,0.42)" fill-rule="evenodd"/>';
      s += '<rect x="' + n(-b) + '" y="' + n(-b) + '" width="' + n(W + 2 * b) + '" height="' + n(H + 2 * b) + '" fill="none" stroke="#e5484d" stroke-width="1" stroke-dasharray="5 4" ' + hair + '/>';
    }
    if (ui.showGuides) s += guidesMarkup(v);
    if (ui.showSafe) {
      // seal-aware: never closer to a cut than the safe margin, never on a seal (seal + 1 mm). The bag's zip and
      // notches sit inside it: Seals shows them, and type on them is flagged.
      const sp = specOf(v), sf = m.safe; let t = sf, bt = sf, lr = sf;
      if (m.format === 'wrapper') { t = Math.max(sf, (Number(sp.endSeal.top) || 0) + SEAL_CLEAR); bt = Math.max(sf, (Number(sp.endSeal.bottom) || 0) + SEAL_CLEAR); }
      else if (m.format === 'bag') { t = Math.max(sf, (Number(sp.topSeal) || 0) + SEAL_CLEAR); lr = Math.max(sf, (Number(sp.sideSeal) || 0) + SEAL_CLEAR); }
      s += '<rect x="' + n(lr) + '" y="' + n(t) + '" width="' + n(W - 2 * lr) + '" height="' + n(H - t - bt) + '" fill="none" stroke="#1f5fc9" stroke-width="1" stroke-dasharray="3 3" opacity="0.85" ' + hair + '/>';
    }
    s += '<path d="' + trimPath(v) + '" fill="none" stroke="#1f5fc9" stroke-width="1.25" ' + hair + '/>';
    if (ui.snapX !== null) s += '<line x1="' + n(ui.snapX) + '" y1="' + n(-b) + '" x2="' + n(ui.snapX) + '" y2="' + n(H + b) + '" stroke="#e5484d" stroke-width="1" ' + hair + '/>';
    s += '</g>' + dielineOverlay(0, 0, W, H) + '<g id="ed-sel" pointer-events="none"></g>';
    stage().innerHTML = s;
    drawSelection();
  }
  // the printer's dieline (loaded by the user) over the current view: centred on the trim, then nudged / scaled
  function dielineOverlay(x0, y0, W, H) {
    const D = ui.dieline; if (!D || !D.show) return '';
    const w = D.wmm * D.scale, h = D.hmm * D.scale;
    const x = x0 + (W - w) / 2 + D.dx, y = y0 + (H - h) / 2 + D.dy;
    return '<image class="mp-dieline" href="' + D.view + '" x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" preserveAspectRatio="none" opacity="' + n(D.opacity, 2) + '" pointer-events="none"/>';
  }
  function elBBox(key) {
    const node = stage().querySelector('[data-el="' + key + '"]');
    if (!node) return null;
    try { const bb = node.getBBox(); return bb.width || bb.height ? bb : null; } catch (e) { return null; }
  }
  function drawSelection() {
    const host = $('#ed-sel'); if (!host) return;
    if (isLayoutView()) { host.innerHTML = ''; return; }
    let s = '';
    const box = (bb, sel) => {
      const p = 0.8;
      return '<rect x="' + n(bb.x - p) + '" y="' + n(bb.y - p) + '" width="' + n(bb.width + 2 * p) + '" height="' + n(bb.height + 2 * p) + '" fill="none" stroke="' + (sel ? '#1f5fc9' : 'rgba(31,95,201,0.55)') + '" stroke-width="' + (sel ? 1.5 : 1) + '"' + (sel ? '' : ' stroke-dasharray="4 3"') + ' vector-effect="non-scaling-stroke"/>';
    };
    if (ui.hover && ui.hover !== state.sel && ui.hover !== 'background') { const bb = elBBox(ui.hover); if (bb) s += box(bb, false); }
    if (state.sel && state.sel !== 'background') {
      const bb = elBBox(state.sel);
      if (bb) s += box(bb, true);
    }
    host.innerHTML = s;
  }
  function toMM(evt) {
    const s = stage(); const pt = s.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = s.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse()); return { x: p.x, y: p.y };
  }
  function visualCenterX(key) {
    const v = curView(); const el = v.els[key]; if (!el) return 0;
    if (key === 'pop' || key === 'badge' || (key === 'logo' && el.style === 'upload')) return el.x;
    if (BLOCK_KEYS.includes(key)) { const b = blockLayout(key, el, v).bbox; return (b.x1 + b.x2) / 2; }
    const g = key === 'logo' ? logoGeometry(el) : textGeometry(el, elText(key, el));
    const ls = g.lines.filter(l => l.t); if (!ls.length) return el.x;
    return (Math.min.apply(null, ls.map(l => l.x1)) + Math.max.apply(null, ls.map(l => l.x2))) / 2;
  }
  let drag = null;
  function onStageDown(e) {
    if (e.button !== 0) return;
    if (isLayoutView()) {
      const t = e.target.closest ? e.target.closest('[data-side]') : null;
      if (t) setView(t.getAttribute('data-side'));
      return;
    }
    const t = e.target.closest ? e.target.closest('[data-el]') : null;
    const key = t ? t.getAttribute('data-el') : null;
    if (!key) { select(null); return; }
    select(key, true);
    const P = curPanel();
    let start;
    if (key === 'background') { if (P.bg.mode !== 'image') return; start = { x: Number(P.bg.image.ox) || 0, y: Number(P.bg.image.oy) || 0 }; }
    else start = { x: P.els[key].x, y: P.els[key].y };
    drag = { key, p0: toMM(e), start, moved: false, id: e.pointerId, cOff: key !== 'background' ? visualCenterX(key) - start.x : 0 };
    try { stage().setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  }
  function onStageMove(e) {
    if (isLayoutView()) return;
    if (!drag) {
      const t = e.target.closest ? e.target.closest('[data-el]') : null;
      const key = t ? t.getAttribute('data-el') : null;
      if (key !== ui.hover) { ui.hover = key; drawSelection(); }
      return;
    }
    const p = toMM(e); let dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (!drag.moved && Math.hypot(dx, dy) * ui.k < 3) return;
    drag.moved = true; ui.dragging = true;
    const m = state.model; const P = curPanel();
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    let nx = n(drag.start.x + dx, 1), ny = n(drag.start.y + dy, 1);
    ui.snapX = null;
    if (drag.key === 'background') { P.bg.image.ox = nx; P.bg.image.oy = ny; }
    else {
      const el = P.els[drag.key];
      const cx = nx + drag.cOff;
      if (Math.abs(cx - m.trim.w / 2) * ui.k < 6) { nx = n(m.trim.w / 2 - drag.cOff, 3); ui.snapX = m.trim.w / 2; }
      el.x = nx; el.y = ny;
    }
    invalidate();
  }
  function onStageUp() {
    if (!drag) return;
    const moved = drag.moved; drag = null; ui.dragging = false; ui.snapX = null;
    if (moved) { commit(); invalidate({ three: true }); } else invalidate();
  }
  function nudge(dx, dy) {
    const key = state.sel; if (!key || isLayoutView()) return;
    const P = curPanel();
    if (key === 'background') { if (P.bg.mode !== 'image') return; P.bg.image.ox = n((Number(P.bg.image.ox) || 0) + dx, 2); P.bg.image.oy = n((Number(P.bg.image.oy) || 0) + dy, 2); }
    else { const el = P.els[key]; el.x = n(el.x + dx, 2); el.y = n(el.y + dy, 2); }
    invalidate(); commitSoon();
  }
  const commitSoon = debounce(commit, 500);

  /* =========================================================================================
   * 11. Panels: presets, format, layers, inspector
   * ======================================================================================= */
  function h(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function renderPresets() {
    const host = $('#presets'); host.innerHTML = '';
    PRESETS.forEach(p => {
      const row = h('div', { class: 'preset' });
      const btn = h('button', { class: 'preset-btn' + (state.model && state.model.preset === p.id ? ' on' : ''), type: 'button', title: 'Start from ' + p.name, onclick: () => applyPreset(p.id) },
        '<span class="swatch2' + (p.land ? ' land' : '') + '" style="background:linear-gradient(180deg,' + p.sw[0] + ' 0 50%,' + p.sw[1] + ' 50% 100%)"></span><span style="min-width:0"><span class="t">' + esc(p.name) + '</span><br><span class="s">' + esc(presetSub(p.fmt, p.lead)) + '</span></span>');
      row.appendChild(btn);
      const ref = p.ref && REFS[p.ref];
      const th = h('button', { class: 'ref-thumb' + (ref ? '' : ' empty'), type: 'button', title: ref ? 'Compare with: ' + ref.label : '', 'aria-label': ref ? 'Compare with ' + ref.label : null, tabindex: ref ? null : '-1',
        onclick: () => { if (!ref) return; if (state.model.ref !== p.ref) { state.model.ref = p.ref; } if (ui.view !== 'front') setView('front'); ui.compare = true; syncToggles(); layoutAndRender(); } },
      ref ? '<img src="' + ref.src + '" alt="">' : '');
      row.appendChild(th);
      host.appendChild(row);
    });
  }

  // ---- control builders bound to model paths ----
  let bindings = [];
  // paths: 'els.*', 'bg.*' and 'order' belong to the panel being edited (front or back); others to the design
  function curPanel() { return state.model.panels[state.side]; }
  function rootOf(path) { const k = path.split('.')[0]; return k === 'els' || k === 'bg' || k === 'order' ? curPanel() : state.model; }
  function getP(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), rootOf(path)); }
  function setP(path, v) { const ks = path.split('.'); let o = rootOf(path); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
  function fieldWrap(label, ctl, valSpan) {
    const f = h('label', { class: 'field' });
    const l = h('span', { class: 'lbl' }); l.appendChild(document.createTextNode(label)); if (valSpan) l.appendChild(valSpan);
    f.appendChild(l); f.appendChild(ctl); return f;
  }
  function cNumber(label, path, o) {
    o = Object.assign({ step: 0.5, min: -9999, max: 9999, unit: '', digits: 2 }, o || {});
    const wrap = h('div', { class: 'unit', 'data-unit': o.unit || '' });
    const inp = h('input', { class: 'inp', type: 'number', step: o.step, min: o.min, max: o.max, inputmode: 'decimal' });
    const show = () => { const v = getP(path); inp.value = v === '' || v === null || v === undefined ? '' : n(Number(v), o.digits); };
    show();
    inp.addEventListener('input', () => {
      if (inp.value === '' && o.allowEmpty) { setP(path, ''); invalidate(o.after); return; }
      const v = parseFloat(inp.value); if (!isFinite(v)) return; setP(path, clamp(v, o.min, o.max)); invalidate(o.after);
    });
    inp.addEventListener('change', () => { commit(); show(); invalidate({ three: true }); });
    bindings.push({ el: inp, sync: show });
    wrap.appendChild(inp);
    return fieldWrap(label, wrap);
  }
  function cRange(label, path, o) {
    o = Object.assign({ step: 1, min: 0, max: 100, fmt: v => v }, o || {});
    const val = h('span', { class: 'val' });
    const inp = h('input', { type: 'range', min: o.min, max: o.max, step: o.step });
    const show = () => { const v = Number(getP(path)); inp.value = v; val.textContent = o.fmt(v); };
    show();
    inp.addEventListener('input', () => { setP(path, parseFloat(inp.value)); val.textContent = o.fmt(parseFloat(inp.value)); invalidate(o.after); });
    inp.addEventListener('change', () => { commit(); invalidate({ three: true }); });
    bindings.push({ el: inp, sync: show });
    return fieldWrap(label, inp, val);
  }
  function cText(label, path, o) {
    o = o || {};
    const ta = o.multi ? h('textarea', { class: 'ta', rows: o.rows || 2, spellcheck: 'true' }) : h('input', { class: 'inp', type: 'text', spellcheck: 'true' });
    const show = () => { ta.value = getP(path) == null ? '' : String(getP(path)); };
    show();
    ta.addEventListener('input', () => { setP(path, ta.value); invalidate(o.after || { layers: true }); });
    ta.addEventListener('change', () => { commit(); invalidate({ three: true }); });
    bindings.push({ el: ta, sync: show });
    const f = fieldWrap(label, ta);
    if (o.hint) f.appendChild(h('span', { class: 'hint', style: 'margin:0' }, o.hint));
    return f;
  }
  function cSelect(label, path, options, o) {
    o = o || {};
    const sel = h('select', { class: 'sel' });
    options.forEach(op => {
      if (op.group) { const g = h('optgroup', { label: op.group }); op.items.forEach(it => g.appendChild(h('option', { value: it[0] }, esc(it[1])))); sel.appendChild(g); }
      else sel.appendChild(h('option', { value: op[0] }, esc(op[1])));
    });
    const show = () => { sel.value = String(getP(path)); };
    show();
    sel.addEventListener('change', () => { const v = o.num ? Number(sel.value) : sel.value; setP(path, v); if (o.onChange) o.onChange(v); commit(); invalidate(Object.assign({ three: true }, o.after || {})); if (o.rebuild) buildInspector(); });
    bindings.push({ el: sel, sync: show });
    return fieldWrap(label, sel);
  }
  function cSeg(label, path, options, o) {
    o = o || {};
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
    const show = () => { const v = getP(path); $$('button', seg).forEach(b => b.classList.toggle('on', String(b.dataset.v) === String(v))); };
    options.forEach(op => {
      const b = h('button', { type: 'button', 'data-v': op[0], title: op[2] || op[1] }, (op[3] ? icon(op[3], 'ico-sm') : '') + esc(op[1]));
      b.addEventListener('click', () => {
        const v = typeof op[0] === 'boolean' ? op[0] : (o.num ? Number(op[0]) : op[0]);
        if (o.onSet) o.onSet(v); else setP(path, v);
        show(); commit(); invalidate(Object.assign({ three: true }, o.after || {}));
        if (o.rebuild) buildInspector();
      });
      seg.appendChild(b);
    });
    show();
    bindings.push({ el: seg, sync: show });
    return label ? fieldWrap(label, seg) : seg;
  }
  function cCheck(label, path, o) {
    o = o || {};
    const lab = h('label', { class: 'chk' }); const inp = h('input', { type: 'checkbox' });
    const show = () => { inp.checked = !!getP(path); };
    show();
    inp.addEventListener('change', () => { setP(path, inp.checked); if (o.onChange) o.onChange(inp.checked); commit(); invalidate(Object.assign({ three: true, layers: true }, o.after || {})); if (o.rebuild) buildInspector(); });
    bindings.push({ el: inp, sync: show });
    lab.appendChild(inp); lab.appendChild(document.createTextNode(label));
    return lab;
  }
  function cColor(label, path, o) {
    o = o || {};
    const wrap = h('div', { class: 'fields', style: 'gap:6px' });
    const sws = h('div', { class: 'swatches' });
    const list = o.swatches || SWATCHES;
    list.forEach(sw => {
      const b = h('button', { type: 'button', class: 'sw', style: 'background:' + sw[0], title: sw[1] + ' ' + sw[0], 'aria-label': sw[1], 'data-c': sw[0] });
      b.addEventListener('click', () => { setP(path, sw[0]); show(); commit(); invalidate({ three: true }); });
      sws.appendChild(b);
    });
    const row = h('div', { class: 'colorbox' });
    const pick = h('input', { type: 'color', 'aria-label': label + ' colour picker' });
    const hex = h('input', { class: 'inp', type: 'text', maxlength: 7, spellcheck: 'false', 'aria-label': label + ' hex' });
    const show = () => {
      const v = normHex(getP(path)) || '#000000';
      pick.value = v; if (document.activeElement !== hex) hex.value = v;
      $$('.sw', sws).forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === v));
    };
    pick.addEventListener('input', () => { setP(path, pick.value); hex.value = pick.value; $$('.sw', sws).forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === pick.value)); invalidate(); });
    pick.addEventListener('change', () => { commit(); invalidate({ three: true }); });
    hex.addEventListener('input', () => { const v = normHex(hex.value); if (v) { setP(path, v); pick.value = v; invalidate(); } });
    hex.addEventListener('change', () => { commit(); show(); invalidate({ three: true }); });
    row.appendChild(pick); row.appendChild(hex);
    wrap.appendChild(sws); wrap.appendChild(row);
    show(); bindings.push({ el: hex, sync: show });
    return fieldWrap(label, wrap);
  }
  function syncInspector() { bindings.forEach(b => { if (document.activeElement !== b.el) { try { b.sync(); } catch (e) { /* control gone */ } } }); }

  function fontOptions() {
    const groups = {};
    FONTS.forEach(f => { (groups[f.group] = groups[f.group] || []).push([f.id, f.family + ' · ' + f.kind]); });
    return Object.keys(groups).map(g => ({ group: g, items: groups[g] }));
  }
  function weightSelect(path, fontPath, italicPath) {
    const f = fontOf(getP(fontPath)); const it = italicPath ? !!getP(italicPath) : false;
    return cSelect('Weight', path, weightsOf(f, it).map(w => [String(w), w + ' ' + (WEIGHT_NAMES[w] || '')]), { num: true });
  }
  function onFontChanged(base) {
    const el = getP(base); const f = fontOf(el.font);
    if (!f.italic) el.italic = false;
    el.weight = nearestWeight(f, Number(el.weight) || 400, !!el.italic);
    ensureFonts(state.model).then(() => { clearMeasureCache(); invalidate({ three: true }); });
  }
  function textControls(host, key, o) {
    o = o || {};
    const base = 'els.' + key;
    const el = getP(base);
    if (key === 'netWeight') {
      host.appendChild(cCheck('Auto from grams (oz = g ÷ 28.3495)', base + '.auto', { rebuild: true, onChange: on => { if (!on) el.text = netWeightText(Object.assign({}, el, { auto: true })); } }));
      if (el.auto) host.appendChild(cNumber('Net weight in grams', base + '.grams', { unit: 'g', step: 1, min: 0, max: 100000, digits: 2, allowEmpty: true, after: { layers: true } }));
      else host.appendChild(cText('Text (override)', base + '.text'));
      host.appendChild(h('div', { class: 'note' }, icon('info') + '<span>Prints: <b id="nw-preview">' + esc(netWeightText(el)) + '</b></span>'));
      host.appendChild(h('div', { class: 'note', id: 'nw-size' }));
      updateNetQtyNote();
    } else {
      host.appendChild(cText('Text', base + '.text', { multi: true, rows: o.rows || 2, hint: 'Press Enter for a new line. What you type is exactly what prints.' }));
    }
    host.appendChild(cSelect('Font', base + '.font', fontOptions(), { rebuild: true, onChange: () => onFontChanged(base) }));
    const f = fontOf(el.font);
    const r = h('div', { class: 'row2' });
    r.appendChild(weightSelect(base + '.weight', base + '.font', base + '.italic'));
    r.appendChild(cNumber('Size', base + '.size', { unit: 'pt', step: 0.5, min: 2, max: 400, digits: 2 }));
    host.appendChild(r);
    if (f.italic) host.appendChild(cCheck('Italic', base + '.italic', { rebuild: true, onChange: () => onFontChanged(base) }));
    host.appendChild(cColor('Colour', base + '.color'));
    if (!o.noAlign) host.appendChild(cSeg('Alignment', base + '.align', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], { after: { layers: true } }));
    const multi = String(el.text || '').includes('\n') || (el.tracking2 !== null && el.tracking2 !== undefined && el.tracking2 !== '');
    const r2 = h('div', { class: multi ? 'row3' : 'row2' });
    r2.appendChild(cNumber('Letter spacing', base + '.tracking', { unit: '‰', step: 5, min: -200, max: 800, digits: 0 }));
    if (multi) r2.appendChild(cNumber('2nd line', base + '.tracking2', { unit: '‰', step: 5, min: -200, max: 800, digits: 1, allowEmpty: true }));
    r2.appendChild(cNumber('Line spacing', base + '.leading', { unit: '×', step: 0.02, min: 0.5, max: 3, digits: 2 }));
    host.appendChild(r2);
    if (multi && el.align === 'left') host.appendChild(cNumber('Second line offset', base + '.indent', { unit: 'mm', step: 0.2, min: -100, max: 100, digits: 2 }));
  }
  // US net-quantity type size (21 CFR 101.105(i)): the lowercase "o" must reach a minimum height that
  // depends on the front panel area. Shown as a quiet check, never enforced.
  let qtyCtx = null;
  function netQtyCheck(m, el) {
    const f = fontOf(el.font); const fs = el.size * PT;
    let oh = 0.53 * fs;
    try {
      const c = qtyCtx || (qtyCtx = document.createElement('canvas').getContext('2d'));
      c.font = (el.italic ? 'italic ' : '') + el.weight + ' 200px ' + fontStack(f);
      const mt = c.measureText('o'); const hh = mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent;
      if (hh > 20) oh = hh / 200 * fs;
    } catch (e) { /* estimate */ }
    const area = (m.trim.w / 25.4) * (m.trim.h / 25.4);
    const minIn = area <= 5 ? 1 / 16 : area <= 25 ? 1 / 8 : area <= 100 ? 3 / 16 : area <= 400 ? 1 / 4 : 1 / 2;
    return { oh, min: minIn * 25.4, area, minIn };
  }
  function updateNetQtyNote() {
    const box = $('#nw-size'); if (!box) return;
    const m = state.model; const r = netQtyCheck(m, m.panels.front.els.netWeight);
    const ok = r.oh + 0.05 >= r.min;
    const frac = { 0.0625: '1/16', 0.125: '1/8', 0.1875: '3/16', 0.25: '1/4', 0.5: '1/2' }[r.minIn] || n(r.minIn, 3);
    box.className = 'note' + (ok ? '' : ' warn');
    box.innerHTML = icon(ok ? 'check' : 'alert') + '<span>Lowercase “o” is <b>' + n(r.oh, 1) + ' mm</b> tall. US rule (21 CFR 101.105): a ' + n(r.area, 1) + ' in² front panel needs at least ' + frac + ' in (' + n(r.min, 1) + ' mm). Check with your label advisor.</span>';
  }
  function positionControls(host, base, o) {
    o = o || {};
    const r = h('div', { class: 'row2' });
    r.appendChild(cNumber(o.xLabel || 'X', base + '.x', { unit: 'mm', step: 0.5, digits: 2 }));
    r.appendChild(cNumber(o.yLabel || 'Y', base + '.y', { unit: 'mm', step: 0.5, digits: 2 }));
    host.appendChild(r);
    if (o.centre !== false) {
      const b = h('button', { class: 'btn sm', type: 'button', title: 'Centre horizontally on the panel' }, icon('center', 'ico-sm') + 'Centre on panel');
      b.addEventListener('click', () => {
        const el = getP(base); const key = base.split('.')[1];
        el.x = n(el.x + state.model.trim.w / 2 - visualCenterX(key), 3);
        commit(); invalidate({ three: true }); syncInspector();
      });
      host.appendChild(b);
    }
  }
  function arrangeControls(host, key) {
    const r = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
    const mv = (d) => { const o = curPanel().order; const i = o.indexOf(key); const j = clamp(i + d, 0, o.length - 1); if (i === j) return; o.splice(i, 1); o.splice(j, 0, key); commit(); invalidate({ three: true, layers: true }); };
    r.appendChild(h('button', { class: 'btn sm', type: 'button', onclick: () => mv(1) }, icon('up', 'ico-sm') + 'Bring forward'));
    r.appendChild(h('button', { class: 'btn sm', type: 'button', onclick: () => mv(-1) }, icon('down', 'ico-sm') + 'Send backward'));
    host.appendChild(r);
  }
  function sub(host, t) { host.appendChild(h('div', { class: 'subhead', text: t })); }

  function buildInspector() {
    bindings = [];
    const host = $('#inspector'); host.innerHTML = '';
    if (state.sel && state.sel !== 'background' && (isLayoutView() || !curPanel().els[state.sel])) state.sel = null;   // (an element of the other panel)
    const key = state.sel; const m = state.model;
    const title = $('#insp-title');
    if (!key) { title.textContent = 'Edit'; host.innerHTML = '<p class="inspector-empty">Select a layer above, or click something on the design. Drag to move it; arrow keys nudge 0.5 mm (Shift: 5 mm).</p>'; return; }
    const box = h('div', { class: 'fields' }); host.appendChild(box);
    if (key === 'background') { title.innerHTML = '<span class="sec-title">Background</span>'; return bgInspector(box); }
    title.innerHTML = '<span class="sec-title">' + esc(EL_INFO[key].label) + '</span>';
    const el = curPanel().els[key];
    box.appendChild(cCheck('Show on the pack', 'els.' + key + '.visible', { after: { layers: true } }));
    if (key === 'logo') logoInspector(box);
    else if (key === 'badge') badgeInspector(box);
    else if (key === 'pop') popInspector(box);
    else if (key === 'facts') factsInspector(box);
    else if (key === 'ingredients') ingredientsInspector(box);
    else if (key === 'claims') claimsInspector(box);
    else if (key === 'warning') warningInspector(box);
    else {
      textControls(box, key, { rows: key === 'productLine' ? 2 : 1 });
      sub(box, 'Position');
      positionControls(box, 'els.' + key, { yLabel: 'Y (baseline)' });
      box.appendChild(cCheck('Pill behind the text', 'els.' + key + '.pill', { rebuild: true }));
      if (el.pill) box.appendChild(cColor('Pill colour', 'els.' + key + '.pillColor'));
    }
    sub(box, 'Arrange');
    arrangeControls(box, key);
  }
  function logoInspector(box) {
    const m = state.model; const el = curPanel().els.logo; const base = 'els.logo';
    box.appendChild(cSeg('Style', base + '.style', [['wrapper', 'Wrapper', 'Upright high-contrast serif, like the single wrapper'], ['bag', 'Bag', 'Italic serif, like the 100 g bag'], ['custom', 'Custom', 'Pick any font from the list'], ['upload', 'Upload', 'Your exact logo file (PNG or SVG)']], {
      rebuild: true, onSet: v => {
        el.style = v;
        if (v === 'wrapper') { el.align = 'center'; if (el.font !== 'playfair') el.font = 'bodoni'; el.weight = nearestWeight(FONT[el.font], el.weight, false); if (el.sparkles.layout === 'diagonal') el.sparkles.layout = 'mirror'; }
        if (v === 'bag') { el.align = 'left'; el.sparkles.layout = 'diagonal'; if (el.font !== 'playfair') el.font = 'bodoni'; }
        if (v === 'custom') { const lf = logoFont(Object.assign({}, el, { style: 'wrapper' })); if (!FONT[el.font]) el.font = lf.font; }
        if (v === 'upload' && !el.upload.w) el.upload.w = m.trim.w * 0.6;
        ensureFonts(m).then(() => { clearMeasureCache(); invalidate({ three: true }); });
      }
    }));
    if (el.style === 'upload') {
      const row = h('div', { class: 'uploadrow' });
      const pick = h('span', { class: 'btn sm filepick' }, icon('upload', 'ico-sm') + (el.upload.src ? 'Replace logo file' : 'Upload logo (PNG or SVG)'));
      const inp = h('input', { type: 'file', accept: 'image/png,image/svg+xml,.svg,image/webp', 'aria-label': 'Upload logo' });
      inp.addEventListener('change', async () => {
        const file = inp.files && inp.files[0]; if (!file) return;
        try { const id = await addUpload(file, 'logo'); el.upload.src = id; commit(); invalidate({ three: true }); buildInspector(); toast('Logo placed exactly as supplied'); }
        catch (e) { toast('Could not read that file: ' + e.message, true); }
      });
      pick.appendChild(inp); row.appendChild(pick); box.appendChild(row);
      if (!el.upload.src) box.appendChild(h('div', { class: 'note' }, icon('info') + '<span>Upload the final logo artwork. It is placed as is: never redrawn or recoloured. An SVG logo stays vector in the PDF.</span>'));
      box.appendChild(cNumber('Logo width', base + '.upload.w', { unit: 'mm', step: 0.5, min: 2, max: 400 }));
      box.appendChild(h('div', { class: 'note', 'data-ppi': 'logo', style: 'display:none' }));
      sub(box, 'Position');
      positionControls(box, base, { xLabel: 'X (centre)', yLabel: 'Y (top)' });
      updatePPINotes();
      return;
    }
    box.appendChild(cText('Words', base + '.text', { multi: true, rows: 2 }));
    if (el.style === 'bag' || el.style === 'wrapper') box.appendChild(cSeg(el.style === 'bag' ? 'Italic serif' : 'Upright serif', base + '.font', [['bodoni', 'Bodoni Moda'], ['playfair', 'Playfair Display']], { onSet: v => { el.font = v; el.weight = nearestWeight(FONT[v], el.weight, el.style === 'bag'); ensureFonts(m).then(() => { clearMeasureCache(); invalidate({ three: true }); }); }, rebuild: true }));
    if (el.style === 'custom') box.appendChild(fontPicker(base));
    const lf = logoFont(el);
    const r = h('div', { class: 'row2' });
    r.appendChild(cSelect('Weight', base + '.weight', weightsOf(fontOf(lf.font), lf.italic).map(w => [String(w), w + ' ' + (WEIGHT_NAMES[w] || '')]), { num: true }));
    r.appendChild(cNumber('Size', base + '.size', { unit: 'pt', step: 0.5, min: 6, max: 400 }));
    box.appendChild(r);
    if (el.style === 'custom') {
      if (fontOf(el.font).italic) box.appendChild(cCheck('Italic', base + '.italic', { rebuild: true, onChange: () => onFontChanged(base) }));
      box.appendChild(cSeg('Alignment', base + '.align', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']]));
    }
    if (fontOf(lf.font).opsz) box.appendChild(cRange('Contrast (optical size)', base + '.opsz', { min: 6, max: 96, step: 1, fmt: v => v <= 14 ? v + ' · sturdy' : v <= 36 ? v + ' · balanced' : v + ' · hairline' }));
    const r2 = h('div', { class: 'row3' });
    r2.appendChild(cNumber('Letter spacing', base + '.tracking', { unit: '‰', step: 5, min: -200, max: 800, digits: 0 }));
    r2.appendChild(cNumber('2nd line', base + '.tracking2', { unit: '‰', step: 5, min: -200, max: 800, digits: 1, allowEmpty: true }));
    r2.appendChild(cNumber('Line spacing', base + '.leading', { unit: '×', step: 0.02, min: 0.4, max: 3 }));
    box.appendChild(r2);
    if (el.style === 'bag' || (el.style === 'custom' && el.align === 'left')) box.appendChild(cNumber('Second line offset', base + '.indent', { unit: 'mm', step: 0.2, min: -100, max: 100 }));
    box.appendChild(cSeg('Fill', base + '.fill', [['white', 'White'], ['cream', 'Cream'], ['gold', 'Gold foil'], ['custom', 'Colour']], { rebuild: true }));
    if (el.fill === 'gold') box.appendChild(h('div', { class: 'note' }, icon('info') + '<span>Gold foil is shown as a gradient. For real hot-foil, tell the printer the logo is a foil layer.</span>'));
    if (el.fill === 'custom') box.appendChild(cColor('Logo colour', base + '.fillColor'));
    sub(box, 'Sparkles');
    box.appendChild(cCheck('Four-point sparkles', base + '.sparkles.on', { rebuild: true }));
    if (el.sparkles.on) {
      box.appendChild(cSeg('Placement', base + '.sparkles.layout', [['mirror', 'Mirrored'], ['diagonal', 'Diagonal']].concat(el.sparkles.points && el.sparkles.points.length ? [['draft', 'As drawn', 'Exactly where the client’s draft has them']] : [])));
      box.appendChild(cSeg('Star', base + '.sparkles.shape', [['slim', 'Slim'], ['plump', 'Plump', 'Fuller arms, as on the wrapper draft']]));
      box.appendChild(cColor('Sparkle colour', base + '.sparkles.color', { swatches: [['#f7e5a2', 'Cream gold (wrapper draft)'], ['#f2d98a', 'Pale gold'], ['#f4b622', 'Gold'], ['#e9c46a', 'Soft gold'], ['#ffffff', 'White'], ['#fbc2dc', 'Petal'], ['#c8f07a', 'Lime']] }));
      const r3 = h('div', { class: 'row2' });
      r3.appendChild(cRange('Size', base + '.sparkles.scale', { min: 0.4, max: 2.2, step: 0.05, fmt: v => Math.round(v * 100) + '%' }));
      r3.appendChild(cRange('Spread', base + '.sparkles.spread', { min: 0.4, max: 2.4, step: 0.05, fmt: v => Math.round(v * 100) + '%' }));
      box.appendChild(r3);
    }
    sub(box, 'Position');
    positionControls(box, base, { yLabel: 'Y (first baseline)' });
  }
  function fontPicker(base) {
    const wrap = h('div', { class: 'field' });
    wrap.appendChild(h('span', { class: 'lbl', text: 'Font' }));
    const list = h('div', { class: 'fontlist', role: 'listbox', 'aria-label': 'Logo font' });
    const cur = getP(base + '.font');
    FONTS.forEach(f => {
      const b = h('button', { type: 'button', class: 'fontopt' + (f.id === cur ? ' on' : ''), role: 'option', 'aria-selected': f.id === cur ? 'true' : 'false' },
        '<span class="pv" style="font-family:' + esc(fontStack(f)) + ';font-weight:' + (f.vw ? 500 : f.sw[Math.min(1, f.sw.length - 1)]) + '">Model Pops</span><span class="nm">' + esc(f.family) + '</span>');
      b.addEventListener('click', () => { setP(base + '.font', f.id); onFontChanged(base); commit(); invalidate({ three: true }); buildInspector(); });
      list.appendChild(b);
    });
    wrap.appendChild(list);
    return wrap;
  }
  function badgeInspector(box) {
    const base = 'els.badge';
    box.appendChild(cText('Words in the heart', base + '.text', { multi: true, rows: 2 }));
    box.appendChild(cSelect('Font', base + '.font', fontOptions(), { rebuild: true, onChange: () => onFontChanged(base) }));
    const r = h('div', { class: 'row2' });
    r.appendChild(weightSelect(base + '.weight', base + '.font', base + '.italic'));
    r.appendChild(cNumber('Text size', base + '.size', { unit: 'pt', step: 0.25, min: 2, max: 60 }));
    box.appendChild(r);
    const r2 = h('div', { class: 'row3' });
    r2.appendChild(cNumber('Letter spacing', base + '.tracking', { unit: '‰', step: 5, min: -200, max: 800, digits: 0 }));
    r2.appendChild(cNumber('2nd line', base + '.tracking2', { unit: '‰', step: 5, min: -200, max: 800, digits: 1, allowEmpty: true }));
    r2.appendChild(cNumber('Line spacing', base + '.leading', { unit: '×', step: 0.02, min: 0.6, max: 2.5 }));
    box.appendChild(r2);
    box.appendChild(cNumber('Words up / down in the heart', base + '.ty', { unit: 'mm', step: 0.1, min: -20, max: 20 }));
    box.appendChild(cColor('Text colour', base + '.color'));
    box.appendChild(cColor('Heart colour', base + '.heartColor'));
    const r3 = h('div', { class: 'row2' });
    r3.appendChild(cNumber('Heart width', base + '.w', { unit: 'mm', step: 0.5, min: 4, max: 300 }));
    r3.appendChild(cNumber('Tilt', base + '.rotate', { unit: '°', step: 1, min: -45, max: 45, digits: 1 }));
    box.appendChild(r3);
    box.appendChild(h('div', { class: 'note warn', id: 'badge-fit', style: 'display:none' }, icon('alert') + '<span>The words do not fit inside the heart: make the heart wider or the text smaller.</span>'));
    updateBadgeFit();
    box.appendChild(cCheck('Soft shadow under the heart', base + '.shadow'));
    sub(box, 'Position');
    positionControls(box, base, { xLabel: 'X (centre)', yLabel: 'Y (centre)' });
  }
  function popInspector(box) {
    const m = state.model; const el = curPanel().els.pop; const base = 'els.pop';
    const grid = h('div', { class: 'popchoices' });
    const ids = Object.keys(ASSETS).filter(id => ASSETS[id].kind === 'pop');
    ids.forEach(id => {
      const a = ASSETS[id];
      const b = h('button', { type: 'button', class: 'popchoice' + (el.src === id ? ' on' : ''), title: a.name + (a.note ? ' (' + a.note + ')' : '') },
        '<img src="' + assetHref(id, 'blob') + '" alt=""><span>' + esc(a.short || a.name) + '</span>');
      b.addEventListener('click', () => { el.src = id; if (m.theme === 'green' && !BUNDLED.has(id)) state.greenPop = id; commit(); invalidate({ three: true }); buildInspector(); });
      grid.appendChild(b);
    });
    box.appendChild(fieldWrap('Picture of the real pop', grid));
    const row = h('div', { class: 'uploadrow' });
    const pick = h('span', { class: 'btn sm filepick' }, icon('upload', 'ico-sm') + 'Upload real photo');
    const inp = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Upload a photo of the real pop' });
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      try {
        const id = await addUpload(file, 'pop');
        el.src = id; if (m.theme === 'green') state.greenPop = id;
        commit(); invalidate({ three: true }); buildInspector();
        toast('Photo placed. If it has a plain background, use “Remove plain background”.');
      } catch (e) { toast('Could not read that photo: ' + e.message, true); }
    });
    pick.appendChild(inp); row.appendChild(pick);
    if (!BUNDLED.has(el.src) && ASSETS[el.src]) {
      const rb = h('button', { class: 'btn sm', type: 'button', title: 'Clears a plain backdrop from the edges inwards. The pop itself is not touched.' }, icon('wand', 'ico-sm') + 'Remove plain background');
      rb.addEventListener('click', async () => {
        rb.disabled = true;
        try { const id = await removePlainBackground(el.src); el.src = id; if (m.theme === 'green') state.greenPop = id; commit(); invalidate({ three: true }); buildInspector(); toast('Background removed. Check the edges on the design; Undo brings the original back.'); }
        catch (e) { toast(e.message || String(e), true); rb.disabled = false; }
      });
      row.appendChild(rb);
    }
    box.appendChild(row);
    const a = ASSETS[el.src];
    if (!a) box.appendChild(h('div', { class: 'note warn' }, icon('alert') + '<span>No picture yet. Upload a photo of the real ' + (m.theme === 'green' ? 'green ' : '') + 'pop (a cut-out PNG is best). Until then the pop is left out of the files; the dashed outline only shows where it goes.</span>'));
    else if (m.theme === 'green' && isPinkBundled(el.src)) box.appendChild(h('div', { class: 'note warn' }, icon('alert') + '<span>Stand-in: this green design is showing the pink pop. Upload a photo of the real green pop.</span>'));
    else if (a.opaque) box.appendChild(h('div', { class: 'note warn' }, icon('alert') + '<span>This photo still has its background, so a box would print around the pop. Use “Remove plain background”, or upload a cut-out PNG (transparent background).</span>'));
    box.appendChild(h('div', { class: 'note' }, icon('info') + '<span>The pop is always the real product picture, placed exactly: never redrawn, recoloured or stretched. Only its size and position change.</span>'));
    const r = h('div', { class: 'row2' });
    r.appendChild(cNumber('Height', base + '.h', { unit: 'mm', step: 0.5, min: 2, max: 400 }));
    r.appendChild(h('div', { class: 'field' }, '<span class="lbl">Width (from the picture)</span><div class="unit" data-unit="mm"><input class="inp" type="text" readonly tabindex="-1" id="pop-w"></div>'));
    box.appendChild(r);
    box.appendChild(h('div', { class: 'note', 'data-ppi': 'pop', style: 'display:none' }));
    const r2 = h('div', { class: 'row2' });
    r2.appendChild(cNumber('How many', base + '.repeat', { step: 1, min: 1, max: 6, digits: 0, after: { layers: true } }));
    r2.appendChild(cNumber('Gap', base + '.gap', { unit: 'mm', step: 0.5, min: -60, max: 100 }));
    box.appendChild(r2);
    box.appendChild(cCheck('Soft shadow', base + '.shadow.on', { rebuild: true }));
    if (el.shadow.on) {
      const r3 = h('div', { class: 'row2' });
      r3.appendChild(cRange('Strength', base + '.shadow.opacity', { min: 0.05, max: 0.6, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
      r3.appendChild(cRange('Softness', base + '.shadow.blur', { min: 0.2, max: 4, step: 0.1, fmt: v => n(v, 1) + ' mm' }));
      box.appendChild(r3);
    }
    sub(box, 'Position');
    positionControls(box, base, { xLabel: 'X (centre)', yLabel: 'Y (top)' });
    updatePopWidth(); updatePPINotes();
  }
  function updatePopWidth() {
    const inp = $('#pop-w'); if (!inp) return;
    const el = state.model.panels.front.els.pop; const a = ASSETS[el.src] || ASSETS['pop-gold'];
    if (a) inp.value = n(el.h * a.w / a.h, 2);
  }
  // effective resolution of each raster picture at its printed size (an SVG is vector: no limit)
  const PPI_MIN = 250, PPI_IDEAL = 300;          // under 250: a warning; 250-299: a note; 300 and up: fine
  function rasterInfo(m) {
    const out = []; const isVec = a => /^data:image\/svg/i.test(a.src || '');
    const F = m.panels.front;
    const pop = F.els.pop, pa = ASSETS[pop.src];
    if (pop.visible && pa && !isVec(pa)) {
      const wmm = Math.max(2, Number(pop.h) || 40) * pa.w / pa.h;
      out.push({ key: 'pop', side: 'front', label: 'The pop picture', ppi: pa.w / (wmm / 25.4), tip: 'Use a larger photo, or make the pop smaller.' });
    }
    ['front', 'back'].forEach(side => {
      const bg = m.panels[side].bg; if (bg.mode !== 'image') return;
      const a = ASSETS[bg.image.src];
      if (a && !isVec(a)) {
        const b = m.bleed + 0.6, bw = m.trim.w + 2 * b, bh = m.trim.h + 2 * b;
        const sc = Math.max(bw / a.w, bh / a.h) * Math.max(1, Number(bg.image.zoom) || 1);   // mm per pixel
        out.push({ key: 'background', side, label: 'The ' + side + ' background art', ppi: 25.4 / sc, tip: 'Upscale it 2× (for example in ComfyUI), then bring it back with Background → Replace background art.' });
      }
    });
    const lg = F.els.logo;
    if (lg.visible && lg.style === 'upload') {
      const a = ASSETS[lg.upload.src];
      if (a && !isVec(a)) out.push({ key: 'logo', label: 'The logo file', ppi: a.w / (Math.max(1, Number(lg.upload.w) || 40) / 25.4), tip: 'Use a larger file, or an SVG logo (vector).' });
    }
    return out;
  }
  function updatePPINotes() {
    $$('[data-ppi]').forEach(box => {
      const k = box.getAttribute('data-ppi');
      const r = rasterInfo(state.model).find(x => x.key === k && (k !== 'background' || x.side === state.side));
      if (!r) { box.style.display = 'none'; return; }
      const ok = r.ppi >= PPI_IDEAL, low = r.ppi < PPI_MIN;
      box.style.display = ''; box.className = 'note' + (low ? ' warn' : '');
      box.innerHTML = icon(ok ? 'check' : low ? 'alert' : 'info') + '<span>Print resolution: <b>' + Math.round(r.ppi) + ' ppi</b> at this size' + (ok ? ' (300 is ideal).' : low ? '. Aim for 300. ' + esc(r.tip) : ', under the 300 ppi ideal. ' + esc(r.tip)) + '</span>';
    });
  }
  function updateBadgeFit() {
    const box = $('#badge-fit'); if (!box) return;
    const el = state.model.panels.front.els.badge;
    box.style.display = el.visible && badgeOverflow(el) ? '' : 'none';
  }
  function bgInspector(box) {
    const m = state.model; const bg = curPanel().bg;
    box.appendChild(cSeg('Background', 'bg.mode', [['solid', 'Solid'], ['two-tone', 'Two-tone'], ['image', 'Image']], { rebuild: true, after: { layers: true } }));
    if (bg.mode === 'image') {
      const row = h('div', { class: 'uploadrow' });
      const pick = h('span', { class: 'btn sm filepick' }, icon('image', 'ico-sm') + (bg.image.src ? 'Replace background art' : 'Import AI art (PNG/JPG)'));
      const inp = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Import background art' });
      inp.addEventListener('change', async () => {
        const file = inp.files && inp.files[0]; if (!file) return;
        try { const id = await addUpload(file, 'background'); bg.image.src = id; bg.image.zoom = 1; bg.image.ox = 0; bg.image.oy = 0; commit(); invalidate({ three: true }); buildInspector(); }
        catch (e) { toast('Could not read that picture: ' + e.message, true); }
      });
      pick.appendChild(inp); row.appendChild(pick); box.appendChild(row);
      box.appendChild(h('div', { class: 'note' }, icon('info') + '<span>Import ComfyUI art <b>without words</b>. It fills the panel and bleed (cover fit); every word and the logo stay live type on top, so nothing warps. Drag it on the design to reposition.</span>'));
      if (bg.image.src) {
        box.appendChild(cRange('Zoom', 'bg.image.zoom', { min: 1, max: 4, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
        const r = h('div', { class: 'row2' });
        r.appendChild(cNumber('Offset X', 'bg.image.ox', { unit: 'mm', step: 0.5 }));
        r.appendChild(cNumber('Offset Y', 'bg.image.oy', { unit: 'mm', step: 0.5 }));
        box.appendChild(r);
        box.appendChild(h('div', { class: 'note', 'data-ppi': 'background', style: 'display:none' }));
      }
      box.appendChild(cColor('Colour under the art', 'bg.c1'));
    } else {
      box.appendChild(cColor(bg.mode === 'two-tone' ? 'Top colour' : 'Colour', 'bg.c1'));
      if (bg.mode === 'two-tone') {
        box.appendChild(cColor('Bottom colour', 'bg.c2'));
        sub(box, 'Wave divider');
        box.appendChild(cRange('Wave height (from the top)', 'bg.wave.y', { min: 0, max: m.trim.h, step: 0.5, fmt: v => n(v, 1) + ' mm' }));
        box.appendChild(cRange('Wave depth', 'bg.wave.depth', { min: -40, max: 40, step: 0.5, fmt: v => n(v, 1) + ' mm' }));
        const r = h('div', { class: 'row2' });
        r.appendChild(cRange('Dip position', 'bg.wave.center', { min: 0.05, max: 0.95, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
        r.appendChild(cRange('Tilt', 'bg.wave.tilt', { min: -30, max: 30, step: 0.5, fmt: v => n(v, 1) + ' mm' }));
        box.appendChild(r);
      }
    }
    if (m.format === 'wrapper') {
      sub(box, 'End seals');
      box.appendChild(cCheck('Rib texture on the end seals (as on the draft)', 'bg.ribs', { rebuild: true }));
      if (bg.ribs !== false) box.appendChild(cRange('Rib strength', 'bg.ribStrength', { min: 0.2, max: 2, step: 0.05, fmt: v => Math.round(v * 100) + '%' }));
      box.appendChild(h('p', { class: 'hint', style: 'margin:-2px 0 0' }, 'Printed in the panel’s own colours, straight cut edges. The sealing jaws emboss the real ribs: ask your printer whether to keep the printed texture.'));
    }
    sub(box, 'Pattern overlay');
    box.appendChild(cSeg(null, 'bg.pattern.kind', [['none', 'None'], ['hearts', 'Hearts', '', 'heart'], ['sparkles', 'Sparkles', '', 'sparkle'], ['dots', 'Dots']], { rebuild: true }));
    const drawn = Array.isArray(bg.pattern.points) && bg.pattern.points.length > 0;
    if (bg.pattern.kind !== 'none' && drawn) {
      const nt = h('div', { class: 'note' }, icon('info') + '<span>' + bg.pattern.points.length + ' shapes placed exactly as on the client’s draft.</span>');
      box.appendChild(nt);
      const sb = h('button', { class: 'btn sm', type: 'button', title: 'Replace the draft’s placement with an even scatter' }, icon('shuffle', 'ico-sm') + 'Scatter evenly instead');
      sb.addEventListener('click', () => { bg.pattern.points = []; commit(); invalidate({ three: true }); buildInspector(); });
      box.appendChild(sb);
    }
    if (bg.pattern.kind !== 'none') {
      box.appendChild(cCheck('Keep clear of the logo and words', 'bg.pattern.clear'));
      box.appendChild(cColor('Pattern colour', 'bg.pattern.color'));
      box.appendChild(cRange('Opacity', 'bg.pattern.opacity', { min: 0.03, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
      const r = h('div', { class: 'row2' });
      r.appendChild(cRange('Size', 'bg.pattern.size', { min: 1, max: 30, step: 0.2, fmt: v => n(v, 1) + ' mm' }));
      if (!drawn) r.appendChild(cRange('Spacing', 'bg.pattern.spacing', { min: 5, max: 60, step: 0.5, fmt: v => n(v, 1) + ' mm' }));
      box.appendChild(r);
    }
    if (bg.pattern.kind !== 'none' && !drawn) {
      const r2 = h('div', { class: 'row2' });
      r2.appendChild(cRange('Scatter', 'bg.pattern.jitter', { min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
      const sh = h('div', { class: 'field' }, '<span class="lbl">Arrangement</span>');
      const b = h('button', { class: 'btn sm', type: 'button' }, icon('shuffle', 'ico-sm') + 'Shuffle');
      b.addEventListener('click', () => { bg.pattern.seed = (Number(bg.pattern.seed) || 1) + 1; commit(); invalidate({ three: true }); });
      sh.appendChild(b); r2.appendChild(sh);
      box.appendChild(r2);
    }
    updatePPINotes();
  }

  function renderLayers() {
    const host = $('#layers'); host.innerHTML = '';
    if (isLayoutView()) { host.innerHTML = '<p class="inspector-empty">The print layout shows every panel as it prints. Click a panel (or Front / Back above the design) to edit it.</p>'; return; }
    const P = curPanel();
    const rows = P.order.slice().reverse().concat(['background']);
    rows.forEach(key => {
      const isBg = key === 'background';
      const el = isBg ? null : P.els[key];
      const label = isBg ? 'Background' : EL_INFO[key].label;
      let meta = '';
      if (isBg) meta = P.bg.mode === 'two-tone' ? 'Two-tone' : P.bg.mode === 'image' ? 'Image' : 'Solid';
      else if (key === 'pop') meta = (ASSETS[el.src] && (ASSETS[el.src].short || ASSETS[el.src].name)) || 'No picture yet';
      else if (key === 'logo') meta = el.style === 'upload' ? 'Uploaded file' : fontOf(el.font).family + (el.italic ? ' italic' : '');
      else if (key === 'badge') meta = String(el.text || '').replace(/\n/g, ' ');
      else if (key === 'facts') meta = 'Servings ' + (String(el.servings || '').trim() || '___');
      else if (key === 'ingredients' || key === 'warning') meta = String(el.text || '').replace(/\n/g, ' ');
      else if (key === 'claims') meta = claimItems(el).join(' · ');
      else meta = elText(key, el).replace(/\n/g, ' ');
      const row = h('div', { class: 'layer' + (state.sel === key ? ' on' : '') + (!isBg && !el.visible ? ' off' : '') });
      if (isBg) row.appendChild(h('span', { style: 'width:28px;display:grid;place-items:center;color:var(--ink-3)' }, icon('background', 'ico-sm')));
      else {
        const eye = h('button', { class: 'eye', type: 'button', title: el.visible ? 'Hide ' + label : 'Show ' + label, 'aria-label': (el.visible ? 'Hide ' : 'Show ') + label, 'aria-pressed': el.visible ? 'true' : 'false' }, icon(el.visible ? 'eye' : 'eyeoff', 'ico-sm'));
        eye.addEventListener('click', () => { el.visible = !el.visible; commit(); invalidate({ three: true, layers: true }); if (state.sel === key) buildInspector(); });
        row.appendChild(eye);
      }
      const nm = h('button', { class: 'name', type: 'button' }, (isBg ? '' : icon(EL_INFO[key].icon, 'ico-sm')) + '<span>' + esc(label) + '</span>');
      nm.addEventListener('click', () => select(key));
      row.appendChild(nm);
      row.appendChild(h('span', { class: 'meta', title: meta, text: meta }));
      host.appendChild(row);
    });
  }

  /* ---- Format: the item spec (MPItems) with the design's own edits, and the printer's dieline overlay ---- */
  function getSpecPath(m, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), specOf(m)); }
  // a spec edit: kept only where it differs from items.js, so items.js stays the source of truth
  function setSpecValue(path, v) {
    const m = state.model; const def = path.split('.').reduce((o, k) => (o == null ? o : o[k]), specDefaults(m.format));
    const W1 = m.trim.w, H1 = m.trim.h;
    const ks = path.split('.'); let o = m.specEdits = isObj(m.specEdits) ? m.specEdits : {};
    const word = typeof def === 'string';
    if (word ? String(v) === def : Math.abs(Number(v) - Number(def)) < 1e-9) {
      // back to the draft value: drop the edit (and any empty parent)
      const stack = [];
      for (let i = 0; i < ks.length - 1 && o; i++) { stack.push([o, ks[i]]); o = o[ks[i]]; }
      if (o) delete o[ks[ks.length - 1]];
      for (let i = stack.length - 1; i >= 0; i--) { const [p, k] = stack[i]; if (isObj(p[k]) && !Object.keys(p[k]).length) delete p[k]; }
    } else {
      for (let i = 0; i < ks.length - 1; i++) { if (!isObj(o[ks[i]])) o[ks[i]] = {}; o = o[ks[i]]; }
      o[ks[ks.length - 1]] = word ? String(v) : Number(v);
    }
    syncSpec(m);
    moveWithSize(m, W1, H1);
  }
  // after a size change of the same item: positions follow the panel, type and pictures follow its size factor
  function moveWithSize(m, W1, H1) {
    if ((m.trim.w === W1 && m.trim.h === H1) || ui.scaleLayout === false) return;
    const r = sizeFactor(m.format, m.trim.w, m.trim.h) / sizeFactor(m.format, W1, H1);
    ['front', 'back'].forEach(s => remapPanel(m.panels[s], W1, H1, m.trim.w, m.trim.h, r));
  }
  function specEdited(m) { return !!(m.specEdits && Object.keys(m.specEdits).length); }
  function resetSpec() {
    const m = state.model; const W1 = m.trim.w, H1 = m.trim.h;
    m.specEdits = {}; syncSpec(m);
    moveWithSize(m, W1, H1);
    commit(); layoutAndRender({ three: true, layers: true, spec: true }); renderFormat(); buildInspector();
    toast('Item specs back to the draft values');
  }
  function renderFormat() {
    const host = $('#format-fields'); host.innerHTML = '';
    const m = state.model;
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Format' });
    Object.keys(FORMATS).forEach(k => {
      const b = h('button', { type: 'button', class: m.format === k ? 'on' : '', title: FORMATS[k].label }, esc(FORMATS[k].short));
      b.addEventListener('click', () => changeFormat(k));
      seg.appendChild(b);
    });
    host.appendChild(seg);
    const it = window.MPItems[m.format] || {}; const sp = specOf(m);
    // the spec values fold into one summary line, so the layers stay close at hand; open to edit them
    const det = h('details', { class: 'spec-box' }); if (ui.specOpen) det.open = true;
    det.addEventListener('toggle', () => { ui.specOpen = det.open; });
    const sum = m.format === 'wrapper' ? 'end seals ' + n(sp.endSeal.top, 1) + ' / ' + n(sp.endSeal.bottom, 1) + ' · fin ' + n(sp.finSeal.width, 1) + ' mm' + (finFold(sp.finSeal) === 'either' ? '' : ', laid ' + finFold(sp.finSeal))
      : m.format === 'bag' ? 'zip ' + n(sp.zip.top, 1) + '–' + n(sp.zip.bottom, 1) + ' · gusset ' + n(sp.gusset.depth, 1) + ' mm' : 'depth ' + n(sp.depth, 1) + ' mm';
    det.appendChild(h('summary', { class: 'spec-head' }, '<span class="sh-t">Item specs: from your drafts (interim)' + (specEdited(m) ? ' · <b class="sh-ed">edited</b>' : '') + '</span><span class="sh-s">' + esc(it.label || FORMATS[m.format].label) + ': ' + n(sp.flat.w, 1) + ' × ' + n(sp.flat.h, 1) + ' mm · ' + esc(sum) + '</span>'));
    host.appendChild(det);
    const grid = h('div', { class: 'spec-grid' });
    (SPEC_FIELDS[m.format] || []).forEach(f => {
      const [path, label, unit, step, min, max] = f;
      const cur = Number(getSpecPath(m, path)), def = Number(getSpecPath({ format: m.format, specEdits: {} }, path));
      const edited = Math.abs(cur - def) > 1e-9;
      const wrap = h('div', { class: 'unit', 'data-unit': unit });
      const inp = h('input', { class: 'inp' + (edited ? ' edited' : ''), type: 'number', step, min, max, inputmode: 'decimal', value: n(cur, 3), 'data-spec': path, title: edited ? 'Edited (draft value ' + n(def, 3) + ')' : 'Draft value' });
      inp.addEventListener('change', () => {
        const v = parseFloat(inp.value);
        if (!(v >= min && v <= max)) { inp.value = n(Number(getSpecPath(state.model, path)), 3); return; }
        setSpecValue(path, v);
        if (path === 'zip.top' || path === 'zip.bottom') { const z = specOf(state.model).zip; if (z.bottom < z.top) toast('The zip’s lower line is above its upper line.', true); }
        commit(); layoutAndRender({ three: true, layers: true, spec: true }); renderFormat(); buildInspector();
      });
      wrap.appendChild(inp);
      grid.appendChild(fieldWrap(label, wrap));
    });
    det.appendChild(grid);
    if (m.format === 'wrapper') {
      const fold = finFold(sp.finSeal), defFold = finFold(specDefaults('wrapper').finSeal);
      const sel = h('select', { class: 'sel' + (fold !== defFold ? ' edited' : ''), 'data-spec': 'finSeal.fold', 'aria-label': 'Which way the fin seal is laid' });
      [['either', 'Either side (not known yet)'], ['left', 'To the left (seen from the back)'], ['right', 'To the right (seen from the back)']].forEach(o => sel.appendChild(h('option', { value: o[0] }, esc(o[1]))));
      sel.value = fold;
      sel.addEventListener('change', () => { setSpecValue('finSeal.fold', sel.value); commit(); layoutAndRender({ three: true, layers: true, spec: true }); renderFormat(); buildInspector(); });
      det.appendChild(fieldWrap('Fin seal is laid', sel));
      det.appendChild(h('p', { class: 'hint', style: 'margin:-4px 0 0' }, 'Its seam runs down the middle of the back. Until the converter says which way the fin is laid, type keeps clear of both sides.'));
    }
    const row = h('div', { class: 'spec-actions' });
    const rb = h('button', { class: 'btn sm', type: 'button', disabled: !specEdited(m), title: 'Put every number back to the value measured from the client’s draft (items.js)' }, icon('reset', 'ico-sm') + 'Reset to draft values');
    rb.addEventListener('click', resetSpec);
    row.appendChild(rb);
    const sc = h('label', { class: 'chk' }); const si = h('input', { type: 'checkbox', id: 'scale-layout' }); si.checked = ui.scaleLayout !== false;
    si.addEventListener('change', () => { ui.scaleLayout = si.checked; });
    sc.appendChild(si); sc.appendChild(document.createTextNode('Move the layout with the size'));
    row.appendChild(sc);
    det.appendChild(row);
    det.appendChild(h('p', { class: 'hint box' }, icon('info', 'ico-sm') + ' The proportions are measured from the client’s drafts; the absolute size is an assumption. Every number is <b>' + esc(INTERIM_NOTE) + '</b>. Guides, the print layout and the 3D pack all follow these numbers.'));
    dielineControls(host);
  }
  // How large a panel's type and pictures are at W x H, relative to the draft size of its format (items.js). Only
  // the ratio of two factors is used: a change of size and its way back multiply to exactly 1, so edits never
  // compound (Reset to draft values gives the design back as it was).
  function sizeFactor(fmt, W, H) { const d = specDefaults(fmt).flat; return Math.min(W / Number(d.w), H / Number(d.h)); }
  // keep a panel's layout where it was, relative to the panel, when the panel's size changes. s: the scale for
  // type and pictures (default: min of the two axes, for a one-off move such as another format)
  function remapPanel(P, W1, H1, W2, H2, s) {
    const sx = W2 / W1, sy = H2 / H1; if (s === undefined) s = Math.min(sx, sy);
    const q = v => n(Number(v) || 0, 4);
    Object.keys(P.els).forEach(k => {
      const el = P.els[k]; el.x = q(el.x * sx); el.y = q(el.y * sy);
      if (k !== 'facts' && el.indent !== undefined) el.indent = q(el.indent * s);   // (a facts row's indent is a level)
      if (k === 'pop') { el.h = q(el.h * s); if (el.gap !== undefined) el.gap = q(el.gap * s); }
      else if (k === 'badge') { el.w = q(el.w * s); el.size = q(el.size * s); if (el.ty !== undefined) el.ty = q(el.ty * s); }
      else if (k === 'logo') { el.size = q(el.size * s); el.upload.w = q(el.upload.w * s); }
      else if (k === 'facts') { el.w = q(el.w * sx); el.size = q(el.size * s); el.titleSize = q(el.titleSize * s); }
      else if (k === 'ingredients') { el.w = q(el.w * sx); el.size = q(el.size * s); el.headSize = q(el.headSize * s); }
      else if (k === 'claims') { el.size = q(el.size * s); el.size2 = q(el.size2 * s); }
      else if (k === 'warning') { el.w = q(el.w * sx); el.size = q(el.size * s); }
      else el.size = q(el.size * s);
    });
    P.bg.wave.y = q(P.bg.wave.y * sy); P.bg.wave.depth = q(P.bg.wave.depth * sy); P.bg.wave.tilt = q((P.bg.wave.tilt || 0) * sy);
    if (P.bg.pattern) { P.bg.pattern.size = q(P.bg.pattern.size * s); P.bg.pattern.spacing = q(P.bg.pattern.spacing * s); }
    if (P.bg.image) { P.bg.image.ox = q(P.bg.image.ox * sx); P.bg.image.oy = q(P.bg.image.oy * sy); }
  }
  function changeFormat(k) {
    const m = state.model; if (m.format === k) return;
    const F = FORMATS[k]; const W1 = m.trim.w, H1 = m.trim.h;
    m.format = k; m.specEdits = {}; m.preset = null; syncSpec(m);
    if (ui.scaleLayout !== false) ['front', 'back'].forEach(s => remapPanel(m.panels[s], W1, H1, m.trim.w, m.trim.h));
    // Servings Per Container is the client's "1" for a single pop; for a bag or a 3-pack it is not confirmed yet
    const f = m.panels.back.els.facts;
    if (f && (f.servings === '1' || !String(f.servings || '').trim())) f.servings = k === 'wrapper' ? '1' : '';
    ['facts', 'ingredients', 'claims', 'warning'].forEach(key => { const el = m.panels.back.els[key]; if (el) el.finClear = k === 'wrapper'; });
    commit(); afterModelReplaced(false);
    toast('Switched to ' + F.label + ' (' + n(m.trim.w, 1) + ' × ' + n(m.trim.h, 1) + ' mm). Tip: the presets give a ready layout for each format.');
  }

  /* ---- the printer's dieline: an overlay for checking alignment (never exported) ---- */
  const PDFJS = { v: '3.11.174', p: null };
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!PDFJS.p) {
      PDFJS.p = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS.v + '/pdf.min.js';
        sc.onload = () => {
          if (!window.pdfjsLib) { rej(new Error('pdf.js did not load')); return; }
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS.v + '/pdf.worker.min.js';
          res(window.pdfjsLib);
        };
        sc.onerror = () => { PDFJS.p = null; rej(new Error('pdf.js could not be loaded (offline?)')); };
        document.head.appendChild(sc);
      });
    }
    return PDFJS.p;
  }
  // physical size of an SVG file from its width / height (units), else its viewBox at 96 px per inch
  // (72 for an Illustrator file, whose "px" are points)
  function svgSizeMM(txt) {
    const tag = (/<svg\b[^>]*>/i.exec(txt) || [''])[0];
    const attr = k => { const r = new RegExp('\\s' + k + '\\s*=\\s*["\']([^"\']+)["\']', 'i').exec(tag); return r ? r[1].trim() : ''; };
    const ai = /Adobe Illustrator/i.test(txt.slice(0, 2000));
    const unitMM = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: ai ? 25.4 / 72 : 25.4 / 96, '': ai ? 25.4 / 72 : 25.4 / 96 };
    const len = v => { const r = /^([\d.]+)\s*(mm|cm|in|pt|pc|px)?$/i.exec(v); return r ? parseFloat(r[1]) * unitMM[(r[2] || '').toLowerCase()] : NaN; };
    let w = len(attr('width')), hh = len(attr('height'));
    const vb = attr('viewBox').split(/[\s,]+/).map(Number);
    if (!(w > 0 && hh > 0) && vb.length === 4 && vb[2] > 0) { w = vb[2] * unitMM[ai ? 'pt' : 'px']; hh = vb[3] * unitMM[ai ? 'pt' : 'px']; }
    return { w, h: hh, guessed: !/(mm|cm|in|pt|pc)$/i.test(attr('width')) };
  }
  // the overlay picture: the file's lines recoloured to one clear colour, white made transparent
  function inkOverlay(src, color) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    const rgb = color === 'original' ? null : hexToRgb(color);
    for (let i = 0; i < d.length; i += 4) {
      const ink = (255 - Math.min(d[i], d[i + 1], d[i + 2])) * d[i + 3] / 255;
      if (rgb) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; }
      d[i + 3] = Math.min(255, Math.round(ink * 1.15));
    }
    x.putImageData(im, 0, 0);
    const url = c.toDataURL('image/png');
    if (url.length < 32) throw new Error('the dieline picture could not be drawn (' + c.width + ' × ' + c.height + ' px)');
    return url;
  }
  async function loadDieline(file) {
    const isPDF = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const isSVG = /\.svg$/i.test(file.name) || file.type === 'image/svg+xml';
    if (!isPDF && !isSVG) throw new Error('please choose an SVG or a PDF');
    let canvas, wmm, hmm, note = '';
    if (isSVG) {
      const txt = await readFile(file, 'text');
      const sz = svgSizeMM(txt); if (!(sz.w > 0 && sz.h > 0)) throw new Error('the SVG has no size');
      wmm = sz.w; hmm = sz.h; if (sz.guessed) note = 'Its size was read from pixels; check it with Scale.';
      const im = await loadImage('data:image/svg+xml;base64,' + utf8ToB64(txt));
      const k = Math.min(12, 8000 / Math.max(wmm, hmm));
      canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(wmm * k)); canvas.height = Math.max(1, Math.round(hmm * k));
      canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
    } else {
      const lib = await loadPdfJs();
      const buf = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsArrayBuffer(file); });
      const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(1);
      const vp1 = page.getViewport({ scale: 1 });                 // PDF points
      wmm = vp1.width * PT; hmm = vp1.height * PT;
      const k = Math.min(12, 8000 / Math.max(wmm, hmm));          // px per mm
      const vp = page.getViewport({ scale: k * PT });             // pdf.js scale = px per PDF point (PT = mm per point)
      canvas = document.createElement('canvas'); canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, background: 'rgba(0,0,0,0)' }).promise;
      if (doc.numPages > 1) note = 'Page 1 of ' + doc.numPages + ' is shown.';
      try { doc.destroy(); } catch (e) { /* ignore */ }
    }
    const color = '#00a3e0', view = inkOverlay(canvas, color);       // (throws before anything changes if it cannot be drawn)
    ui.dieline = { name: file.name, canvas, wmm, hmm, dx: 0, dy: 0, scale: 1, opacity: 0.85, show: true, color, note, view };
    renderFormat(); invalidate();
    toast('Dieline loaded: ' + n(wmm, 1) + ' × ' + n(hmm, 1) + ' mm, centred on the ' + (isLayoutView() ? 'print layout' : SIDES[state.side].toLowerCase() + ' panel'));
  }
  function dielineControls(host) {
    host.appendChild(h('div', { class: 'subhead', text: 'Printer’s dieline' }));
    const row = h('div', { class: 'uploadrow' });
    const pick = h('span', { class: 'btn sm filepick' }, icon('dieline', 'ico-sm') + (ui.dieline ? 'Load another dieline' : 'Load printer’s dieline (SVG or PDF)'));
    const inp = h('input', { type: 'file', id: 'dieline-file', accept: '.svg,.pdf,image/svg+xml,application/pdf', 'aria-label': 'Load the printer’s dieline' });
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
      try { await loadDieline(f); } catch (e) { toast('Could not read that dieline: ' + (e.message || e), true); }
    });
    pick.appendChild(inp); row.appendChild(pick);
    const D = ui.dieline;
    if (D) {
      const rm = h('button', { class: 'btn sm', type: 'button' }, icon('close', 'ico-sm') + 'Remove');
      rm.addEventListener('click', () => { ui.dieline = null; renderFormat(); invalidate(); });
      row.appendChild(rm);
    }
    host.appendChild(row);
    if (!D) { host.appendChild(h('p', { class: 'hint', style: 'margin:0' }, 'Shown over the design to check alignment (scaled to mm, its page centred on the trim; type exact offsets for an off-centre file). It is never part of the exports.')); return; }
    host.appendChild(h('div', { class: 'note' }, icon('info') + '<span><b>' + esc(D.name) + '</b>: ' + n(D.wmm, 1) + ' × ' + n(D.hmm, 1) + ' mm. ' + esc(D.note || '') + ' Never exported.</span>'));
    const upd = (from) => {
      invalidate(); const o = $('#dl-out'); if (o) o.textContent = 'Offset ' + n(D.dx, 2) + ', ' + n(D.dy, 2) + ' mm · scale ' + n(D.scale * 100, 2) + '%';
      if (from !== 'x') { const i = $('#dl-x'); if (i) i.value = n(D.dx, 2); }
      if (from !== 'y') { const i = $('#dl-y'); if (i) i.value = n(D.dy, 2); }
    };
    const nudgeRow = h('div', { class: 'dl-nudge' });
    [['arrowL', -1, 0, 'Left'], ['up', 0, -1, 'Up'], ['down', 0, 1, 'Down'], ['arrowR', 1, 0, 'Right']].forEach(a => {
      const b = h('button', { class: 'btn sm icon', type: 'button', title: 'Nudge ' + a[3].toLowerCase() + ' 0.5 mm (Shift: 0.1 mm)', 'aria-label': 'Nudge dieline ' + a[3].toLowerCase() }, icon(a[0], 'ico-sm'));
      b.addEventListener('click', e => { const st = e.shiftKey ? 0.1 : 0.5; D.dx = n(D.dx + a[1] * st, 3); D.dy = n(D.dy + a[2] * st, 3); upd(); });
      nudgeRow.appendChild(b);
    });
    const sc = h('div', { class: 'unit', 'data-unit': '%' });
    const si = h('input', { class: 'inp', type: 'number', step: 0.1, min: 10, max: 1000, value: n(D.scale * 100, 2), 'aria-label': 'Dieline scale' });
    si.addEventListener('input', () => { const v = parseFloat(si.value); if (v >= 10 && v <= 1000) { D.scale = v / 100; upd(); } });
    sc.appendChild(si); nudgeRow.appendChild(sc);
    const rs = h('button', { class: 'btn sm', type: 'button', title: 'Back to centred, 100 %' }, 'Reset');
    rs.addEventListener('click', () => { D.dx = 0; D.dy = 0; D.scale = 1; si.value = 100; upd(); });
    rs.title = 'Back to centred on the trim, 100 %';
    nudgeRow.appendChild(rs);
    host.appendChild(nudgeRow);
    // exact offsets: where the file's page centre sits from the trim's centre (right / down positive)
    const xy = h('div', { class: 'row2' });
    [['x', 'dx', 'Offset X (right)'], ['y', 'dy', 'Offset Y (down)']].forEach(a => {
      const w = h('div', { class: 'unit', 'data-unit': 'mm' });
      const i = h('input', { class: 'inp', type: 'number', step: 0.1, id: 'dl-' + a[0], value: n(D[a[1]], 2), 'aria-label': 'Dieline ' + a[2].toLowerCase() });
      i.addEventListener('input', () => { const v = parseFloat(i.value); if (isFinite(v) && Math.abs(v) <= 2000) { D[a[1]] = v; upd(a[0]); } });
      w.appendChild(i); xy.appendChild(fieldWrap(a[2], w));
    });
    host.appendChild(xy);
    host.appendChild(h('div', { class: 'hint', id: 'dl-out', style: 'margin:0' }));
    const r2 = h('div', { class: 'row2' });
    const op = h('input', { type: 'range', min: 0.1, max: 1, step: 0.05, value: D.opacity, 'aria-label': 'Dieline opacity' });
    op.addEventListener('input', () => { D.opacity = parseFloat(op.value); invalidate(); });
    r2.appendChild(fieldWrap('Opacity', op));
    const col = h('select', { class: 'sel', 'aria-label': 'Dieline colour' });
    [['#00a3e0', 'Cyan'], ['#111111', 'Black'], ['#16a34a', 'Green'], ['original', 'As in the file']].forEach(c => col.appendChild(h('option', { value: c[0] }, esc(c[1]))));
    col.value = D.color;
    col.addEventListener('change', () => { try { D.view = inkOverlay(D.canvas, col.value); D.color = col.value; } catch (e) { toast(e.message, true); col.value = D.color; } invalidate(); });
    r2.appendChild(fieldWrap('Line colour', col));
    host.appendChild(r2);
    const sh = h('label', { class: 'chk' }); const sb = h('input', { type: 'checkbox' }); sb.checked = D.show;
    sb.addEventListener('change', () => { D.show = sb.checked; invalidate(); });
    sh.appendChild(sb); sh.appendChild(document.createTextNode('Show the dieline'));
    host.appendChild(sh);
    upd();
  }

  /* ---- back-panel inspectors ---- */
  function finClearCheck(box, base) {
    if (state.model.format === 'wrapper' && state.side === 'back') {
      box.appendChild(cCheck('Keep clear of the fin seal', base + '.finClear', { rebuild: true }));
      box.appendChild(h('p', { class: 'hint', style: 'margin:-4px 0 0' }, 'The fin seal’s seam runs down the middle of the back and the fin is laid flat to one side. On: the words keep clear of every place the fin can lie (two columns). Off: one column like the client’s label, and the fin covers part of it.'));
    }
  }
  function blockPosition(box, base) {
    const r = h('div', { class: 'row3' });
    r.appendChild(cNumber('X (left)', base + '.x', { unit: 'mm', step: 0.5, digits: 2 }));
    r.appendChild(cNumber('Y (top)', base + '.y', { unit: 'mm', step: 0.5, digits: 2 }));
    r.appendChild(cNumber('Width', base + '.w', { unit: 'mm', step: 0.5, min: 8, max: 600, digits: 2 }));
    box.appendChild(r);
    const b = h('button', { class: 'btn sm', type: 'button', title: 'Centre horizontally on the panel' }, icon('center', 'ico-sm') + 'Centre on panel');
    b.addEventListener('click', () => { const el = getP(base); el.x = n((state.model.trim.w - el.w) / 2, 3); commit(); invalidate({ three: true }); syncInspector(); });
    box.appendChild(b);
  }
  function factsInspector(box) {
    const base = 'els.facts'; const el = getP(base);
    box.appendChild(h('div', { class: 'note' }, icon('info') + '<span>The client’s own label, word for word. Every cell is editable; nothing is added. The title and column headings are the standard FDA panel headings.</span>'));
    const sv = h('div', { class: 'row2' });
    sv.appendChild(cText('Servings Per Container', base + '.servings', { after: { layers: true } }));
    sv.appendChild(cCheck('Show the title', base + '.showTitle'));
    box.appendChild(sv);
    if (!String(el.servings || '').trim()) box.appendChild(h('div', { class: 'note warn' }, icon('alert') + '<span>Blank on purpose: the per-' + (state.model.format === 'bag' ? 'bag' : 'pack') + ' count is not confirmed. The files say DRAFT until it is filled in.</span>'));
    box.appendChild(cCheck('Column headings (Amount Per Serving / % Daily Value)', base + '.showHead'));
    box.appendChild(cCheck('Serving Size line', base + '.servingSizeOn', { rebuild: true }));
    if (el.servingSizeOn) box.appendChild(cText('Serving Size', base + '.servingSize', { hint: 'The client’s label does not show a serving size: fill it in only with the client’s words.' }));
    sub(box, 'Rows');
    const tbl = h('div', { class: 'facts-rows' });
    tbl.appendChild(h('div', { class: 'fr-h' }, '<span>Name</span><span>Amount</span><span>% DV</span><span title="Indent">In</span><span title="Line under the row">Line</span>'));
    el.rows.forEach((r, i) => {
      const row = h('div', { class: 'fr' });
      const nm = h('textarea', { class: 'ta fr-name', rows: String(r.name).includes('\n') ? 2 : 1, spellcheck: 'true', 'aria-label': 'Row ' + (i + 1) + ' name' }); nm.value = r.name;
      nm.addEventListener('input', () => { r.name = nm.value; invalidate({ layers: true }); }); nm.addEventListener('change', () => { commit(); invalidate({ three: true }); });
      const am = h('input', { class: 'inp', type: 'text', 'aria-label': 'Row ' + (i + 1) + ' amount' }); am.value = r.amount;
      am.addEventListener('input', () => { r.amount = am.value; invalidate(); }); am.addEventListener('change', () => { commit(); invalidate({ three: true }); });
      const dv = h('input', { class: 'inp', type: 'text', 'aria-label': 'Row ' + (i + 1) + ' % Daily Value' }); dv.value = r.dv;
      dv.addEventListener('input', () => { r.dv = dv.value; invalidate(); }); dv.addEventListener('change', () => { commit(); invalidate({ three: true }); });
      const ind = h('select', { class: 'sel', 'aria-label': 'Row ' + (i + 1) + ' indent' }); [0, 1, 2].forEach(k => ind.appendChild(h('option', { value: k }, String(k)))); ind.value = String(r.indent || 0);
      ind.addEventListener('change', () => { r.indent = Number(ind.value); commit(); invalidate({ three: true }); });
      const ru = h('select', { class: 'sel', 'aria-label': 'Row ' + (i + 1) + ' line under' }); [['hair', 'thin'], ['bar', 'bar'], ['heavy', 'heavy'], ['none', 'none']].forEach(k => ru.appendChild(h('option', { value: k[0] }, k[1]))); ru.value = r.rule || 'hair';
      ru.addEventListener('change', () => { r.rule = ru.value; commit(); invalidate({ three: true }); });
      [nm, am, dv, ind, ru].forEach(x => row.appendChild(x));
      tbl.appendChild(row);
    });
    box.appendChild(tbl);
    box.appendChild(cText('Footnote', base + '.footnote'));
    finClearCheck(box, base);
    sub(box, 'Type');
    const r = h('div', { class: 'row3' });
    r.appendChild(cNumber('Rows', base + '.size', { unit: 'pt', step: 0.1, min: 2, max: 40 }));
    r.appendChild(cNumber('Title', base + '.titleSize', { unit: 'pt', step: 0.1, min: 2, max: 60 }));
    r.appendChild(cNumber('Row height', base + '.leading', { unit: '×', step: 0.02, min: 1, max: 2.4 }));
    box.appendChild(r);
    box.appendChild(cRange('Amount column', base + '.amountCol', { min: 0.4, max: 0.95, step: 0.01, fmt: v => Math.round(v * 100) + '%' }));
    const c2 = h('div', { class: 'row2' });
    c2.appendChild(cColor('Type and lines', base + '.color'));
    c2.appendChild(cColor('Box', base + '.box'));
    box.appendChild(c2);
    sub(box, 'Position');
    blockPosition(box, base);
  }
  function paragraphType(box, base, o) {
    box.appendChild(cSelect('Font', base + '.font', fontOptions(), { rebuild: true, onChange: () => onFontChanged(base) }));
    const r = h('div', { class: 'row2' });
    r.appendChild(weightSelect(base + '.weight', base + '.font'));
    r.appendChild(cNumber('Size', base + '.size', { unit: 'pt', step: 0.1, min: 2, max: 60 }));
    box.appendChild(r);
    const r2 = h('div', { class: 'row2' });
    r2.appendChild(cNumber('Line spacing', base + '.leading', { unit: '×', step: 0.02, min: 0.8, max: 3 }));
    if (o && o.tracking) r2.appendChild(cNumber('Letter spacing', base + '.tracking', { unit: '‰', step: 5, min: -100, max: 400, digits: 0 }));
    box.appendChild(r2);
  }
  function ingredientsInspector(box) {
    const base = 'els.ingredients';
    box.appendChild(cText('Heading', base + '.heading'));
    box.appendChild(cText('Ingredients', base + '.text', { multi: true, rows: 5, hint: 'The client’s exact words. What you type is exactly what prints.' }));
    box.appendChild(cCheck('Line under the heading', base + '.rule'));
    finClearCheck(box, base);
    sub(box, 'Type');
    paragraphType(box, base, { tracking: true });
    box.appendChild(cNumber('Heading size', base + '.headSize', { unit: 'pt', step: 0.1, min: 2, max: 60 }));
    box.appendChild(cColor('Colour', base + '.color'));
    sub(box, 'Position');
    blockPosition(box, base);
  }
  function claimsInspector(box) {
    const base = 'els.claims'; const el = getP(base);
    box.appendChild(cText('Claims', base + '.text', { multi: true, rows: 2, hint: 'First line large, the next lines smaller. The client’s exact words.' }));
    box.appendChild(cCheck('Add “Zinc Free”', base + '.zinc'));
    box.appendChild(h('div', { class: 'note' + (el.zinc ? ' warn' : '') }, icon(el.zinc ? 'alert' : 'info') + '<span>The client’s label also prints “Zinc Free”. It looks like a proof error (zinc is not in the product and no other claim mentions it), so it is off. Switch it on only if the client confirms it.</span>'));
    finClearCheck(box, base);
    sub(box, 'Type');
    box.appendChild(cSelect('Font', base + '.font', fontOptions(), { rebuild: true, onChange: () => onFontChanged(base) }));
    const r = h('div', { class: 'row3' });
    r.appendChild(weightSelect(base + '.weight', base + '.font'));
    r.appendChild(cNumber('First line', base + '.size', { unit: 'pt', step: 0.1, min: 2, max: 60 }));
    r.appendChild(cNumber('Others', base + '.size2', { unit: 'pt', step: 0.1, min: 2, max: 60 }));
    box.appendChild(r);
    box.appendChild(cColor('Colour', base + '.color'));
    sub(box, 'Position');
    positionControls(box, base, { xLabel: 'X (centre)', yLabel: 'Y (first baseline)' });
  }
  function warningInspector(box) {
    const base = 'els.warning'; const el = getP(base);
    box.appendChild(cText('Warning', base + '.text', { multi: true, rows: 6, hint: 'The client’s exact words. Enter starts a new line.' }));
    finClearCheck(box, base);
    sub(box, 'Type');
    paragraphType(box, base);
    box.appendChild(cColor('Colour', base + '.color'));
    box.appendChild(cCheck('Box behind the warning', base + '.box', { rebuild: true }));
    if (el.box) box.appendChild(cColor('Box colour', base + '.boxColor'));
    sub(box, 'Position');
    blockPosition(box, base);
  }

  /* =========================================================================================
   * 12. Notices, status bar, toasts, modal
   * ======================================================================================= */
  // visible words of one panel that still hold a blank (___) to fill in
  function blankFields(m, side) {
    const out = []; const v = panelView(m, side || 'front');
    const has = s => /_{3,}/.test(String(s || ''));
    v.order.forEach(k => {
      const el = v.els[k]; if (!el || !el.visible) return;
      let hit = false;
      if (k === 'logo') hit = el.style !== 'upload' && has(el.text);
      else if (k === 'badge') hit = has(el.text);
      else if (k === 'facts') hit = !String(el.servings || '').trim() || has(el.servings) || (el.rows || []).some(r => has(r.name) || has(r.amount) || has(r.dv)) || (el.servingSizeOn && has(el.servingSize));
      else if (k === 'ingredients') hit = has(el.text) || has(el.heading);
      else if (k === 'claims') hit = has(el.text);
      else if (k === 'warning') hit = has(el.text);
      else if (TEXT_KEYS.includes(k)) hit = has(elText(k, el));
      if (hit) out.push({ key: k, label: k === 'facts' && !String(el.servings || '').trim() ? 'Servings Per Container' : EL_INFO[k].label });
    });
    return out;
  }
  // The open items of a design (both panels): shown above the design and again when exporting. `draft` items (a
  // blank, a missing or stand-in picture) mean that panel is not final yet, so its file names say DRAFT.
  function collectIssues(m) {
    m = m || state.model; const out = [];
    const add = o => out.push(Object.assign({ level: 'warn', draft: false, act: 'Edit', side: 'front' }, o));
    const F = m.panels.front;
    const pop = F.els.pop, pa = ASSETS[pop.src];
    if (pop.visible) {
      if (!pa) add({ draft: true, key: 'pop', act: 'Add photo', text: state.lost.pop ? 'Your uploaded pop photo could not be restored (it was too large to keep in this browser). Upload it again, or open your saved design file (.json).' : m.theme === 'green' ? 'Add a photo of the real green pop. Until then the pop is left out of the files.' : 'The pop has no picture yet: choose one, or upload a photo of the real pop.' });
      else if (m.theme === 'green' && isPinkBundled(pop.src)) add({ draft: true, key: 'pop', act: 'Add photo', text: 'Stand-in: this green design shows the pink pop. Add a photo of the real green pop.' });
      else if (pa.opaque) add({ key: 'pop', act: 'Fix', text: 'The pop photo still has its background, so a box would print around the pop. Use “Remove plain background”, or upload a cut-out PNG.' });
    }
    const lg = F.els.logo;
    if (lg.visible && lg.style === 'upload' && !ASSETS[lg.upload.src]) add({ draft: true, key: 'logo', act: 'Upload', text: state.lost.logo ? 'Your uploaded logo file could not be restored. Upload it again, or open your saved design file (.json).' : 'Upload your logo file, or choose a type style for the logo.' });
    ['front', 'back'].forEach(side => {
      const bg = m.panels[side].bg;
      if (bg.mode === 'image' && !ASSETS[bg.image.src]) add({ side, draft: true, key: 'background', act: 'Import', text: (side === 'back' ? 'Back: ' : '') + (state.lost.background ? 'Your background art could not be restored. Import it again, or open your saved design file (.json).' : 'Import the background art, or choose a Solid or Two-tone background.') });
      const blanks = blankFields(m, side);
      if (blanks.length) add({ side, draft: true, key: blanks[0].key, act: 'Fill in', text: (side === 'back' ? 'Back: f' : 'F') + 'ill in the blanks (___): ' + blanks.map(b => b.label).join(', ') + '.' });
    });
    if (F.els.badge.visible && badgeOverflow(F.els.badge)) add({ key: 'badge', text: 'The words do not fit inside the heart: make the heart wider or the text smaller.' });
    rasterInfo(m).forEach(r => {
      if (r.ppi < PPI_MIN) add({ side: r.side || 'front', key: r.key, text: r.label + ' is ' + Math.round(r.ppi) + ' ppi at print size (aim for 300). ' + r.tip });
      else if (r.ppi < PPI_IDEAL) add({ level: 'info', side: r.side || 'front', key: r.key, short: r.label.replace(/^The /, '') + ' ' + Math.round(r.ppi) + ' ppi', text: r.label + ' is ' + Math.round(r.ppi) + ' ppi at print size: printable, but under the 300 ppi ideal. ' + r.tip });
    });
    const nw = F.els.netWeight;
    if (nw.visible && netWeightText(nw).trim()) {
      const q = netQtyCheck(m, nw);
      if (q.oh + 0.05 < q.min) add({ level: 'info', key: 'netWeight', short: 'Net wt. type below US minimum', text: 'Net weight type: its lowercase “o” is ' + n(q.oh, 1) + ' mm; the US rule for this panel size asks for at least ' + n(q.min, 1) + ' mm (21 CFR 101.105). Check with your label advisor.' });
    }
    ['front', 'back'].forEach(side => {
      const hits = sealOverlaps(m).filter(o => o.side === side); if (!hits.length) return;
      add({ side, key: hits[0].key, act: 'Edit', short: 'Type on a seal', text: (side === 'back' ? 'Back: ' : 'Front: ') + 'words on a seal: ' + hits.map(o => o.label + ' (' + o.where + ')').join(', ') + '. The sealing jaws and the zip break up type there: keep it ' + SEAL_CLEAR + ' mm clear (switch on Seals to see them).' });
    });
    const B = m.panels.back.els, fe = B.facts, we = B.warning;
    if (fe && fe.visible) {
      const sizes = [Number(fe.size)].concat(we && we.visible ? [Number(we.size)] : []).filter(x => x > 0);
      const minPt = Math.min.apply(null, sizes);
      if (minPt < 6) add({ level: 'info', side: 'back', key: 'facts', short: 'Facts type ' + n(minPt, 1) + ' pt', text: 'The smallest Supplement Facts / warning type here is ' + n(minPt, 1) + ' pt (the client’s label set to fit this pack). FDA rules set minimum type sizes for the Supplement Facts panel (21 CFR 101.36): check it with your label advisor. The studio does not check it.' });
      if (!fe.servingSizeOn) add({ level: 'info', side: 'back', key: 'facts', short: 'Not on the client’s label', text: 'Not on the client’s label: a Serving Size line, the manufacturer’s or distributor’s name and place of business, a barcode. Ask the client and your label advisor whether the pack needs them; the studio never adds words.' });
    }
    const under = finOverlaps(m);
    if (under.length) {
      const blocks = BLOCK_KEYS.some(k => under.includes(EL_INFO[k].label));
      const how = blocks ? 'Tick “Keep clear of the fin seal”' + (under.length > BLOCK_KEYS.filter(k => under.includes(EL_INFO[k].label)).length ? ' (and move the other lines clear of the hatched band)' : '') : 'Move ' + (under.length > 1 ? 'them' : 'it') + ' clear of the hatched band';
      add({ level: 'info', side: 'back', key: m.panels.back.order.find(k => under.includes(EL_INFO[k].label)) || 'facts', short: 'Type under the fin seal', text: 'Fin seal: ' + under.join(', ') + ' run' + (under.length > 1 ? '' : 's') + ' where the fin can lie (its seam runs down the middle of the back). ' + how + ', or, once the converter confirms which way the fin is laid, set it under Format.' });
    }
    return out;
  }
  // side: 'front' / 'back' = that panel's own items (and the design-wide ones); none = anything
  function isDraft(m, side) { return collectIssues(m).some(i => i.draft && (!side || i.side === side)); }
  function focusEl(key, side) {
    if (side && (side !== state.side || isLayoutView())) setView(side);
    select(key, true); revealInspector();
  }
  // warnings sit above the design; quiet info items (the net-weight type check, the fin seal) sit in the status bar
  function renderNotices(list) {
    const host = $('#notices');
    const out = (list || collectIssues(state.model)).filter(o => o.level !== 'info');
    const key = out.map(o => o.level + o.side + o.text).join('|');
    if (host.dataset.key === key) return;
    host.dataset.key = key; host.innerHTML = '';
    out.forEach(o => {
      const d = h('div', { class: 'notice' + (o.level === 'info' ? ' info' : '') }, icon(o.level === 'info' ? 'info' : 'alert') + '<span>' + esc(o.text) + '</span>');
      const b = h('button', { class: 'btn sm', type: 'button' }, esc(o.act)); b.addEventListener('click', () => focusEl(o.key, o.side)); d.appendChild(b);
      host.appendChild(d);
    });
  }
  // the same list for the export dialogs
  function issuesHTML(list) {
    if (!list.length) return '<div class="checklist ok">' + icon('check', 'ico-sm') + '<span>No open items found.</span></div>';
    const draft = list.some(i => i.draft);
    return '<div class="checklist"><div class="cl-h">' + icon('alert', 'ico-sm') + '<span>Before you send</span></div><ul>' +
      list.map(i => '<li class="' + (i.level === 'info' ? 'info' : 'warn') + '">' + esc(i.text) + '</li>').join('') + '</ul>' +
      (draft ? '<p class="cl-f">Until these are done, the file names of that panel (and of the print layout) say <b>DRAFT</b>.</p>' : '') + '</div>';
  }
  function renderStatus(list) {
    const m = state.model; const F = FORMATS[m.format];
    const info = (list || collectIssues(m)).filter(o => o.level === 'info');
    let main;
    if (isLayoutView()) { const L = layoutGeometry(m); main = 'Print layout <b>' + n(L.w, 1) + ' × ' + n(L.h, 1) + ' mm</b> + ' + n(m.bleed, 1) + ' mm bleed'; }
    else main = SIDES[state.side] + ' · trim <b>' + n(m.trim.w, 2) + ' × ' + n(m.trim.h, 2) + ' mm</b> · bleed ' + n(m.bleed, 2) + ' mm';
    const html = '<span class="st-main"><i class="lg" title="Trim line" style="border-top-style:solid;border-color:#1f5fc9"></i>' + main + '</span>' +
      info.map(o => '<button class="st-check" type="button" data-focus="' + esc(o.key) + '" data-side="' + esc(o.side || 'front') + '" title="' + esc(o.text) + '">' + icon('info', 'ico-sm') + esc(o.short || o.text) + '</button>').join('') +
      '<span class="dieline" title="The item specs are measured from the client’s drafts. Your printer’s dieline is the authority.">' + icon('info', 'ico-sm') + 'Item specs ' + esc(INTERIM_NOTE) + '</span>';
    const bar = $('#statusbar'); if (bar.dataset.html !== html) { bar.dataset.html = html; bar.innerHTML = html; }
    $('#tg-guides-lbl').textContent = F.guides || 'Seals';
    $('#tg-guides').disabled = !F.guides || isLayoutView();
    $('#mock-type').textContent = F.label;
  }
  function toast(msg, err) {
    const t = h('div', { class: 'toast' + (err ? ' err' : '') }, icon(err ? 'alert' : 'check') + '<span>' + esc(msg) + '</span>');
    const host = $('#toasts'); host.appendChild(t);
    while (host.children.length > 2) host.firstElementChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, err ? 7000 : 3800);
  }
  function openModal(html, onMount) {
    const bg = $('#modal-bg'); $('#modal').innerHTML = html; bg.classList.add('on');
    if (onMount) onMount($('#modal'));
    const first = $('#modal button, #modal input'); if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal() { $('#modal-bg').classList.remove('on'); $('#modal').innerHTML = ''; }

  function openExport() {
    const m = state.model; const F = FORMATS[m.format];
    const has3D = !!mock.inst;
    let side = isLayoutView() ? ui.lastPrint.side || 'front' : state.side;
    const L = layoutGeometry(m);
    const layoutSize = n(L.w, 1) + ' × ' + n(L.h, 1) + ' mm + ' + n(m.bleed, 1) + ' mm bleed';
    openModal(
      '<div class="modal-h"><h3 id="modal-title">Export the files to send</h3><button class="btn ghost icon" data-close aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="modal-b">' +
      '<div class="kv"><span>Design</span><span>' + esc(m.name) + '</span><span>Format</span><span>' + esc(F.label) + '</span><span>Panel trim</span><span>' + sizeLabel(m, false) + ' (with bleed ' + sizeLabel(m, true) + ')</span><span>Item specs</span><span>' + esc(INTERIM_NOTE) + '</span></div>' +
      issuesHTML(collectIssues(m)) +
      '<div class="exp-sec"><div class="exp-sec-h">Print layout (all panels) · production</div>' +
      row('layout', 'Print layout (all panels)', (L.kind === 'web' ? 'The flow-wrap web: ½ back | front | ½ back, fin-seal allowances at both edges' : L.kind === 'pouch' ? 'Front | back side by side, the bottom gusset below' : 'Front | back side by side') + ' · ' + layoutSize + '. Artwork only: the file to print.',
        '<label class="chk"><input type="checkbox" id="x-die"' + (ui.lastPrint.dieline ? ' checked' : '') + '> Add the dieline (SVG: separate layer · PDF: separate page)</label>',
        '<div class="btn-col"><button class="btn primary" id="x-lpdf">' + icon('print', 'ico-sm') + 'PDF…</button><button class="btn" id="x-lsvg">SVG</button></div>') + '</div>' +
      '<div class="exp-sec"><div class="exp-sec-h">One panel <span class="seg sm" role="group" aria-label="Panel to export" id="x-side"><button type="button" data-v="front">Front</button><button type="button" data-v="back">Back</button></span></div>' +
      row('pdf', 'Print PDF', 'Vector, real text, fonts embedded; the trim centred on a trim + bleed page.', '<label class="chk"><input type="checkbox" id="x-crop"' + (ui.lastPrint.crop ? ' checked' : '') + '> Crop marks (only if your printer asks)</label>', '<button class="btn" id="x-pdf">' + icon('print', 'ico-sm') + 'Export PDF…</button>') +
      row('svg', 'SVG', 'Self-contained vector file: fonts and pictures embedded.', '<label class="chk"><input type="checkbox" id="x-svg-bleed"> Include bleed</label>', '<button class="btn" id="x-svg">Download SVG</button>') +
      row('png', 'PNG · 300 dpi', 'Exact pixels of the same file (' + Math.round(m.trim.w / 25.4 * 300) + ' × ' + Math.round(m.trim.h / 25.4 * 300) + ' px at trim).', '<label class="chk"><input type="checkbox" id="x-png-bleed"> Include bleed</label>', '<button class="btn" id="x-png">Download PNG</button>') + '</div>' +
      row('cube', '3D render', has3D ? 'A high-resolution PNG of the mockup as it is posed now.' : 'Needs the 3D preview (mockup3d.js).', '<label class="chk"><input type="checkbox" id="x-3d-tr"' + (has3D ? '' : ' disabled') + '> Transparent background</label>', '<button class="btn" id="x-3d"' + (has3D ? '' : ' disabled') + '>Download render</button>') +
      row('json', 'Design file', 'Re-open and edit later. Both panels and the pictures are included.', '', '<button class="btn" id="x-json">Save .json</button>') +
      '<p class="hint" id="x-names"></p>' +
      '</div>',
      root => {
        const busy = async (btn, fn) => { btn.disabled = true; const t = btn.innerHTML; btn.textContent = 'Working…'; try { await fn(); } catch (e) { toast('Export failed: ' + (e.message || e), true); } btn.disabled = false; btn.innerHTML = t; };
        const names = () => { $('#x-names', root).innerHTML = 'Files are named <b>' + esc(fileBase('print', side)) + '</b>, <b>' + esc(fileBase($('#x-die', root).checked ? 'print-layout-with-dieline' : 'print-layout', 'layout')) + '</b>…'; };
        $('#x-die', root).addEventListener('change', () => { ui.lastPrint.dieline = $('#x-die', root).checked; names(); });
        const segBtns = $$('#x-side button', root);
        const showSide = () => { segBtns.forEach(b => b.classList.toggle('on', b.dataset.v === side)); names(); };
        segBtns.forEach(b => b.addEventListener('click', () => { side = b.dataset.v; showSide(); }));
        showSide();
        $('#x-lpdf', root).addEventListener('click', () => openPrintSteps({ layout: true, dieline: $('#x-die', root).checked }));
        $('#x-lsvg', root).addEventListener('click', e => busy(e.currentTarget, () => exportLayoutSVG($('#x-die', root).checked)));
        $('#x-pdf', root).addEventListener('click', () => openPrintSteps({ crop: $('#x-crop', root).checked, side }));
        $('#x-svg', root).addEventListener('click', e => busy(e.currentTarget, () => exportSVGFile($('#x-svg-bleed', root).checked, side)));
        $('#x-png', root).addEventListener('click', e => busy(e.currentTarget, () => exportPNGFile($('#x-png-bleed', root).checked, side)));
        $('#x-3d', root).addEventListener('click', e => busy(e.currentTarget, () => export3D($('#x-3d-tr', root).checked)));
        $('#x-json', root).addEventListener('click', () => saveDesignFile());
      });
    function row(ic, t, d, opts, btn) {
      return '<div class="exp-row"><div class="ic">' + icon(ic) + '</div><div><div class="t">' + t + '</div><div class="d">' + d + '</div>' + (opts ? '<div class="opts">' + opts + '</div>' : '') + '</div><div>' + btn + '</div></div>';
    }
  }
  // o: { crop, side } for one panel, or { layout: true, dieline }
  function openPrintSteps(o) {
    if (typeof o !== 'object' || o === null) o = { crop: !!o, side: state.side };
    const m = state.model; const P = printPage(m, !!o.crop, !!o.layout);
    const page = n(P.pw, 2) + ' × ' + n(P.ph, 2) + ' mm';
    const side = o.layout ? 'layout' : sideOf(o.side);
    const fname = o.layout ? fileBase(o.dieline ? 'print-layout-with-dieline' : 'print-layout', 'layout') : fileBase(o.crop ? 'print-marks' : 'print', side);
    let where;
    if (o.layout) {
      const L = layoutGeometry(m);
      where = 'The print layout (' + n(L.w, 2) + ' × ' + n(L.h, 2) + ' mm) sits in the middle with ' + n(P.bleedX, 2) + ' mm bleed left and right and ' + n(P.bleedY, 2) + ' mm top and bottom (Chrome makes PDF pages in fine steps; the extra over ' + n(m.bleed, 2) + ' mm is bleed). ' + (o.dieline ? 'Page 1 is the artwork alone (the page to print); page 2 repeats it with the dieline on top in thin magenta lines, for checking.' : 'Artwork only, one page.');
    } else where = o.crop
      ? 'The ' + SIDES[side].toLowerCase() + ' panel (' + sizeLabel(m, false) + ') sits in the middle with ' + n(m.bleed, 2) + ' mm bleed and crop marks in the margin.'
      : 'The ' + SIDES[side].toLowerCase() + ' panel (' + sizeLabel(m, false) + ') sits in the middle with ' + n(P.bleedX, 2) + ' mm bleed left and right and ' + n(P.bleedY, 2) + ' mm top and bottom. (Chrome makes PDF pages in fine steps, so the page is slightly larger than trim + ' + n(m.bleed, 2) + ' mm; the extra is bleed.)';
    const lg = m.panels.front.els.logo;
    openModal(
      '<div class="modal-h"><h3 id="modal-title">Save the ' + (o.layout ? 'print layout' : SIDES[side].toLowerCase() + ' panel') + ' PDF</h3><button class="btn ghost icon" data-close aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="modal-b">' +
      '<div class="kv"><span>Page</span><span>' + page + '</span><span>File name</span><span>' + esc(fname) + '.pdf</span></div>' +
      '<p class="hint" style="margin:0">' + esc(where) + '</p>' +
      issuesHTML(collectIssues(m)) +
      '<p style="margin:2px 0 0">The browser’s print window opens next. Set it up like this, once:</p>' +
      '<ol class="steps"><li><b>Destination:</b> Save as PDF</li><li><b>Margins:</b> None</li><li><b>Scale:</b> Default (100%) — never “Fit to page”</li><li>Under <b>More settings</b>, tick <b>Background graphics</b></li><li>Press <b>Save</b>.</li></ol>' +
      '<div class="note">' + icon('info') + '<span>The PDF is vector: real text with the fonts embedded, the pop at full resolution' + (o.layout ? ', every panel in place for the converter.' : ', the trim centred on the page, ready for the printer to place on their dieline.') + '</span></div>' +
      ((o.layout || side === 'front') && lg.visible && lg.style !== 'upload' ? '<div class="note">' + icon('info') + '<span>The logo has very fine hairlines. Ask your printer for their minimum line width for white type on a colour; if needed, lower the logo’s <b>Contrast (optical size)</b> for sturdier strokes.</span></div>' : '') +
      '</div><div class="modal-f"><button class="btn" data-close>Cancel</button><button class="btn primary" id="x-print">' + icon('print', 'ico-sm') + 'Open print window</button></div>',
      root => { $('#x-print', root).addEventListener('click', async () => { closeModal(); await printPDF(o.layout ? { layout: true, dieline: !!o.dieline } : { crop: !!o.crop, side }); }); });
  }
  async function export3D(transparent) {
    if (!mock.inst) throw new Error('3D preview is not available');
    await update3D(true);
    const r = $('#mock-view').getBoundingClientRect();
    const scale = clamp(2400 / Math.max(1, r.width, r.height), 2, 6);
    const blob = await mock.inst.snapshot({ scale, transparent: !!transparent });
    const name = fileBase('3d-' + (mock.inst.view || mock.view) + (transparent ? '-transparent' : '')) + '.png';
    download(blob, name); toast('Saved ' + name);
    return name;
  }

  /* =========================================================================================
   * 13. Uploads and "remove plain background" (for a real photo of the pop)
   * ======================================================================================= */
  async function addUpload(file, kind) {
    if (!/^image\//.test(file.type) && !/\.svg$/i.test(file.name)) throw new Error('please choose a PNG, JPG, WebP or SVG');
    let src = await readFile(file);
    if (/\.svg$/i.test(file.name) && !/^data:image\/svg\+xml/i.test(src)) src = 'data:image/svg+xml;base64,' + src.split(',')[1];
    const d = await imageSize(src);
    const id = uid(kind);
    const nm = file.name.replace(/\.[a-z0-9]+$/i, '');
    const opaque = kind === 'pop' ? await edgeOpaque(src) : false;
    registerAsset({ id, src, w: d.w, h: d.h, name: nm, short: nm.length > 18 ? nm.slice(0, 17) + '…' : nm, kind, opaque });
    return id;
  }
  // true when the picture's edges are solid (a photo that still has its backdrop), false for a cut-out
  async function edgeOpaque(src) {
    try {
      const im = await loadImage(src); const W = im.naturalWidth, H = im.naturalHeight; if (!W || !H) return false;
      const k = Math.min(1, 256 / Math.max(W, H)), w = Math.max(2, Math.round(W * k)), h = Math.max(2, Math.round(H * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data; let solid = 0, tot = 0;
      const chk = (px, py) => { tot++; if (d[(py * w + px) * 4 + 3] > 245) solid++; };
      for (let i = 0; i < w; i++) { chk(i, 0); chk(i, h - 1); }
      for (let j = 1; j < h - 1; j++) { chk(0, j); chk(w - 1, j); }
      return solid / tot > 0.9;
    } catch (e) { return false; }
  }
  async function removePlainBackground(id) {
    const a = ASSETS[id]; const im = await loadImage(a.src);
    const W = im.naturalWidth, H = im.naturalHeight;
    if (W * H > 24e6) throw new Error('That photo is very large; please use one under 24 megapixels.');
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(im, 0, 0); const img = ctx.getImageData(0, 0, W, H); const d = img.data;
    // background colour = the most common (quantised) border colour
    const counts = new Map(); const pushB = i => { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1); };
    for (let x = 0; x < W; x++) { pushB(x * 4); pushB(((H - 1) * W + x) * 4); }
    for (let y = 0; y < H; y++) { pushB(y * W * 4); pushB((y * W + W - 1) * 4); }
    let best = 0, bestK = 0; counts.forEach((v, k) => { if (v > best) { best = v; bestK = k; } });
    let sr = 0, sg = 0, sb = 0, sn = 0;
    const scan = i => { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); if (k === bestK) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sn++; } };
    for (let x = 0; x < W; x++) { scan(x * 4); scan(((H - 1) * W + x) * 4); }
    for (let y = 0; y < H; y++) { scan(y * W * 4); scan((y * W + W - 1) * 4); }
    const B = [sr / sn, sg / sn, sb / sn];
    const border = 2 * (W + H);
    if (best / border < 0.35) throw new Error('The photo edges are not one plain colour, so the background was left alone.');
    // spread of the background (noise) sets the tolerance: very tight for a flat studio background,
    // so pale parts of the product (a white stick) are never mistaken for background
    let vs = 0, vn = 0;
    const addN = i => { vs += (d[i] - B[0]) ** 2 + (d[i + 1] - B[1]) ** 2 + (d[i + 2] - B[2]) ** 2; vn++; };
    for (let x = 0; x < W; x += 2) { addN(x * 4); addN(((H - 1) * W + x) * 4); }
    const noise = Math.sqrt(vs / Math.max(1, vn));
    const tol = clamp(noise * 2.5 + 2.6, 2.6, 30);
    const N = W * H;
    const dist = new Float32Array(N);
    for (let p = 0, i = 0; p < N; p++, i += 4) dist[p] = Math.sqrt((d[i] - B[0]) ** 2 + (d[i + 1] - B[1]) ** 2 + (d[i + 2] - B[2]) ** 2);
    const q = new Int32Array(N);
    // flood fill from the image edges over pixels that pass `ok(p)`
    const flood = (ok) => {
      const m = new Uint8Array(N); let qh = 0, qt = 0;
      const seed = p => { if (!m[p] && ok(p)) { m[p] = 1; q[qt++] = p; } };
      for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
      while (qh < qt) {
        const p = q[qh++]; const x = p % W;
        if (x > 0) seed(p - 1); if (x < W - 1) seed(p + 1); if (p >= W) seed(p - W); if (p < N - W) seed(p + W);
      }
      return m;
    };
    const cand = flood(p => dist[p] <= tol);
    // opening by reconstruction: a 1-2 px leak into the product (through a pale edge) is cut off,
    // because only background that stays connected to the edges after a 1 px erosion survives
    const er = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      if (!cand[p]) continue; const x = p % W;
      er[p] = (x === 0 || cand[p - 1]) && (x === W - 1 || cand[p + 1]) && (p < W || cand[p - W]) && (p >= N - W || cand[p + W]) ? 1 : 0;
    }
    const core = flood(p => er[p] === 1);
    const bg = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      if (!cand[p]) continue; const x = p % W;
      if (core[p] || (x > 0 && core[p - 1]) || (x < W - 1 && core[p + 1]) || (p >= W && core[p - W]) || (p < N - W && core[p + W])) bg[p] = 1;
    }
    // faint halo / ringing right at the edge (still very close to the background colour), max 2 px
    for (let pass = 0; pass < 2; pass++) {
      const add = [];
      for (let p = 0; p < N; p++) {
        if (bg[p] || dist[p] > tol * 1.8) continue; const x = p % W;
        if ((x > 0 && bg[p - 1]) || (x < W - 1 && bg[p + 1]) || (p >= W && bg[p - W]) || (p < N - W && bg[p + W])) add.push(p);
      }
      add.forEach(p => { bg[p] = 1; });
    }
    let removed = 0;
    for (let p = 0; p < N; p++) if (bg[p]) removed++;
    if (removed < N * 0.05) throw new Error('No plain background found around the pop.');
    // ---- JPEG fringe. A flat-backdrop JPEG leaves blotches of almost-backdrop colour along the pop's edge
    // (compression ringing, up to ~8 px). They are pale (close to the backdrop colour), thin and attached to
    // the cleared backdrop. A pale part of the pop itself (a white stick on a white sweep) is pale too, but
    // thick, so it is protected: only thin pale blotches are touched, never the pop's own pale parts.
    const PALE = 45;
    const pale = new Uint8Array(N);
    for (let p = 0; p < N; p++) if (!bg[p] && dist[p] < PALE) pale[p] = 1;
    // thick pale parts: survive a 2 px erosion (5 x 5 square) and are not tiny; protected with a 4 px margin
    const rowRun = new Uint8Array(N), erP = new Uint8Array(N);
    for (let y = 0; y < H; y++) { let run = 0; for (let x = 0; x < W; x++) { const p = y * W + x; run = pale[p] ? run + 1 : 0; if (run >= 5) rowRun[p - 2] = 1; } }
    for (let x = 0; x < W; x++) { let run = 0; for (let y = 0; y < H; y++) { const p = y * W + x; run = rowRun[p] ? run + 1 : 0; if (run >= 5) erP[p - 2 * W] = 1; } }
    const label4 = (mask, lab, sizes) => {                              // 4-connected components of a mask
      const qq = new Int32Array(N);
      for (let p0 = 0; p0 < N; p0++) {
        if (!mask[p0] || lab[p0]) continue;
        const id = sizes.length + 1; let h0 = 0, t0 = 0; lab[p0] = id; qq[t0++] = p0;
        while (h0 < t0) {
          const p = qq[h0++], x = p % W;
          if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; qq[t0++] = p - 1; }
          if (x < W - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; qq[t0++] = p + 1; }
          if (p >= W && mask[p - W] && !lab[p - W]) { lab[p - W] = id; qq[t0++] = p - W; }
          if (p < N - W && mask[p + W] && !lab[p + W]) { lab[p + W] = id; qq[t0++] = p + W; }
        }
        sizes.push(t0);
      }
    };
    const erLab = new Int32Array(N), erSize = [];
    label4(erP, erLab, erSize);
    const amin = Math.max(60, N * 0.0004);
    const big = new Uint8Array(N);
    for (let p = 0; p < N; p++) if (erLab[p] && erSize[erLab[p] - 1] >= amin) big[p] = 1;
    const dil = new Uint8Array(N), prot = new Uint8Array(N);              // 9 x 9 dilation, then within pale
    for (let y = 0; y < H; y++) { let last = -99; for (let x = 0; x < W; x++) { if (big[y * W + x]) last = x; if (x - last <= 4) dil[y * W + x] = 1; } last = 1e9; for (let x = W - 1; x >= 0; x--) { if (big[y * W + x]) last = x; if (last - x <= 4) dil[y * W + x] = 1; } }
    for (let x = 0; x < W; x++) { let last = -99; for (let y = 0; y < H; y++) { if (dil[y * W + x]) last = y; if (y - last <= 4 && pale[y * W + x]) prot[y * W + x] = 1; } last = 1e9; for (let y = H - 1; y >= 0; y--) { if (dil[y * W + x]) last = y; if (last - y <= 4 && pale[y * W + x]) prot[y * W + x] = 1; } }
    // blotches: unprotected pale pieces that touch the cleared backdrop
    const thin = new Uint8Array(N);
    for (let p = 0; p < N; p++) if (pale[p] && !prot[p]) thin[p] = 1;
    const thLab = new Int32Array(N), thSize = [];
    label4(thin, thLab, thSize);
    const touches = new Uint8Array(thSize.length + 1);
    for (let p = 0; p < N; p++) {
      const l = thLab[p]; if (!l || touches[l]) continue; const x = p % W;
      if ((x > 0 && bg[p - 1]) || (x < W - 1 && bg[p + 1]) || (p >= W && bg[p - W]) || (p < N - W && bg[p + W])) touches[l] = 1;
    }
    const blot = new Uint8Array(N);
    for (let p = 0; p < N; p++) if (thLab[p] && touches[thLab[p]]) blot[p] = 1;
    // opacity for the blotches and for the pop's first ring of pixels next to them or to the backdrop: each is
    // read as a mix of the backdrop B and the pop's edge colour F nearby (the 3 most backdrop-unlike pixels
    // within 5 px); how far it lies along B -> F sets its opacity. Ringing becomes clear, a true edge keeps a
    // soft transition, and the backdrop is un-mixed out of the colour (no light rim on dark packs). Where no
    // strongly coloured pixel is near, nothing is touched (it is a pale part of the pop).
    const out = new Uint8ClampedArray(d);
    for (let p = 0; p < N; p++) if (bg[p]) out[p * 4 + 3] = 0;
    const FR = 5;
    for (let p = 0, i = 0; p < N; p++, i += 4) {
      if (bg[p]) continue;
      const x = p % W, y = (p / W) | 0;
      let todo = blot[p] === 1;
      if (!todo && !pale[p]) {
        const nb = qp => bg[qp] || blot[qp];
        todo = (x > 0 && nb(p - 1)) || (x < W - 1 && nb(p + 1)) || (p >= W && nb(p - W)) || (p < N - W && nb(p + W));
      }
      if (!todo) continue;
      let d1 = -1, d2 = -1, d3 = -1, i1 = -1, i2 = -1, i3 = -1;
      for (let yy = Math.max(0, y - FR); yy <= Math.min(H - 1, y + FR); yy++) for (let xx = Math.max(0, x - FR); xx <= Math.min(W - 1, x + FR); xx++) {
        const pp = yy * W + xx; if (bg[pp]) continue; const dd = dist[pp];
        if (dd > d3) {
          if (dd > d1) { d3 = d2; i3 = i2; d2 = d1; i2 = i1; d1 = dd; i1 = pp; }
          else if (dd > d2) { d3 = d2; i3 = i2; d2 = dd; i2 = pp; }
          else { d3 = dd; i3 = pp; }
        }
      }
      if (d1 < 60) continue;
      const ids = [i1, i2, i3].filter(v => v >= 0);
      const F = [0, 1, 2].map(k => ids.reduce((s, q) => s + d[q * 4 + k], 0) / ids.length);
      const v = [F[0] - B[0], F[1] - B[1], F[2] - B[2]], den = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      const pr = ((d[i] - B[0]) * v[0] + (d[i + 1] - B[1]) * v[1] + (d[i + 2] - B[2]) * v[2]) / den;
      let al = clamp((pr - 0.16) / 0.56, 0, 1); al = al * al * (3 - 2 * al);
      if (al >= 0.999) continue;
      out[i + 3] = Math.round(al * 255);
      if (al <= 0) continue;
      const t = clamp((al - 0.15) / 0.5, 0, 1);
      for (let k = 0; k < 3; k++) out[i + k] = Math.round(clamp((d[i + k] - (1 - al) * B[k]) / al, 0, 255) * t + F[k] * (1 - t));
    }
    // specks: tiny islands left in the backdrop (dust, compression blocks) go; the pop itself is one big piece
    const lab = new Int32Array(N); const comps = []; const cq = new Int32Array(N);
    for (let p0 = 0; p0 < N; p0++) {
      if (lab[p0] || out[p0 * 4 + 3] <= 8) continue;
      const cid = comps.length + 1; let h0 = 0, t0 = 0; lab[p0] = cid; cq[t0++] = p0;
      while (h0 < t0) {
        const p = cq[h0++], x = p % W;
        const visit = qp => { if (!lab[qp] && out[qp * 4 + 3] > 8) { lab[qp] = cid; cq[t0++] = qp; } };
        if (x > 0) visit(p - 1); if (x < W - 1) visit(p + 1); if (p >= W) visit(p - W); if (p < N - W) visit(p + W);
      }
      comps.push(t0);
    }
    let main = 0; comps.forEach(s => { if (s > main) main = s; });
    // a piece goes when it is tiny, or when it is small and entirely backdrop-coloured (a loose blotch).
    // Anything sizeable stays, even if pale (a white stick is never dropped).
    const paleN = new Int32Array(comps.length + 1);
    for (let p = 0; p < N; p++) if (lab[p] && pale[p]) paleN[lab[p]]++;
    const speck = Math.max(16, Math.min(400, main * 0.0005)), loose = main * 0.003;
    const drop = comps.map((s, k) => s < main && (s <= speck || (s <= loose && paleN[k + 1] >= s * 0.9)));
    if (drop.some(Boolean)) for (let p = 0; p < N; p++) if (lab[p] && drop[lab[p] - 1]) out[p * 4 + 3] = 0;
    d.set(out);
    ctx.putImageData(img, 0, 0);
    // crop away the now-empty margins (the pop itself is untouched; only empty space goes)
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
    const c2 = document.createElement('canvas'); c2.width = cw; c2.height = chh;
    c2.getContext('2d').drawImage(c, x0, y0, cw, chh, 0, 0, cw, chh);
    const src = c2.toDataURL('image/png');
    const nid = uid(a.kind || 'pop');
    registerAsset({ id: nid, src, w: cw, h: chh, name: a.name + ' (cut out)', short: (a.short || a.name).slice(0, 12) + ' · cut', kind: a.kind || 'pop', opaque: false });
    return nid;
  }

  /* =========================================================================================
   * 14. 3D mockup bridge (mockup3d.js defines window.MPMockup)
   * ======================================================================================= */
  // the 3D pack is built from the item spec (MPItems + the design's edits) and wears both panels' exact art
  const mock = { inst: null, type: null, specKey: '', busy: false, pending: false, view: 'hero', finish: 'satin', bg: '#f4ece9', failed: false };
  function mockPH(msg, show) {
    const ph = $('#mock-ph'); if (!ph) return;
    ph.style.display = show === false ? 'none' : '';
    if (msg) $('#mock-ph-msg').innerHTML = msg;
  }
  async function renderArtCanvas(longSide, model, side) {
    const m = model || state.model; const W = m.trim.w, H = m.trim.h;
    side = side === 'back' ? 'back' : 'front';
    const k = (longSide || 2048) / Math.max(W, H);
    const pxW = Math.round(W * k), pxH = Math.round(H * k);
    const r = await buildExportSVG({ bleed: false, pxW, pxH, idp: 'tx-' + side + '-', model: m, side });
    const c = await svgToCanvas(r.svg, pxW, pxH);
    const bg = m.panels[side].bg;
    c.backColor = bg.mode === 'two-tone' ? bg.c2 : bg.c1;
    return c;
  }
  const specKey = m => m.format + '|' + JSON.stringify(specOf(m));
  async function init3D() {
    buildMockControls();
    if (!window.MPMockup || typeof window.MPMockup.create !== 'function') {
      mockPH('The 3D module <b>mockup3d.js</b> is not next to index.html yet. The flat design and every export still work.');
      return;
    }
    mockPH('Building the 3D pack…');
    try {
      const host = h('div', { id: 'mock-host', style: 'position:absolute;inset:0' });
      $('#mock-view').insertBefore(host, $('#mock-view').firstChild);
      const m = state.model;
      const art = await renderArtCanvas(2048, m, 'front'), artBack = await renderArtCanvas(2048, m, 'back');
      mock.inst = await window.MPMockup.create(host, { type: FORMATS[m.format].mock, spec: specFor3D(m), art, artBack, finish: mock.finish, background: mock.bg, view: mock.view });
      mock.type = FORMATS[m.format].mock; mock.specKey = specKey(m);
      mockPH(null, false);
      buildMockControls();
      schedule3D();          // catch up with anything edited while the 3D pack was being built
    } catch (e) {
      mock.inst = null; mock.failed = true;
      console.warn('[label-studio] 3D mockup unavailable:', e);
      mockPH('3D preview could not start here (' + esc(e && e.message || 'no WebGL') + '). The flat design and every export still work.');
    }
  }
  const schedule3D = debounce(() => { update3D(); }, 450);
  async function update3D(force) {
    if (!mock.inst) return;
    if (mock.busy) { mock.pending = true; if (force) { while (mock.busy) await new Promise(r => setTimeout(r, 60)); } else return; }
    mock.busy = true; $('#mock-busy').classList.add('on');
    try {
      // one snapshot of the design for the pack's shape and both its panels, so they always match (edits made
      // while the art renders wait for the next round)
      const m = clone(state.model); const type = FORMATS[m.format].mock; const key = specKey(m); const spec3 = specFor3D(m);
      const art = await renderArtCanvas(2048, m, 'front'), back = await renderArtCanvas(2048, m, 'back');
      if (mock.type !== type || mock.specKey !== key) {
        if (typeof mock.inst.setSpec === 'function') mock.inst.setSpec(spec3, art, back);      // rebuild from the spec, art in the same step
        else mock.inst.setType(type, { w: m.trim.w, h: m.trim.h }, art);                              // (an older mockup3d.js)
        mock.type = type; mock.specKey = key;
      } else mock.inst.setArt(art, back);
    } catch (e) { console.warn('[label-studio] 3D update failed:', e); }
    finally {
      mock.busy = false; $('#mock-busy').classList.remove('on');
      if (mock.pending) { mock.pending = false; schedule3D(); }
    }
  }
  function buildMockControls() {
    const host = $('#mock-ctrls'); host.innerHTML = '';
    const dis = !mock.inst;
    const seg = (label, opts, cur, fn) => {
      const s = h('div', { class: 'seg', role: 'group', 'aria-label': label });
      opts.forEach(o => {
        const b = h('button', { type: 'button', class: o[0] === cur ? 'on' : '', disabled: dis }, esc(o[1]));
        b.addEventListener('click', () => { $$('button', s).forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(o[0]); });
        s.appendChild(b);
      });
      return fieldWrap(label, s);
    };
    const views = [['front', 'Front'], ['three-quarter', '¾ view'], ['hero', 'Hero']];
    if (!window.MPMockup || !window.MPMockup.VIEWS || window.MPMockup.VIEWS.indexOf('back') >= 0) views.push(['back', 'Back']);
    host.appendChild(seg('View', views, mock.view, v => { mock.view = v; try { mock.inst.setView(v); } catch (e) { console.warn(e); } }));
    host.appendChild(seg('Finish', [['gloss', 'Gloss'], ['satin', 'Satin'], ['matte', 'Matte']], mock.finish, v => { mock.finish = v; try { mock.inst.setFinish(v); } catch (e) { console.warn(e); } }));
    const sws = h('div', { class: 'swatches' });
    [['#f4ece9', 'Warm white'], ['#ffffff', 'White'], ['#fbe3ee', 'Blush'], ['#e8efe4', 'Sage'], ['#d9d2cd', 'Stone'], ['#2a2125', 'Ink']].forEach(c => {
      const b = h('button', { type: 'button', class: 'sw' + (mock.bg === c[0] ? ' on' : ''), style: 'background:' + c[0], title: c[1], 'aria-label': 'Backdrop ' + c[1], disabled: dis });
      b.addEventListener('click', () => { mock.bg = c[0]; $$('.sw', sws).forEach(x => x.classList.remove('on')); b.classList.add('on'); $('#mock-view').style.background = c[0]; try { mock.inst.setBackground(c[0]); } catch (e) { console.warn(e); } });
      sws.appendChild(b);
    });
    host.appendChild(fieldWrap('Backdrop', sws));
    const btn = h('button', { class: 'btn block', type: 'button', disabled: dis }, icon('png', 'ico-sm') + 'Save 3D render (PNG)');
    btn.addEventListener('click', async () => { btn.disabled = true; try { await export3D(false); } catch (e) { toast('Render failed: ' + e.message, true); } btn.disabled = false; });
    host.appendChild(btn);
    host.appendChild(h('div', { class: 'mock-hint', text: mock.inst ? 'Drag to turn · scroll to zoom. The pack is built from the item specs and wears both exact panels.' : 'The 3D pack wears the exact export files.' }));
  }

  /* =========================================================================================
   * 15. Orchestration
   * ======================================================================================= */
  let frame = 0; const pend = { layers: false, three: false, layout: false };
  function invalidate(o) {
    o = o || {};
    if (o.layers) pend.layers = true; if (o.three) pend.three = true; if (o.layout) pend.layout = true;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!state.model) return;
      if (pend.layout) { layoutStage(); pend.layout = false; }
      renderStage();
      if (pend.layers) { renderLayers(); pend.layers = false; }
      syncInspector(); updatePopWidth(); updateNetQtyNote(); updatePPINotes(); updateBadgeFit();
      const nwp = $('#nw-preview'); if (nwp) nwp.textContent = netWeightText(state.model.panels.front.els.netWeight);
      const iss = collectIssues(state.model); renderNotices(iss); renderStatus(iss);
      if (!ui.dragging) { schedule3D(); pend.three = false; }
      autosave();
    });
  }
  function layoutAndRender(o) { layoutStage(); invalidate(Object.assign({ layers: true }, o || {})); }
  function select(key, fromStage) {
    if (state.sel === key) { drawSelection(); return; }
    state.sel = key; buildInspector(); renderLayers(); drawSelection();
    if (fromStage && key) revealInspector();
  }
  function revealInspector() {
    const panel = $('.panel-left'); const sec = $('#sec-layers'); if (!panel || !sec) return;
    const pr = panel.getBoundingClientRect(), ir = $('#sec-inspector').getBoundingClientRect();
    if (ir.top < pr.top || ir.top > pr.bottom - 120) panel.scrollTo({ top: sec.offsetTop - 4, behavior: 'smooth' });
  }
  function afterModelReplaced(resetSel) {
    if (resetSel) state.sel = null;
    if (state.sel && state.sel !== 'background' && !curPanel().els[state.sel]) state.sel = null;
    $('#docname').value = state.model.name;
    renderPresets(); renderFormat(); buildInspector(); syncToggles(); syncViewSwitch();
    ensureFonts(state.model).then(() => { clearMeasureCache(); invalidate({ three: true }); });
    layoutAndRender({ three: true });
    updateUndoButtons();
  }
  function applyPreset(id) {
    const p = PRESETS.find(x => x.id === id); if (!p) return;
    state.model = p.build(); state.sel = null; state.lost = {}; ui.zoomMode = 'fit';
    if (ui.view === 'layout') ui.view = state.side;
    commit(); afterModelReplaced(true);
    toast(p.name + ' applied' + (hist.i > 0 ? ' · Ctrl+Z to go back' : ''));
  }
  function syncToggles() {
    $('#tg-bleed').classList.toggle('on', ui.showBleed);
    $('#tg-safe').classList.toggle('on', ui.showSafe);
    $('#tg-guides').classList.toggle('on', ui.showGuides);
    const ref = state.model && compareRef();
    $('#tg-compare').disabled = !ref; $('#tg-compare').classList.toggle('on', ui.compare && !!ref);
    $('#tg-compare').title = ref ? 'Compare with: ' + ref.label : isLayoutView() ? 'Compare works on the front or back panel' : 'No client reference for this design';
    const ov = !!(ui.compare && state.model && overlayRef());
    $('#compare-mode').hidden = !ov;
    $$('#compare-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.compareMode));
    $('#compare-op').hidden = !(ov && ui.compareMode === 'overlay');
  }
  // the editor view: the front or the back panel (each with its own layers), or the whole print layout
  function syncViewSwitch() {
    $$('#view-switch button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.view));
    const h2 = $('#sec-layers .sec-h h2'); if (h2) h2.textContent = ui.view === 'layout' ? 'Layers' : 'Layers · ' + SIDES[state.side].toLowerCase();
  }
  function setView(v) {
    if (v !== 'front' && v !== 'back' && v !== 'layout') return;
    if (v !== 'layout') state.side = v;
    ui.view = v; state.sel = null; ui.hover = null; ui.zoomMode = 'fit';
    syncViewSwitch(); syncToggles(); buildInspector();
    layoutAndRender();
  }

  function wire() {
    $$('[data-icon]').forEach(i => { i.outerHTML = icon(i.getAttribute('data-icon')); });
    // the guide toggles carry their own line sample, so they double as the legend
    const sample = (sel, css) => { const t = $(sel); const ic = t.querySelector('svg'); if (ic) ic.outerHTML = '<i class="lg" style="' + css + '"></i>'; };
    sample('#tg-bleed', 'border-top-style:dashed;border-color:#e5484d');
    sample('#tg-safe', 'border-top-style:dashed;border-color:#1f5fc9');
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#btn-save').addEventListener('click', saveDesignFile);
    $('#btn-export').addEventListener('click', openExport);
    $('#open-json').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) openDesignFile(f); e.target.value = ''; });
    const dn = $('#docname');
    dn.addEventListener('input', () => { state.model.name = dn.value || 'Untitled design'; autosave(); });
    dn.addEventListener('change', () => { commit(); });
    $('#zoom-in').addEventListener('click', () => { ui.zoomMode = 'manual'; ui.k = Math.min(ui.k * 1.25, 60); layoutAndRender(); });
    $('#zoom-out').addEventListener('click', () => { ui.zoomMode = 'manual'; ui.k = Math.max(ui.k / 1.25, 0.6); layoutAndRender(); });
    $('#zoom-fit').addEventListener('click', () => { ui.zoomMode = 'fit'; layoutAndRender(); });
    $('#tg-bleed').addEventListener('click', () => { ui.showBleed = !ui.showBleed; syncToggles(); invalidate(); });
    $('#tg-safe').addEventListener('click', () => { ui.showSafe = !ui.showSafe; syncToggles(); invalidate(); });
    $('#tg-guides').addEventListener('click', () => { ui.showGuides = !ui.showGuides; syncToggles(); invalidate(); });
    $('#tg-compare').addEventListener('click', () => { ui.compare = !ui.compare; syncToggles(); layoutAndRender(); });
    $$('#compare-mode button').forEach(b => b.addEventListener('click', () => { ui.compareMode = b.dataset.v; syncToggles(); layoutAndRender(); }));
    $('#compare-op input').addEventListener('input', e => { ui.compareOpacity = parseFloat(e.target.value); invalidate(); });
    $$('#view-switch button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
    const s = stage();
    s.addEventListener('pointerdown', onStageDown);
    s.addEventListener('pointermove', onStageMove);
    s.addEventListener('pointerup', onStageUp);
    s.addEventListener('pointercancel', onStageUp);
    s.addEventListener('pointerleave', () => { if (!drag && ui.hover) { ui.hover = null; drawSelection(); } });
    s.addEventListener('dblclick', e => {
      const t = e.target.closest && e.target.closest('[data-el]'); if (!t) return;
      const ta = $('#inspector textarea, #inspector input[type=text]'); if (ta) { ta.focus(); ta.select && ta.select(); }
    });
    $('#stage-wrap').addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); ui.zoomMode = 'manual'; ui.k = clamp(ui.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.6, 60); layoutAndRender();
    }, { passive: false });
    $('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg' || (e.target.closest && e.target.closest('[data-close]'))) closeModal(); });
    $('#statusbar').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-focus]'); if (b) focusEl(b.getAttribute('data-focus'), b.getAttribute('data-side')); });
    document.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { if ($('#modal-bg').classList.contains('on')) closeModal(); else if (!typing) select(null); return; }
      if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveDesignFile(); return; }
      if (typing) return;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (e.altKey) return;   // Alt+arrows belong to the browser (back / forward)
      // arrow keys on the 3D view turn the pack there; they must never move anything in the print artwork
      if (e.defaultPrevented || (e.target && e.target.closest && e.target.closest('#mock-view'))) return;
      const step = e.shiftKey ? 5 : 0.5;
      const dirs = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (dirs[e.key] && state.sel) { e.preventDefault(); nudge(dirs[e.key][0], dirs[e.key][1]); }
    });
    if (window.ResizeObserver) new ResizeObserver(() => { if (ui.zoomMode === 'fit') layoutAndRender(); }).observe($('#stage-wrap'));
    else window.addEventListener('resize', () => { if (ui.zoomMode === 'fit') layoutAndRender(); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => { clearMeasureCache(); invalidate({ three: true }); });
  }

  async function boot() {
    if (!itemsReady()) throw new Error('items.js is missing (window.MPItems): the item specs could not be loaded. Keep items.js next to index.html.');
    addFontLinks();
    const pops = (window.MP_ASSETS && window.MP_ASSETS.pops) || [];
    pops.forEach(p => { registerAsset({ id: p.id, src: p.src, w: p.w, h: p.h, name: p.name + ' (' + p.note + ')', short: p.name.replace('Pink pop, ', '').replace(/^./, c => c.toUpperCase()), note: p.note, kind: 'pop' }); BUNDLED.add(p.id); });
    if (!ASSETS['pop-gold']) throw new Error('assets/assets-data.js is missing: the bundled pop pictures could not be loaded.');
    wire();
    const saved = readAutosave();
    let restored = false;
    if (saved && saved.model) {
      try {
        // uploaded pictures were kept in IndexedDB (see autosave); bring them back first
        const ids = Array.isArray(saved.idb) ? saved.idb.filter(x => typeof x === 'string') : [];
        if (ids.length) {
          saved.assets = isObj(saved.assets) ? saved.assets : {};
          try { (await idbGetAll(ids)).forEach(a => { if (a && a.id && typeof a.src === 'string') { saved.assets[a.id] = a; IDB.saved.add(a.id); } }); } catch (e) { /* reported below as a lost picture */ }
        }
        await loadDesignData(saved); restored = true;
      } catch (e) { restored = false; }
    }
    if (!restored) state.model = presetWrapper(false);
    commit();
    await Promise.race([Promise.all(Object.values(fontLinks)), new Promise(r => setTimeout(r, 4000))]);
    await ensureFonts(state.model, 5000);
    clearMeasureCache();
    afterModelReplaced(true);
    await nextFrame();
    layoutAndRender();
    init3D();
    const lostN = Object.keys(state.lost).filter(k => state.lost[k]).length;
    if (restored && lostN) toast('Your last design was restored, but ' + (lostN > 1 ? lostN + ' pictures' : 'a picture') + ' could not be. See the note above the design.', true);
    else if (restored) toast('Welcome back: your last design was restored');
    window.MPStudio.ready = true;
  }

  // Small API for scripted checks (QA) and power users in the console.
  window.MPStudio = {
    ready: false,
    get model() { return state.model; },
    applyPreset, select, undo, redo,
    buildExportSVG, renderPNG, preparePrint, renderArtCanvas,
    exportSVGFile, exportPNGFile, saveDesignFile, buildLayoutSVG, exportLayoutSVG, setView, resetSpec,
    get side() { return state.side; }, get view() { return ui.view; },
    spec: () => specOf(state.model),
    layout: () => { const L = layoutGeometry(state.model); return { kind: L.kind, w: L.w, h: L.h, bleed: L.b, pieces: L.pieces.map(q => ({ side: q.side, x: q.x, y: q.y, w: q.w, h: q.h, src: q.src })) }; },
    setSpecValue: (path, v) => { setSpecValue(path, v); commit(); layoutAndRender({ three: true, layers: true }); renderFormat(); },
    blockBox: (key, side) => { const v = panelView(state.model, side || 'back'); const el = v.els[key]; return el ? blockLayout(key, el, v).bbox : null; },
    finBand: () => finBand(panelView(state.model, 'back')), finOverlaps: () => finOverlaps(state.model),
    sealZones: side => sealZones(panelView(state.model, side || 'front')), sealOverlaps: () => sealOverlaps(state.model),
    typeBoxes: side => typeBoxes(panelView(state.model, side || 'front')),
    get dieline() { return ui.dieline ? { name: ui.dieline.name, wmm: ui.dieline.wmm, hmm: ui.dieline.hmm, dx: ui.dieline.dx, dy: ui.dieline.dy, scale: ui.dieline.scale } : null; },
    issues: () => collectIssues(state.model), isDraft: side => isDraft(state.model, side),
    printPage: (crop, layout) => printPage(state.model, !!crop, !!layout), rasterInfo: () => rasterInfo(state.model),
    get lost() { return Object.assign({}, state.lost); },
    flushAutosave: () => { autosave.flush(); return saveChain; },
    loadDesign: async (obj) => { await loadDesignData(obj); hist.stack = []; hist.i = -1; commit(); afterModelReplaced(true); },
    serialize: () => serialize(true),
    netWeightText, fileBase,
    get mockup() { return mock.inst; },
    get mockBusy() { return mock.busy || mock.pending; },
    export3D, update3D: () => update3D(true),
    ensureFonts: () => ensureFonts(state.model, 8000),
    set: (path, v) => { setP(path, v); commit(); afterModelReplaced(false); },
    geom: (key, side) => { const v = panelView(state.model, side || state.side); const el = v.els[key]; if (!el) return null; const g = key === 'logo' ? logoGeometry(el) : textGeometry(el, elText(key, el)); return { cap: g.cap, fs: g.fs, lh: g.lh, lines: g.lines.map(l => ({ t: l.t, x1: l.x1, x2: l.x2, base: l.base })) }; },
    compare: (on, mode) => { ui.compare = !!on; if (mode) ui.compareMode = mode; syncToggles(); layoutAndRender(); },
    // for gpu.js (AI on your GPU): the studio's icons and toasts, one more picture, and AI background art set
    // behind a panel. Only the background changes: the logo, every word and the real pop stay on top, as they are.
    icon, toast,
    addImageAsset: async (o) => {
      const src = String((o && o.src) || '');
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(src)) throw new Error('not a PNG, JPG or WebP picture');
      const d = await imageSize(src); const kind = (o && o.kind) || 'image'; const nm = String((o && o.name) || 'Picture');
      const id = uid(kind);
      registerAsset({ id, src, w: d.w, h: d.h, name: nm, short: nm.length > 18 ? nm.slice(0, 17) + '…' : nm, kind, opaque: false });
      return id;
    },
    useBackgroundImage: (id, side) => {
      if (!ASSETS[id]) throw new Error('unknown picture');
      const sd = side === 'front' || side === 'back' ? side : state.side;
      const bg = state.model.panels[sd].bg;
      bg.mode = 'image'; bg.image = { src: id, zoom: 1, ox: 0, oy: 0 };
      commit();
      if (!isLayoutView() && sd === state.side) { if (state.sel === 'background') buildInspector(); else select('background', true); }
      invalidate({ three: true, layers: true });
      return sd;
    },
  };
  boot().catch(e => {
    console.error('[label-studio] could not start:', e);
    document.body.insertAdjacentHTML('afterbegin', '<div style="padding:12px 16px;background:#7a1d2b;color:#fff;font:14px system-ui">Label Studio could not start: ' + esc(e.message || e) + '</div>');
  });
})();
