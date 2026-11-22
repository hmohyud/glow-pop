/* Model Pops Label Studio · AI on your GPU (gpu.js)
 *
 * Optional, and the only part of the studio that uses a GPU: the user's own, through the Model Pops GPU bridge
 * (gpu-bridge/) that runs next to ComfyUI on their PC. The studio reaches the bridge at http://127.0.0.1:8189 on
 * that PC, or from anywhere through a tunnel the user starts on that same PC (an https trycloudflare or ngrok
 * address). Without a bridge this panel only explains itself, and the studio works exactly as before.
 *
 * The panel edits what is selected in the design (the target line follows the selection), and what comes back goes
 * straight onto the design, so the stage and the 3D pack show it at once. Versions and "Back to before" switch
 * what is showing; all of it is ONE undo step (MPStudio.aiStep).
 *  - Nothing or the Background selected: new background art from the panel's current background (only the
 *    background is sent: no words, no logo, no pop). It becomes the panel's background image (cover fit); the
 *    exact logo, every word and the real pop stay on top as live layers.
 *  - A picture element: reworked in place (its centre and longer side kept). "New element": a new one from a
 *    description, in the middle of the panel. The bridge draws it on one flat colour and the studio's own remover
 *    cuts that colour out here. It is an AI drawing and is marked as one wherever it shows.
 *  - The pop: its picture is sent as an element rework, and the drawing goes on the design as a picture element
 *    at the pop's centre and height while the Pop layer is hidden (never deleted, its photo never changed). It
 *    is sent with "subject": "pop", so the bridge (1.2.0 on) locks the product: only its angle, tilt, light or
 *    drawing style may change, never its shape, colour, collar or stick. An older bridge: the pop's Generate is off.
 *  - Words (logo, badge, text): never redrawn. Logo and pack ideas, folded away at the bottom, are pictures to
 *    choose a direction: always labelled "ideas, not print files", and never placed in the design.
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
  const IDEA_ORDER = ['logo', 'pack'];                         // the Ideas section (folded away at the bottom)
  const BAND_AT = [0.15, 0.4, 0.6, 0.9];                      // a click on a band sets the slider to its middle
  const bandOf = d => d < 0.25 ? 0 : d < 0.5 ? 1 : d < 0.75 ? 2 : 3;    // (the bands of the Design brief node)
  const BAND_RANGE = ['0–0.25', '0.25–0.5', '0.5–0.75', '0.75–1'];
  // the bases: the current design, or one of the bundled bases in ComfyUI's input/model-pops/bases/
  const BASES = {
    mine: { label: 'My current design', sub: 'front panel' },
    wrapper: { label: 'Wrapper draft', sub: 'client’s current', name: 'individual-wrapper (current).png', thumb: 'assets/ref/individual-wrapper-current.png' },
    bag: { label: 'Bag draft', sub: 'client’s current', name: 'bag 100 g (current).png', thumb: 'assets/ref/bag-100g-current.png' },
  };
  // the pop's one-click examples under "Angle or style": only what the bridge's pop lock lets change
  const POP_CHIPS = [['Tilted a little to the left', 'tilted a little to the left'], ['Seen slightly from above', 'seen slightly from above'],
    ['Flat illustration', 'a flat illustration'], ['Watercolour', 'a watercolour painting']];
  const POP_HELP = 'Your pop stays your pop. AI can turn it, tilt it, light it differently or draw it in another style. It never changes its shape, its colour, its collar or its stick.';
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
  // the studio's "?" help (one pattern for both): the button and its hidden words. (An older studio without it:
  // the words stay in view.) setHelp: one "?" in host whose words change; none when html is empty
  const help = (html, topic) => (typeof MP.helpHTML === 'function' ? MP.helpHTML(html, topic) : ' ' + html);
  const setHelp = (host, html, topic) => { if (!host) return; if (typeof MP.setHelp === 'function') MP.setHelp(host, html, topic); else host.innerHTML = html ? ' ' + html : ''; };
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
    // Ideas (folded): logo or pack, the base, how far from it, the style
    mode: 'logo', base: 'mine', distance: 0.4, styleTouched: false,
    // Make: the words for each kind of target, how much a background changes (a band), "New element" pressed
    texts: { bg: '', change: '', new: '', pop: '' }, band: 1, pin: null,
    seedMode: 'random', seed: 20261120, versions: 1,
    // go: what is showing on the design for one target ({ t, tok, before, thumb, ids, showing, drawKey, gone, depth })
    go: null, tthumb: { sig: '', url: '' },
    run: null, runMsg: '', results: [], sel: null, rsel: null, mineThumb: '', clearArm: 0,
  };
  let D = null;                     // the drawer
  let connSeq = 0, runSeq = 0, hTimer = 0, tick = 0, thumbSeq = 0, goSeq = 0, tthumbSeq = 0;
  let tSig = '', lookTimer = 0;     // what the target line was last drawn from

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
    try { localStorage.setItem(LS_MAKE, JSON.stringify({ v: 2, texts: st.texts, band: st.band, mode: st.mode, base: st.base, distance: st.distance, style: $('#gd-style', D).value, styleTouched: st.styleTouched, seedMode: st.seedMode, seed: clampSeed($('#gd-seed', D).value), versions: st.versions })); } catch (e) { /* storage blocked */ }
  }
  function readMake() {
    let o = null; try { o = JSON.parse(localStorage.getItem(LS_MAKE) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return;
    if (IDEA_ORDER.indexOf(o.mode) >= 0) st.mode = o.mode;
    if (BASES[o.base]) st.base = o.base;
    if (typeof o.distance === 'number' && o.distance >= 0 && o.distance <= 1) st.distance = Math.round(o.distance * 20) / 20;
    if (o.v === 2 && typeof o.style === 'string' && o.style.trim()) { $('#gd-style', D).value = o.style.slice(0, 600); st.styleTouched = !!o.styleTouched; }
    if (o.texts && typeof o.texts === 'object') ['bg', 'change', 'new', 'pop'].forEach(k => { if (typeof o.texts[k] === 'string') st.texts[k] = o.texts[k].slice(0, 600); });
    if ([0, 1, 2, 3].indexOf(o.band) >= 0) st.band = o.band;
    if (o.seedMode === 'fixed' || o.seedMode === 'random') st.seedMode = o.seedMode;
    if (Number.isFinite(o.seed)) { st.seed = clampSeed(o.seed); $('#gd-seed', D).value = st.seed; }
    if (o.v === 2 && [1, 2, 3, 4].indexOf(o.versions) >= 0) st.versions = o.versions;
  }
  // bring something in the panel into view, gently (never while the user is typing in the panel)
  const typing = () => { const a = document.activeElement; return !!a && !!D && D.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName) && a.type !== 'range'; };
  function reveal(node) {
    if (!node || !st.open || typing()) return;
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
    if (c.state === 'on') showMake();
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
  // side: the panel whose background is sent (art: the one being edited; ideas: always the front)
  async function buildBase(mode, baseKey, side) {
    if (baseKey !== 'mine') return { base: { name: BASES[baseKey].name }, label: BASES[baseKey].label };
    await whenReady();
    const m = baseModel(mode); const M = MODES[mode]; const sd = side === 'back' ? 'back' : 'front';
    const r = await renderPanel(m, sd, BASE_PIXELS, !M.bgOnly);
    const out = { base: { png: r.url }, label: M.bgOnly ? 'Background · ' + sd : BASES.mine.label, w: r.w, h: r.h, thumb: r.url };
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
  // the small picture on the Ideas' "My current design" card: what is sent, for the chosen kind of idea
  async function refreshMineThumb() {
    if (!st.open || !MP.ready || !D || !$('#gd-ideas', D).open) return;
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
  // the pop is reworked only by a bridge that locks it to the product (it lists the subject "pop": 1.2.0 on)
  const popOK = () => { const h = st.conn.health; return !!h && Array.isArray(h.subjects) && h.subjects.indexOf('pop') >= 0; };
  // the picture elements in the design (both panels, front first, top layer first), each with its picture or null
  function pictures() {
    try { return MP.elements().map(e => Object.assign(e, { pic: MP.elementPicture(e.key, e.side) })); }
    catch (e) { return []; }                                              // (the studio is still starting)
  }
  const findElement = t => (t ? pictures().find(e => e.key === t.key && e.side === t.side) || null : null);
  // The target: what the panel edits. It is the selection in the design (MPStudio.onSelection tells when it
  // changes), except while a target is pinned: "New element" pressed, or the drawing the panel itself just put on
  // the design (the pop's, a new element's) is what is selected. A click anywhere else ends the pin.
  //   kind: 'bg' (nothing or the Background selected), 'el' (a picture element), 'pop', 'new' or 'text' (words)
  const selSig = () => (MP.view || '') + ':' + (MP.side || '') + ':' + (MP.sel || '');
  function curTarget() {
    if (!MP.ready || !MP.model) return null;
    if (st.pin && st.pin.sel === selSig()) return st.pin.t;
    st.pin = null;
    const side = MP.side === 'back' ? 'back' : 'front', sel = MP.sel;
    const info = sel ? MP.layerInfo(sel, side) : null;
    if (!info || info.kind === 'background') return { kind: 'bg', side, sig: 'bg:' + side, name: 'Background · ' + side };
    if (info.kind === 'pop') return { kind: 'pop', side: 'front', sig: 'pop', name: 'The pop' };
    if (info.kind === 'picture') return { kind: 'el', side, key: sel, sig: 'el:' + side + ':' + sel, name: info.name };
    return { kind: 'text', side, key: sel, sig: 'tx:' + side + ':' + sel, name: info.name, logo: info.kind === 'logo' };
  }
  const pinTarget = t => { st.pin = t ? { t, sel: selSig() } : null; };
  const textKey = t => (!t || t.kind === 'bg' ? 'bg' : t.kind === 'new' ? 'new' : t.kind === 'pop' ? 'pop' : 'change');
  // the picture a rework sends: the element's own, or the real pop's (never changed)
  const sourceOf = t => (t.kind === 'pop' ? MP.popPicture() : MP.elementPicture(t.key, t.side));
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
    if (op !== 'rework') { const bg = pickBackground(words, false); return { label: '', background: bg.name, send: bg.hex ? { background: bg.name } : {}, thumb: '' }; }
    await whenReady();
    const p = sourceOf(target);
    if (!p) throw userErr('That element is no longer in the design, or it has lost its picture. Pick another one to rework.');
    const img = await loadImg(p.dataURL);
    try { await img.decode(); } catch (e) { /* already decoded */ }
    const bg = pickBackground(words, looksGreen(img));
    if (!bg.hex) throw userErr('This bridge does not say which flat colours it draws elements on, so the element cannot be sent. It needs a newer bridge.');
    const cv = document.createElement('canvas'); cv.width = cv.height = EL_PX;
    const x = cv.getContext('2d'); x.fillStyle = bg.hex; x.fillRect(0, 0, EL_PX, EL_PX); x.imageSmoothingQuality = 'high';
    const k = EL_PX * EL_FILL / Math.max(img.naturalWidth, img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
    x.drawImage(img, (EL_PX - w) / 2, (EL_PX - h) / 2, w, h);
    return { label: p.name, background: bg.name, send: { background: bg.name, base: { png: cv.toDataURL('image/png') } }, thumb: p.dataURL };
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
  // idea: false for Make (the target), true for the Ideas section. Make's results go straight onto the design.
  async function generate(idea) {
    idea = idea === true;
    if (st.run || st.conn.state !== 'on') return;
    const t = idea ? null : curTarget();
    if (!idea && (!t || !canMake(t))) return;
    const mode = idea ? st.mode : t.kind === 'bg' ? 'art' : 'element', M = MODES[mode];
    const op = M.element ? (t.kind === 'new' ? 'new' : 'rework') : '';
    const box = idea ? $('#gd-style', D) : $('#gd-text', D); const style = box.value.trim();
    if (!style) { st.runMsg = noteHTML('warn', idea || t.kind === 'bg' ? 'Describe a style first, or pick one of the suggestions under it.' : op === 'rework' ? 'Say what should change first.' : 'Describe the element first, or pick one of the examples under it.'); st.runIdea = idea; renderRun(); box.focus(); return; }
    const baseKey = idea ? st.base : M.element ? '' : 'mine';
    const distance = idea ? Math.round(st.distance * 100) / 100 : M.element ? 0 : BAND_AT[st.band], of = st.versions;
    const seed0 = st.seedMode === 'fixed' ? clampSeed($('#gd-seed', D).value) : null;
    const r = { id: ++runSeq, phase: 'render', n: 1, of, t0: Date.now(), tSent: 0, position: null, ctl: new AbortController(), cancelled: false, made: 0, element: !!M.element, idea, t };
    st.run = r; st.runMsg = ''; st.runIdea = idea; renderRun(); renderMake(); startTicker(); scheduleHealth(2500); saveMake();
    reveal($(idea ? '#gd-irun' : '#gd-run', D));
    try {
      const b = M.element ? await buildElement(op, t, style) : await buildBase(mode, baseKey, t ? t.side : 'front');
      for (let i = 0; i < of; i++) {
        if (r.cancelled) return;
        const seed = seed0 != null ? (seed0 + i) % 2147483647 : randomSeed();
        r.n = i + 1; r.tSent = Date.now(); r.position = null; r.phase = ''; setPhase(r, 'send');
        // an element: its words, the flat colour, and for a rework the element itself; no base name, no distance
        const body = M.element ? Object.assign({ mode, op, style, seed }, b.send) : { mode, base: b.base, distance, style, seed };
        if (M.element && op === 'rework' && t.kind === 'pop') body.subject = 'pop';     // the bridge locks the product
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
          const o = { jobId: String(res.jobId), n: k, mode, base: baseKey, baseLabel: b.label, distance, style, seed, blob, kind: idea ? 'idea' : t.kind, side: t ? t.side : 'front' };
          if (M.element) {                                      // the cut-out is what is kept, shown, downloaded and placed
            setPhase(r, 'cut');
            Object.assign(o, await cutOut(blob), { op, target: t.kind === 'el' ? { key: t.key, side: t.side, name: t.name } : t.kind === 'pop' ? { pop: true, side: 'front', name: 'The pop' } : null, background: b.background });
            if (r.cancelled) return;
          }
          const rec = await addResult(o);
          if (idea) { if (!r.made++) reveal($('#gd-prev', D)); }
          else { r.made++; await place(rec, t, b.thumb || ''); }    // straight onto the design
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
    // (a long reason keeps its first sentence in view, the rest behind a "?"; "Try again" always stays in view)
    const why = e ? (typeof MP.splitHelp === 'function' ? MP.splitHelp(runError(e)) : [runError(e), '']) : null;
    st.runMsg = e ? noteHTML('warn', why[0] + (why[1] ? help(why[1], 'Generate') : '') + ' <button type="button" class="gd-link" data-act="' + (r.idea ? 'igo' : 'go') + '">Try again</button>') : st.runMsg;      // (a note made during the run, such as an element gone, stays)
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
    st.runMsg = quiet ? '' : noteHTML('info', 'Cancelled.' + (r.phase === 'render' ? '' : help('The bridge has no stop button, so your GPU still finishes the image it was given; it is not added here.', 'Cancelled')));
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
  // was cut out and, if not, why, and the flat colour it was drawn on; every result: what it was for, and the panel)
  const record = r => ({ id: r.id, jobId: r.jobId, n: r.n, mode: r.mode, base: r.base, baseLabel: r.baseLabel, distance: r.distance, style: r.style, seed: r.seed, w: r.w, h: r.h, createdAt: r.createdAt, blob: r.blob,
    op: r.op, target: r.target, cut: r.cut, note: r.note, background: r.background, kind: r.kind, side: r.side });
  // what a result is for: 'bg', 'el', 'pop', 'new' or 'idea' (one kept before the panel edited the selection: from its mode)
  const kindOf = r => r.kind || (r.mode === 'art' ? 'bg' : MODES[r.mode] && MODES[r.mode].element ? (r.op === 'rework' ? 'el' : 'new') : 'idea');
  const isIdea = r => kindOf(r) === 'idea';
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
    renderResults();
  }
  async function addResult(o) {
    let w = 0, h = 0;
    try { const bm = await createImageBitmap(o.blob); w = bm.width; h = bm.height; if (bm.close) bm.close(); }
    catch (e) { throw userErr('The picture from the bridge could not be read.'); }
    const r = Object.assign({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), createdAt: Date.now(), w, h }, o);
    r.url = URL.createObjectURL(r.blob);
    st.results.unshift(r); if (isIdea(r)) st.sel = r.id; else st.rsel = r.id;
    const extra = st.results.splice(KEEP_N);
    extra.forEach(x => { URL.revokeObjectURL(x.url); });
    renderResults();
    try { await tx('readwrite', s => { s.put(record(r)); extra.forEach(x => s.delete(x.id)); }); } catch (e) { /* kept in memory for this visit */ }
    return r;
  }
  function removeResult(id) {
    const i = st.results.findIndex(r => r.id === id); if (i < 0) return;
    const [r] = st.results.splice(i, 1); URL.revokeObjectURL(r.url);
    if (st.sel === id) st.sel = null;
    if (st.rsel === id) st.rsel = null;
    tx('readwrite', s => s.delete(id)).catch(() => {});
    renderResults();
  }
  function clearResults() {
    st.results.forEach(r => URL.revokeObjectURL(r.url)); st.results = []; st.sel = null; st.rsel = null;
    tx('readwrite', s => s.clear()).catch(() => {});
    renderResults();
  }
  const curResult = () => st.results.find(r => r.id === st.sel && isIdea(r)) || null;          // the idea shown in Ideas
  const curRecent = () => st.results.find(r => r.id === st.rsel && !isIdea(r)) || null;       // the one picked under Recent
  const byId = id => st.results.find(r => r.id === id) || null;
  function download(r) {
    const a = document.createElement('a'); a.href = r.url;
    a.download = 'model-pops_ai-' + MODES[r.mode].file + '_' + today() + '_seed-' + r.seed + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  }
  // An AI drawing goes into the design as a picture element (never as the pop's photo), marked as an AI drawing there.
  const aiOf = r => ({ op: r.op === 'rework' ? 'rework' : 'new', prompt: r.style, seed: r.seed });
  const nameOf = r => { const s = (r.target && !r.target.pop && r.target.name) || String(r.style || '').replace(/\s+/g, ' ').trim() || 'AI drawing'; return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 40); };
  // the result as a picture of the studio's (made once per result and visit, then reused when versions switch)
  async function assetOf(r) {
    if (!r.asset) {
      await whenReady();
      const src = await blobToDataURL(r.blob);
      r.asset = await MP.addImageAsset(MODES[r.mode].element ? { src, name: 'AI drawing (seed ' + r.seed + ')', kind: 'element' } : { src, name: 'AI background art (seed ' + r.seed + ')', kind: 'background' });
    }
    return r.asset;
  }
  const sideOf = key => { const e = pictures().find(x => x.key === key); return e ? e.side : MP.side; };       // (the panel the studio put it on)
  // "Add as a new element": a picture element in the middle of the panel being edited (its own undo step)
  async function addToDesign(r) {
    if (!r || MODES[r.mode].use !== 'element') return;
    try {
      const key = MP.addElement(await assetOf(r), { name: nameOf(r), ai: aiOf(r) });
      toast('The AI drawing is now a picture element on the ' + sideOf(key) + ' panel · Ctrl+Z to undo');
      renderTarget(); renderResults();
    } catch (e) { toast('Could not add it: ' + (e.message || e), true); }
  }

  /* ------------------------------------------------------------------------------------------ results on the design */
  // A "go": the results made (or picked under Recent) for one target, and what is showing on the design: Before or
  // one of them. Every switch is part of ONE undo step (MPStudio.aiStep with the go's token).
  function startGo(t, thumb) {
    const before = t.kind === 'bg' ? { bg: MP.backgroundOf(t.side) } : t.kind === 'el' ? { el: MP.elementState(t.key, t.side) } : t.kind === 'pop' ? { pop: !!(MP.popPicture() || {}).visible } : {};
    st.go = { t, tok: 'ai-go-' + (++goSeq) + '-' + Date.now().toString(36), before, thumb: thumb || '', ids: [], showing: 'before', drawKey: null, gone: false, depth: -1 };
    return st.go;
  }
  // one change on the design; the target stays this go's while what the change selected stays selected
  function goStep(g, fn) {
    const out = MP.aiStep(g.tok, fn);
    g.depth = MP.undoDepth; pinTarget(g.t);
    return out;
  }
  async function place(r, t, thumb) {
    if (!st.go || st.go.t.sig !== t.sig) startGo(t, thumb);
    const g = st.go; if (g.ids.indexOf(r.id) < 0) g.ids.push(r.id);
    await show(g, r);
  }
  async function show(g, r) {
    if (!g || st.go !== g || !r) return;
    let id; try { id = await assetOf(r); } catch (e) { toast('Could not put it on the design: ' + (e.message || e), true); return; }
    if (st.go !== g) return;
    const t = g.t; let ok = true;
    try {
      goStep(g, () => {
        if (t.kind === 'bg') { MP.useBackgroundImage(id, t.side); return; }
        if (t.kind === 'el') { ok = MP.replaceElementPicture(t.key, id, { ai: aiOf(r) }, t.side); return; }
        // the pop or a new element: this go's own drawing (added again when the step was replaced)
        if (g.drawKey && MP.elementState(g.drawKey, t.side)) { MP.replaceElementPicture(g.drawKey, id, { ai: aiOf(r) }, t.side); return; }
        if (t.kind === 'pop') {
          const p = MP.popPicture(); if (!p) { ok = false; return; }
          g.drawKey = MP.addElement(id, { name: 'Pop drawing', ai: aiOf(r), side: 'front', w: p.hmm * r.w / r.h });     // as tall as the pop
          MP.placeElement(g.drawKey, { x: p.x, y: p.y }, 'front'); MP.setPopVisible(false);
        } else g.drawKey = MP.addElement(id, { name: nameOf(r), ai: aiOf(r), side: t.side });
      });
    } catch (e) { toast('Could not put it on the design: ' + (e.message || e), true); return; }
    if (!ok) {
      // the element went meanwhile (deleted, undone): nothing was changed; say so, and offer it as a new element
      st.go = null; pinTarget(null);
      st.runMsg = noteHTML('info', '“' + esc(t.name) + '” is no longer in the design. <button type="button" class="gd-link" data-act="addnew" data-id="' + esc(r.id) + '">Add as a new element</button>'); st.runIdea = false;
      tSig = ''; renderTarget(true); renderRun(); renderResults(); return;
    }
    g.gone = false; g.showing = r.id;
    afterShow();
  }
  // "Back to before" (or the Before thumbnail): the step is taken back; if something else changed since, the target
  // alone is put back as it was
  function backToBefore(g) {
    if (!g || st.go !== g || g.showing === 'before') return;
    const t = g.t;
    try {
      goStep(g, replaced => {
        if (replaced) return;
        if (t.kind === 'bg') MP.setBackground(g.before.bg, t.side);
        else if (t.kind === 'el') { if (g.before.el) MP.restoreElement(t.key, g.before.el, t.side); }
        else { if (g.drawKey) MP.deleteElement(g.drawKey, t.side); if (t.kind === 'pop') MP.setPopVisible(g.before.pop); }
      });
    } catch (e) { toast('Could not go back: ' + (e.message || e), true); return; }
    g.drawKey = null; g.showing = 'before'; g.gone = false;
    afterShow();
  }
  function afterShow() { tSig = ''; renderTarget(true); renderGoStrip(); renderResults(); if (!typing()) showMake(); }
  // Make at the top of the panel (under the docked 3D view): what is being edited, the words, Generate
  function showMake() { const b = $('.gd-body', D), m = $('#gd-make', D); if (!st.open || !b || m.hidden) return; b.scrollTop += m.getBoundingClientRect().top - b.getBoundingClientRect().top; }
  // Recent: an older result goes onto the matching target (a background: the panel being edited); an element whose
  // element has gone, and a new element, are offered as a new element instead
  function recentTarget(r) {
    const k = kindOf(r), side = MP.side === 'back' ? 'back' : 'front';
    if (k === 'bg') return { kind: 'bg', side, sig: 'bg:' + side, name: 'Background · ' + side };
    if (k === 'pop') return MP.popPicture() ? { kind: 'pop', side: 'front', sig: 'pop', name: 'The pop' } : null;
    if (k === 'el') { const e = findElement(r.target); return e && e.pic ? { kind: 'el', side: e.side, key: e.key, sig: 'el:' + e.side + ':' + e.key, name: e.name } : null; }
    return null;
  }
  async function useRecent(r) {
    st.rsel = r.id; renderResults();
    const t = recentTarget(r); if (!t) return;
    if (st.go && st.go.t.sig === t.sig && st.go.showing === r.id) return;
    const thumb = t.kind === 'bg' ? (st.tthumb.sig === t.sig ? st.tthumb.url : '') : ((sourceOf(t) || {}).dataURL || '');
    await place(r, t, thumb);
  }
  // the selection or the panel changed in the studio (or Undo ran): the target line follows
  function onSelChange() {
    if (!D || !st.open) return;
    const g = st.go;
    if (g && g.showing !== 'before' && g.depth >= 0 && MP.undoDepth < g.depth) { g.showing = 'before'; g.drawKey = null; }    // undone in the studio
    renderTarget(true); renderGoStrip(); renderRecentRow();
  }
  // print resolution of art on the current panel (cover fit over trim + bleed, as the studio places it)
  function fitInfo(r) {
    const m = MP.model; if (!m || !r.w || !r.h) return null;
    const b = m.bleed + 0.6, bw = m.trim.w + 2 * b, bh = m.trim.h + 2 * b;
    const ppi = 25.4 / Math.max(bw / r.w, bh / r.h);
    const shape = Math.abs((r.w / r.h) / (bw / bh) - 1);
    return { ppi: Math.round(ppi), crop: shape > 0.06 };
  }
  // Ideas: "Reuse settings" puts an idea's settings back in the Ideas section, with its seed fixed
  function reuse(r) {
    if (!isIdea(r)) return;
    st.mode = IDEA_ORDER.indexOf(r.mode) >= 0 ? r.mode : 'logo';
    st.base = BASES[r.base] ? r.base : 'mine'; st.distance = r.distance;
    $('#gd-style', D).value = r.style; st.styleTouched = true;
    st.seedMode = 'fixed'; $('#gd-seed', D).value = r.seed;
    $('#gd-ideas', D).open = true; $('#gd-more', D).open = true;
    renderMake(); refreshMineThumb();
    $('#gd-ideas', D).scrollIntoView({ block: 'start', behavior: 'smooth' });
    toast('Its settings are back under Ideas, with its seed fixed: move the distance to see the same idea nearer or further.');
  }

  /* ------------------------------------------------------------------------------------------ the panel */
  // topic: a long message keeps its first sentence (and a short second one) in view; the rest goes behind a "?"
  function noteHTML(kind, html, topic) {
    let body = html;
    if (topic && typeof MP.splitHelp === 'function') { const p = MP.splitHelp(html); body = p[0] + (p[1] ? help(p[1], topic) : ''); }
    return '<div class="note gd-note ' + kind + '">' + icon(kind === 'warn' ? 'alert' : kind === 'ok' ? 'check' : 'info') + '<span>' + body + '</span></div>';
  }
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
      // the studio's own 3D view stays in sight above the AI controls while the panel is open (studio.js dock3D)
      '<div class="gd-mock" id="gd-mock"></div>' +
      '<div class="gd-body">' +
      // 1 · connect
      '<section class="gd-sec" id="gd-conn"><div class="gd-sec-h"><h3>Connect</h3><span class="gd-pill" id="gd-pill"><i></i><span></span></span></div>' +
      // one line, with the rest (what elements are, the steps to connect) in a section the user opens
      '<div class="gd-intro" id="gd-intro"><p>Edit what you select in the design with ComfyUI on your own PC: <b>the background</b>, <b>a picture</b> or <b>the pop</b>.</p>' +
      '<details class="gd-how"><summary>How to connect</summary><div class="gd-how-b"><p>Select something in the design, describe the change and Generate: the result goes straight onto the design, and one click goes back. Words are never redrawn. The studio itself needs no GPU: everything else works without this.</p>' +
      '<ol class="gd-steps"><li>On the PC with the GPU, start the <b>Model Pops GPU bridge</b> (the <code>gpu-bridge</code> folder; its README has the steps). It shows the address.</li>' +
      '<li>On that PC, the address is <b>' + LOCAL_URL + '</b>. For another device, start a tunnel on that same PC, next to the bridge (cloudflared or ngrok), then paste the <b>https</b> address it shows on that device. That device needs nothing installed.</li>' +
      '<li>Paste the address here, then Connect.</li></ol></div></details></div>' +
      '<div class="gd-form" id="gd-form">' +
      // (the GPU PC's own address stays one click away, beside the label; where the address comes from is behind the "?")
      '<div class="field"><span class="lbl"><span class="lbl-t"><label for="gd-url">Bridge address</label>' + help('On the GPU PC: <b>' + LOCAL_URL + '</b> · another device: the https address of the tunnel running on the GPU PC', 'Bridge address') + '</span>' +
      '<button type="button" class="gd-link" data-act="local" title="Fill in the address on the GPU PC itself">' + LOCAL_URL + '</button></span>' +
      '<input class="inp" id="gd-url" type="url" inputmode="url" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="' + LOCAL_URL + '  or  https://….trycloudflare.com"></div>' +
      // the key: shown only when the bridge asks for one (it answered 401: its requireKey is on)
      '<div class="field" id="gd-keyf" hidden><label class="lbl" for="gd-key">Key</label><div class="gd-keyrow"><input class="inp" id="gd-key" type="password" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="The key in the bridge window">' +
      '<button type="button" class="btn sm" data-act="showkey" aria-pressed="false" aria-label="Show the key">Show</button></div></div>' +
      '<label class="chk"' + (FILE_PAGE ? ' title="Opened from disk: every file opened from disk shares this browser’s storage, so the address (and any key) is never kept past this tab."' : '') + '><input type="checkbox" id="gd-remember"> ' + (FILE_PAGE ? 'Remember until this tab closes' : 'Remember on this browser') + '</label>' +
      '<div class="gd-row"><button type="button" class="btn primary" data-act="connect" id="gd-connect">Connect</button><button type="button" class="btn ghost sm" data-act="forget" id="gd-forget" hidden>' + icon('trash', 'ico-sm') + 'Forget the saved address</button></div></div>' +
      '<div class="gd-summary" id="gd-summary" hidden></div>' +
      '<div id="gd-msg" role="status" aria-live="polite"></div></section>' +
      // 2 · make: what is being edited (the selection), one text box, Generate, and what is showing on the design
      '<section class="gd-sec" id="gd-make" hidden><div class="gd-sec-h"><h3>Make</h3></div>' +
      '<div class="gd-target" id="gd-target"><span class="gd-tth" id="gd-tth" aria-hidden="true"></span>' +
      '<span class="gd-tn"><span class="gd-tk">Editing</span><b id="gd-tname" aria-live="polite"></b></span>' +
      '<button type="button" class="btn sm" data-act="newel" id="gd-newel" aria-pressed="false" title="Make a new picture element from a description">' + icon('plus', 'ico-sm') + 'New element</button></div>' +
      '<div class="gd-tline" id="gd-tline" hidden></div>' +
      // what is showing on the design for this target: Before and the versions (right under what is being edited)
      '<div class="gd-vers" id="gd-vers" hidden></div>' +
      '<div class="field" id="gd-textf"><span class="lbl"><span class="lbl-t"><label for="gd-text" id="gd-text-l">Describe the background</label><span class="help-host" id="gd-text-h"></span></span><span class="val" id="gd-text-n"></span></span><textarea class="ta" id="gd-text" rows="3" maxlength="600"></textarea><div class="gd-chips" id="gd-text-chips"></div></div>' +
      '<div class="field" id="gd-howf"><span class="lbl"><span class="lbl-t"><span id="gd-how-l">How much to change</span><span class="help-host" id="gd-hownote"></span></span></span><div class="seg gd-howseg" role="group" aria-labelledby="gd-how-l" id="gd-how">' +
      MODES.art.bands.map((b, i) => '<button type="button" data-act="how" data-i="' + i + '">' + b[0] + '</button>').join('') + '</div></div>' +
      '<details class="gd-how gd-more" id="gd-more"><summary>More options</summary><div class="gd-two gd-more-b"><div class="field"><span class="lbl" id="gd-seed-l">Seed</span><div class="seg sm" role="group" aria-labelledby="gd-seed-l" id="gd-seedmode">' +
      '<button type="button" data-act="seedmode" data-v="random" title="A new idea every time">New each time</button><button type="button" data-act="seedmode" data-v="fixed" title="The same seed again: change only the words to steer it">Fixed</button></div>' +
      '<input class="inp" id="gd-seed" type="number" min="0" max="2147483647" step="1" aria-label="Seed number" hidden></div>' +
      '<div class="field"><span class="lbl" id="gd-ver-l">Versions</span><div class="seg sm" role="group" aria-labelledby="gd-ver-l" id="gd-versions">' +
      [1, 2, 3, 4].map(v => '<button type="button" data-act="versions" data-v="' + v + '">' + v + '</button>').join('') + '</div></div></div></details>' +
      '<button type="button" class="btn primary block" data-act="go" id="gd-go">' + icon('wand', 'ico-sm') + '<span>Generate</span></button>' +
      '<div id="gd-gowhy" hidden></div>' +
      '<div class="gd-run" id="gd-run" hidden></div></section>' +
      // 3 · recent results (kept a day): a click puts one on the design again
      '<section class="gd-sec" id="gd-res" hidden><div class="gd-sec-h"><h3>Recent' + help('Kept in this browser for a day (the last ' + KEEP_N + '). Click one to put it on the design again.', 'Recent') + '</h3><button type="button" class="btn ghost sm" data-act="clear" id="gd-clear">' + icon('trash', 'ico-sm') + '<span>Clear</span></button></div>' +
      '<div class="gd-strip" id="gd-grid" role="group" aria-label="Recent results"></div><div id="gd-rrow"></div></section>' +
      // 4 · ideas, folded away: pictures to choose a direction, never placed in the design
      '<section class="gd-sec" id="gd-isec" hidden><details class="gd-ideas" id="gd-ideas"><summary>Ideas (not print files)</summary><div class="gd-ideas-b">' +
      '<div class="field"><span class="lbl" id="gd-mode-l">What</span><div class="seg" role="group" aria-labelledby="gd-mode-l" id="gd-mode">' +
      IDEA_ORDER.map(k => '<button type="button" data-act="mode" data-v="' + k + '">' + MODES[k].label + '</button>').join('') + '</div></div>' +
      '<div id="gd-modenote"></div>' +
      // a design to start from, and how far to go from it (what is sent, and what the distance does: behind the "?")
      '<div class="field" id="gd-basef"><span class="lbl"><span class="lbl-t"><span id="gd-base-l">Start from</span><span class="help-host" id="gd-basenote"></span></span></span><div class="gd-bases" role="group" aria-labelledby="gd-base-l" id="gd-bases">' +
      Object.keys(BASES).map(k => '<button type="button" class="gd-base" data-act="base" data-v="' + k + '"><span class="gd-bth"><img alt="" id="gd-thumb-' + k + '"' + (BASES[k].thumb ? ' src="' + BASES[k].thumb + '"' : '') + '></span><span class="t">' + BASES[k].label + '</span><span class="s">' + BASES[k].sub + '</span></button>').join('') +
      '</div></div>' +
      '<div class="field" id="gd-distf"><span class="lbl"><span class="lbl-t"><label for="gd-dist">How far from it</label><span class="help-host" id="gd-bandnote"></span></span><span class="val" id="gd-dist-v"></span></span><input type="range" id="gd-dist" min="0" max="1" step="0.05">' +
      '<div class="gd-bands" id="gd-bands" role="group" aria-label="Distance bands">' + BAND_AT.map((v, i) => '<button type="button" data-act="band" data-i="' + i + '"><span class="t"></span><span class="s">' + BAND_RANGE[i] + '</span></button>').join('') + '</div></div>' +
      '<div class="field" id="gd-stylef"><label class="lbl" for="gd-style">Style <span class="val" id="gd-style-n"></span></label><textarea class="ta" id="gd-style" rows="3" maxlength="600" placeholder="Describe the look, or pick one below"></textarea><div class="gd-chips" id="gd-chips"></div></div>' +
      '<button type="button" class="btn block" data-act="igo" id="gd-igo">' + icon('wand', 'ico-sm') + '<span>Generate ideas</span></button>' +
      '<div class="gd-run" id="gd-irun" hidden></div>' +
      '<div id="gd-prev"></div><div class="gd-grid" id="gd-igrid"></div></div></details></section>' +
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
    $('#gd-text', D).addEventListener('input', () => { st.texts[st.textKind || 'bg'] = $('#gd-text', D).value; renderStyleCount(); renderChips(); });
    $('#gd-seed', D).addEventListener('change', e => { e.target.value = clampSeed(e.target.value); st.seed = Number(e.target.value); });
    $('#gd-ideas', D).addEventListener('toggle', () => { if ($('#gd-ideas', D).open) refreshMineThumb(); });
    $('#gd-remember', D).addEventListener('change', e => {
      if (!e.target.checked) { removeCreds(); toast('This browser no longer keeps the bridge address' + (st.conn.key ? ' or key.' : '.')); }
      else if (st.conn.state === 'on') saveCreds();
    });
    // the target line follows the selection: the studio says when it changes (MPStudio.onSelection). A click or a
    // key anywhere also looks again (cheap: redrawn only when something changed), for a drag, a rename or a delete.
    if (typeof MP.onSelection === 'function') MP.onSelection(() => onSelChange());
    const lookAgain = () => { if (!st.open || lookTimer) return; lookTimer = setTimeout(() => { lookTimer = 0; if (st.open) { renderTarget(); renderGoStrip(); } }, 80); };
    document.addEventListener('pointerup', lookAgain, true); document.addEventListener('keyup', lookAgain, true);
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
    // Make
    else if (a === 'newel') { const cur = curTarget(); pinTarget(cur && cur.kind === 'new' ? null : newTarget()); renderTarget(); if (curTarget().kind === 'new') $('#gd-text', D).focus({ preventScroll: true }); }
    else if (a === 'chip') { const tk = st.textKind, c = chipsFor(tk)[Number(t.getAttribute('data-i'))]; if (c) { $('#gd-text', D).value = c[1]; st.texts[tk] = c[1]; renderStyleCount(); renderChips(); } }
    else if (a === 'how') { st.band = Math.min(3, Math.max(0, Number(t.getAttribute('data-i')) || 0)); renderHow(); }
    else if (a === 'logoideas') { st.mode = 'logo'; if (!st.styleTouched || styleIsChipOf('pack')) { $('#gd-style', D).value = MODES.logo.chips[0][1]; st.styleTouched = false; } $('#gd-ideas', D).open = true; renderMake(); refreshMineThumb(); $('#gd-ideas', D).scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else if (a === 'seedmode') { st.seedMode = v === 'fixed' ? 'fixed' : 'random'; renderSeed(); if (st.seedMode === 'fixed') $('#gd-seed', D).focus(); }
    else if (a === 'versions') { st.versions = Math.min(4, Math.max(1, Number(v) || 1)); renderSeed(); renderGo(); }
    else if (a === 'go') generate(false);
    else if (a === 'igo') generate(true);
    else if (a === 'cancel') cancelRun();
    // what is showing on the design
    else if (a === 'ver') { const g = st.go, id = t.getAttribute('data-id'); if (!g) return; if (id === 'before') backToBefore(g); else if (g.showing !== id) show(g, byId(id)); }
    else if (a === 'before') backToBefore(st.go);
    else if (a === 'addnew') { const r = byId(t.getAttribute('data-id')); if (!r) return; const now = Date.now(); if (now - ((r.at = r.at || {}).add || 0) < 1200) return; r.at.add = now; if (/no longer in the design/.test(st.runMsg)) { st.runMsg = ''; renderRun(); } addToDesign(r); }
    // recent
    else if (a === 'recent') { const r = byId(t.getAttribute('data-id')); if (r) useRecent(r); }
    else if (a === 'rdownload') { const r = curRecent(); if (r) download(r); }
    else if (a === 'rremove') { const r = curRecent(); if (r) removeResult(r.id); }
    else if (a === 'clear') {
      if (Date.now() - st.clearArm < 4000) { st.clearArm = 0; clearResults(); }
      else { st.clearArm = Date.now(); $('#gd-clear span', D).textContent = 'Clear all ' + st.results.length + '?'; setTimeout(() => { if (st.clearArm && Date.now() - st.clearArm >= 3900) { st.clearArm = 0; const s = $('#gd-clear span', D); if (s) s.textContent = 'Clear'; } }, 4000); }
    }
    // ideas
    else if (a === 'mode') {
      if (IDEA_ORDER.indexOf(v) >= 0 && v !== st.mode) {
        const was = st.mode; st.mode = v;
        if (!st.styleTouched || styleIsChipOf(was)) { $('#gd-style', D).value = MODES[v].chips[0][1]; st.styleTouched = false; }
        renderMake(); refreshMineThumb();
      }
    }
    else if (a === 'base') { if (BASES[v]) { st.base = v; renderMake(); if (v === 'mine') refreshMineThumb(); } }
    else if (a === 'band') { st.distance = BAND_AT[Number(t.getAttribute('data-i'))]; renderDistance(); }
    else if (a === 'ichip') { const c = MODES[st.mode].chips[Number(t.getAttribute('data-i'))]; if (c) { $('#gd-style', D).value = c[1]; st.styleTouched = false; renderStyleCount(); renderChips(); } }
    else if (a === 'sel') { st.sel = t.getAttribute('data-id'); renderResults(); }
    else if (a === 'download') { const r = curResult(); if (r) download(r); }
    else if (a === 'reuse') { const r = curResult(); if (r) reuse(r); }
    else if (a === 'remove') { const r = curResult(); if (r) removeResult(r.id); }
  }
  const styleIsChipOf = mode => MODES[mode].chips.some(c => c[1] === $('#gd-style', D).value.trim());
  const newTarget = () => ({ kind: 'new', side: MP.side === 'back' ? 'back' : 'front', sig: 'new', name: 'New element' });

  function open() {
    if (st.open) return;
    st.open = true; D.classList.add('on'); D.removeAttribute('inert'); D.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gd-open');                  // the design column makes room (studio.css)
    if (typeof MP.dock3D === 'function') { try { MP.dock3D($('#gd-mock', D)); } catch (e) { console.warn('[gpu] 3D view not docked', e); } }
    const b = $('#btn-gpu'); b.classList.add('open'); b.setAttribute('aria-expanded', 'true');
    restoreResults();
    const saved = readCreds();
    if (saved && !st.autoTried && st.conn.state === 'off') {
      st.autoTried = true;
      $('#gd-url', D).value = saved.url; $('#gd-key', D).value = saved.key; $('#gd-remember', D).checked = true;
      connect();
    } else if (st.conn.state === 'on' || st.conn.state === 'lost') pollHealth();
    tSig = ''; renderAll(); refreshMineThumb(); showMake();
    if (!MP.ready) whenReady().then(() => { if (st.open) { tSig = ''; renderTarget(true); } }, () => {});      // (opened while the studio was still starting)
    setTimeout(() => { const f = st.conn.state === 'on' ? $('#gd-go', D) : (!$('#gd-url', D).value ? $('#gd-url', D) : st.conn.askKey && !$('#gd-key', D).value ? $('#gd-key', D) : $('#gd-connect', D)); if (f && !f.disabled) f.focus({ preventScroll: true }); }, 220);
  }
  // closing leaves the design as it is showing (what you see is what you have)
  function close() {
    if (!st.open) return;
    st.open = false; D.classList.remove('on'); D.setAttribute('inert', ''); D.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gd-open');
    st.go = null; st.pin = null;
    if (typeof MP.undock3D === 'function') { try { MP.undock3D(); } catch (e) { console.warn('[gpu] 3D view not given back', e); } }
    const b = $('#btn-gpu'); b.classList.remove('open'); b.setAttribute('aria-expanded', 'false');
    if (D.contains(document.activeElement)) b.focus({ preventScroll: true });
  }
  // The studio's "Make with AI…" (Add element) and "Rework with AI…" (a picture's own panel) land here: the panel
  // opens with "New element" as the target, or with that element selected. It always says where things stand: a
  // run still going, no connection yet, or a bridge too old for elements.
  function askElement(op, key) {
    if (!D) return;
    open();
    const c = st.conn.state, live = c === 'on' || c === 'lost';
    if (live && !elementOK()) { toast('The bridge you are connected to cannot make elements yet: it needs a newer bridge (1.1.0 or later).', true); return; }
    if (op === 'rework' && key) {
      const list = pictures(); const e = list.find(x => x.key === key && x.side === MP.side) || list.find(x => x.key === key);
      if (e && e.pic) { if (e.side !== MP.side) MP.setView(e.side); MP.select(e.key); } else toast('That element has no picture to rework.', true);
    } else pinTarget(newTarget());
    tSig = ''; renderTarget(true);
    if (st.run) toast('Your GPU is still making a picture. Generate comes back when it has finished (or press Cancel).');
    else if (c === 'off' || c === 'error') toast('Connect to your GPU first: paste the bridge address here, then Connect. Then describe it and Generate.');
    if (live) setTimeout(() => { if (!st.open) return; $('#gd-make', D).scrollIntoView({ block: 'start' }); $('#gd-text', D).focus({ preventScroll: true }); }, 260);
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
    if (h.busy || h.queued) return ['busy', 'Busy'];                       // (how many wait: under Connection)
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
    // connected: the status light says it in one word (above); the address, the bridge version, the ComfyUI and GPU
    // line, "GPU capped", Change and Disconnect wait in one closed row, "Connection". Lost: Reconnect stays in view.
    const sum = $('#gd-summary', D);
    sum.hidden = !live || c.editing;
    if (!sum.hidden) {
      if (!$('#gd-conn-d', sum)) {
        sum.innerHTML = '<div class="gd-row" id="gd-lost" hidden><button type="button" class="btn sm primary" data-act="reconnect">Reconnect</button></div>' +
          '<details class="gd-how gd-conn-d" id="gd-conn-d"><summary>Connection</summary><div class="gd-conn-b" id="gd-conn-b"></div></details>';
        $('#gd-conn-d', sum).addEventListener('toggle', e => { st.connOpen = e.target.open; });
        if (st.connOpen) $('#gd-conn-d', sum).open = true;
      }
      $('#gd-lost', sum).hidden = c.state !== 'lost';
      let where = c.url; try { where = new URL(c.url).host; } catch (e) { /* as typed */ }
      const h = c.health, on = !!h && c.state === 'on';
      // (redrawn only when what it says changes, so a focused button or an open "?" in it stays the same one)
      const bsig = [c.state, where, h && h.version, on && healthText(h), on && h.message, on && h.comfy, on && capText(h)].join('\u0001');
      const body = $('#gd-conn-b', sum);
      if (body.dataset.sig !== bsig) {
        body.dataset.sig = bsig;
        body.innerHTML = '<div class="gd-sum-t">' + (c.state === 'lost' ? 'Lost the connection to <b>' : 'Connected to <b>') + esc(where) + '</b>' + (h && h.version ? ' <span class="gd-ver">bridge ' + esc(h.version) + '</span>' : '') + '</div>' +
          (on ? '<div class="gd-sum-s">' + healthText(h) + '</div>' + (h.message ? '<div class="gd-sum-m' + (h.comfy === 'error' ? ' err' : '') + '">' + esc(String(h.message).slice(0, 300)) + '</div>' : '') + (capText(h) ? '<div class="gd-sum-cap">' + icon('check', 'ico-sm') + '<span>GPU capped</span>' + help(esc(capText(h)), 'GPU capped') + '</div>' : '') : '') +
          '<div class="gd-row"><button type="button" class="btn sm" data-act="change">Change</button><button type="button" class="btn ghost sm" data-act="disconnect">Disconnect</button></div>';
      }
    }
    const msg = $('#gd-msg', D);
    const show = c.err && (c.state === 'error' || c.state === 'lost' || c.state === 'off'), sig = show ? (c.state === 'off' ? 'i' : 'w') + c.err : '';
    if (msg.dataset.err !== sig) { msg.dataset.err = sig; msg.innerHTML = show ? noteHTML(c.state === 'off' ? 'info' : 'warn', c.err, 'Connection') : ''; }   // (redrawn only when it changes, so its "?" stays put)
  }
  function renderForget() { if (!D) return; const f = $('#gd-forget', D); if (f) f.hidden = !readCreds(); }
  function renderMake() {
    if (!D) return;
    const live = st.conn.state === 'on' || st.conn.state === 'lost';
    $('#gd-make', D).hidden = !live; $('#gd-isec', D).hidden = !live;
    if (!live) return;
    renderTarget(); renderHow(); renderSeed(); renderIdeas(); renderGo(); renderGoStrip();
  }
  // can Generate work on this target? '' if so, else the one short line that says why not (HTML)
  function blockOf(t) {
    if (!t) return 'The studio is still starting.';
    if (t.kind === 'text') return 'AI can’t redraw words: they must print exactly.' + (t.logo ? ' <button type="button" class="gd-link" data-act="logoideas">Logo ideas</button>' : '');
    if (t.kind === 'bg') return '';
    if (!elementOK()) return 'Pictures need a newer bridge (1.1.0 or later).' + help('Update the gpu-bridge folder on the GPU PC and start it again. Background art works with this one.', 'Newer bridge');
    if (t.kind === 'pop' && !popOK()) return 'Needs a newer bridge.' + help('Reworking the pop needs bridge 1.2.0 or later, which keeps the pop exactly what it is. Update the gpu-bridge folder on the GPU PC and start it again. Pictures and the background work with this one.', 'Newer bridge');
    if (t.kind === 'pop' && !MP.popPicture()) return 'The pop has no picture yet.';
    if (t.kind === 'el' && !MP.elementPicture(t.key, t.side)) return 'This element has lost its picture.';
    return '';
  }
  const canMake = t => !!t && !blockOf(t);
  // The target line: a small picture of what is being edited, its name, and "New element". The text box takes the
  // words for that kind of target (each kind keeps its own). force: the target's picture is drawn again.
  function renderTarget(force) {
    if (!D) return;
    const t = curTarget();
    // a go ends when the target changes (its own run still going keeps it): the design stays as it is showing
    if (st.go && (!t || st.go.t.sig !== t.sig) && !(st.run && !st.run.idea && st.run.t && st.run.t.sig === st.go.t.sig)) st.go = null;
    const k = textKey(t);
    if (k !== st.textKind) {
      st.textKind = k;
      const ta = $('#gd-text', D); ta.value = st.texts[k] || '';
      $('#gd-text-l', D).textContent = k === 'bg' ? 'Describe the background' : k === 'new' ? 'Describe the element' : k === 'pop' ? 'Angle or style' : 'What should change';
      setHelp($('#gd-text-h', D), k === 'pop' ? esc(POP_HELP) : '', 'Angle or style');
      ta.placeholder = k === 'bg' ? 'Describe the look, or pick one below' : k === 'new' ? 'One thing, for example: a strawberry lollipop' : k === 'pop' ? 'Pick one below, or describe the angle or style' : 'For example: make the candy orange';
      ta.rows = k === 'bg' ? 3 : 2;
      renderStyleCount(); renderChips();
    }
    const block = blockOf(t);
    const sig = t ? [t.sig, t.name, block, st.conn.state].join('|') : '';
    if (sig !== tSig || force) {
      tSig = sig;
      $('#gd-tname', D).textContent = t ? t.name : '';
      const nb = $('#gd-newel', D), isNew = !!t && t.kind === 'new';
      nb.classList.toggle('on', isNew); nb.setAttribute('aria-pressed', String(isNew));
      const words = !!t && t.kind === 'text';
      $('#gd-textf', D).hidden = words; $('#gd-howf', D).hidden = !t || t.kind !== 'bg'; $('#gd-more', D).hidden = words;
      const tl = $('#gd-tline', D); tl.hidden = !block;
      if (tl.dataset.sig !== block) { tl.dataset.sig = block; tl.innerHTML = block ? noteHTML(words ? 'info' : 'warn', block) : ''; }
      refreshTargetThumb(t, force);
    }
    renderGo(); renderGoStrip();
  }
  // the small picture: the panel's background as it is now, the element's or the pop's own picture, or an icon
  async function refreshTargetThumb(t, force) {
    const box = $('#gd-tth', D); if (!box) return;
    const put = (html, k) => { if (box.dataset.k !== k) { box.dataset.k = k; box.innerHTML = html; } };
    if (!t || t.kind === 'new' || t.kind === 'text') { put(icon(!t ? 'image' : t.kind === 'new' ? 'sparkle' : t.logo ? 'logo' : 'text'), 'i:' + (t ? t.kind + (t.logo ? 'logo' : '') : '')); box.classList.remove('img'); return; }
    if (t.kind === 'el' || t.kind === 'pop') {
      const p = sourceOf(t); box.classList.toggle('img', !!p);
      if (!p) { put(icon(t.kind === 'pop' ? 'pop' : 'image'), 'i:' + t.kind); return; }
      put('<img alt="">', 'img'); const im = $('img', box); if (im.getAttribute('src') !== p.dataURL) im.src = p.dataURL;
      return;
    }
    box.classList.add('img'); put('<img alt="">', 'img');
    const im = $('img', box);
    if (st.tthumb.sig === t.sig && st.tthumb.url && !force) { if (im.getAttribute('src') !== st.tthumb.url) im.src = st.tthumb.url; return; }
    if (st.tthumb.sig === t.sig && st.tthumb.url) { if (im.getAttribute('src') !== st.tthumb.url) im.src = st.tthumb.url; }
    const seq = ++tthumbSeq;
    try {
      await whenReady();
      const r = await renderPanel(baseModel('art'), t.side, 12000, false);
      if (seq !== tthumbSeq) return;
      st.tthumb = { sig: t.sig, url: r.url };
      const im2 = $('#gd-tth img', D); if (im2) im2.src = r.url;
    } catch (e) { /* the line keeps its last picture */ }
  }
  // background: how much to change, as four bands (the distance in the middle of each)
  function renderHow() {
    $$('#gd-how button', D).forEach((b, i) => { const on = i === st.band; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.title = MODES.art.bands[i][1]; });
    setHelp($('#gd-hownote', D), esc(MODES.art.bands[st.band][1] + ' Never any words or a pop.'), 'How much to change');
  }
  // the Ideas section (folded): logo or pack, the base, how far from it, the style
  function renderIdeas() {
    const M = MODES[st.mode];
    $$('#gd-mode button', D).forEach(b => { const on = b.getAttribute('data-v') === st.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    // the honesty marker stays in view as a short tag; the sentence that explains it is behind the "?" beside it
    const nm = /^<b>(.*?)\.?<\/b>\s*([\s\S]*)$/.exec(M.note) || [null, M.label, M.note];
    if ($('#gd-modenote', D).dataset.mode !== st.mode) {
      $('#gd-modenote', D).dataset.mode = st.mode;
      $('#gd-modenote', D).innerHTML = '<div class="gd-modetag idea">' + icon('info', 'ico-sm') + '<b>' + nm[1] + '</b>' + help(nm[2], nm[1]) + '</div>';
    }
    if (!baseAvailable(st.base)) st.base = 'mine';
    $$('#gd-bases .gd-base', D).forEach(b => { const k = b.getAttribute('data-v'); const on = k === st.base, ok = baseAvailable(k); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !ok; b.title = ok ? '' : 'Not among the bases the bridge has on that PC'; });
    const im = $('#gd-thumb-mine', D); if (im && st.mineThumb && im.getAttribute('src') !== st.mineThumb) im.src = st.mineThumb;
    setHelp($('#gd-basenote', D), esc(st.base === 'mine'
      ? 'Uses the design open in this browser, as it is now: the logo, the words and the real pop' + (M.words ? ', with its words passed on to be spelled exactly.' : '.')
      : 'The client’s current ' + (st.base === 'bag' ? 'bag' : 'wrapper') + ' draft (a base already on the GPU PC, with its words).'), 'Start from');
    if (!$('#gd-style', D).value.trim() && !st.styleTouched) $('#gd-style', D).value = M.chips[0][1];
    renderDistance(); renderStyleCount(); renderChips();
  }
  function renderDistance() {
    const M = MODES[st.mode];
    const d = st.distance, bi = bandOf(d);
    const r = $('#gd-dist', D); if (Number(r.value) !== d) r.value = d;
    $('#gd-dist-v', D).textContent = d.toFixed(2);
    $$('#gd-bands button', D).forEach((b, i) => { b.classList.toggle('on', i === bi); b.setAttribute('aria-pressed', String(i === bi)); $('.t', b).textContent = M.bands[i][0]; b.title = M.bands[i][1]; });
    setHelp($('#gd-bandnote', D), esc(M.bands[bi][1] + ' The pop stays the real product.'), 'How far from it');
  }
  // (the count shows only near the 600-character limit, where it matters)
  function renderStyleCount() { ['style', 'text'].forEach(k => { const len = $('#gd-' + k, D).value.length; $('#gd-' + k + '-n', D).textContent = len >= 500 ? len + ' / 600' : ''; }); }
  const chipsFor = tk => (tk === 'pop' ? POP_CHIPS : tk === 'new' ? MODES.element.chips : tk === 'change' ? [] : MODES.art.chips);
  function renderChips() {
    const chips = (list, cur, act) => list.map((c, i) => '<button type="button" class="gd-chip' + (c[1] === cur ? ' on' : '') + '" data-act="' + act + '" data-i="' + i + '" title="' + esc(c[1]) + '">' + esc(c[0]) + '</button>').join('');
    const tk = st.textKind || 'bg';
    $('#gd-text-chips', D).innerHTML = tk === 'change' ? '' : chips(chipsFor(tk), $('#gd-text', D).value.trim(), 'chip');
    $('#gd-chips', D).innerHTML = chips(MODES[st.mode].chips, $('#gd-style', D).value.trim(), 'ichip');
  }
  function renderSeed() {
    $$('#gd-seedmode button', D).forEach(b => { const on = b.getAttribute('data-v') === st.seedMode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const s = $('#gd-seed', D); s.hidden = st.seedMode !== 'fixed'; if (s.value === '') s.value = st.seed;
    $$('#gd-versions button', D).forEach(b => { const on = Number(b.getAttribute('data-v')) === st.versions; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  // the bridge says the models would not fit in Windows memory now: how much to free (it refuses to load them)
  function memWarn(h) {
    const m = h && h.memory;
    if (!m || typeof m !== 'object' || m.enoughToLoad !== false || h.modelsLoaded) return '';
    const need = Number(m.modelsNeedGB) || 0, free = Number(m.commitFreeGB) || 0, lim = Number(m.commitLimitGB) || 0, below = Number(m.loadBelowPct) || 85;
    const more = Math.max(1, Math.ceil(need - (free - lim * (1 - below / 100))));
    if (m.restartPending) return 'The GPU PC is short of memory for the AI models right now. A bigger page file' + (m.pageFileSetGB ? ' (<b>' + Math.round(Number(m.pageFileSetGB)) + ' GB</b>)' : '') + ' is already set there, but it is not in use yet: restart that PC once (Start > Power > <b>Restart</b>, not Shut down) and this goes away. Until then, close apps there to free about <b>' + more + ' GB</b> more.';
    return 'The GPU PC is short of memory for the AI models right now: they take about <b>' + Math.round(need) + ' GB</b> of Windows memory (RAM + page file), and ' + Math.round(free) + ' GB is free. Close apps there to free about <b>' + more + ' GB</b> more (games, browser tabs, other AI tools) before you generate. Until then the bridge won’t load them, so that PC never runs out of memory.';
  }
  // the memory warning in one short sentence (what is wrong, what to do); memWarn has the whole of it
  function memShort(h) {
    const m = h.memory, need = Number(m.modelsNeedGB) || 0, free = Number(m.commitFreeGB) || 0, lim = Number(m.commitLimitGB) || 0, below = Number(m.loadBelowPct) || 85;
    const more = Math.max(1, Math.ceil(need - (free - lim * (1 - below / 100))));
    return m.restartPending ? 'The GPU PC is short of memory for the AI models: restart that PC once, or close apps there to free about <b>' + more + ' GB</b>.'
      : 'The GPU PC is short of memory for the AI models: close apps there to free about <b>' + more + ' GB</b>.';
  }
  function renderGo() {
    const g = $('#gd-go', D), ig = $('#gd-igo', D);
    const h = st.conn.state === 'on' ? st.conn.health : null;
    const comfyDown = !!h && h.comfy === 'error';          // the bridge would answer 503: say why here instead
    const off = !!st.run || st.conn.state !== 'on' || comfyDown;
    g.disabled = off || !canMake(curTarget());              // (the line under the target says why)
    ig.disabled = off;
    $('span', g).textContent = 'Generate' + (st.versions > 1 ? ' ' + st.versions + ' versions' : '');
    $('span', ig).textContent = 'Generate ' + (st.versions > 1 ? st.versions + ' ideas' : 'an idea');
    const why = $('#gd-gowhy', D);
    // (what is wrong and what to do stay in view; the bridge's own words and the details are behind the "?")
    const mw = !comfyDown && !st.run ? memWarn(h) : '';
    const sig = comfyDown ? 'c' + (h.message || '') : mw;
    why.hidden = !sig;
    if (why.dataset.sig !== sig) {
      why.dataset.sig = sig;
      why.innerHTML = comfyDown ? noteHTML('warn', 'Your GPU can’t take a job right now.' + help('Your GPU can’t take a job right now' + (h.message ? ': ' + esc(String(h.message).slice(0, 300).replace(/\.?$/, '.')) : '.') + ' This button comes back by itself when the bridge is ready.', 'GPU not ready'))
        : mw ? noteHTML('warn', memShort(h) + help(mw, 'GPU PC memory')) : '';
    }
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
    // Make's progress shows under Make; an idea's under Ideas
    const idea = st.run ? !!st.run.idea : !!st.runIdea;
    const box = $(idea ? '#gd-irun' : '#gd-run', D), other = $(idea ? '#gd-run' : '#gd-irun', D);
    other.hidden = true; other.innerHTML = '';
    const r = st.run;
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
    const design = st.results.filter(r => !isIdea(r)), ideas = st.results.filter(isIdea);
    // Recent: a strip of what was made for the design (a click puts one on the design again)
    $('#gd-res', D).hidden = !design.length;
    const showing = st.go && st.go.showing;
    $('#gd-grid', D).innerHTML = design.map(r => {
      const M = MODES[r.mode], on = r.id === st.rsel;
      return '<button type="button" class="gd-th' + (r.cut ? ' cut' : '') + (on ? ' on' : '') + (r.id === showing ? ' live' : '') + '" data-act="recent" data-id="' + esc(r.id) + '" aria-pressed="' + on + '" title="' + esc(M.label + ' · seed ' + r.seed) + '">' +
        '<img src="' + r.url + '" alt="' + esc(M.label + ', seed ' + r.seed) + '"><span class="gd-tag">' + M.tag + '</span></button>';
    }).join('');
    renderRecentRow();
    // Ideas: their own grid and card, never placed in the design
    if (!curResult()) st.sel = ideas.length ? ideas[0].id : null;
    $('#gd-igrid', D).innerHTML = ideas.map(r => {
      const M = MODES[r.mode];
      return '<button type="button" class="gd-th' + (r.id === st.sel ? ' on' : '') + '" data-act="sel" data-id="' + esc(r.id) + '" aria-pressed="' + (r.id === st.sel) + '" title="' + esc(M.label + ' · seed ' + r.seed) + '">' +
        '<img src="' + r.url + '" alt="' + esc(M.label + ', seed ' + r.seed) + '"><span class="gd-tag idea">' + M.tag + '</span></button>';
    }).join('');
    renderPreview();
    renderGoStrip();
  }
  // the one picked under Recent: what it is (the details behind the "?"), Download, and when it cannot go back
  // onto its target, "Add as a new element"
  function renderRecentRow() {
    const box = $('#gd-rrow', D); if (!box) return;
    const r = curRecent();
    if (!r) { if (box.innerHTML) box.innerHTML = ''; box.dataset.sig = ''; return; }
    const k = kindOf(r), t = recentTarget(r), M = MODES[r.mode];
    const live = !!st.go && st.go.showing === r.id;
    const sig = r.id + '|' + (t ? t.sig : '') + '|' + (MP.side || '') + '|' + live;
    if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    const tname = esc((r.target && r.target.name) || 'the element');
    const what = k === 'bg' ? 'Background art' : k === 'pop' ? 'The pop, as an AI drawing' : k === 'el' ? 'A rework of “' + tname + '”' : 'A new element';
    let details = 'Seed ' + esc(r.seed) + ' · ' + esc(r.w) + ' × ' + esc(r.h) + ' px · “' + esc(r.style) + '”';
    if (k === 'bg') { const f = fitInfo(r); if (f) details += ' · about ' + f.ppi + ' ppi on this panel' + (f.ppi >= 300 ? ': print-ready.' : f.ppi >= 250 ? ' (300 is ideal).' : ': fine for proofs. For the final print, download it, upscale it 2× (for example in ComfyUI) and bring it back with Background → Replace background art.') + (f.crop ? ' A different shape from this panel, so its edges are cropped to fit.' : ''); }
    else details += ' · ' + (r.cut ? 'background cut out.' : 'with its background' + (r.note ? ' (' + esc(r.note) + ')' : '') + '.');
    const offer = !t && M.element && !live;            // (not while it is the one showing on the design)
    box.innerHTML = '<div class="gd-rrow"><div class="gd-rrow-t"><b>' + what + '</b>' + help(details, 'This result') + '</div>' +
      (k === 'el' && !t ? noteHTML('info', '“' + tname + '” is no longer in the design.') : '') +
      '<div class="gd-pv-a">' + (offer ? '<button type="button" class="btn primary sm" data-act="addnew" data-id="' + esc(r.id) + '">' + icon('plus', 'ico-sm') + 'Add as a new element</button>' : '') +
      '<button type="button" class="btn sm" data-act="rdownload">' + icon('save', 'ico-sm') + 'Download PNG</button>' +
      '<button type="button" class="btn ghost sm icon" data-act="rremove" aria-label="Remove this result" title="Remove this result">' + icon('trash', 'ico-sm') + '</button></div></div>';
  }
  // What is showing on the design for this target: Before and each version, and "Back to before"
  function renderGoStrip() {
    const box = $('#gd-vers', D); if (!box) return;
    const g = st.go, t = curTarget();
    const list = g ? g.ids.map(byId).filter(Boolean) : [];
    if (!g || !t || g.t.sig !== t.sig || !list.length) { box.hidden = true; if (box.innerHTML) box.innerHTML = ''; box.dataset.sig = ''; return; }
    const cur = list.find(r => r.id === g.showing);
    const sig = [g.tok, g.showing, g.gone, list.map(r => r.id).join(',')].join('|');
    if (box.dataset.sig === sig && !box.hidden) return;
    box.dataset.sig = sig; box.hidden = false;
    const what = g.showing === 'before' ? 'Before' : 'Version ' + (list.indexOf(cur) + 1);
    let notes = '';
    if (cur && MODES[cur.mode].element && !cur.cut) notes += noteHTML('warn', 'Its background could not be cut out, so this is the picture as it came.' + (cur.note ? help(esc(cur.note), 'Background not cut out') : ''));
    if (g.gone) {
      const r = list[list.length - 1];
      notes += noteHTML('info', '“' + esc(g.t.name) + '” is no longer in the design. <button type="button" class="gd-link" data-act="addnew" data-id="' + esc(r.id) + '">Add as a new element</button>');
    }
    box.innerHTML = '<div class="gd-vers-h"><span class="gd-vers-t">On the design: <b>' + what + '</b></span>' +
      (g.showing !== 'before' ? '<button type="button" class="btn sm" data-act="before">' + icon('undo', 'ico-sm') + 'Back to before</button>' : '') + '</div>' +
      '<div class="gd-vers-row" role="group" aria-label="Before and the versions">' +
      '<button type="button" class="gd-v' + (g.showing === 'before' ? ' on' : '') + '" data-act="ver" data-id="before" aria-pressed="' + (g.showing === 'before') + '" title="As it was before">' +
      '<span class="gd-v-i">' + (g.thumb ? '<img alt="" src="' + g.thumb + '">' : icon('minus')) + '</span><span class="gd-v-l">Before</span></button>' +
      list.map((r, i) => '<button type="button" class="gd-v' + (r.cut ? ' cut' : '') + (r.id === g.showing ? ' on' : '') + '" data-act="ver" data-id="' + esc(r.id) + '" aria-pressed="' + (r.id === g.showing) + '" title="Version ' + (i + 1) + ' · seed ' + esc(r.seed) + '">' +
        '<span class="gd-v-i"><img alt="" src="' + r.url + '"></span><span class="gd-v-l">' + (i + 1) + '</span></button>').join('') +
      '</div>' + notes;
  }
  // the idea picked in the Ideas section: Download, Reuse settings, remove (never placed in the design)
  function renderPreview() {
    if (!D) return;
    const r = curResult(); const box = $('#gd-prev', D);
    if (!r) { box.innerHTML = ''; return; }
    const M = MODES[r.mode];
    const line = esc(M.bands[bandOf(r.distance)][0]) + ' (distance ' + Number(r.distance).toFixed(2) + ') · seed ' + esc(r.seed) + ' · ' + esc(r.w) + ' × ' + esc(r.h) + ' px';
    box.innerHTML = '<figure class="gd-pv"><div class="gd-pv-img"><img src="' + r.url + '" alt="' + esc(M.label + ' result, seed ' + r.seed) + '">' +
      '<span class="gd-badge">' + M.badge + '</span></div>' +
      // (its distance, seed and size are behind the "?")
      '<figcaption><div class="gd-pv-t">' + esc(M.label) + ' <span>from ' + esc(r.baseLabel || '') + '</span>' + help(line, 'This idea') + '</div>' +
      '<div class="gd-pv-s gd-pv-style">“' + esc(r.style) + '”</div></figcaption>' +
      '<div class="gd-pv-a"><button type="button" class="btn sm" data-act="download">' + icon('save', 'ico-sm') + 'Download PNG</button>' +
      '<button type="button" class="btn sm" data-act="reuse" title="Put its style, distance and seed back, to try it nearer or further">' + icon('reset', 'ico-sm') + 'Reuse settings</button>' +
      '<button type="button" class="btn ghost sm icon" data-act="remove" aria-label="Remove this idea" title="Remove this idea">' + icon('trash', 'ico-sm') + '</button></div></figure>';
  }

  /* ------------------------------------------------------------------------------------------ start */
  try {
    moveFileCreds();
    buildButton(); buildDrawer();
    st.texts.bg = MODES.art.chips[0][1];
    $('#gd-style', D).value = MODES.logo.chips[0][1]; $('#gd-seed', D).value = st.seed;
    readMake();
    $('#gd-dist', D).value = st.distance;
    const saved = readCreds();
    if (saved) { $('#gd-url', D).value = saved.url; $('#gd-remember', D).checked = true; }
    renderAll();
  } catch (e) { console.warn('[label-studio] AI on your GPU is unavailable:', e); }
  // for scripted checks (QA), and for the studio: its "Make with AI…" and "Rework with AI…" call makeElement() and
  // rework(key), which open this panel on "New element", or with that element selected
  const goState = () => { const g = st.go; return g ? { sig: g.t.sig, kind: g.t.kind, showing: g.showing, ids: g.ids.slice(), drawKey: g.drawKey, gone: g.gone } : null; };
  MP.gpu = {
    get state() { return { open: st.open, conn: st.conn.state, health: st.conn.health, err: st.conn.err, run: st.run ? { phase: st.run.phase, n: st.run.n, of: st.run.of, position: st.run.position, idea: st.run.idea } : null, runMsg: st.runMsg, results: st.results.map(r => ({ id: r.id, mode: r.mode, kind: kindOf(r), side: r.side, base: r.base, seed: r.seed, w: r.w, h: r.h, distance: r.distance, op: r.op, target: r.target, cut: r.cut, note: r.note, background: r.background })), sel: st.sel, rsel: st.rsel, mode: st.mode, base: st.base, distance: st.distance, band: st.band, target: curTarget(), go: goState() }; },
    open, close, connect, disconnect, generate: () => generate(false), generateIdea: () => generate(true), cancel: () => cancelRun(), frontWords: () => frontWords(MP.model),
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
