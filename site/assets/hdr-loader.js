/* Minimal Radiance .hdr (RGBE) loader for the candy library: no three.js examples imports,
 * so it works with the dynamically imported core build.
 *
 *   GloHDR.load(THREE, url, { rotate: 0.25 }) -> Promise<{ texture, width, height, sun }>
 *
 * texture : HalfFloat equirect DataTexture, ready for PMREMGenerator.fromEquirectangular()
 * rotate  : turns the panorama horizontally by this fraction of a full turn (0..1) at parse
 *           time, which is how you place the sun (three r160 has no environmentRotation)
 * sun     : { dir: [x,y,z] (unit, three.js world space, after rotation), color: [r,g,b] (0..1),
 *             intensity } estimated from the brightest region; use it to aim the key light
 *
 * Fetching the .hdr needs http(s) (or Chrome's --allow-file-access-from-files); on plain
 * file:// the promise rejects and callers should fall back to a procedural environment.
 */
(function () {
  'use strict';

  function parseRGBE(buffer) {
    var b = new Uint8Array(buffer), p = 0;
    function line() {
      var s = '';
      while (p < b.length) { var c = b[p++]; if (c === 10) break; s += String.fromCharCode(c); }
      return s;
    }
    var first = line();
    if (!/^#\?(RADIANCE|RGBE)/.test(first)) throw new Error('not a Radiance .hdr file');
    var l;
    while ((l = line()) !== '' && p < b.length) { /* header lines */ }
    var m = line().match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    if (!m) throw new Error('unsupported .hdr orientation');
    var H = +m[1], W = +m[2];
    var rgbe = new Uint8Array(W * H * 4), scan = new Uint8Array(W * 4);
    for (var y = 0; y < H; y++) {
      if (W < 8 || W > 0x7fff || b[p] !== 2 || b[p + 1] !== 2 || (b[p + 2] & 0x80)) {
        for (var i = 0; i < W * 4; i++) scan[i] = b[p++];          // flat (uncompressed) scanline
      } else {
        p += 4;                                                     // new-style RLE, channel by channel
        for (var c = 0; c < 4; c++) {
          var x = 0;
          while (x < W) {
            var n = b[p++];
            if (n > 128) { n -= 128; var v = b[p++]; while (n--) scan[(x++) * 4 + c] = v; }
            else { while (n--) scan[(x++) * 4 + c] = b[p++]; }
          }
        }
      }
      rgbe.set(scan, y * W * 4);
    }
    return { width: W, height: H, rgbe: rgbe };
  }

  function load(T, url, opts) {
    opts = opts || {};
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.arrayBuffer();
    }).then(function (buf) {
      var img = parseRGBE(buf), W = img.width, H = img.height, src = img.rgbe;
      var shift = Math.round(((opts.rotate || 0) % 1 + 1) % 1 * W);
      var half = new Uint16Array(W * H * 4), toHalf = T.DataUtils.toHalfFloat;
      var best = -1, bx = 0, by = 0;
      for (var y = 0; y < H; y++) {
        // DataTextures are uploaded bottom row first, so write the top scanline last.
        var dstRow = (H - 1 - y) * W;
        for (var x = 0; x < W; x++) {
          var s = (y * W + x) * 4, e = src[s + 3];
          var f = e ? Math.pow(2, e - 136) : 0;
          // clamp to the half-float range (65504); only the sun core can get near it
          var r = Math.min(src[s] * f, 65000), g = Math.min(src[s + 1] * f, 65000), bl = Math.min(src[s + 2] * f, 65000);
          var dx = (x + shift) % W, d = (dstRow + dx) * 4;
          half[d] = toHalf(r); half[d + 1] = toHalf(g); half[d + 2] = toHalf(bl); half[d + 3] = toHalf(1);
          var lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
          if (lum > best) { best = lum; bx = dx; by = y; }
        }
      }
      var tex = new T.DataTexture(half, W, H, T.RGBAFormat, T.HalfFloatType);
      tex.mapping = T.EquirectangularReflectionMapping;
      tex.colorSpace = T.LinearSRGBColorSpace;
      tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter;
      tex.generateMipmaps = false; tex.flipY = false;
      tex.needsUpdate = true;
      // Sun: average a small window around the brightest pixel (pixel space -> three equirect dir).
      var sr = 0, sg = 0, sb = 0, cnt = 0, R = 3;
      for (var yy = Math.max(0, by - R); yy <= Math.min(H - 1, by + R); yy++) {
        for (var xx = bx - R; xx <= bx + R; xx++) {
          var px = ((xx % W) + W) % W, sx = ((px - shift) % W + W) % W, k = (yy * W + sx) * 4, ee = src[k + 3];
          var ff = ee ? Math.pow(2, ee - 136) : 0;
          sr += src[k] * ff; sg += src[k + 1] * ff; sb += src[k + 2] * ff; cnt++;
        }
      }
      sr /= cnt; sg /= cnt; sb /= cnt;
      var u = (bx + 0.5) / W, v = 1 - (by + 0.5) / H;               // three: u = atan(z,x)/2PI + .5, v = asin(y)/PI + .5
      var theta = (u - 0.5) * Math.PI * 2, phi = (v - 0.5) * Math.PI;
      var dir = [Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)];
      var mx = Math.max(sr, sg, sb) || 1;
      return { texture: tex, width: W, height: H, sun: { dir: dir, color: [sr / mx, sg / mx, sb / mx], intensity: mx } };
    });
  }

  window.GloHDR = { load: load, parseRGBE: parseRGBE };
})();
