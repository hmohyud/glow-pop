/* Model Pops · packaging item specs (one source of truth for the 2D print layout AND the 3D mockups).
 *
 * INTERIM VALUES: measured in pixels on the client's own drafts, not taken from a printer's dieline. Replace
 * the numbers with the real dieline / measurements when they arrive. Everything else (layout guides, exports,
 * 3D geometry) follows from these numbers automatically.
 *
 *   wrapper  references/pink-single-pop-sachet.png  flat 413 × 807 px → W/H 0.512
 *            ribbed heat-seal bands 6.4 mm top and bottom (41 px of 807), 7 light ribs in each (≈ 0.9 mm pitch);
 *            sides are folds (no side seals); the filled body is 0.942 W wide from 20 to 100 mm (bulge 0.058)
 *            not visible on the front draft (assumption): the fin seal, 8 mm, its seam on the back centre line
 *   bag      references/pink-bag-100g.png         flat top zone 647 px wide; the bag itself 816 px tall (top edge
 *            70.8 px → bottom edge 886.6 px, above its contact shadow and the floor) → W/H 0.793
 *            top corners R 9.2 mm (circle fits 9.0–9.5 mm); zip track 21.8–30.5 mm below the top; a small round
 *            tear notch 16.0 mm below the top on both sides, ≈ 1.3 mm deep
 *            not measurable on a front view (assumptions): top seal 8 mm, side seals 6 mm, gusset 40 mm
 *
 * Absolute size (mm) is an interim assumption that keeps the measured proportions:
 *   wrapper width 65 mm (a ~30 mm ball pop drawn at real size on the draft gives ≈ 64.5 mm),
 *   bag width 150 mm. Heights follow from the ratios; the zip and the notch are mm from the top.
 */
(function () {
  var WRAPPER_W = 65, WRAPPER_RATIO = 413 / 807;
  var BAG_W = 150, BAG_RATIO = 647 / 816;

  window.MPItems = {
    wrapper: {
      label: 'Single-pop wrapper (flow wrap)',
      construction: 'flow-wrap',              // one film, folded round the pop; fin seal on the back; end seals
      interim: true,
      source: 'Proportions measured from the client draft (references/pink-single-pop-sachet.png)',
      flat: { w: WRAPPER_W, h: +(WRAPPER_W / WRAPPER_RATIO).toFixed(1) },   // finished pack, lying flat (mm)
      endSeal: { top: 6.4, bottom: 6.4, ribs: 7, style: 'horizontal-ribs' }, // heat-seal bands (mm)
      // The fin seal: the two film edges sealed together. Its seam (the fin's root) runs down the back centre line
      // (see web()), and the converter lays the sealed fin flat to one side. fold: which side, seen looking at the
      // back panel: 'left', 'right' or 'either' (not known yet: type keeps clear of both sides). clear: the
      // keep-clear margin beyond the fin for type on the back (2D guide). All mm.
      finSeal: { width: 8, position: 'back-centre', fold: 'either', clear: 2 },
      sides: 'folded',
      bulge: 0.058,                           // how much the sides pull in mid-height when filled (fraction of W)
      bleed: 3, safe: 3,                      // mm
      // print web for the converter: back-left half | front | back-right half, fin allowances at the edges.
      // Both allowances turn up at the back centre line (the seam), whichever way the fin is then laid.
      web: function () {
        var f = this.flat, s = this.finSeal.width;
        return { w: +(2 * f.w + 2 * s).toFixed(1), repeat: f.h, panels: [
          { name: 'back-left',  x: 0,             w: f.w / 2 + s },
          { name: 'front',      x: f.w / 2 + s,   w: f.w },
          { name: 'back-right', x: f.w * 1.5 + s, w: f.w / 2 + s } ] };
      },
    },
    bag: {
      label: 'Stand-up bag (100 g)',
      construction: 'stand-up-pouch',
      interim: true,
      source: 'Proportions measured from the client draft (references/pink-bag-100g.png)',
      flat: { w: BAG_W, h: +(BAG_W / BAG_RATIO).toFixed(1) },
      cornerRadius: 9.2,                                    // top corners (die cut)
      topSeal: 8,                                           // heat-seal band at the very top (mm; assumption)
      zip: { top: 21.8, bottom: 30.5 },                     // zip track, mm below the top edge
      tearNotch: { fromTop: 16.0, depth: 1.3, shape: 'round' },   // a half-round notch (radius = depth) on both sides
      sideSeal: 6,                                          // (assumption)
      gusset: { depth: 40, style: 'round-bottom' },         // folded bottom panel (total depth when open, mm; assumption)
      bleed: 3, safe: 5,
    },
    sleeve3: {
      label: '3-pack sleeve',
      construction: 'sleeve',
      interim: true,
      source: 'No client reference yet: a neutral sleeve sized for three wrappers side by side',
      flat: { w: 165, h: 110 }, depth: 30,
      bleed: 3, safe: 4,
    },
  };
})();
