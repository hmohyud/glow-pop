/* Model Pops Label Studio · AI on your GPU (gpu.js)
 *
 * Optional, and the only part of the studio that uses a GPU: the user's own, through the Model Pops GPU bridge
 * (gpu-bridge/) that runs next to ComfyUI on their PC. The studio reaches the bridge at http://127.0.0.1:8189 on
 * that PC, or from anywhere through a tunnel the user starts (an https ngrok or trycloudflare address). Without a
 * bridge this panel only explains itself, and the studio works exactly as before.
 *
 * What comes back is one of two things, and they never mix:
 *  - Background art: text-free, pop-free art for the print file. "Use as background" sets it as the panel's
 *    background image (cover fit, as Background > Image does); the exact logo, every word and the real pop stay
 *    on top as live layers. Made from "My current design", only the design's background is sent.
 *  - Ideas (logo or pack pictures): to choose a direction. Always labelled "ideas, not print files", and never
 *    placed in the design.
 * The key travels only in the X-MP-Key header, never in a URL; this browser keeps it only when asked to.
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
  const MODES = {
    art: {
      label: 'Background art', tag: 'Art', file: 'background-art', print: true,
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
      label: 'Logo ideas', tag: 'Idea', file: 'logo-idea', print: false,
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
      label: 'Pack ideas', tag: 'Idea', file: 'pack-idea', print: false,
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
  };
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
  async function whenReady() { for (let i = 0; i < 300 && !MP.ready; i++) await sleep(100); if (!MP.ready) throw new Error('The studio is still starting.'); }
  const isLoopback = h => /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i.test(h) || /\.localhost$/i.test(h);
  const isTunnel = h => /(^|\.)(ngrok-free\.app|ngrok-free\.dev|ngrok\.app|ngrok\.dev|ngrok\.io|trycloudflare\.com)$/i.test(h);
  const pageOrigin = () => (location.origin && location.origin !== 'null' ? location.origin : 'a file opened from disk (origin “null”)');
  // a pasted address: scheme added when missing, a trailing /api or /api/health dropped, no query or user info
  function normalizeURL(raw) {
    let s = String(raw || '').trim();
    if (!s) return { error: 'Paste the bridge address first (on the PC with the GPU it is ' + LOCAL_URL + ').' };
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
    conn: { url: '', key: '', state: 'off', health: null, err: '', seen: 0, editing: true },
    mode: 'art', base: 'mine', distance: 0.4, styleTouched: false,
    seedMode: 'random', seed: 20261120, versions: 2,
    run: null, runMsg: '', results: [], sel: null, mineThumb: '', clearArm: 0,
  };
  let D = null;                     // the drawer
  let connSeq = 0, runSeq = 0, hTimer = 0, tick = 0, thumbSeq = 0;

  /* ------------------------------------------------------------------------------------------ remembered address + key */
  // A studio opened from disk (file://, origin "null") shares ONE browser storage with every other HTML file opened
  // from disk, so any downloaded page could read a key kept there. On such a page the key is kept only for this tab
  // (sessionStorage) and never in localStorage; online and on a local server, localStorage (this site only).
  const FILE_PAGE = location.protocol === 'file:' || location.origin === 'null';
  function credStore() { try { return FILE_PAGE ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }
  function readCreds() { try { const s = credStore().getItem(LS_KEY); const o = s ? JSON.parse(s) : null; return o && typeof o.url === 'string' && typeof o.key === 'string' ? o : null; } catch (e) { return null; } }
  function saveCreds() { try { credStore().setItem(LS_KEY, JSON.stringify({ url: st.conn.url, key: st.conn.key, savedAt: new Date().toISOString() })); } catch (e) { toast('This browser would not keep the key (storage blocked).', true); } renderForget(); }
  function removeCreds() { try { credStore().removeItem(LS_KEY); } catch (e) { /* storage blocked */ } if (FILE_PAGE) { try { localStorage.removeItem(LS_KEY); } catch (e) { /* storage blocked */ } } renderForget(); }
  // a key an earlier version kept in the shared file:// localStorage moves to this tab only
  function moveFileCreds() {
    if (!FILE_PAGE) return;
    try { const old = localStorage.getItem(LS_KEY); if (old) { if (!sessionStorage.getItem(LS_KEY)) sessionStorage.setItem(LS_KEY, old); localStorage.removeItem(LS_KEY); } } catch (e) { /* storage blocked */ }
  }
  function saveMake() {
    try { localStorage.setItem(LS_MAKE, JSON.stringify({ mode: st.mode, base: st.base, distance: st.distance, style: $('#gd-style', D).value, styleTouched: st.styleTouched, seedMode: st.seedMode, seed: clampSeed($('#gd-seed', D).value), versions: st.versions })); } catch (e) { /* storage blocked */ }
  }
  function readMake() {
    let o = null; try { o = JSON.parse(localStorage.getItem(LS_MAKE) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return;
    if (MODES[o.mode]) st.mode = o.mode;
    if (BASES[o.base]) st.base = o.base;
    if (typeof o.distance === 'number' && o.distance >= 0 && o.distance <= 1) st.distance = Math.round(o.distance * 20) / 20;
    if (typeof o.style === 'string' && o.style.trim()) { $('#gd-style', D).value = o.style.slice(0, 600); st.styleTouched = !!o.styleTouched; }
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
  // every call carries the key in a header (never in the URL) and ngrok's "skip the browser warning" header
  async function call(method, path, body, o) {
    o = o || {}; const c = st.conn;
    const ctl = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, o.timeout || 15000);
    const outer = o.signal;
    const onOuter = () => ctl.abort();
    if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener('abort', onOuter, { once: true }); }
    const headers = { 'X-MP-Key': o.key || c.key, 'ngrok-skip-browser-warning': '1' };
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
    if (e.status === 401) return '<b>Wrong key.</b> Use the key the bridge printed when it started (it is also in <code>gpu-bridge\\config.json</code> on that PC).';
    if (e.status === 403) return 'The bridge refused this page (' + esc(pageOrigin()) + '). Add it to <code>allowedOrigins</code> in <code>gpu-bridge\\config.json</code>, then restart the bridge.';
    if (e.status === 404) return 'Something answered at ' + host + ', but it is not the Model Pops GPU bridge. Check the address and the port (the bridge uses 8189).';
    if (e.status >= 500 && tunnel) return 'The tunnel at ' + host + ' is up, but the bridge behind it did not answer (' + e.status + '). Start the bridge on your PC, and check that the tunnel points at port 8189.';
    if (e.status) return 'The bridge answered with an error (' + e.status + ')' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.kind === 'notbridge') return 'Something answered at ' + host + ', but not like the Model Pops GPU bridge.' + (tunnel ? ' If it is an ngrok page, check that the tunnel points at the bridge (port 8189).' : '');
    if (e.kind === 'timeout') return 'No answer from ' + host + ' in ' + e.secs + ' seconds. Check that the bridge' + (tunnel ? ' and the tunnel are' : ' is') + ' running.' + allow;
    if (await reachable(base)) {
      return tunnel
        ? 'The address ' + host + ' answers, but the bridge did not. Check that both the tunnel and the bridge are running on your PC, and that the tunnel points at port 8189. (Free tunnel addresses change every time they start: paste the new one.)'
        : 'Something on this PC answered at ' + host + ', but the browser blocked its reply (CORS). If it is the bridge, add this page (' + esc(pageOrigin()) + ') to <code>allowedOrigins</code> in <code>gpu-bridge\\config.json</code> and restart it.';
    }
    if (tunnel) return 'Can’t reach ' + host + '. If it is a tunnel (ngrok or cloudflared), is it still running? Free tunnel addresses change every time they start: paste the new one.';
    // an https page (the online studio) needs the browser's permission to reach this PC (Local Network Access)
    if (location.protocol === 'https:') return 'Couldn’t reach the bridge at ' + host + '. Is it running on this PC? This https page also needs the browser’s permission to reach apps on this device: when it asks, choose <b>Allow</b> (if you blocked it once, allow it again in the site settings, left of the address bar). Or use your tunnel’s https address.';
    return 'Nothing answered at ' + host + '. Is the bridge running on this PC? Start it, then connect again.';
  }

  /* ------------------------------------------------------------------------------------------ connect */
  async function connect() {
    const c = st.conn;
    const n = normalizeURL($('#gd-url', D).value);
    if (n.error) return connFail(esc(n.error));
    const key = $('#gd-key', D).value.trim();
    if (!key) return connFail('Paste the key the bridge printed when it started.');
    if (location.protocol === 'https:' && n.u.protocol === 'http:' && !isLoopback(n.u.hostname)) {
      return connFail('This page is on https, so the browser blocks plain <b>http</b> addresses (except this PC’s own 127.0.0.1). Use the <b>https</b> address your tunnel shows (ngrok or cloudflared).');
    }
    $('#gd-url', D).value = n.url;
    if (st.run && (n.url !== c.url || key !== c.key)) cancelRun(true);       // its job lives on the other bridge
    const seq = ++connSeq;
    c.url = n.url; c.key = key; c.state = 'checking'; c.err = ''; c.health = null;
    renderConn();
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
      c.state = 'error'; c.health = null; c.err = await explain(e, n.url);
      if (seq !== connSeq) return;
    }
    renderAll();
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
      if (e.status === 401) { c.state = 'error'; c.editing = true; c.err = 'The bridge no longer accepts this key (was it restarted with a new one?). Paste the new key and Connect.'; renderAll(); return; }
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
  // art: only the design's background goes (no words, no logo, no pop, no printed seal ribs), so the art is made
  // for behind them and nothing of the product can end up in it. Ideas: the front exactly as it is.
  function baseModel(mode) {
    const m = JSON.parse(JSON.stringify(MP.model));
    if (mode === 'art') { const P = m.panels.front; Object.keys(P.els).forEach(k => { if (P.els[k]) P.els[k].visible = false; }); P.bg.ribs = false; }
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
    const m = baseModel(mode);
    const r = await renderPanel(m, 'front', BASE_PIXELS, mode !== 'art');
    const out = { base: { png: r.url }, label: BASES.mine.label, w: r.w, h: r.h };
    if (mode === 'pack') { const w = frontWords(m); if (w) out.words = w; }
    if (mode !== 'art') out.lollipop = lollipopFor(m.panels.front.els.pop);
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
    if (!st.open || !MP.ready) return;
    const seq = ++thumbSeq;
    try {
      const r = await renderPanel(baseModel(st.mode), 'front', 15000, st.mode !== 'art');
      if (seq !== thumbSeq) return;
      st.mineThumb = r.url; const im = $('#gd-thumb-mine', D); if (im) im.src = r.url;
    } catch (e) { /* the card keeps its last picture */ }
  }

  /* ------------------------------------------------------------------------------------------ generate */
  function setPhase(r, ph) { if (st.run !== r) return; const was = r.phase; r.phase = ph; if (was !== ph) renderRun(); else updateRunTime(); }
  async function generate() {
    if (st.run || st.conn.state !== 'on') return;
    const style = $('#gd-style', D).value.trim();
    if (!style) { st.runMsg = noteHTML('warn', 'Describe a style first, or pick one of the suggestions under it.'); renderRun(); $('#gd-style', D).focus(); return; }
    const mode = st.mode, baseKey = st.base, distance = Math.round(st.distance * 100) / 100, of = st.versions;
    const seed0 = st.seedMode === 'fixed' ? clampSeed($('#gd-seed', D).value) : null;
    const r = { id: ++runSeq, phase: 'render', n: 1, of, t0: Date.now(), tSent: 0, position: null, ctl: new AbortController(), cancelled: false, made: 0 };
    st.run = r; st.runMsg = ''; renderRun(); renderMake(); startTicker(); scheduleHealth(2500); saveMake();
    reveal($('#gd-run', D));
    try {
      const b = await buildBase(mode, baseKey);
      for (let i = 0; i < of; i++) {
        if (r.cancelled) return;
        const seed = seed0 != null ? (seed0 + i) % 2147483647 : randomSeed();
        r.n = i + 1; r.tSent = Date.now(); r.position = null; r.phase = ''; setPhase(r, 'send');
        const body = { mode, base: b.base, distance, style, seed };
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
          await addResult({ jobId: String(res.jobId), n: k, mode, base: baseKey, baseLabel: b.label, distance, style, seed, blob });
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
    if (e && e.kind === 'network' && st.conn.state === 'on') { st.conn.state = 'lost'; st.conn.err = 'The connection dropped while it was working. The bridge may still finish the image on your PC.'; scheduleHealth(3000); }
    renderAll();
  }
  function runError(e) {
    if (e.user) return esc(e.user);
    if (e.status === 401) return 'The bridge no longer accepts this key (was it restarted with a new one?). Connect again with the new key.';
    if (e.status === 429) return 'Your GPU’s queue is full (3 waiting). Try again when one has finished.';
    if (e.status === 413) return 'The design picture is too large for the bridge (12 MB).';
    if (e.status === 503) return 'Your GPU is not available right now' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.status === 400) return 'The bridge did not accept it' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.status) return 'The bridge answered with an error (' + e.status + ')' + (msgOf(e) ? ': ' + esc(msgOf(e)) : '.');
    if (e.kind === 'timeout') return 'The bridge stopped answering (no reply in ' + e.secs + ' s).';
    if (e.kind === 'network') return 'Lost the connection to the bridge. The image may still finish on your PC; reconnect and try again.';
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
  const record = r => ({ id: r.id, jobId: r.jobId, n: r.n, mode: r.mode, base: r.base, baseLabel: r.baseLabel, distance: r.distance, style: r.style, seed: r.seed, w: r.w, h: r.h, createdAt: r.createdAt, blob: r.blob });
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
    if (!r || r.mode !== 'art') return;                       // ideas are never placed in the design
    try {
      await whenReady();
      const src = await blobToDataURL(r.blob);
      const id = await MP.addImageAsset({ src, name: 'AI background art (seed ' + r.seed + ')', kind: 'background' });
      const side = MP.useBackgroundImage(id);
      toast('The AI art is now the ' + side + ' panel’s background. The exact logo, words and pop stay on top · Ctrl+Z to undo');
      refreshMineThumb(); renderPreview();
    } catch (e) { toast('Could not use it: ' + (e.message || e), true); }
  }
  function reuse(r) {
    st.mode = r.mode; st.base = BASES[r.base] ? r.base : 'mine'; st.distance = r.distance;
    $('#gd-style', D).value = r.style; st.styleTouched = true;
    st.seedMode = 'fixed'; $('#gd-seed', D).value = r.seed;
    renderMake(); refreshMineThumb();
    $('#gd-make', D).scrollIntoView({ block: 'start', behavior: 'smooth' });
    toast('Its settings are back under Make, with its seed fixed: move the distance to see the same idea nearer or further.');
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
    const b = el('button', { class: 'btn gpu-btn', id: 'btn-gpu', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'gpu-drawer', 'aria-label': 'AI on your GPU', title: 'AI on your GPU: background art and ideas from ComfyUI on your own PC' },
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
      '<div class="gd-intro" id="gd-intro"><p>Make <b>background art</b> and <b>logo or pack ideas</b> with ComfyUI on your own PC. The studio itself needs no GPU: everything else works without this.</p>' +
      '<ol class="gd-steps"><li>On the PC with the GPU, start the <b>Model Pops GPU bridge</b> (the <code>gpu-bridge</code> folder; its README has the steps). It shows an address and a key.</li>' +
      '<li>On that PC, the address is <b>' + LOCAL_URL + '</b>. From anywhere else, start a tunnel to it (cloudflared or ngrok) and use the <b>https</b> address the tunnel shows.</li>' +
      '<li>Paste the address and the key here, then Connect.</li></ol></div>' +
      '<div class="gd-form" id="gd-form">' +
      '<div class="field"><label class="lbl" for="gd-url">Bridge address</label><input class="inp" id="gd-url" type="url" inputmode="url" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="' + LOCAL_URL + '  or  https://….trycloudflare.com">' +
      '<div class="gd-hint">This PC: <button type="button" class="gd-link" data-act="local">' + LOCAL_URL + '</button> · anywhere: your tunnel’s https address</div></div>' +
      '<div class="field"><label class="lbl" for="gd-key">Key</label><div class="gd-keyrow"><input class="inp" id="gd-key" type="password" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="The key the bridge printed">' +
      '<button type="button" class="btn sm" data-act="showkey" aria-pressed="false" aria-label="Show the key">Show</button></div></div>' +
      '<label class="chk"' + (FILE_PAGE ? ' title="Opened from disk: every file opened from disk shares this browser’s storage, so the key is never kept past this tab."' : '') + '><input type="checkbox" id="gd-remember"> ' + (FILE_PAGE ? 'Remember until this tab closes' : 'Remember on this browser') + '</label>' +
      '<div class="gd-row"><button type="button" class="btn primary" data-act="connect" id="gd-connect">Connect</button><button type="button" class="btn ghost sm" data-act="forget" id="gd-forget" hidden>' + icon('trash', 'ico-sm') + 'Forget the saved key</button></div></div>' +
      '<div class="gd-summary" id="gd-summary" hidden></div>' +
      '<div id="gd-msg" role="status" aria-live="polite"></div></section>' +
      // 2 · make
      '<section class="gd-sec" id="gd-make" hidden><div class="gd-sec-h"><h3>Make</h3></div>' +
      '<div class="field"><span class="lbl" id="gd-mode-l">What</span><div class="seg" role="group" aria-labelledby="gd-mode-l" id="gd-mode">' +
      Object.keys(MODES).map(k => '<button type="button" data-act="mode" data-v="' + k + '">' + MODES[k].label + '</button>').join('') + '</div></div>' +
      '<div id="gd-modenote"></div>' +
      '<div class="field"><span class="lbl" id="gd-base-l">Start from</span><div class="gd-bases" role="group" aria-labelledby="gd-base-l" id="gd-bases">' +
      Object.keys(BASES).map(k => '<button type="button" class="gd-base" data-act="base" data-v="' + k + '"><span class="gd-bth"><img alt="" id="gd-thumb-' + k + '"' + (BASES[k].thumb ? ' src="' + BASES[k].thumb + '"' : '') + '></span><span class="t">' + BASES[k].label + '</span><span class="s">' + BASES[k].sub + '</span></button>').join('') +
      '</div><div class="gd-hint" id="gd-basenote"></div></div>' +
      '<div class="field"><label class="lbl" for="gd-dist">How far from it <span class="val" id="gd-dist-v"></span></label><input type="range" id="gd-dist" min="0" max="1" step="0.05">' +
      '<div class="gd-bands" id="gd-bands" role="group" aria-label="Distance bands">' + BAND_AT.map((v, i) => '<button type="button" data-act="band" data-i="' + i + '"><span class="t"></span><span class="s">' + BAND_RANGE[i] + '</span></button>').join('') + '</div>' +
      '<div class="gd-hint" id="gd-bandnote"></div></div>' +
      '<div class="field"><label class="lbl" for="gd-style">Style <span class="val" id="gd-style-n"></span></label><textarea class="ta" id="gd-style" rows="3" maxlength="600" placeholder="Describe the look, or pick one below"></textarea><div class="gd-chips" id="gd-chips"></div></div>' +
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
    $('#gd-seed', D).addEventListener('change', e => { e.target.value = clampSeed(e.target.value); st.seed = Number(e.target.value); });
    $('#gd-remember', D).addEventListener('change', e => {
      if (!e.target.checked) { removeCreds(); toast('This browser no longer keeps the bridge address and key.'); }
      else if (st.conn.state === 'on') saveCreds();
    });
    // the "Use as background" button names the panel it goes on: keep it right when the panel changes
    const vs = document.getElementById('view-switch'); if (vs) vs.addEventListener('click', () => setTimeout(renderPreview, 0));
  }
  function onClick(e) {
    const t = e.target.closest && e.target.closest('[data-act]'); if (!t || !D.contains(t) || t.disabled) return;
    const a = t.getAttribute('data-act'), v = t.getAttribute('data-v');
    if (a === 'close') close();
    else if (a === 'local') { $('#gd-url', D).value = LOCAL_URL; $('#gd-key', D).focus(); }
    else if (a === 'showkey') { const k = $('#gd-key', D); const show = k.type === 'password'; k.type = show ? 'text' : 'password'; t.textContent = show ? 'Hide' : 'Show'; t.setAttribute('aria-pressed', String(show)); t.setAttribute('aria-label', show ? 'Hide the key' : 'Show the key'); }
    else if (a === 'connect' || a === 'reconnect') { if (a === 'reconnect') { $('#gd-url', D).value = st.conn.url; $('#gd-key', D).value = st.conn.key; } connect(); }
    else if (a === 'change') { st.conn.editing = true; renderConn(); $('#gd-url', D).focus(); }
    else if (a === 'disconnect') disconnect();
    else if (a === 'forget') { removeCreds(); $('#gd-remember', D).checked = false; $('#gd-key', D).value = ''; disconnect('Forgot the saved address and key on this browser.'); }
    else if (a === 'mode') { if (MODES[v] && v !== st.mode) { const was = st.mode; st.mode = v; if (!st.styleTouched || styleIsChipOf(was)) { $('#gd-style', D).value = MODES[v].chips[0][1]; st.styleTouched = false; } renderMake(); refreshMineThumb(); } }
    else if (a === 'base') { if (BASES[v]) { st.base = v; renderMake(); if (v === 'mine') refreshMineThumb(); } }
    else if (a === 'band') { st.distance = BAND_AT[Number(t.getAttribute('data-i'))]; renderDistance(); }
    else if (a === 'chip') { const c = MODES[st.mode].chips[Number(t.getAttribute('data-i'))]; if (c) { $('#gd-style', D).value = c[1]; st.styleTouched = false; renderStyleCount(); renderChips(); } }
    else if (a === 'seedmode') { st.seedMode = v === 'fixed' ? 'fixed' : 'random'; renderSeed(); if (st.seedMode === 'fixed') $('#gd-seed', D).focus(); }
    else if (a === 'versions') { st.versions = Math.min(4, Math.max(1, Number(v) || 1)); renderSeed(); renderGo(); }
    else if (a === 'go') generate();
    else if (a === 'cancel') cancelRun();
    else if (a === 'sel') { st.sel = t.getAttribute('data-id'); renderResults(); }
    else if (a === 'use') useAsBackground(curResult());
    else if (a === 'download') { const r = curResult(); if (r) download(r); }
    else if (a === 'reuse') { const r = curResult(); if (r) reuse(r); }
    else if (a === 'remove') { const r = curResult(); if (r) removeResult(r.id); }
    else if (a === 'clear') {
      if (Date.now() - st.clearArm < 4000) { st.clearArm = 0; clearResults(); }
      else { st.clearArm = Date.now(); $('#gd-clear span', D).textContent = 'Clear all ' + st.results.length + '?'; setTimeout(() => { if (st.clearArm && Date.now() - st.clearArm >= 3900) { st.clearArm = 0; const s = $('#gd-clear span', D); if (s) s.textContent = 'Clear'; } }, 4000); }
    }
  }
  const styleIsChipOf = mode => MODES[mode].chips.some(c => c[1] === $('#gd-style', D).value.trim());

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
    setTimeout(() => { const f = st.conn.state === 'on' ? $('#gd-go', D) : (!$('#gd-url', D).value ? $('#gd-url', D) : $('#gd-key', D).value ? $('#gd-connect', D) : $('#gd-key', D)); if (f && !f.disabled) f.focus({ preventScroll: true }); }, 220);
  }
  function close() {
    if (!st.open) return;
    st.open = false; D.classList.remove('on'); D.setAttribute('inert', ''); D.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gd-open');
    const b = $('#btn-gpu'); b.classList.remove('open'); b.setAttribute('aria-expanded', 'false');
    if (D.contains(document.activeElement)) b.focus({ preventScroll: true });
  }

  /* ---- rendering */
  function renderAll() { renderConn(); renderMake(); renderRun(); renderResults(); }
  function healthText(h) {
    const comfy = { up: 'ComfyUI ready', starting: 'ComfyUI starting (the first load takes about a minute)', down: 'ComfyUI not running yet', error: 'ComfyUI hit an error (see the bridge window)' }[h.comfy] || 'ComfyUI: ' + esc(h.comfy);
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
    return parts.length ? 'Capped: ' + parts.join(' and ') + ', so your PC stays usable.' : '';
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
    const M = MODES[st.mode];
    $$('#gd-mode button', D).forEach(b => { const on = b.getAttribute('data-v') === st.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $('#gd-modenote', D).innerHTML = noteHTML(M.print ? 'ok' : 'idea', M.note);
    if (!baseAvailable(st.base)) st.base = 'mine';
    $$('#gd-bases .gd-base', D).forEach(b => { const k = b.getAttribute('data-v'); const on = k === st.base, ok = baseAvailable(k); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !ok; b.title = ok ? '' : 'Not among the bases the bridge has on that PC'; });
    const im = $('#gd-thumb-mine', D); if (im && st.mineThumb && im.getAttribute('src') !== st.mineThumb) im.src = st.mineThumb;
    $('#gd-basenote', D).textContent = st.base === 'mine'
      ? (st.mode === 'art' ? 'Sent as its background only: no words, no logo, no pop.' : 'Sent as it is now: the logo, the words and the real pop' + (st.mode === 'pack' ? ', with its words passed on to be spelled exactly.' : '.'))
      : 'The client’s current ' + (st.base === 'bag' ? 'bag' : 'wrapper') + ' draft (a base already on your PC, with its words).';
    if (!$('#gd-style', D).value.trim() && !st.styleTouched) $('#gd-style', D).value = M.chips[0][1];
    renderDistance(); renderStyleCount(); renderChips(); renderSeed(); renderGo();
  }
  function renderDistance() {
    const d = st.distance, bi = bandOf(d), M = MODES[st.mode];
    const r = $('#gd-dist', D); if (Number(r.value) !== d) r.value = d;
    $('#gd-dist-v', D).textContent = d.toFixed(2);
    $$('#gd-bands button', D).forEach((b, i) => { b.classList.toggle('on', i === bi); b.setAttribute('aria-pressed', String(i === bi)); $('.t', b).textContent = M.bands[i][0]; b.title = M.bands[i][1]; });
    $('#gd-bandnote', D).textContent = M.bands[bi][1] + (st.mode === 'art' ? ' Never any words or a pop.' : ' The pop stays the real product.');
  }
  function renderStyleCount() { $('#gd-style-n', D).textContent = $('#gd-style', D).value.length + ' / 600'; }
  function renderChips() {
    const cur = $('#gd-style', D).value.trim();
    $('#gd-chips', D).innerHTML = MODES[st.mode].chips.map((c, i) => '<button type="button" class="gd-chip' + (c[1] === cur ? ' on' : '') + '" data-act="chip" data-i="' + i + '" title="' + esc(c[1]) + '">' + esc(c[0]) + '</button>').join('');
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
    return 'Your PC is short of memory for the AI models right now: they take about <b>' + Math.round(need) + ' GB</b> of Windows memory (RAM + page file), and ' + Math.round(free) + ' GB is free. Close apps to free about <b>' + more + ' GB</b> more (games, browser tabs, other AI tools) before you generate. Until then the bridge won’t load them, so your PC never runs out of memory.';
  }
  function renderGo() {
    const g = $('#gd-go', D);
    const h = st.conn.state === 'on' ? st.conn.health : null;
    const comfyDown = !!h && h.comfy === 'error';          // the bridge would answer 503: say why here instead
    g.disabled = !!st.run || st.conn.state !== 'on' || comfyDown;
    $('span', g).textContent = 'Generate' + (st.versions > 1 ? ' ' + st.versions + ' versions' : '');
    const why = $('#gd-gowhy', D);
    const html = comfyDown ? noteHTML('warn', 'Your GPU can’t take a job right now' + (h.message ? ': ' + esc(String(h.message).slice(0, 300).replace(/\.?$/, '.')) : '.') + ' This button comes back by itself when the bridge is ready.')
      : !st.run && memWarn(h) ? noteHTML('warn', memWarn(h)) : '';
    why.hidden = !html;
    if (why.innerHTML !== html) why.innerHTML = html;
  }
  function runLine(r) {
    const lead = r.of > 1 ? 'Version ' + r.n + ' of ' + r.of + ' · ' : '';
    if (r.phase === 'render') return 'Preparing your design…';
    if (r.phase === 'send') return lead + 'Sending it to your GPU…';
    if (r.phase === 'queued') return lead + 'Waiting for your GPU' + (r.position > 1 ? ' (number ' + r.position + ' in line)' : r.position === 1 ? ' (next in line)' : '');
    if (r.phase === 'running') return lead + 'Making it on your GPU';
    if (r.phase === 'fetch') return lead + 'Bringing it back…';
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
    hint.textContent = r.phase === 'queued' && h && h.comfy !== 'up' ? 'ComfyUI is starting on your PC; the first image takes longer.'
      : r.phase === 'running' && ms > 90000 ? 'Taking longer than usual (the first run loads the models). It keeps going.'
        : r.phase === 'running' ? 'Usually 15–40 s, at a capped pace so your PC stays usable.' : '';
  }
  function renderResults() {
    if (!D) return;
    $('#gd-res', D).hidden = !st.results.length;
    if (!st.results.length) { $('#gd-grid', D).innerHTML = ''; $('#gd-prev', D).innerHTML = ''; return; }
    if (!curResult()) st.sel = st.results[0].id;
    $('#gd-grid', D).innerHTML = st.results.map(r => {
      const M = MODES[r.mode];
      return '<button type="button" class="gd-th' + (r.id === st.sel ? ' on' : '') + '" data-act="sel" data-id="' + esc(r.id) + '" aria-pressed="' + (r.id === st.sel) + '" title="' + esc(M.label + ' · seed ' + r.seed) + '">' +
        '<img src="' + r.url + '" alt="' + esc(M.label + ', seed ' + r.seed) + '"><span class="gd-tag' + (M.print ? '' : ' idea') + '">' + M.tag + '</span></button>';
    }).join('');
    renderPreview();
  }
  function renderPreview() {
    if (!D) return;
    const r = curResult(); const box = $('#gd-prev', D);
    if (!r) { box.innerHTML = ''; return; }
    const M = MODES[r.mode]; const B = MODES[r.mode].bands[bandOf(r.distance)][0];
    const side = MP.side === 'back' ? 'back' : 'front';
    let fit = '';
    if (M.print) {
      const f = fitInfo(r);
      if (f) fit = '<div class="gd-pv-fit">' + (f.ppi >= 300 ? 'About ' + f.ppi + ' ppi on this panel: print-ready.' : f.ppi >= 250 ? 'About ' + f.ppi + ' ppi on this panel (300 is ideal).' : 'About ' + f.ppi + ' ppi on this panel: fine for proofs. For the final print, download it, upscale it 2× (for example in ComfyUI) and bring it back with Background → Replace background art.') +
        (f.crop ? ' A different shape from this panel, so its edges are cropped to fit (drag it to place it).' : '') + '</div>';
    }
    box.innerHTML = '<figure class="gd-pv"><div class="gd-pv-img"><img src="' + r.url + '" alt="' + esc(M.label + ' result, seed ' + r.seed) + '">' +
      (M.print ? '' : '<span class="gd-badge">Idea · not a print file</span>') + '</div>' +
      '<figcaption><div class="gd-pv-t">' + esc(M.label) + ' <span>from ' + esc(r.baseLabel || '') + '</span></div>' +
      '<div class="gd-pv-s">' + esc(B) + ' (distance ' + Number(r.distance).toFixed(2) + ') · seed ' + r.seed + ' · ' + r.w + ' × ' + r.h + ' px</div>' +
      '<div class="gd-pv-s gd-pv-style">“' + esc(r.style) + '”</div>' + fit + '</figcaption>' +
      '<div class="gd-pv-a">' + (M.print ? '<button type="button" class="btn primary sm" data-act="use">' + icon('background', 'ico-sm') + 'Use as ' + side + ' background</button>' : '') +
      '<button type="button" class="btn sm" data-act="download">' + icon('save', 'ico-sm') + 'Download PNG</button>' +
      '<button type="button" class="btn sm" data-act="reuse" title="Put its style, distance and seed back under Make, to try it nearer or further">' + icon('reset', 'ico-sm') + 'Reuse settings</button>' +
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
  // for scripted checks (QA)
  MP.gpu = {
    get state() { return { open: st.open, conn: st.conn.state, health: st.conn.health, err: st.conn.err, run: st.run ? { phase: st.run.phase, n: st.run.n, of: st.run.of, position: st.run.position } : null, runMsg: st.runMsg, results: st.results.map(r => ({ id: r.id, mode: r.mode, base: r.base, seed: r.seed, w: r.w, h: r.h, distance: r.distance })), sel: st.sel, mode: st.mode, base: st.base, distance: st.distance }; },
    open, close, connect, disconnect, generate, cancel: () => cancelRun(), frontWords: () => frontWords(MP.model),
  };
})();
