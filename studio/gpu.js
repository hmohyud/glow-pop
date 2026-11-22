/* Model Pops Label Studio · AI on your GPU (gpu.js)
 *
 * Optional, and the only part of the studio that uses a GPU: the user's own, through the Model Pops GPU bridge
 * (gpu-bridge/) that runs next to ComfyUI on their PC. The studio reaches the bridge at http://127.0.0.1:8189 on
 * that PC, or from anywhere through a tunnel the user starts on that same PC (an https trycloudflare or ngrok
 * address). Without a bridge this panel only explains itself, and the studio works exactly as before.
 *
 * What comes back is one of three things, and they never mix:
 *  - Background art: text-free, pop-free art for the print file. "Use as background" sets it as the panel's
 *    background image (cover fit, as Background > Image does); the exact logo, every word and the real pop stay
 *    on top as live layers. Made from "My current design", only the design's background is sent.
 *  - Elements: one picture element (a lollipop, a heart, a slice of lemon), new from a description or a rework of
 *    one that is already in the design. The bridge draws it on one flat colour and the studio's own remover cuts
 *    that colour out here; "Add to design" and "Replace the element" then place it as a picture layer. It is an
 *    AI drawing and is marked as one wherever it shows. It is never the Pop layer: that stays the real photo.
 *  - Ideas (logo or pack pictures): to choose a direction. Always labelled "ideas, not print files", and never
 *    placed in the design.
 * No key by default: the panel asks only for the address. A bridge that asks for a key (it answers 401: its
 * requireKey is on) gets it in the X-MP-Key header only, never in a URL. This browser keeps the address (and a key,
 * if one was used) only when asked to.
 * Results stay in this browser (IndexedDB) for a day. Classic script: works from file://, http and https.
 */
(function () {
  'use strict';
  const MP = window.MPStudio;
  if (!MP || !document.querySelector('.topbar')) return;     // the studio did not load: nothing to add to

  /* ------------------------------------------------------------------------------------------ constants */
  const LS_KEY = 'model-pops-label-studio:gpu:v1';
  const LS_MAKE = 'model-pops-label-studio:gpu-make:v1';     // the last brief (no secrets): a convenience only
  const DB_NAME = 'model-pops-label-studio-gpu', DB_STORE = 'results';
  const KEEP_MS = 24 * 3600e3, KEEP_N = 24;
  const BASE_PIXELS = 1.0e6;                                    // the workflow works at about 1 megapixel
  const LOCAL_URL = 'http://127.0.0.1:8189';
  // What each kind of picture is, as flags the rest of the panel reads:
  //   use      where a result may go: 'background' (art), 'element' (a picture element) or '' (ideas: nowhere)
  //   badge    the words on a result that is not a print file
  //   bgOnly   "My current design" is sent as its background only
  //   words, lollipop   ideas from the current design: its exact words, and the real pop as the product lock
  //   element  no "Start from" and no "How far": a new element from a description, or a rework of one (so no bands)
  const MODES = {
    art: {
      label: 'Background art', tag: 'Art', file: 'background-art', use: 'background', bgOnly: true,
      note: '<b>For print.</b> No words, no logo, no pop: art to go behind your design. The studio keeps the exact logo, every word and the real pop on top.',
      bands: [['Refine', 'The same background (its colours, shapes and patterns), refined.'], ['Variation', 'A fresh variation of the background.'],
        ['New style', 'A new background, loosely inspired by it.'], ['All new', 'A completely new background.']],
      chips: [
        ['Riviera sun', 'sunny Riviera summer: sun-bleached pink and peach stripes, a soft low sun, little glints of sea light'],
        ['Watercolour hearts', 'soft watercolour hearts scattered on blush pink, airy and hand-painted'],
        ['Candy gloss', 'glossy candy swirls in raspberry and blush, smooth and luminous, premium confectionery'],
        ['Gold sparkle', 'fine gold-foil sparkles on deep raspberry, premium beauty, elegant'],
        ['Pastel confetti', 'playful pastel confetti and tiny stars on cream, light and joyful'],
        ['Minimal blush', 'minimal: a calm blush-to-white gradient with fine gold lines and lots of quiet space'],
      ],
    },
    logo: {
      label: 'Logo ideas', tag: 'Idea', file: 'logo-idea', use: '', badge: 'Idea · not a print file', lollipop: true,
      note: '<b>Ideas, not print files.</b> To choose a direction for the MODEL POPS logo. The logo that prints stays the studio’s exact type (or your final vector logo, under Logo → Upload).',
      bands: [['Refine', 'A close refinement of the MODEL POPS lettering.'], ['New take', 'A new take on the logo, keeping its spirit.'],
        ['Loose', 'A new logo, only loosely inspired by it.'], ['All new', 'A completely new MODEL POPS logo.']],
      chips: [
        ['Fashion house', 'a bold, modern fashion-house wordmark with wide letter spacing in glossy gold foil, premium beauty finish'],
        ['Magazine Didone', 'a high-contrast Didone wordmark like a beauty magazine masthead, with elegant hairlines'],
        ['Script', 'an elegant hand-lettered script with a soft flourish, feminine and confident'],
        ['Candy letters', 'rounded, playful candy lettering in glossy pink with a soft highlight'],
      ],
    },
    pack: {
      label: 'Pack ideas', tag: 'Idea', file: 'pack-idea', use: '', badge: 'Idea · not a print file', lollipop: true, words: true,
      note: '<b>Ideas, not print files.</b> Pictures of a whole pack, to choose a direction. AI words can be misspelled and the pop is drawn, so these never go to print: the real file is made here in the studio.',
      bands: [['Refine', 'The same pack; only the logo lettering changes.'], ['New logo', 'Same layout, pop and words; a new logo, colours to match.'],
        ['New style', 'A new design for the same pack; the words and the pop stay.'], ['All new', 'Everything new except the words and the pop.']],
      chips: [
        ['Premium beauty', 'premium beauty pack: a glossy gold-foil logo on a calm blush background, refined and minimal'],
        ['Riviera summer', 'sunny Riviera summer: sun-bleached pastels and soft stripes, fresh and playful'],
        ['Clean minimal', 'clean and minimal: lots of white space with one confident pink accent'],
        ['Pop-art candy', 'bold pop-art candy: big glossy shapes, high energy, joyful'],
      ],
    },
    // a picture element for the design. Its chips are the one-click examples under "Describe the element"
    element: {
      label: 'Element', tag: 'AI drawing', file: 'element', use: 'element', badge: 'AI drawing', element: true,
      note: '<b>AI drawing.</b> A picture element for your design: a lollipop, a heart, fruit. AI draws it, so it is not your product photo: the real pop stays under Pop.',
      chips: [
        ['A strawberry lollipop', 'a strawberry lollipop'], ['A heart', 'a heart'], ['A sparkle', 'a sparkle'],
        ['A seashell', 'a seashell'], ['A palm leaf', 'a palm leaf'], ['A slice of lemon', 'a slice of lemon'],
      ],
    },
  };
  const MODE_ORDER = ['art', 'element', 'logo', 'pack'];       // the "What" control, two by two: what can go into the design, then the ideas
  const BAND_AT = [0.15, 0.4, 0.6, 0.9];                      // a click on a band sets the slider to its middle
  const bandOf = d => d < 0.25 ? 0 : d < 0.5 ? 1 : d < 0.75 ? 2 : 3;    // (the bands of the Design brief node)
  const BAND_RANGE = ['0–0.25', '0.25–0.5', '0.5–0.75', '0.75–1'];
  // the bases: the current design, or one of the bundled bases in ComfyUI's input/model-pops/bases/
  const BASES = {
    mine: { label: 'My current design', sub: 'front panel' },
    wrapper: { label: 'Wrapper draft', sub: 'client’s current', name: 'individual-wrapper (current).png', thumb: 'assets/ref/individual-wrapper-current.png' },
    bag: { label: 'Bag draft', sub: 'client’s current', name: 'bag 100 g (current).png', thumb: 'assets/ref/bag-100g-current.png' },
  };
  // ideas only: the lollipop the bridge holds the drawing to, matched to the pop on the current design
  const LOLLIPOPS = { 'pop-gold': 'pink pop, gold stick (current wrapper art).png', 'pop-white': 'pink pop, white stick (old printed pack).png' };
  const SAME_AS_BASE = 'same lollipop as the base design';
  // elements: a rework sends the element on a square of one flat colour, filling about two thirds of it (as the
  // bridge asks the model to draw a new one). Words that say the element is green, or blue, decide the flat
  // colour it is drawn on (see pickBackground). Teal, turquoise and aqua count as both.
  const EL_PX = 1024, EL_FILL = 0.66;
  const GREENISH = /\b(green(ish|ery)?|lime|mint|lea(f|ves)|leafy|palm|grass|kiwi|olive|emerald|jade|sage|matcha|avocado|pistachio|clover|cactus|fern|herb|basil|veggie|vegetable|plant|tree|teal|turquoise|aqua)s?\b/i;
  const BLUEISH = /\b(blue(ish)?|navy|sky|ocean|sea|wave|water|denim|sapphire|cobalt|azure|indigo|blueberr(y|ies)|teal|turquoise|aqua)s?\b/i;

  /* ------------------------------------------------------------------------------------------ helpers */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, c) => (typeof MP.icon === 'function' ? MP.icon(n, c) : '');
  const toast = (m, e) => { try { MP.toast(m, e); } catch (x) { /* no toasts */ } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const gb = mb => (Math.round(mb / 102.4) / 10).toFixed(1);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const randomSeed = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647; } catch (e) { return Math.floor(Math.random() * 2147483647); } };
  const clampSeed = v => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.min(2147483647, Math.max(0, v)) : 0; };
  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => { const v = attrs[k]; if (v == null || v === false) return; if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function utf8ToB64(str) { const u8 = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('The picture could not be read.')); im.src = src; }); }
  function blobToDataURL(b) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); }); }
  function dataURLToBlob(u) { const s = atob(u.slice(u.indexOf(',') + 1)); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new Blob([a], { type: 'image/png' }); }
  async function whenReady() { for (let i = 0; i < 300 && !MP.ready; i++) await sleep(100); if (!MP.ready) throw new Error('The studio is still starting.'); }
  const isLoopback = h => /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i.test(h) || /\.localhost$/i.test(h);
  const isTunnel = h => /(^|\.)(ngrok-free\.app|ngrok-free\.dev|ngrok\.app|ngrok\.dev|ngrok\.io|trycloudflare\.com)$/i.test(h);
  const pageOrigin = () => (location.origin && location.origin !== 'null' ? location.origin : 'a file opened from disk (origin “null”)');
  // a pasted address: scheme added when missing, a trailing /api or /api/health dropped, no query or user info
  function normalizeURL(raw) {
    let s = String(raw || '').trim();
    if (!s) return { error: 'Paste the bridge address first (on the PC with the GPU it is ' + LOCAL_URL + ').' };
    const found = /https?:\/\/[^\s|<>"']+/i.exec(s); if (found) s = found[0];          // (a whole line copied from the tunnel window: take the address in it)
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = (/^(localhost|127\.|\[::1\])/i.test(s) ? 'http://' : 'https://') + s;
    let u; try { u = new URL(s); } catch (e) { return { error: 'That is not a web address. Example: ' + LOCAL_URL }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'The address starts with http:// or https://.' };
    if (u.username || u.password) return { error: 'Leave any user name or password out of the address.' };
    const p = u.pathname.replace(/\/+$/, '').replace(/\/api(\/health)?$/i, '');
    return { url: u.origin + p, u };
  }

  /* ------------------------------------------------------------------------------------------ state */
  const st = {
    open: false, restored: false, autoTried: false,
    conn: { url: '', key: '', askKey: false, state: 'off', health: null, err: '', seen: 0, editing: true },   // askKey: the bridge asked for a key (401)
    mode: 'art', base: 'mine', distance: 0.4, styleTouched: false,
    elOp: 'new', target: null, seenSel: null,   // Element: New or Rework; the element to rework { key, side }; the studio's selection when last looked at
    seedMode: 'random', seed: 20261120, versions: 2,
    run: null, runMsg: '', results: [], sel: null, mineThumb: '', clearArm: 0,
  };
  let D = null;                     // the drawer
  let connSeq = 0, runSeq = 0, hTimer = 0, tick = 0, thumbSeq = 0;
  let elSig = null, pvSig = '', lookTimer = 0;      // what the rework cards and the result card were last drawn from

  /* ------------------------------------------------------------------------------------------ remembered address (+ key) */
  // A studio opened from disk (file://, origin "null") shares ONE browser storage with every other HTML file opened
  // from disk, so any downloaded page could read what is kept there. On such a page the address (and a key) is kept
  // only for this tab (sessionStorage) and never in localStorage; online and on a local server, localStorage (this
  // site only). A key is kept only if one was used (the bridge asked for it).
  const FILE_PAGE = location.protocol === 'file:' || location.origin === 'null';
  function credStore() { try { return FILE_PAGE ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }
  function readCreds() { try { const s = credStore().getItem(LS_KEY); const o = s ? JSON.parse(s) : null; return o && typeof o.url === 'string' && (o.key == null || typeof o.key === 'string') ? { url: o.url, key: o.key || '' } : null; } catch (e) { return null; } }
  function saveCreds() { try { const o = { url: st.conn.url, savedAt: new Date().toISOString() }; if (st.conn.key) o.key = st.conn.key; credStore().setItem(LS_KEY, JSON.stringify(o)); } catch (e) { toast('This browser would not keep the address (storage blocked).', true); } renderForget(); }
  function removeCreds() { try { credStore().removeItem(LS_KEY); } catch (e) { /* storage blocked */ } if (FILE_PAGE) { try { localStorage.removeItem(LS_KEY); } catch (e) { /* storage blocked */ } } renderForget(); }
  // a key an earlier version kept in the shared file:// localStorage moves to this tab only
  function moveFileCreds() {
    if (!FILE_PAGE) return;
    try { const old = localStorage.getItem(LS_KEY); if (old) { if (!sessionStorage.getItem(LS_KEY)) sessionStorage.setItem(LS_KEY, old); localStorage.removeItem(LS_KEY); } } catch (e) { /* storage blocked */ }
  }
  function saveMake() {
    try { localStorage.setItem(LS_MAKE, JSON.stringify({ mode: st.mode, base: st.base, distance: st.distance, style: $('#gd-style', D).value, styleTouched: st.styleTouched, elOp: st.elOp, what: $('#gd-what', D).value, seedMode: st.seedMode, seed: clampSeed($('#gd-seed', D).value), versions: st.versions })); } catch (e) { /* storage blocked */ }
  }
  function readMake() {
    let o = null; try { o = JSON.parse(localStorage.getItem(LS_MAKE) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return;
    if (MODES[o.mode]) st.mode = o.mode;
    if (BASES[o.base]) st.base = o.base;
    if (typeof o.distance === 'number' && o.distance >= 0 && o.distance <= 1) st.distance = Math.round(o.distance * 20) / 20;
    if (typeof o.style === 'string' && o.style.trim()) { $('#gd-style', D).value = o.style.slice(0, 600); st.styleTouched = !!o.styleTouched; }
    if (o.elOp === 'new' || o.elOp === 'rework') st.elOp = o.elOp;
    if (typeof o.what === 'string') $('#gd-what', D).value = o.what.slice(0, 600);
    if (o.seedMode === 'fixed' || o.seedMode === 'random') st.seedMode = o.seedMode;
    if (Number.isFinite(o.seed)) { st.seed = clampSeed(o.seed); $('#gd-seed', D).value = st.seed; }
    if ([1, 2, 3, 4].indexOf(o.versions) >= 0) st.versions = o.versions;
  }
  // bring something in the panel into view, gently (never while the user is typing in the panel)
  function reveal(node) {
    if (!node || !st.open) return;
    const a = document.activeElement;
    if (a && D.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName) && a.type !== 'range') return;
    try { node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { node.scrollIntoView(false); }
  }

  /* ------------------------------------------------------------------------------------------ talking to the bridge */
  // every call carries ngrok's "skip the browser warning" header, and a key only when there is one (in a header,
  // never in the URL): a bridge asks for it with a 401; a keyless bridge ignores it
  async function call(method, path, body, o) {
    o = o || {}; const c = st.conn;
    const ctl = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, o.timeout || 15000);
    const outer = o.signal;
    const onOuter = () => ctl.abort();
    if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener('abort', onOuter, { once: true }); }
    const headers = { 'ngrok-skip-browser-warning': '1' };
    if (o.key || c.key) headers['X-MP-Key'] = o.key || c.key;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      let res;
      try {
        res = await fetch((o.base || c.url) + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl.signal });
      } catch (e) {
        if (outer && outer.aborted) throw Object.assign(new Error('cancelled'), { cancelled: true });
        if (timedOut) throw Object.assign(new Error('timeout'), { kind: 'timeout', secs: Math.round((o.timeout || 15000) / 1000) });
        throw Object.assign(new Error((e && e.message) || 'network'), { kind: 'network' });
      }
      if (o.raw && res.ok) return { res, blob: await res.blob() };
      const txt = await res.text(); let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
      if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status, data, path });
      if (data === null || typeof data !== 'object') throw Object.assign(new Error('not JSON'), { kind: 'notbridge' });
      return data;
    } catch (e) {
      if (outer && outer.aborted && !e.cancelled) throw Object.assign(new Error('cancelled'), { cancelled: true });
      if (e && e.name === 'AbortError') throw timedOut ? Object.assign(new Error('timeout'), { kind: 'timeout', secs: Math.round((o.timeout || 15000) / 1000) }) : Object.assign(new Error('cancelled'), { cancelled: true });
      throw e;
    } finally { clearTimeout(timer); if (outer) outer.removeEventListener('abort', onOuter); }
  }
  // was anything there at all? (an opaque no-cors request: it tells "nothing answered" from "the browser blocked
  // the reply", which a CORS-mode fetch cannot)
  async function reachable(base) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    try { await fetch(base + '/api/health', { mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal }); return true; }
    catch (e) { return false; } finally { clearTimeout(t); }
  }
  const msgOf = e => (e && e.data && typeof e.data.error === 'string' ? e.data.error.slice(0, 300) : '');
  // a clear sentence for what went wrong while connecting (HTML, escaped)
  async function explain(e, base) {
    let u; try { u = new URL(base); } catch (x) { u = { host: base, hostname: base, protocol: '' }; }
    const host = '<b>' + esc(u.host) + '</b>';
    const tunnel = !isLoopback(u.hostname);
    const allow = location.protocol === 'https:' && isLoopback(u.hostname)
      ? ' If the browser asks whether this site may use apps and services on this device, choose <b>Allow</b>, or use your tunnel’s https address.' : '';
    if (e.status === 401) return st.conn.key ? '<b>Wrong key.</b> Use the key shown in the bridge window on the GPU PC (it is also in <code>gpu-bridge\\config.json</code> there).' : 'This bridge asks for a key: it is shown in the bridge window on the GPU PC.';
    if (e.status === 403) return 'The bridge refused this page (' + esc(pageOrigin()) + '). Add it to <code>allowedOrigins</code> in <code>gpu-bridge\\config.json</code> on the GPU PC, then restart the bridge.';
    if (e.status === 404) return 'Something answered at ' + host + ', but it is not the Model Pops GPU bridge. Check the address and the port (the bridge uses 8189).';
    if (e.status >= 500 && tunnel) return 'The tunnel at ' + host + ' is up, but the bridge behind it did not answer (' + e.status + '). Start the bridge on the GPU PC, and check that the tunnel points at port 8189.';
    if (e.status) return 'The bridge answered with an error (' + e.status + ')' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.kind === 'notbridge') return 'Something answered at ' + host + ', but not like the Model Pops GPU bridge.' + (tunnel ? ' If it is an ngrok page, check that the tunnel points at the bridge (port 8189).' : '');
    if (e.kind === 'timeout') return 'No answer from ' + host + ' in ' + e.secs + ' seconds. ' + (tunnel ? 'The bridge and the tunnel run on the GPU PC: are both still running, and is that PC awake? (A new cloudflared quick tunnel can take up to a minute to answer.)' : 'Check that the bridge is running.') + allow;
    if (await reachable(base)) {
      return tunnel
        ? 'The address ' + host + ' answers, but the bridge behind it did not. The bridge and the tunnel run on the GPU PC: are both running there, is that PC awake, and does the tunnel point at port 8189? Only a cloudflared quick-tunnel address changes at each start (paste the new one; a new one can take up to a minute to answer). ngrok’s free address stays the same.'
        : 'Something on this PC answered at ' + host + ', but the browser blocked its reply (CORS). If it is the bridge, add this page (' + esc(pageOrigin()) + ') to <code>allowedOrigins</code> in <code>gpu-bridge\\config.json</code> and restart it.';
    }
    if (tunnel) return 'Can’t reach ' + host + '. The tunnel runs on the GPU PC, next to the bridge: is it still running there, and is that PC awake? Only a cloudflared quick-tunnel address changes at each start: paste the new one (a new one can take up to a minute to answer). ngrok’s free address stays the same.';
    // an https page (the online studio) needs the browser's permission to reach this PC (Local Network Access)
    if (location.protocol === 'https:') return 'Couldn’t reach the bridge at ' + host + '. Is it running on this PC? That address works only on the GPU PC itself: on another device, paste the <b>https</b> address of the tunnel running on the GPU PC. This https page also needs the browser’s permission to reach apps on this device: when it asks, choose <b>Allow</b> (if you blocked it once, allow it again in the site settings, left of the address bar). Or use your tunnel’s https address.';
    return 'Nothing answered at ' + host + '. Is the bridge running on this PC? Start it, then connect again.';
  }

  /* ------------------------------------------------------------------------------------------ connect */
  async function connect() {
    const c = st.conn;
    const n = normalizeURL($('#gd-url', D).value);
    if (n.error) return connFail(esc(n.error));
    const key = $('#gd-key', D).value.trim();                // empty unless the bridge asked for one (or one was saved)
    if (location.protocol === 'https:' && n.u.protocol === 'http:' && !isLoopback(n.u.hostname)) {
      return connFail('This page is on https, so the browser blocks plain <b>http</b> addresses (except this PC’s own 127.0.0.1). Use the <b>https</b> address the tunnel on the GPU PC shows (cloudflared or ngrok).');
    }
    $('#gd-url', D).value = n.url;
    if (st.run && (n.url !== c.url || key !== c.key)) cancelRun(true);       // its job lives on the other bridge
    const seq = ++connSeq;
    c.url = n.url; c.key = key; c.state = 'checking'; c.err = ''; c.health = null;
    renderConn();
    let askNow = false;
    try {
      const h = await call('GET', '/api/health', undefined, { timeout: 8000 });
      if (seq !== connSeq) return;
      if (h.ok !== true || typeof h.comfy !== 'string') throw Object.assign(new Error('not the bridge'), { kind: 'notbridge' });
      c.state = 'on'; c.health = h; c.seen = Date.now(); c.editing = false;
      if ($('#gd-remember', D).checked) saveCreds();
      scheduleHealth(h.comfy === 'starting' || h.busy ? 3000 : 10000);
      refreshMineThumb();
    } catch (e) {
      if (seq !== connSeq) return;
      if (e.status === 401) { c.askKey = true; askNow = true; }             // this bridge asks for a key: show its field
      c.state = 'error'; c.health = null; c.err = await explain(e, n.url);
      if (seq !== connSeq) return;
    }
    renderAll();
    if (askNow && st.open) $('#gd-key', D).focus();
  }
  function connFail(html) { const c = st.conn; ++connSeq; c.state = 'error'; c.err = html; c.health = null; renderConn(); renderMake(); }
  function disconnect(msg) {
    const c = st.conn; ++connSeq; clearTimeout(hTimer);
    if (st.run) cancelRun(true);
    c.state = 'off'; c.health = null; c.err = msg || ''; c.editing = true;
    renderAll();
  }
  function scheduleHealth(ms) { clearTimeout(hTimer); hTimer = setTimeout(pollHealth, ms); }
  // while the panel is open (or a job runs): the bridge's state, ComfyUI's, and the GPU's
  async function pollHealth() {
    const c = st.conn; if (c.state !== 'on' && c.state !== 'lost') return;
    if (!st.open && !st.run) return;
    if (document.hidden) { scheduleHealth(15000); return; }
    const seq = connSeq;
    try {
      const h = await call('GET', '/api/health', undefined, { timeout: 8000 });
      if (seq !== connSeq) return;
      if (h.ok !== true) throw Object.assign(new Error('not the bridge'), { kind: 'notbridge' });
      c.health = h; c.seen = Date.now();
      if (c.state === 'lost') { c.state = 'on'; c.err = ''; }
    } catch (e) {
      if (seq !== connSeq) return;
      if (e.status === 401) { c.state = 'error'; c.editing = true; c.askKey = true; c.err = c.key ? 'The bridge no longer accepts this key (was it restarted with a new one?). Paste the new key and Connect.' : 'This bridge now asks for a key: it is shown in the bridge window on the GPU PC.'; renderAll(); return; }
      c.state = 'lost'; c.err = await explain(e, c.url);
      if (seq !== connSeq) return;
    }
    renderConn(); renderMake();
    scheduleHealth(c.state === 'lost' ? 15000 : c.health && (c.health.comfy === 'starting' || c.health.busy || c.health.queued) ? 3000 : 10000);
  }

  /* ------------------------------------------------------------------------------------------ the base picture */
  // the panel as the print file draws it (the studio's own renderer), with its bleed, at about 1 megapixel
  async function renderPanel(model, side, pixels, fonts) {
    const W = model.trim.w + 2 * model.bleed, H = model.trim.h + 2 * model.bleed;
    const k = Math.sqrt(pixels / (W * H)); const pxW = Math.max(16, Math.round(W * k)), pxH = Math.max(16, Math.round(H * k));
    const r = await MP.buildExportSVG({ model, side, bleed: true, pxW, pxH, idp: 'gpu-', embedFonts: !!fonts });
    const img = await loadImg('data:image/svg+xml;base64,' + utf8ToB64(r.svg));
    try { await img.decode(); } catch (e) { /* already decoded */ }
    const cv = document.createElement('canvas'); cv.width = pxW; cv.height = pxH;
    const x = cv.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, pxW, pxH); x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, pxW, pxH);
    return { url: cv.toDataURL('image/png'), w: pxW, h: pxH };
  }
  // art: only the design's background goes (no words, no logo, no pop, no added elements, no printed seal ribs),
  // on both panels, so the art is made for behind them and nothing of the product can end up in it. Ideas: the
  // front exactly as it is.
  function baseModel(mode) {
    const m = JSON.parse(JSON.stringify(MP.model));
    if (MODES[mode].bgOnly) ['front', 'back'].forEach(sd => { const P = m.panels[sd]; Object.keys(P.els).forEach(k => { if (P.els[k]) P.els[k].visible = false; }); P.bg.ribs = false; });
    return m;
  }
  // the exact words on the front, for pack ideas (like a base's .txt): never a blank (___) or an invented word
  function frontWords(m) {
    const F = m.panels.front.els; const out = [];
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
    const ok = s => s && !/_{2,}/.test(s) && /[a-z0-9]/i.test(s);
    const add = (s, where) => { s = clean(s); if (ok(s)) out.push('"' + s.replace(/"/g, '\'') + '"' + (where ? ' (' + where + ')' : '')); };
    if (F.logo && F.logo.visible) add(F.logo.style === 'upload' ? 'MODEL POPS' : F.logo.text, 'the logo');
    if (F.badge && F.badge.visible) add(F.badge.text, 'in the heart badge');
    ['productLine', 'tagline', 'count', 'flavor', 'identity'].forEach(k => { if (F[k] && F[k].visible) add(F[k].text); });
    if (F.netWeight && F.netWeight.visible) add(MP.netWeightText(F.netWeight), 'small, at the bottom');
    const s = out.length > 1 ? out.slice(0, -1).join(', ') + ' and ' + out[out.length - 1] : out.join('');
    return s.slice(0, 600);
  }
  async function buildBase(mode, baseKey) {
    if (baseKey !== 'mine') return { base: { name: BASES[baseKey].name }, label: BASES[baseKey].label };
    await whenReady();
    const m = baseModel(mode); const M = MODES[mode];
    const r = await renderPanel(m, 'front', BASE_PIXELS, !M.bgOnly);
    const out = { base: { png: r.url }, label: BASES.mine.label, w: r.w, h: r.h };
    if (M.words) { const w = frontWords(m); if (w) out.words = w; }
    if (M.lollipop) out.lollipop = lollipopFor(m.panels.front.els.pop);
    if (!out.lollipop) delete out.lollipop;
    return out;
  }
  // the product lock for ideas made from the current design: the bundled pop's own picture, or else (an
  // uploaded photo, the green pop) the pop in the design itself, never the bridge's default pink pop
  function lollipopFor(pop) {
    const known = st.conn.health && Array.isArray(st.conn.health.lollipops) ? st.conn.health.lollipops : null;
    const file = pop && pop.visible ? LOLLIPOPS[pop.src] : null;
    if (file && (!known || known.indexOf(file) >= 0)) return file;
    return !known || known.indexOf(SAME_AS_BASE) >= 0 ? SAME_AS_BASE : null;
  }
  // a bundled base the bridge does not have (when it lists its bases) cannot be chosen
  const baseAvailable = k => { const h = st.conn.health; return k === 'mine' || !h || !Array.isArray(h.bases) || h.bases.indexOf(BASES[k].name) >= 0; };
  // the small picture on the "My current design" card: what is sent, for the chosen mode
  async function refreshMineThumb() {
    if (!st.open || !MP.ready || MODES[st.mode].element) return;          // (an element has no "Start from")
    const seq = ++thumbSeq;
    try {
      const r = await renderPanel(baseModel(st.mode), 'front', 15000, !MODES[st.mode].bgOnly);
      if (seq !== thumbSeq) return;
      st.mineThumb = r.url; const im = $('#gd-thumb-mine', D); if (im) im.src = r.url;
    } catch (e) { /* the card keeps its last picture */ }
  }

  /* ------------------------------------------------------------------------------------------ elements */
  // Element is offered only by a bridge that lists it (1.1.0 on); an older one answers 400 to it
  const elementOK = () => { const h = st.conn.health; return !!h && Array.isArray(h.modes) && h.modes.indexOf('element') >= 0; };
  const modeOK = k => !MODES[k].element || elementOK();
  // the picture elements in the design that have their picture (both panels, front first, top layer first);
  // all: also one that has lost its picture (it is still in the design, but cannot be reworked)
  function pictures(all) {
    try { return MP.elements().map(e => Object.assign(e, { pic: MP.elementPicture(e.key, e.side) })).filter(e => all || e.pic); }
    catch (e) { return []; }                                              // (the studio is still starting)
  }
  const findPicture = (t, list) => (t ? (list || pictures()).find(e => e.key === t.key && e.side === t.side) || null : null);
  const findElement = t => findPicture(t, pictures(true));
  const sigOf = e => (e ? e.side + ':' + e.key : '');                    // (a key never has a colon in it)
  const selectedIn = list => list.find(e => e.key === MP.sel && e.side === MP.side) || null;
  // The element to rework. The studio sends no events, so this is looked at again whenever the panel redraws: a
  // picture newly selected in the design becomes the target; one picked here stays until then; a target that has
  // gone gives way to the selected picture, or to the top one.
  function syncTarget() {
    const list = pictures(), sel = selectedIn(list), now = sigOf(sel);
    if (now !== st.seenSel) { st.seenSel = now; if (sel) st.target = { key: sel.key, side: sel.side }; }
    if (!findPicture(st.target, list)) { const e = sel || list[0]; st.target = e ? { key: e.key, side: e.side } : null; }
    return list;
  }
  // one picked on purpose (a card here, "Rework with AI…" in the studio, Reuse settings)
  function setTarget(e) { st.target = { key: e.key, side: e.side }; st.seenSel = sigOf(selectedIn(pictures())); }
  // the flat colour an element is drawn on (it is cut out afterwards): green by default; blue when the words or
  // the element itself are green; magenta only when the subject is both green and blue (this brand is pink, and
  // hot pink sits close to magenta, so magenta is the last choice). pic: what looksGreen found in the element
  // (a rework), or nothing (a new one). The bridge owns the colours: only a name it lists is sent, with its hex.
  function pickBackground(words, pic) {
    const t = st.conn.health && st.conn.health.elementBackgrounds; const tab = t && typeof t === 'object' ? t : {};
    const ok = n => typeof tab[n] === 'string' && /^#[0-9a-f]{6}$/i.test(tab[n]);
    const w = String(words || ''), p = pic || {};
    const green = !!p.green || GREENISH.test(w), blue = !!p.blue || BLUEISH.test(w);
    let name = 'green';
    if (green && blue && ok('magenta')) name = 'magenta';
    else if (green && ok('blue')) name = 'blue';
    else if (green && ok('magenta')) name = 'magenta';                 // (a bridge that does not list blue)
    return { name, hex: ok(name) ? tab[name] : '' };
  }
  // how green and how blue is the element? green: a third or more of what is not see-through is green. blue: a
  // part of a green element is blue (it would be lost on a blue backdrop), or a third or more of any other one.
  function looksGreen(img) {
    const n = 48, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data; let seen = 0, green = 0, blue = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue; seen++;
      if (d[i + 1] > 60 && d[i + 1] > d[i] * 1.2 && d[i + 1] > d[i + 2] * 1.2) green++;
      else if (d[i + 2] > 60 && d[i + 2] > d[i] * 1.3 && d[i + 2] > d[i + 1] * 1.1) blue++;
    }
    const g = seen > 0 && green / seen > 1 / 3;
    return { green: g, blue: seen > 0 && blue / seen > (g ? 0.08 : 1 / 3) };
  }
  // What an element job sends besides its words. New: only the colour to draw it on. Rework: also the element
  // itself, whole, centred and padded on a 1024 px square filled with that colour, as an opaque PNG (the bridge
  // would turn see-through parts white).
  async function buildElement(op, target, words) {
    if (op !== 'rework') { const bg = pickBackground(words, false); return { label: '', background: bg.name, send: bg.hex ? { background: bg.name } : {} }; }
    await whenReady();
    const p = MP.elementPicture(target.key, target.side);
    if (!p) throw userErr('That element is no longer in the design, or it has lost its picture. Pick another one to rework.');
    const img = await loadImg(p.dataURL);
    try { await img.decode(); } catch (e) { /* already decoded */ }
    const bg = pickBackground(words, looksGreen(img));
    if (!bg.hex) throw userErr('This bridge does not say which flat colours it draws elements on, so the element cannot be sent. It needs a newer bridge.');
    const cv = document.createElement('canvas'); cv.width = cv.height = EL_PX;
    const x = cv.getContext('2d'); x.fillStyle = bg.hex; x.fillRect(0, 0, EL_PX, EL_PX); x.imageSmoothingQuality = 'high';
    const k = EL_PX * EL_FILL / Math.max(img.naturalWidth, img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
    x.drawImage(img, (EL_PX - w) / 2, (EL_PX - h) / 2, w, h);
    return { label: p.name, background: bg.name, send: { background: bg.name, base: { png: cv.toDataURL('image/png') } } };
  }
  // An element comes back on its flat colour: the studio's own remover cuts it out (it reads the colour from the
  // picture's border). If it cannot, the picture is kept as it came and the result card says why.
  async function cutOut(blob) {
    try {
      const r = await MP.cutOutPlainBackground(await blobToDataURL(blob));
      if (r && r.cut) return { blob: dataURLToBlob(r.dataURL), cut: true, note: '' };
      return { blob, cut: false, note: String((r && r.note) || 'Its background could not be removed.').slice(0, 300) };
    } catch (e) { return { blob, cut: false, note: 'Its background could not be removed (' + String((e && e.message) || e).slice(0, 200) + ').' }; }
  }

  /* ------------------------------------------------------------------------------------------ generate */
  function setPhase(r, ph) { if (st.run !== r) return; const was = r.phase; r.phase = ph; if (was !== ph) renderRun(); else updateRunTime(); }
  async function generate() {
    if (st.run || st.conn.state !== 'on') return;
    const mode = st.mode, M = MODES[mode], op = M.element ? st.elOp : '';
    const box = textBox(); const style = box.value.trim();
    if (!style) { st.runMsg = noteHTML('warn', !M.element ? 'Describe a style first, or pick one of the suggestions under it.' : op === 'rework' ? 'Say what should change first.' : 'Describe the element first, or pick one of the examples under it.'); renderRun(); box.focus(); return; }
    // a rework keeps the element it started with, whatever is selected or picked while it runs
    const target = op === 'rework' ? findPicture(st.target) : null;
    if (op === 'rework' && !target) { st.runMsg = noteHTML('warn', 'Pick the element to rework first.'); renderRun(); renderMake(); return; }
    const baseKey = M.element ? '' : st.base, distance = M.element ? 0 : Math.round(st.distance * 100) / 100, of = st.versions;
    const seed0 = st.seedMode === 'fixed' ? clampSeed($('#gd-seed', D).value) : null;
    const r = { id: ++runSeq, phase: 'render', n: 1, of, t0: Date.now(), tSent: 0, position: null, ctl: new AbortController(), cancelled: false, made: 0, element: !!M.element };
    st.run = r; st.runMsg = ''; renderRun(); renderMake(); startTicker(); scheduleHealth(2500); saveMake();
    reveal($('#gd-run', D));
    try {
      const b = M.element ? await buildElement(op, target, style) : await buildBase(mode, baseKey);
      for (let i = 0; i < of; i++) {
        if (r.cancelled) return;
        const seed = seed0 != null ? (seed0 + i) % 2147483647 : randomSeed();
        r.n = i + 1; r.tSent = Date.now(); r.position = null; r.phase = ''; setPhase(r, 'send');
        // an element: its words, the flat colour, and for a rework the element itself; no base name, no distance
        const body = M.element ? Object.assign({ mode, op, style, seed }, b.send) : { mode, base: b.base, distance, style, seed };
        if (b.words) body.wordsOverride = b.words;
        if (b.lollipop) body.lollipop = b.lollipop;
        const res = await call('POST', '/api/generate', body, { timeout: 180000, signal: r.ctl.signal });
        if (!res.jobId) throw userErr('The bridge did not start a job.');
        setPhase(r, 'queued');
        const job = await waitJob(r, String(res.jobId));
        if (!job) return;
        setPhase(r, 'fetch');
        const imgs = Array.isArray(job.images) ? job.images : [];
        if (!imgs.length) throw userErr('The job finished without a picture.');
        for (let k = 0; k < imgs.length; k++) {
          const blob = await fetchImage(imgs[k].url, r);
          if (r.cancelled) return;
          const o = { jobId: String(res.jobId), n: k, mode, base: baseKey, baseLabel: b.label, distance, style, seed, blob };
          if (M.element) {                                      // the cut-out is what is kept, shown, downloaded and placed
            setPhase(r, 'cut');
            Object.assign(o, await cutOut(blob), { op, target: target ? { key: target.key, side: target.side, name: target.name } : null, background: b.background });
            if (r.cancelled) return;
          }
          await addResult(o);
          if (!r.made++) reveal($('#gd-prev', D));            // the first new picture comes into view
        }
      }
      finishRun(r, null);
    } catch (e) {
      if ((e && e.cancelled) || r.cancelled) return;
      finishRun(r, e);
    }
  }
  const userErr = msg => Object.assign(new Error(msg), { user: msg });
  async function waitJob(r, jobId) {
    let fails = 0;
    for (;;) {
      if (r.cancelled || st.run !== r) return null;
      let j;
      try { j = await call('GET', '/api/job/' + encodeURIComponent(jobId), undefined, { timeout: 15000, signal: r.ctl.signal }); fails = 0; }
      catch (e) {
        if (e.cancelled || r.cancelled) return null;
        if (e.status === 404) throw userErr('The bridge no longer knows this job (was it restarted?). Generate again.');
        if (e.status) throw e;
        if (++fails >= 6) throw Object.assign(new Error('lost'), { kind: 'network' });
        await sleep(2000); continue;
      }
      if (j.status === 'done') return j;
      if (j.status === 'error') throw userErr('Your GPU could not make it: ' + String(j.error || 'an unknown error').slice(0, 300).replace(/\.?$/, '.'));
      r.position = Number(j.position) || null;
      r.serverMs = typeof j.elapsedMs === 'number' ? j.elapsedMs : null; r.polledAt = Date.now();
      const ph = j.status === 'running' ? 'running' : 'queued';
      if (r.phase !== ph || (ph === 'queued' && r.shownPos !== r.position)) { r.shownPos = r.position; r.phase = ''; setPhase(r, ph); } else updateRunTime();
      await sleep(ph === 'running' ? 1000 : 1500);
    }
  }
  // only the bridge's own image paths get the key
  async function fetchImage(u, r) {
    let path = String(u || '');
    if (/^https?:\/\//i.test(path)) { const a = new URL(path), b = new URL(st.conn.url); if (a.origin !== b.origin) throw userErr('The bridge pointed at a picture somewhere else; it was not fetched.'); path = a.pathname; }
    const prefix = new URL(st.conn.url).pathname.replace(/\/+$/, '');          // (a bridge behind a path prefix)
    if (prefix && path.indexOf(prefix + '/') === 0) path = path.slice(prefix.length);
    if (!/^\/api\/image\/[^/?#]+\/\d+$/.test(path)) throw userErr('The bridge returned an unexpected picture address.');
    const out = await call('GET', path, undefined, { timeout: 120000, signal: r.ctl.signal, raw: true });
    return out.blob;
  }
  function finishRun(r, e) {
    if (st.run !== r) return;
    st.run = null; stopTicker();
    st.runMsg = e ? noteHTML('warn', runError(e) + ' <button type="button" class="gd-link" data-act="go">Try again</button>') : '';
    if (e && e.status === 401) { st.conn.askKey = true; st.conn.editing = true; }      // the bridge asks for a key: show its field now
    if (e && e.kind === 'network' && st.conn.state === 'on') { st.conn.state = 'lost'; st.conn.err = 'The connection dropped while it was working. The bridge may still finish the image on the GPU PC.'; scheduleHealth(3000); }
    renderAll();
  }
  function runError(e) {
    if (e.user) return esc(e.user);
    if (e.status === 401) return st.conn.key ? 'The bridge no longer accepts this key (was it restarted with a new one?). Connect again with the new key.' : 'The bridge now asks for a key: it is shown in the bridge window on the GPU PC. Connect again with it.';
    if (e.status === 429) return 'Your GPU’s queue is full (3 waiting). Try again when one has finished.';
    if (e.status === 413) return 'The design picture is too large for the bridge (12 MB).';
    if (e.status === 503) return 'Your GPU is not available right now' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.status === 400) return 'The bridge did not accept it' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.status) return 'The bridge answered with an error (' + e.status + ')' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.kind === 'timeout') return 'The bridge stopped answering (no reply in ' + e.secs + ' s).';
    if (e.kind === 'network') return 'Lost the connection to the bridge. The image may still finish on the GPU PC; reconnect and try again.';
    return 'Something went wrong: ' + esc(e.message || e);
  }
  function cancelRun(quiet) {
    const r = st.run; if (!r) return;
    r.cancelled = true; try { r.ctl.abort(); } catch (e) { /* done */ }
    st.run = null; stopTicker();
    st.runMsg = quiet ? '' : noteHTML('info', r.phase === 'render' ? 'Cancelled.' : 'Cancelled. The bridge has no stop button, so your GPU still finishes the image it was given; it is not added here.');
    renderRun(); renderMake();
  }
  function startTicker() { stopTicker(); tick = setInterval(updateRunTime, 500); }
  function stopTicker() { if (tick) clearInterval(tick); tick = 0; }

  /* ------------------------------------------------------------------------------------------ results (memory + IndexedDB) */
  const DB = { p: null };
  function db() {
    if (!DB.p) {
      DB.p = new Promise((res, rej) => {
        if (!window.indexedDB) { rej(new Error('no IndexedDB')); return; }
        let q; try { q = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
        q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(DB_STORE)) q.result.createObjectStore(DB_STORE, { keyPath: 'id' }); };
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error || new Error('IndexedDB failed'));
        q.onblocked = () => rej(new Error('IndexedDB is blocked'));
      });
    }
    return DB.p;
  }
  function tx(mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction(DB_STORE, mode); const q = fn(t.objectStore(DB_STORE));
      t.oncomplete = () => res(q && 'result' in q ? q.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted'));
    }));
  }
  // what is kept of a result (an element also keeps: new or rework, the element it reworks, whether its background
  // was cut out and, if not, why, and the flat colour it was drawn on)
  const record = r => ({ id: r.id, jobId: r.jobId, n: r.n, mode: r.mode, base: r.base, baseLabel: r.baseLabel, distance: r.distance, style: r.style, seed: r.seed, w: r.w, h: r.h, createdAt: r.createdAt, blob: r.blob,
    op: r.op, target: r.target, cut: r.cut, note: r.note, background: r.background });
  async function restoreResults() {
    if (st.restored) return; st.restored = true;
    let all = [];
    try { all = (await tx('readonly', s => s.getAll())) || []; } catch (e) { return; }
    const now = Date.now(); all.sort((a, b) => b.createdAt - a.createdAt);
    const keep = all.filter((r, i) => i < KEEP_N && now - r.createdAt < KEEP_MS && r.blob && MODES[r.mode]);
    const drop = all.filter(r => keep.indexOf(r) < 0);
    if (drop.length) tx('readwrite', s => { drop.forEach(r => s.delete(r.id)); }).catch(() => {});
    const have = new Set(st.results.map(r => r.id));
    keep.forEach(r => { if (!have.has(r.id)) { r.url = URL.createObjectURL(r.blob); st.results.push(r); } });
    st.results.sort((a, b) => b.createdAt - a.createdAt);
    if (!st.sel && st.results.length) st.sel = st.results[0].id;
    renderResults();
  }
  async function addResult(o) {
    let w = 0, h = 0;
    try { const bm = await createImageBitmap(o.blob); w = bm.width; h = bm.height; if (bm.close) bm.close(); }
    catch (e) { throw userErr('The picture from the bridge could not be read.'); }
    const r = Object.assign({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), createdAt: Date.now(), w, h }, o);
    r.url = URL.createObjectURL(r.blob);
    st.results.unshift(r); st.sel = r.id;
    const extra = st.results.splice(KEEP_N);
    extra.forEach(x => { URL.revokeObjectURL(x.url); });
    renderResults();
    try { await tx('readwrite', s => { s.put(record(r)); extra.forEach(x => s.delete(x.id)); }); } catch (e) { /* kept in memory for this visit */ }
  }
  function removeResult(id) {
    const i = st.results.findIndex(r => r.id === id); if (i < 0) return;
    const [r] = st.results.splice(i, 1); URL.revokeObjectURL(r.url);
    if (st.sel === id) st.sel = st.results[Math.min(i, st.results.length - 1)] ? st.results[Math.min(i, st.results.length - 1)].id : null;
    tx('readwrite', s => s.delete(id)).catch(() => {});
    renderResults();
  }
  function clearResults() {
    st.results.forEach(r => URL.revokeObjectURL(r.url)); st.results = []; st.sel = null;
    tx('readwrite', s => s.clear()).catch(() => {});
    renderResults();
  }
  const curResult = () => st.results.find(r => r.id === st.sel) || null;
  function download(r) {
    const a = document.createElement('a'); a.href = r.url;
    a.download = 'model-pops_ai-' + MODES[r.mode].file + '_' + today() + '_seed-' + r.seed + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function useAsBackground(r) {
    if (!r || MODES[r.mode].use !== 'background') return;     // ideas are never placed in the design
    try {
      await whenReady();
      const src = await blobToDataURL(r.blob);
      const id = await MP.addImageAsset({ src, name: 'AI background art (seed ' + r.seed + ')', kind: 'background' });
      const side = MP.useBackgroundImage(id);
      toast('The AI art is now the ' + side + ' panel’s background. The exact logo, words and pop stay on top · Ctrl+Z to undo');
      refreshMineThumb(); renderPreview();
    } catch (e) { toast('Could not use it: ' + (e.message || e), true); }
  }
  // An AI drawing goes into the design as a picture element (never as the pop), marked as an AI drawing there.
  // Each of the three actions is one undo step in the studio, and says which panel it went to.
  const aiOf = r => ({ op: r.op === 'rework' ? 'rework' : 'new', prompt: r.style, seed: r.seed });
  const nameOf = r => { const s = (r.target && r.target.name) || String(r.style || '').replace(/\s+/g, ' ').trim() || 'AI drawing'; return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 40); };
  async function elementAsset(r) { await whenReady(); return MP.addImageAsset(await blobToDataURL(r.blob), { name: 'AI drawing (seed ' + r.seed + ')', kind: 'element' }); }
  const sideOf = key => { const e = pictures(true).find(x => x.key === key); return e ? e.side : MP.side; };       // (the panel the studio put it on)
  function afterPlaced() { renderMake(); refreshMineThumb(); renderPreview(); }
  async function addToDesign(r) {
    if (!r || MODES[r.mode].use !== 'element') return;
    try {
      const key = MP.addElement(await elementAsset(r), { name: nameOf(r), ai: aiOf(r) });
      toast('The AI drawing is now a picture element on the ' + sideOf(key) + ' panel · Ctrl+Z to undo');
      afterPlaced();
    } catch (e) { toast('Could not add it: ' + (e.message || e), true); }
  }
  // the element may have gone since (deleted, another design opened): then nothing is replaced, and the card offers Add to design
  async function replaceElement(r) {
    if (!r || MODES[r.mode].use !== 'element' || !r.target) return;
    const t = r.target;
    try {
      const e = findElement(t);
      if (!e || !MP.replaceElementPicture(t.key, await elementAsset(r), { ai: aiOf(r) }, t.side)) {
        toast('“' + t.name + '” is no longer in the design, so nothing was replaced. “Add to design” puts this picture in as a new element.', true);
        renderPreview(); return;
      }
      toast('“' + e.name + '” on the ' + t.side + ' panel now shows the reworked picture · Ctrl+Z to undo');
      afterPlaced();
    } catch (e) { toast('Could not replace it: ' + (e.message || e), true); }
  }
  // a second element with the reworked picture: on the same panel and as large as the one it was made from
  // (if that one has gone meanwhile, it is simply added)
  async function addAsCopy(r) {
    if (!r || MODES[r.mode].use !== 'element') return;
    const t = findPicture(r.target);
    if (!t) { addToDesign(r); return; }
    try {
      const el = MP.model.panels[t.side].els[t.key];
      const long = Math.max(el.w, el.w * t.pic.h / t.pic.w);            // the longer side keeps its printed length
      const key = MP.addElement(await elementAsset(r), { name: (t.name.replace(/ copy$/, '') + ' copy').slice(0, 80), ai: aiOf(r), side: t.side, w: r.w >= r.h ? long : long * r.w / r.h });
      toast('The reworked picture is now a second element on the ' + sideOf(key) + ' panel · Ctrl+Z to undo');
      afterPlaced();
    } catch (e) { toast('Could not add it: ' + (e.message || e), true); }
  }
  function reuse(r) {
    const M = MODES[r.mode];
    if (st.conn.health && !modeOK(r.mode)) { toast('The bridge you are connected to cannot make elements: it needs a newer bridge.', true); return; }
    let gone = false;
    st.mode = r.mode;
    if (M.element) {
      st.elOp = r.op === 'rework' ? 'rework' : 'new';
      $(st.elOp === 'rework' ? '#gd-change' : '#gd-what', D).value = r.style;
      if (st.elOp === 'rework') { const t = findPicture(r.target); if (t) setTarget(t); else gone = true; }
    } else {
      st.base = BASES[r.base] ? r.base : 'mine'; st.distance = r.distance;
      $('#gd-style', D).value = r.style; st.styleTouched = true;
    }
    st.seedMode = 'fixed'; $('#gd-seed', D).value = r.seed;
    renderMake(); refreshMineThumb();
    $('#gd-make', D).scrollIntoView({ block: 'start', behavior: 'smooth' });
    toast(!M.element ? 'Its settings are back under Make, with its seed fixed: move the distance to see the same idea nearer or further.'
      : 'Its words are back under Make, with its seed fixed: change the words to steer it.' + (gone ? ' The element it reworked is no longer in the design, so pick another one.' : ''));
  }
  // print resolution of art on the current panel (cover fit over trim + bleed, as the studio places it)
  function fitInfo(r) {
    const m = MP.model; if (!m || !r.w || !r.h) return null;
    const b = m.bleed + 0.6, bw = m.trim.w + 2 * b, bh = m.trim.h + 2 * b;
    const ppi = 25.4 / Math.max(bw / r.w, bh / r.h);
    const shape = Math.abs((r.w / r.h) / (bw / bh) - 1);
    return { ppi: Math.round(ppi), crop: shape > 0.06 };
  }

  /* ------------------------------------------------------------------------------------------ the panel */
  function noteHTML(kind, html) { return '<div class="note gd-note ' + kind + '">' + icon(kind === 'warn' ? 'alert' : kind === 'ok' ? 'check' : 'info') + '<span>' + html + '</span></div>'; }
  function buildButton() {
    const save = document.getElementById('btn-save');
    const group = save && save.closest('.tb-group');
    const b = el('button', { class: 'btn gpu-btn', id: 'btn-gpu', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'gpu-drawer', 'aria-label': 'AI on your GPU', title: 'AI on your GPU: background art, picture elements and ideas from ComfyUI on your own PC' },
      icon('chip') + '<span class="lbl-long">AI on your GPU</span><i class="gdot" aria-hidden="true"></i>');
    const wrap = el('div', { class: 'tb-group' }); wrap.appendChild(b);
    if (group) { group.parentNode.insertBefore(wrap, group); group.parentNode.insertBefore(el('div', { class: 'divider-v' }), group); }
    else document.querySelector('.topbar').appendChild(wrap);
    b.addEventListener('click', () => (st.open ? close() : open()));
  }
  function buildDrawer() {
    D = el('aside', { class: 'gd', id: 'gpu-drawer', 'aria-label': 'AI on your GPU', 'aria-hidden': 'true', inert: true });
    D.innerHTML =
      '<div class="gd-h"><div class="gd-mk">' + icon('chip') + '</div><div class="gd-ht"><h2>AI on your GPU</h2><div class="s">ComfyUI on your own PC, through its bridge</div></div>' +
      '<button type="button" class="btn ghost icon" data-act="close" aria-label="Close" title="Close (Esc)">' + icon('close') + '</button></div>' +
      '<div class="gd-body">' +
      // 1 · connect
      '<section class="gd-sec" id="gd-conn"><div class="gd-sec-h"><h3>Connect</h3><span class="gd-pill" id="gd-pill"><i></i><span></span></span></div>' +
      '<div class="gd-intro" id="gd-intro"><p>Make <b>background art</b>, <b>picture elements</b> (a lollipop, a heart: AI drawings you can add to the design) and <b>logo or pack ideas</b> with ComfyUI on your own PC. The studio itself needs no GPU: everything else works without this.</p>' +
      '<ol class="gd-steps"><li>On the PC with the GPU, start the <b>Model Pops GPU bridge</b> (the <code>gpu-bridge</code> folder; its README has the steps). It shows the address.</li>' +
      '<li>On that PC, the address is <b>' + LOCAL_URL + '</b>. For another device, start a tunnel on that same PC, next to the bridge (cloudflared or ngrok), then paste the <b>https</b> address it shows on that device. That device needs nothing installed.</li>' +
      '<li>Paste the address here, then Connect.</li></ol></div>' +
      '<div class="gd-form" id="gd-form">' +
      '<div class="field"><label class="lbl" for="gd-url">Bridge address</label><input class="inp" id="gd-url" type="url" inputmode="url" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="' + LOCAL_URL + '  or  https://….trycloudflare.com">' +
      '<div class="gd-hint">On the GPU PC: <button type="button" class="gd-link" data-act="local">' + LOCAL_URL + '</button> · another device: the https address of the tunnel running on the GPU PC</div></div>' +
      // the key: shown only when the bridge asks for one (it answered 401: its requireKey is on)
      '<div class="field" id="gd-keyf" hidden><label class="lbl" for="gd-key">Key</label><div class="gd-keyrow"><input class="inp" id="gd-key" type="password" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="The key in the bridge window">' +
      '<button type="button" class="btn sm" data-act="showkey" aria-pressed="false" aria-label="Show the key">Show</button></div></div>' +
      '<label class="chk"' + (FILE_PAGE ? ' title="Opened from disk: every file opened from disk shares this browser’s storage, so the address (and any key) is never kept past this tab."' : '') + '><input type="checkbox" id="gd-remember"> ' + (FILE_PAGE ? 'Remember until this tab closes' : 'Remember on this browser') + '</label>' +
      '<div class="gd-row"><button type="button" class="btn primary" data-act="connect" id="gd-connect">Connect</button><button type="button" class="btn ghost sm" data-act="forget" id="gd-forget" hidden>' + icon('trash', 'ico-sm') + 'Forget the saved address</button></div></div>' +
      '<div class="gd-summary" id="gd-summary" hidden></div>' +
      '<div id="gd-msg" role="status" aria-live="polite"></div></section>' +
      // 2 · make
      '<section class="gd-sec" id="gd-make" hidden><div class="gd-sec-h"><h3>Make</h3></div>' +
      '<div class="field"><span class="lbl" id="gd-mode-l">What</span><div class="seg" role="group" aria-labelledby="gd-mode-l" id="gd-mode">' +
      MODE_ORDER.map(k => '<button type="button" data-act="mode" data-v="' + k + '">' + MODES[k].label + '</button>').join('') + '</div>' +
      '<div class="gd-hint" id="gd-modewhy" hidden>Element needs a newer bridge (1.1.0 or later): update the gpu-bridge folder on the GPU PC and start it again.</div></div>' +
      '<div id="gd-modenote"></div>' +
      // art and ideas: a design to start from, and how far to go from it
      '<div class="field" id="gd-basef"><span class="lbl" id="gd-base-l">Start from</span><div class="gd-bases" role="group" aria-labelledby="gd-base-l" id="gd-bases">' +
      Object.keys(BASES).map(k => '<button type="button" class="gd-base" data-act="base" data-v="' + k + '"><span class="gd-bth"><img alt="" id="gd-thumb-' + k + '"' + (BASES[k].thumb ? ' src="' + BASES[k].thumb + '"' : '') + '></span><span class="t">' + BASES[k].label + '</span><span class="s">' + BASES[k].sub + '</span></button>').join('') +
      '</div><div class="gd-hint" id="gd-basenote"></div></div>' +
      '<div class="field" id="gd-distf"><label class="lbl" for="gd-dist">How far from it <span class="val" id="gd-dist-v"></span></label><input type="range" id="gd-dist" min="0" max="1" step="0.05">' +
      '<div class="gd-bands" id="gd-bands" role="group" aria-label="Distance bands">' + BAND_AT.map((v, i) => '<button type="button" data-act="band" data-i="' + i + '"><span class="t"></span><span class="s">' + BAND_RANGE[i] + '</span></button>').join('') + '</div>' +
      '<div class="gd-hint" id="gd-bandnote"></div></div>' +
      '<div class="field" id="gd-stylef"><label class="lbl" for="gd-style">Style <span class="val" id="gd-style-n"></span></label><textarea class="ta" id="gd-style" rows="3" maxlength="600" placeholder="Describe the look, or pick one below"></textarea><div class="gd-chips" id="gd-chips"></div></div>' +
      // an element, in their place: a new one from a description, or a rework of one that is in the design
      '<div class="field" id="gd-opf" hidden><span class="lbl" id="gd-op-l">New or rework</span><div class="seg" role="group" aria-labelledby="gd-op-l" id="gd-op">' +
      '<button type="button" data-act="elop" data-v="new">New</button><button type="button" data-act="elop" data-v="rework">Rework</button></div></div>' +
      '<div class="field" id="gd-tgf" hidden><span class="lbl" id="gd-tg-l">Element to rework</span><div class="gd-bases gd-els" role="group" aria-labelledby="gd-tg-l" id="gd-els"></div><div class="gd-hint" id="gd-tgnote"></div></div>' +
      '<div class="field" id="gd-whatf" hidden><label class="lbl" for="gd-what">Describe the element <span class="val" id="gd-what-n"></span></label><textarea class="ta" id="gd-what" rows="2" maxlength="600" placeholder="One thing, for example: a strawberry lollipop"></textarea><div class="gd-chips" id="gd-what-chips"></div></div>' +
      '<div class="field" id="gd-changef" hidden><label class="lbl" for="gd-change">What should change <span class="val" id="gd-change-n"></span></label><textarea class="ta" id="gd-change" rows="2" maxlength="600" placeholder="For example: make the candy orange"></textarea></div>' +
      '<div class="gd-two"><div class="field"><span class="lbl" id="gd-seed-l">Seed</span><div class="seg sm" role="group" aria-labelledby="gd-seed-l" id="gd-seedmode">' +
      '<button type="button" data-act="seedmode" data-v="random" title="A new idea every time">New each time</button><button type="button" data-act="seedmode" data-v="fixed" title="The same idea again: change only the distance to see it nearer to or further from the base">Fixed</button></div>' +
      '<input class="inp" id="gd-seed" type="number" min="0" max="2147483647" step="1" aria-label="Seed number" hidden></div>' +
      '<div class="field"><span class="lbl" id="gd-ver-l">Versions</span><div class="seg sm" role="group" aria-labelledby="gd-ver-l" id="gd-versions">' +
      [1, 2, 3, 4].map(v => '<button type="button" data-act="versions" data-v="' + v + '">' + v + '</button>').join('') + '</div></div></div>' +
      '<button type="button" class="btn primary block" data-act="go" id="gd-go">' + icon('wand', 'ico-sm') + '<span>Generate</span></button>' +
      '<div id="gd-gowhy" hidden></div>' +
      '<div class="gd-run" id="gd-run" hidden></div></section>' +
      // 3 · results
      '<section class="gd-sec" id="gd-res" hidden><div class="gd-sec-h"><h3>Results</h3><button type="button" class="btn ghost sm" data-act="clear" id="gd-clear">' + icon('trash', 'ico-sm') + '<span>Clear</span></button></div>' +
      '<div id="gd-prev"></div><div class="gd-grid" id="gd-grid"></div><p class="gd-hint">Kept in this browser for a day (the last ' + KEEP_N + ').</p></section>' +
      '</div>';
    document.body.appendChild(D);
    D.addEventListener('click', onClick);
    D.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (/^Arrow/.test(e.key)) e.stopPropagation();                // never nudge the design from inside the panel
      if (e.key === 'Enter' && (e.target.id === 'gd-url' || e.target.id === 'gd-key')) { e.preventDefault(); connect(); }
    });
    $('#gd-dist', D).addEventListener('input', e => { st.distance = Math.round(parseFloat(e.target.value) * 100) / 100; renderDistance(); });
    $('#gd-style', D).addEventListener('input', () => { st.styleTouched = true; renderStyleCount(); renderChips(); });
    $('#gd-what', D).addEventListener('input', () => { renderStyleCount(); renderChips(); });
    $('#gd-change', D).addEventListener('input', renderStyleCount);
    $('#gd-seed', D).addEventListener('change', e => { e.target.value = clampSeed(e.target.value); st.seed = Number(e.target.value); });
    $('#gd-remember', D).addEventListener('change', e => {
      if (!e.target.checked) { removeCreds(); toast('This browser no longer keeps the bridge address' + (st.conn.key ? ' or key.' : '.')); }
      else if (st.conn.state === 'on') saveCreds();
    });
    // the "Use as background" button names the panel it goes on: keep it right when the panel changes
    const vs = document.getElementById('view-switch'); if (vs) vs.addEventListener('click', () => setTimeout(renderPreview, 0));
    // The studio sends no events when an element is selected, added, renamed, deleted or undone. So after a click
    // or a key anywhere on the page, the open panel looks again: which element a rework is for, and whether the
    // element a result was made for is still there.
    const lookAgain = () => { if (!st.open || lookTimer) return; lookTimer = setTimeout(() => { lookTimer = 0; if (st.open) syncElements(); }, 80); };
    document.addEventListener('pointerup', lookAgain, true); document.addEventListener('keyup', lookAgain, true);
  }
  function syncElements() {
    if (!$('#gd-make', D).hidden && MODES[st.mode].element && st.elOp === 'rework') { renderTargets(); renderGo(); }
    stalePreview();
  }
  function onClick(e) {
    const t = e.target.closest && e.target.closest('[data-act]'); if (!t || !D.contains(t) || t.disabled) return;
    const a = t.getAttribute('data-act'), v = t.getAttribute('data-v');
    if (a === 'close') close();
    else if (a === 'local') { $('#gd-url', D).value = LOCAL_URL; $(st.conn.askKey ? '#gd-key' : '#gd-connect', D).focus(); }
    else if (a === 'showkey') { const k = $('#gd-key', D); const show = k.type === 'password'; k.type = show ? 'text' : 'password'; t.textContent = show ? 'Hide' : 'Show'; t.setAttribute('aria-pressed', String(show)); t.setAttribute('aria-label', show ? 'Hide the key' : 'Show the key'); }
    else if (a === 'connect' || a === 'reconnect') { if (a === 'reconnect') { $('#gd-url', D).value = st.conn.url; $('#gd-key', D).value = st.conn.key; } connect(); }
    else if (a === 'change') { st.conn.editing = true; renderConn(); $('#gd-url', D).focus(); }
    else if (a === 'disconnect') disconnect();
    else if (a === 'forget') { const k = (readCreds() || {}).key; removeCreds(); $('#gd-remember', D).checked = false; $('#gd-key', D).value = ''; st.conn.key = ''; st.conn.askKey = false; disconnect('Forgot the saved address' + (k ? ' and key' : '') + ' on this browser.'); }
    else if (a === 'mode') {
      if (MODES[v] && v !== st.mode && modeOK(v)) {
        const was = st.mode; st.mode = v;
        if (MODES[v].element) st.seenSel = null;                    // a rework starts from the picture selected in the design
        else if (!st.styleTouched || styleIsChipOf(was)) { $('#gd-style', D).value = MODES[v].chips[0][1]; st.styleTouched = false; }
        renderMake(); refreshMineThumb();
      }
    }
    else if (a === 'base') { if (BASES[v]) { st.base = v; renderMake(); if (v === 'mine') refreshMineThumb(); } }
    else if (a === 'band') { st.distance = BAND_AT[Number(t.getAttribute('data-i'))]; renderDistance(); }
    else if (a === 'chip') { const M = MODES[st.mode], c = M.chips[Number(t.getAttribute('data-i'))]; if (c) { $(M.element ? '#gd-what' : '#gd-style', D).value = c[1]; if (!M.element) st.styleTouched = false; renderStyleCount(); renderChips(); } }
    else if (a === 'elop') { st.elOp = v === 'rework' ? 'rework' : 'new'; st.seenSel = null; renderMake(); }
    else if (a === 'target') { const i = String(v).indexOf(':'); const e = findPicture({ side: v.slice(0, i), key: v.slice(i + 1) }); if (e) setTarget(e); renderTargets(); renderGo(); }
    else if (a === 'seedmode') { st.seedMode = v === 'fixed' ? 'fixed' : 'random'; renderSeed(); if (st.seedMode === 'fixed') $('#gd-seed', D).focus(); }
    else if (a === 'versions') { st.versions = Math.min(4, Math.max(1, Number(v) || 1)); renderSeed(); renderGo(); }
    else if (a === 'go') generate();
    else if (a === 'cancel') cancelRun();
    else if (a === 'sel') { st.sel = t.getAttribute('data-id'); renderResults(); }
    else if (a === 'use') useAsBackground(curResult());
    else if (a === 'add' || a === 'replace' || a === 'copy') {
      // (a double click would stack a second element exactly on the first: the same button waits a moment)
      const r = curResult(), now = Date.now(); if (!r || now - ((r.at = r.at || {})[a] || 0) < 1200) return;
      r.at[a] = now; (a === 'add' ? addToDesign : a === 'replace' ? replaceElement : addAsCopy)(r);
    }
    else if (a === 'download') { const r = curResult(); if (r) download(r); }
    else if (a === 'reuse') { const r = curResult(); if (r) reuse(r); }
    else if (a === 'remove') { const r = curResult(); if (r) removeResult(r.id); }
    else if (a === 'clear') {
      if (Date.now() - st.clearArm < 4000) { st.clearArm = 0; clearResults(); }
      else { st.clearArm = Date.now(); $('#gd-clear span', D).textContent = 'Clear all ' + st.results.length + '?'; setTimeout(() => { if (st.clearArm && Date.now() - st.clearArm >= 3900) { st.clearArm = 0; const s = $('#gd-clear span', D); if (s) s.textContent = 'Clear'; } }, 4000); }
    }
  }
  const styleIsChipOf = mode => MODES[mode].chips.some(c => c[1] === $('#gd-style', D).value.trim());
  // the words that are sent: the style, or for an element its description (New) or what should change (Rework)
  const textBox = () => $(!MODES[st.mode].element ? '#gd-style' : st.elOp === 'rework' ? '#gd-change' : '#gd-what', D);

  function open() {
    if (st.open) return;
    st.open = true; D.classList.add('on'); D.removeAttribute('inert'); D.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gd-open');                  // the design column makes room (studio.css)
    const b = $('#btn-gpu'); b.classList.add('open'); b.setAttribute('aria-expanded', 'true');
    restoreResults();
    const saved = readCreds();
    if (saved && !st.autoTried && st.conn.state === 'off') {
      st.autoTried = true;
      $('#gd-url', D).value = saved.url; $('#gd-key', D).value = saved.key; $('#gd-remember', D).checked = true;
      connect();
    } else if (st.conn.state === 'on' || st.conn.state === 'lost') pollHealth();
    renderAll(); refreshMineThumb();
    if (!MP.ready) whenReady().then(() => { if (st.open) syncElements(); }, () => {});      // (opened while the studio was still starting)
    setTimeout(() => { const f = st.conn.state === 'on' ? $('#gd-go', D) : (!$('#gd-url', D).value ? $('#gd-url', D) : st.conn.askKey && !$('#gd-key', D).value ? $('#gd-key', D) : $('#gd-connect', D)); if (f && !f.disabled) f.focus({ preventScroll: true }); }, 220);
  }
  function close() {
    if (!st.open) return;
    st.open = false; D.classList.remove('on'); D.setAttribute('inert', ''); D.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gd-open');
    const b = $('#btn-gpu'); b.classList.remove('open'); b.setAttribute('aria-expanded', 'false');
    if (D.contains(document.activeElement)) b.focus({ preventScroll: true });
  }
  // The studio's "Make with AI…" (Add element) and "Rework with AI…" (a picture's own panel) land here: the panel
  // opens in Element, on New, or on Rework with that element as the one to rework. It always says where things
  // stand: a run still going, no connection yet, or a bridge too old for elements.
  function askElement(op, key) {
    if (!D) return;
    open();
    const c = st.conn.state, live = c === 'on' || c === 'lost';
    if (live && !elementOK()) { toast('The bridge you are connected to cannot make elements yet: it needs a newer bridge (1.1.0 or later).', true); return; }
    st.mode = 'element'; st.elOp = op === 'rework' ? 'rework' : 'new'; st.seenSel = null;
    if (st.elOp === 'rework' && key) {
      const list = pictures(); const e = list.find(x => x.key === key && x.side === MP.side) || list.find(x => x.key === key);
      if (e) setTarget(e); else toast('That element has no picture to rework.', true);
    }
    renderMake();
    if (st.run) toast('Your GPU is still making a picture. Generate comes back when it has finished (or press Cancel).');
    else if (c === 'off' || c === 'error') toast('Connect to your GPU first: paste the bridge address here, then Connect. Element is ready after that.');
    if (live) setTimeout(() => { if (!st.open) return; $('#gd-make', D).scrollIntoView({ block: 'start' }); textBox().focus({ preventScroll: true }); }, 260);
  }

  /* ---- rendering */
  function renderAll() { renderConn(); renderMake(); renderRun(); renderResults(); }
  function healthText(h) {
    const comfy = { up: 'ComfyUI ready', starting: 'ComfyUI starting (the first load takes about a minute)', down: 'ComfyUI not running yet', error: 'ComfyUI hit an error (see the bridge window on the GPU PC)' }[h.comfy] || 'ComfyUI: ' + esc(h.comfy);
    const q = Number(h.queued) || 0;
    const work = h.busy ? 'making an image' + (q ? ', ' + q + ' waiting' : '') : q ? q + ' waiting' : '';
    const g = h.gpu && typeof h.gpu === 'object' ? 'GPU ' + Math.round(Number(h.gpu.util) || 0) + ' %' + (h.gpu.memTotalMB ? ' · ' + gb(Number(h.gpu.memUsedMB) || 0) + ' of ' + gb(Number(h.gpu.memTotalMB)) + ' GB' : '') : 'GPU use not reported';
    return [comfy, work, g].filter(Boolean).join(' · ');
  }
  function capText(h) {
    const c = h && h.cap; if (!c) return '';
    let d = Number(c.duty); if (Number.isFinite(d) && d > 0 && d <= 1) d *= 100;
    const parts = [];
    if (Number.isFinite(d) && d > 0) parts.push('the GPU works at most about ' + Math.round(d) + ' % of the time');
    if (Number(c.reserveVramGB) > 0) parts.push(Number(c.reserveVramGB) + ' GB of its memory stay free');
    return parts.length ? 'Capped: ' + parts.join(' and ') + ', so the GPU PC stays usable.' : '';
  }
  function pillState() {
    const c = st.conn, h = c.health;
    if (c.state === 'checking') return ['wait', 'Connecting…'];
    if (c.state === 'lost') return ['err', 'Connection lost'];
    if (c.state !== 'on' || !h) return ['off', 'Not connected'];
    if (h.comfy === 'error') return ['err', 'ComfyUI error'];
    if (h.comfy === 'starting') return ['busy', 'ComfyUI starting'];
    if (h.busy || h.queued) return ['busy', 'Busy' + (h.queued ? ' · ' + h.queued + ' waiting' : '')];
    if (h.comfy === 'down') return ['on', 'Connected'];
    return ['on', 'Ready'];
  }
  function renderConn() {
    if (!D) return;
    const c = st.conn; const live = c.state === 'on' || c.state === 'lost';
    const [cls, txt] = pillState();
    const pill = $('#gd-pill', D); pill.className = 'gd-pill ' + cls; $('span', pill).textContent = txt;
    const dot = $('#btn-gpu .gdot'); if (dot) dot.className = 'gdot ' + cls;
    $('#btn-gpu').title = 'AI on your GPU · ' + txt;
    $('#gd-intro', D).hidden = live;
    $('#gd-form', D).hidden = live && !c.editing;
    $('#gd-keyf', D).hidden = !c.askKey;                     // the key field: only once the bridge asked for one
    $('#gd-connect', D).disabled = c.state === 'checking';
    $('#gd-connect', D).textContent = c.state === 'checking' ? 'Connecting…' : 'Connect';
    renderForget();
    const sum = $('#gd-summary', D);
    sum.hidden = !live || c.editing;
    if (!sum.hidden) {
      let where = c.url; try { where = new URL(c.url).host; } catch (e) { /* as typed */ }
      sum.innerHTML = '<div class="gd-sum-t">' + (c.state === 'lost' ? 'Lost the connection to <b>' : 'Connected to <b>') + esc(where) + '</b>' + (c.health && c.health.version ? ' <span class="gd-ver">bridge ' + esc(c.health.version) + '</span>' : '') + '</div>' +
        (c.health && c.state === 'on' ? '<div class="gd-sum-s">' + healthText(c.health) + '</div>' + (c.health.message ? '<div class="gd-sum-m' + (c.health.comfy === 'error' ? ' err' : '') + '">' + esc(String(c.health.message).slice(0, 300)) + '</div>' : '') + (capText(c.health) ? '<div class="gd-sum-cap">' + icon('check', 'ico-sm') + '<span>' + esc(capText(c.health)) + '</span></div>' : '') : '') +
        '<div class="gd-row">' + (c.state === 'lost' ? '<button type="button" class="btn sm primary" data-act="reconnect">Reconnect</button>' : '') +
        '<button type="button" class="btn sm" data-act="change">Change</button><button type="button" class="btn ghost sm" data-act="disconnect">Disconnect</button></div>';
    }
    const msg = $('#gd-msg', D);
    msg.innerHTML = c.err && (c.state === 'error' || c.state === 'lost' || c.state === 'off') ? noteHTML(c.state === 'off' ? 'info' : 'warn', c.err) : '';
  }
  function renderForget() { if (!D) return; const f = $('#gd-forget', D); if (f) f.hidden = !readCreds(); }
  function renderMake() {
    if (!D) return;
    const live = st.conn.state === 'on' || st.conn.state === 'lost';
    $('#gd-make', D).hidden = !live;
    if (!live) return;
    if (!modeOK(st.mode)) { st.mode = 'art'; refreshMineThumb(); }           // (an older bridge: no Element)
    const M = MODES[st.mode], isEl = !!M.element, rework = isEl && st.elOp === 'rework';
    $$('#gd-mode button', D).forEach(b => { const k = b.getAttribute('data-v'); const on = k === st.mode, ok = modeOK(k); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !ok; b.title = ok ? '' : 'Needs a newer bridge'; });
    $('#gd-modewhy', D).hidden = elementOK();
    $('#gd-modenote', D).innerHTML = noteHTML(M.badge ? 'idea' : 'ok', M.note);
    // an element has no "Start from", "How far" or style: it is new (described) or a rework of one in the design
    $('#gd-basef', D).hidden = isEl; $('#gd-distf', D).hidden = isEl; $('#gd-stylef', D).hidden = isEl;
    $('#gd-opf', D).hidden = !isEl; $('#gd-whatf', D).hidden = !isEl || rework; $('#gd-tgf', D).hidden = !rework; $('#gd-changef', D).hidden = !rework;
    $$('#gd-op button', D).forEach(b => { const on = b.getAttribute('data-v') === st.elOp; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    if (rework) renderTargets();
    if (!baseAvailable(st.base)) st.base = 'mine';
    $$('#gd-bases .gd-base', D).forEach(b => { const k = b.getAttribute('data-v'); const on = k === st.base, ok = baseAvailable(k); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !ok; b.title = ok ? '' : 'Not among the bases the bridge has on that PC'; });
    const im = $('#gd-thumb-mine', D); if (im && st.mineThumb && im.getAttribute('src') !== st.mineThumb) im.src = st.mineThumb;
    $('#gd-basenote', D).textContent = st.base === 'mine'
      ? 'Uses the design open in this browser. ' + (M.bgOnly ? 'Sent as its background only: no words, no logo, no pop, no added elements.' : 'Sent as it is now: the logo, the words and the real pop' + (M.words ? ', with its words passed on to be spelled exactly.' : '.'))
      : 'The client’s current ' + (st.base === 'bag' ? 'bag' : 'wrapper') + ' draft (a base already on the GPU PC, with its words).';
    if (!isEl && !$('#gd-style', D).value.trim() && !st.styleTouched) $('#gd-style', D).value = M.chips[0][1];
    renderDistance(); renderStyleCount(); renderChips(); renderSeed(); renderGo();
    stalePreview();
  }
  // Rework: one card per picture element in the design, the one to rework marked. Redrawn only when the list changes.
  function renderTargets() {
    const list = syncTarget(); const box = $('#gd-els', D);
    const sig = list.map(e => [e.side, e.key, e.src, e.ai ? 1 : 0, e.name].join(':')).join('\n');
    if (sig !== elSig) {
      elSig = sig;
      box.innerHTML = list.map(e => '<button type="button" class="gd-base" data-act="target" data-v="' + esc(sigOf(e)) + '" title="' + esc(e.name) + '"><span class="gd-bth"><img alt=""></span><span class="t">' + esc(e.name) + '</span><span class="s">' + e.side + (e.ai ? ' · AI drawing' : ' panel') + '</span></button>').join('');
      $$('img', box).forEach((im, i) => { im.src = list[i].pic.dataURL; });
    }
    const cur = sigOf(st.target);
    $$('.gd-base', box).forEach(b => { const on = b.getAttribute('data-v') === cur; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    box.hidden = !list.length;
    $('#gd-tgnote', D).textContent = list.length ? 'The picture selected in the design is picked for you; click another one here to rework that instead. Its place and size in the design stay.'
      : 'There is no picture element in this design yet. Add one under Layers → Add element, or make a New one here first.';
  }
  function renderDistance() {
    const M = MODES[st.mode]; if (!M.bands) return;          // (an element has no distance)
    const d = st.distance, bi = bandOf(d);
    const r = $('#gd-dist', D); if (Number(r.value) !== d) r.value = d;
    $('#gd-dist-v', D).textContent = d.toFixed(2);
    $$('#gd-bands button', D).forEach((b, i) => { b.classList.toggle('on', i === bi); b.setAttribute('aria-pressed', String(i === bi)); $('.t', b).textContent = M.bands[i][0]; b.title = M.bands[i][1]; });
    $('#gd-bandnote', D).textContent = M.bands[bi][1] + (M.bgOnly ? ' Never any words or a pop.' : ' The pop stays the real product.');
  }
  function renderStyleCount() { ['style', 'what', 'change'].forEach(k => { $('#gd-' + k + '-n', D).textContent = $('#gd-' + k, D).value.length + ' / 600'; }); }
  function renderChips() {
    const M = MODES[st.mode]; const cur = $(M.element ? '#gd-what' : '#gd-style', D).value.trim();
    $(M.element ? '#gd-what-chips' : '#gd-chips', D).innerHTML = M.chips.map((c, i) => '<button type="button" class="gd-chip' + (c[1] === cur ? ' on' : '') + '" data-act="chip" data-i="' + i + '" title="' + esc(c[1]) + '">' + esc(c[0]) + '</button>').join('');
  }
  function renderSeed() {
    $$('#gd-seedmode button', D).forEach(b => { const on = b.getAttribute('data-v') === st.seedMode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $('#gd-seedmode [data-v="fixed"]', D).title = MODES[st.mode].element ? 'The same seed again: change only the words to steer the same drawing' : 'The same idea again: change only the distance to see it nearer to or further from the base';
    const s = $('#gd-seed', D); s.hidden = st.seedMode !== 'fixed'; if (s.value === '') s.value = st.seed;
    $$('#gd-versions button', D).forEach(b => { const on = Number(b.getAttribute('data-v')) === st.versions; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  // the bridge says the models would not fit in Windows memory now: how much to free (it refuses to load them)
  function memWarn(h) {
    const m = h && h.memory;
    if (!m || typeof m !== 'object' || m.enoughToLoad !== false || h.modelsLoaded) return '';
    const need = Number(m.modelsNeedGB) || 0, free = Number(m.commitFreeGB) || 0, lim = Number(m.commitLimitGB) || 0, below = Number(m.loadBelowPct) || 85;
    const more = Math.max(1, Math.ceil(need - (free - lim * (1 - below / 100))));
    return 'The GPU PC is short of memory for the AI models right now: they take about <b>' + Math.round(need) + ' GB</b> of Windows memory (RAM + page file), and ' + Math.round(free) + ' GB is free. Close apps there to free about <b>' + more + ' GB</b> more (games, browser tabs, other AI tools) before you generate. Until then the bridge won’t load them, so that PC never runs out of memory.';
  }
  function renderGo() {
    const g = $('#gd-go', D);
    const h = st.conn.state === 'on' ? st.conn.health : null;
    const comfyDown = !!h && h.comfy === 'error';          // the bridge would answer 503: say why here instead
    const noTarget = !!MODES[st.mode].element && st.elOp === 'rework' && !st.target;       // (the note under "Element to rework" says why)
    g.disabled = !!st.run || st.conn.state !== 'on' || comfyDown || noTarget;
    $('span', g).textContent = 'Generate' + (st.versions > 1 ? ' ' + st.versions + ' versions' : '');
    const why = $('#gd-gowhy', D);
    const html = comfyDown ? noteHTML('warn', 'Your GPU can’t take a job right now' + (h.message ? ': ' + esc(String(h.message).slice(0, 300).replace(/\.?$/, '.')) : '.') + ' This button comes back by itself when the bridge is ready.')
      : !st.run && memWarn(h) ? noteHTML('warn', memWarn(h)) : '';
    why.hidden = !html;
    if (why.innerHTML !== html) why.innerHTML = html;
  }
  function runLine(r) {
    const lead = r.of > 1 ? 'Version ' + r.n + ' of ' + r.of + ' · ' : '';
    if (r.phase === 'render') return r.element ? 'Getting the element ready…' : 'Preparing your design…';
    if (r.phase === 'send') return lead + 'Sending it to your GPU…';
    if (r.phase === 'queued') return lead + 'Waiting for your GPU' + (r.position > 1 ? ' (number ' + r.position + ' in line)' : r.position === 1 ? ' (next in line)' : '');
    if (r.phase === 'running') return lead + 'Making it on your GPU';
    if (r.phase === 'fetch') return lead + 'Bringing it back…';
    if (r.phase === 'cut') return lead + 'Cutting out its background…';
    return lead + 'Working…';
  }
  function runMs(r) { if (!r.tSent) return 0; if (r.phase === 'running' && r.serverMs != null) return r.serverMs + (Date.now() - r.polledAt); return Date.now() - r.tSent; }
  function renderRun() {
    if (!D) return;
    renderGo();
    const box = $('#gd-run', D); const r = st.run;
    if (!r) { box.hidden = !st.runMsg; box.innerHTML = st.runMsg || ''; return; }
    box.hidden = false;
    box.innerHTML = '<div class="gd-run-box"><div class="gd-run-t"><span id="gd-run-line">' + esc(runLine(r)) + '</span><span class="gd-time" id="gd-time"></span></div>' +
      '<div class="gd-bar' + (r.phase === 'running' ? ' running' : '') + '"><i></i></div><div class="gd-run-f"><span class="gd-hint" id="gd-run-hint"></span>' +
      '<button type="button" class="btn sm" data-act="cancel">' + icon('stop', 'ico-sm') + 'Cancel</button></div></div>';
    updateRunTime();
  }
  function updateRunTime() {
    const r = st.run; if (!r || !D) return;
    const t = $('#gd-time', D); if (t) t.textContent = r.tSent ? clock(runMs(r)) : '';
    const hint = $('#gd-run-hint', D); if (!hint) return;
    const h = st.conn.health; const ms = runMs(r);
    hint.textContent = h && (h.comfy === 'starting' || (r.phase === 'queued' && h.comfy !== 'up')) ? 'ComfyUI is starting on the GPU PC; the first image takes longer.'
      : r.phase === 'running' && ms > 90000 ? 'Taking longer than usual (the first run loads the models). It keeps going.'
        : r.phase === 'running' ? 'Usually 15–40 s, at a capped pace so the GPU PC stays usable.' : '';
  }
  function renderResults() {
    if (!D) return;
    $('#gd-res', D).hidden = !st.results.length;
    if (!st.results.length) { $('#gd-grid', D).innerHTML = ''; $('#gd-prev', D).innerHTML = ''; return; }
    if (!curResult()) st.sel = st.results[0].id;
    $('#gd-grid', D).innerHTML = st.results.map(r => {
      const M = MODES[r.mode];
      return '<button type="button" class="gd-th' + (r.cut ? ' cut' : '') + (r.id === st.sel ? ' on' : '') + '" data-act="sel" data-id="' + esc(r.id) + '" aria-pressed="' + (r.id === st.sel) + '" title="' + esc(M.label + ' · seed ' + r.seed) + '">' +
        '<img src="' + r.url + '" alt="' + esc(M.label + ', seed ' + r.seed) + '"><span class="gd-tag' + (M.badge ? ' idea' : '') + '">' + M.tag + '</span></button>';
    }).join('');
    renderPreview();
  }
  // what the result card is drawn from besides the result: the panel being edited and, for a rework, whether its
  // element is still in the design (it can go, and come back with Undo, without a word to this panel)
  const previewSig = r => (r ? r.id + ':' + (MP.side === 'back' ? 'back' : 'front') + ':' + (r.op === 'rework' ? !!findElement(r.target) : '') : '');
  function stalePreview() { if (D && previewSig(curResult()) !== pvSig) renderPreview(); }
  function renderPreview() {
    if (!D) return;
    const r = curResult(); const box = $('#gd-prev', D);
    pvSig = previewSig(r);
    if (!r) { box.innerHTML = ''; return; }
    const M = MODES[r.mode];
    const side = MP.side === 'back' ? 'back' : 'front';
    let from = 'from ' + esc(r.baseLabel || ''), line = '', fit = '', notes = '', acts = '';
    if (M.use === 'background') {
      const f = fitInfo(r);
      if (f) fit = '<div class="gd-pv-fit">' + (f.ppi >= 300 ? 'About ' + f.ppi + ' ppi on this panel: print-ready.' : f.ppi >= 250 ? 'About ' + f.ppi + ' ppi on this panel (300 is ideal).' : 'About ' + f.ppi + ' ppi on this panel: fine for proofs. For the final print, download it, upscale it 2× (for example in ComfyUI) and bring it back with Background → Replace background art.') +
        (f.crop ? ' A different shape from this panel, so its edges are cropped to fit (drag it to place it).' : '') + '</div>';
      acts = '<button type="button" class="btn primary sm" data-act="use">' + icon('background', 'ico-sm') + 'Use as ' + side + ' background</button>';
    }
    if (M.element) {
      // a new element is added; a rework replaces its element or is added beside it. If that element has gone, it can only be added
      const rework = r.op === 'rework', t = rework ? findElement(r.target) : null, name = esc((t && t.name) || (r.target && r.target.name) || 'The element');
      from = rework ? 'a rework of “' + name + '”' : 'new, from a description';
      line = 'seed ' + esc(r.seed) + ' · ' + esc(r.w) + ' × ' + esc(r.h) + ' px · ' + (r.cut ? 'background cut out' : 'with its background');
      if (!r.cut) notes += noteHTML('warn', 'Its background could not be cut out, so this is the picture as it came. ' + esc(r.note || ''));
      if (rework && !t) notes += noteHTML('info', '“' + name + '” is no longer in the design, so there is nothing to replace. This picture can still be added as a new element.');
      acts = rework && t
        ? '<button type="button" class="btn primary sm" data-act="replace" title="Puts this picture in place of “' + name + '” on the ' + t.side + ' panel: the same place, the same size">' + icon('image', 'ico-sm') + 'Replace the element</button>' +
          '<button type="button" class="btn sm" data-act="copy" title="Keeps “' + name + '” and adds this picture as a second element on the ' + t.side + ' panel">' + icon('copy', 'ico-sm') + 'Add as a copy</button>'
        : '<button type="button" class="btn primary sm" data-act="add" title="Adds it as a picture element in the middle of the ' + side + ' panel (the one being edited)">' + icon('plus', 'ico-sm') + 'Add to design</button>';
    } else line = esc(M.bands[bandOf(r.distance)][0]) + ' (distance ' + Number(r.distance).toFixed(2) + ') · seed ' + esc(r.seed) + ' · ' + esc(r.w) + ' × ' + esc(r.h) + ' px';
    box.innerHTML = '<figure class="gd-pv"><div class="gd-pv-img' + (r.cut ? ' cut' : '') + '"><img src="' + r.url + '" alt="' + esc(M.label + ' result, seed ' + r.seed) + '">' +
      (M.badge ? '<span class="gd-badge">' + M.badge + '</span>' : '') + '</div>' +
      '<figcaption><div class="gd-pv-t">' + esc(M.label) + ' <span>' + from + '</span></div>' +
      '<div class="gd-pv-s">' + line + '</div>' +
      '<div class="gd-pv-s gd-pv-style">“' + esc(r.style) + '”</div>' + fit + '</figcaption>' + notes +
      '<div class="gd-pv-a">' + acts +
      '<button type="button" class="btn sm" data-act="download">' + icon('save', 'ico-sm') + 'Download PNG</button>' +
      '<button type="button" class="btn sm" data-act="reuse" title="' + (M.element ? 'Put its words and seed back under Make' : 'Put its style, distance and seed back under Make, to try it nearer or further') + '">' + icon('reset', 'ico-sm') + 'Reuse settings</button>' +
      '<button type="button" class="btn ghost sm icon" data-act="remove" aria-label="Remove this result" title="Remove this result">' + icon('trash', 'ico-sm') + '</button></div></figure>';
  }

  /* ------------------------------------------------------------------------------------------ start */
  try {
    moveFileCreds();
    buildButton(); buildDrawer();
    $('#gd-style', D).value = MODES.art.chips[0][1]; $('#gd-seed', D).value = st.seed;
    readMake();
    $('#gd-dist', D).value = st.distance;
    const saved = readCreds();
    if (saved) { $('#gd-url', D).value = saved.url; $('#gd-remember', D).checked = true; }
    renderAll();
  } catch (e) { console.warn('[label-studio] AI on your GPU is unavailable:', e); }
  // for scripted checks (QA), and for the studio: its "Make with AI…" and "Rework with AI…" call makeElement() and
  // rework(key), which open this panel in Element (New, or Rework on that element)
  MP.gpu = {
    get state() { return { open: st.open, conn: st.conn.state, health: st.conn.health, err: st.conn.err, run: st.run ? { phase: st.run.phase, n: st.run.n, of: st.run.of, position: st.run.position } : null, runMsg: st.runMsg, results: st.results.map(r => ({ id: r.id, mode: r.mode, base: r.base, seed: r.seed, w: r.w, h: r.h, distance: r.distance, op: r.op, target: r.target, cut: r.cut, note: r.note, background: r.background })), sel: st.sel, mode: st.mode, base: st.base, distance: st.distance, elOp: st.elOp, target: st.target }; },
    open, close, connect, disconnect, generate, cancel: () => cancelRun(), frontWords: () => frontWords(MP.model),
    makeElement: () => askElement('new'), rework: key => askElement('rework', key),
  };

  // A link can carry the bridge address after "#gpu=" (the desktop launcher opens the studio that way, and the same
  // link can be sent to another device). The part after # never leaves the browser. The address is filled in, the
  // panel opens and connects, and the address is taken out of the address bar again.
  (function linkAddress() {
    const m = /(?:^#|&)gpu=([^&]+)/.exec(location.hash || '');
    if (!m) return;
    let raw = ''; try { raw = decodeURIComponent(m[1]); } catch (e) { return; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* a page opened from disk may refuse */ }
    const n = normalizeURL(raw); if (n.error) return;
    whenReady().then(() => {
      st.autoTried = true;                                   // this address, not a remembered one
      open(); $('#gd-url', D).value = n.url;
      if (st.conn.state !== 'on' || st.conn.url !== n.url) connect();
    }, () => {});
  })();
})();
