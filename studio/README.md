# Model Pops · Label Studio

Makes the **exact** pack artwork: the print files you send, not a picture of them. Every word and the logo
are real vector type (never AI-drawn, so nothing warps), and the pop is the real product picture, placed
exactly. The items themselves (the single-pop wrapper and the 100 g bag) are replicas of the client's two
drafts, so a design made here fits the pack, and the same files are wrapped onto a 3D pack for mockups.

## Open it
- **On this PC:** double-click `index.html` (Chrome). It works straight from the folder; no install, no server.
  (Or serve the folder, for example `python -m http.server 8000` in it, then open http://localhost:8000.)
- **Online:** https://hmohyud.github.io/glow-pop/studio/ is the same studio. Every path in it is relative, so the
  folder works as it is on any https host.

It needs the internet for the fonts (Google Fonts), the 3D library (three.js) and, only when you load a printer's
PDF dieline, pdf.js. It needs **no GPU**: the AI panel below is optional. Your last design is remembered in this
browser (uploaded pictures included); use **Save design** to keep a file. Each browser, and the online and local
copies, keep their own.

## The flow
1. **Start from** a preset: *Current wrapper*, *Current bag*, *Green wrapper*, *Green bag* or *3-pack sleeve*.
   The small pictures next to them are the client's drafts; click one (or **Compare**) to see it beside the design.
2. **Front | Back | Layout** (above the design): each item has a front and a back panel, each with its own layers.
   **Layout** shows the print layout: every panel as it prints, with the dieline on top (click a panel to edit it).
3. **Edit**: click anything on the design (or in **Layers**) to change its words, font, size, colour and position.
   Drag to move (it snaps to the centre line); arrow keys nudge 0.5 mm, Shift + arrow 5 mm; or type exact X / Y in mm.
   Ctrl+Z / Ctrl+Shift+Z undo / redo. (Arrow keys on the 3D view only turn the pack.)
4. **Open items** show above the design (on either panel): a blank to fill in, a missing picture, words that do not
   fit the heart, words on a seal, a picture too small for print. Quieter notes sit in the status bar below the
   design. The export dialog repeats them all under **Before you send**.
5. **Export files** (top right).

## The items: one spec for everything (`items.js`)
`items.js` (`window.MPItems`) is the single source of truth for each item: flat size, seals, fin seal, zip, tear
notches, corner radius, gusset, bleed and safe. The 2D guides, the print layout, its dieline and the 3D pack are all
built from it. **The proportions are measured in pixels on the client's drafts; the absolute size is an
assumption** (wrapper 65 mm wide, bag 150 mm wide). Every number is *from your drafts: replace with the printer's
dieline* when it arrives (edit `items.js`, or the design's own numbers in **Format**). The presets follow `items.js`:
on new numbers every element keeps its place relative to the panel.

| Item | Flat (trim) | Measured on the draft | Assumed (not visible on a front view) |
|---|---|---|---|
| Single-pop wrapper (flow wrap) | 65 × 127 mm (W/H 413/807) | ribbed end seals 6.4 mm top and bottom, 7 ribs each, straight cut edges, printed in the panel colours; folded sides (no side seals); filled body 0.942 W wide (bulge 0.058, 3D) | the fin seal: 8 mm, its seam on the back centre line, laid to one side (which side: ask the converter) |
| Stand-up bag (100 g) | 150 × 189.2 mm (W/H 647/816: the bag itself, above its shadow and the floor) | top corners R 9.2 mm; zip track 21.8–30.5 mm below the top; small round tear notches (R 1.3) 16.0 mm below the top on both sides | top seal 8 mm, side seals 6 mm, round-bottom gusset 40 mm |
| 3-pack sleeve | 165 × 110 mm, depth 30 | no client reference yet | |

**Format** shows these numbers under *Item specs: from your drafts (interim)* (click the line to open it). Any of
them can be edited for this design; an edited number is tinted, and **Reset to draft values** puts them all back.
Edits flow to the guides, the exports and the 3D pack at once (the layout moves with the size unless you untick
*Move the layout with the size*). A size change and its way back cancel exactly: Reset (or typing the draft value
back) gives the design back as it was, to 0.0001 mm. Bleed 3 mm; safe 3 mm (wrapper) / 5 mm (bag).

**The fin seal** (wrapper): the two film edges are sealed together at the seam, which runs down the middle of the
back (the print web turns both fin allowances up there), and the sealed fin is then laid flat to one side.
*Fin seal is laid* in Format says which side: *Either side (not known yet)* keeps type out of everything the fin can
cover on both sides (22.5–42.5 mm across the back: 8 mm fin + 2 mm clear each way); *To the left* / *To the right*
(seen from the back, once the converter confirms it) narrows that to one side. The 3D pack lays the fin the same
way (drawn to the left while it is not known).

The **Seals** toggle shows the item on the design: the ribbed end seals and the folds of the wrapper; on its back
the fin's seam (dash-dot), where the laid fin can lie (tinted) and the keep-clear band (hatched); the bag's top
seal, zip, tear notches, side seals, die-cut corners and round-bottom gusset seals. **Safe** is seal-aware: never
closer than the seal + 1 mm. Words on a seal, the zip or a tear notch are flagged (the sealing jaws and the zip
break type up there). Guides are never exported.

## The two drafts, replicated
*Current wrapper* and *Current bag* rebuild the client's drafts element by element. The drafts are front views of a
**filled** pack, so each was laid onto the flat panel through the 3D pack's own geometry (`MPMockup.frontMap`: where
each point of the flat print shows on the filled pack), and every element was then fitted to it
(`.studio-qa/fix2/build_flat.py`, `fit.py`): logo lines, sparkles, the heart badge and its words, the pop (the
whole real picture matched at its natural size, never stretched), the wave, flavour, identity and net weight; the
bag's logo, headline block, flavour, bottom lines and every one of its 35 hearts. Fitted to within 0.4 % of the
panel (about one pixel of the draft); the art wrapped onto the 3D pack gives the draft back: in a straight-on 3D
render the words are within ±1 % of the draft's widths, the outlines within 0.3 %, the bag's aspect 0.792
(draft 0.793), the wrapper's 0.512 (draft 0.512).
- The fonts are the **closest** free fonts (the drafts' own fonts are not known): Playfair Display (wrapper logo),
  Bodoni Moda italic (bag logo), Montserrat (wrapper words), Poppins (bag words and the heart badge). Single letters
  can differ from the draft by up to about 1 mm; for an exact match, upload the client's vector logo (Logo → Upload).
- The sparkles on the wrapper are the draft's fuller, cream-gold stars (Logo → Star: *Plump*).
- The draft's lolly stick is drawn a little longer and wider than the real pop picture's; the pop is the real
  picture at the draft's size, so its stick ends about 1.4 mm higher than on the draft.

**Compare** shows the draft beside the design, or **Overlay** / **Difference**: the draft laid onto the flat panel
the same way, exactly over the design.

## The back panel
The back is the client's own new back label, word for word, rebuilt as real vector type: *MODEL POPS / Your
supermodel routine*, a **Supplement Facts** table (a real FDA-style table in Arimo: title, servings, heavy and thin
rules, amounts and % Daily Value in their own columns, the † footnote), **Ingredients**, the claims (*GMO FREE /
Sugar Free · Gluten Free*) and the **Warning** box. Every cell and line is an editable field; nothing is added.
- The title and the column headings (*Amount Per Serving / % Daily Value*) are the standard FDA panel headings
  (the photo's box has blank space there). The † marks follow the photo, which shows a mark on Total Sugars, Sugar
  Alcohol, the collagen peptides and hyaluronic acid. The headings and the footnote are set at the row size.
- The label also prints **Zinc Free**, which looks like a proof error: it is an option under Claims, **off**. Switched
  on, it goes where the photo has it: *Sugar Free · Zinc Free* on one line, *Gluten Free* on the next.
- On the wrapper the fin seal runs down the middle of the back, the full height of the pack. *Keep clear of the fin
  seal* (on by default) lays the facts names left of the fin band and the numbers right of it, and sets the
  ingredients, claims and warning in a column either side of it. The brand line is stacked in the column left of
  it (MODEL POPS over the tagline, as on the client's label; centred, it would run over the fin). A claim line that
  needs to wrap in its column breaks after a "·", so each claim stays whole. Off: one column like the client's label.
  Whenever any words run where the fin can lie, a quiet note says which.
- The **bag**'s back has the same layout with **Servings Per Container blank** (the per-bag count is not confirmed),
  so its back panel and the print layout are named **DRAFT** until it is filled in. The green presets' backs keep
  the layout with blanks for every fact (the green pop's facts are not supplied), and the client's choking-hazard
  and keep-out-of-reach lines (confirm with the client that they apply to the green pop).
- Type sizes follow the client's label, set to fit each pack (the smallest on the wrapper: 4.4 pt). The studio does
  not check the FDA minimum type sizes for Supplement Facts (21 CFR 101.36): a note says so; check with your label
  advisor. Another note lists what the client's label does not carry (a Serving Size line, the manufacturer's or
  distributor's name and place of business, a barcode): ask the client; the studio never adds words.

## The files to send
Open **Export files**. *Print layout (all panels)* is the production file; the panel files are below it (choose
**Front** or **Back**).

| File | What it is |
|---|---|
| **Print layout (all panels) · PDF / SVG** | Every panel on one sheet, as the converter prints it, **artwork only** (the file to print). **Wrapper**: the flow-wrap web, left to right ½ back · front · ½ back, with the fin-seal allowances at both web edges (width `MPItems.wrapper.web()`: 2 × 65 + 2 × 8 = 146 mm; repeat = the flat height, 127 mm). **Bag**: front and back side by side and the bottom gusset panel below (306 × 235.2 mm; the gusset's halves in the front's and the back's colour). Page = layout + bleed. Tick *Add the dieline* for the dieline: in the **SVG** it is a separate layer, the group `<g id="dieline">` (Inkscape / Illustrator layer "Dieline (non-printing)", with sub-groups for cut, folds, seals, zip, notches, bleed and the title block); in the **PDF** it is a separate **page 2** (the artwork again with the dieline on top, for checking). Page 1 of the PDF is always the artwork alone. |
| **Print PDF** (one panel) | Vector, real text, fonts embedded; the panel's trim centred on a trim + bleed page (crop marks optional). |
| **SVG** (one panel) | Self-contained vector file: fonts and pictures embedded (trim or with bleed). |
| **PNG · 300 dpi** (one panel) | Exact pixels of the same file, tagged 300 dpi (the wrapper's 65 mm = 768 px). Trim or with bleed. |
| **3D render** | A high-resolution PNG of the 3D pack as it is posed (optionally transparent). |
| **Design file (.json)** | Both panels, the item numbers and the pictures. Re-open with **Open**. |

PDFs come from the browser's print window: choose **Destination: Save as PDF**, **Margins: None**,
**Scale: Default (100%)**, and tick **Background graphics** under More settings. Ctrl+P prints the last choice.

The dieline: cut / trim solid magenta; folds dashed (the wrapper's side folds and fin roots, the gusset's centre
fold); seals as a flat translucent cyan tint, plain vector (end seals and fin allowances; top seal, side seals and
round-bottom corners); the zip track dash-dot; the tear notches drawn on the cut edge (half-round); bleed dotted; and
a title block with the item, the sizes, the fin, the date and *INTERIM: proportions from client drafts*. The title
block also says what is layout spacing only (the bag's panels sit 6 mm apart: bleed + bleed, not a converter
dimension) and that the wrapping machine's eye mark is placed by the converter. On the wrapper web the title block
runs up the left fin allowance (a strip with room for it); being part of the dieline, it never prints. On the web
the two fin allowances carry the back's art on past its centre line, so the laid fin shows the same art as the
strip it lies on, whichever way it is laid.

Names: `format_design-name_date[_DRAFT]_side_suffix`, for example
`single-wrapper_current-wrapper_2026-11-21_front_print.pdf`, `..._back_300dpi.png`, `..._layout_print-layout.pdf`
(artwork only) and `..._layout_print-layout-with-dieline.pdf` / `.svg`. A panel file says **DRAFT** while that panel
has an open item that makes it unfinished (a blank `___`, a missing pop photo or a stand-in); the print layout and
the design file say DRAFT while any panel does.

## The printer's dieline
**Format → Load printer's dieline (SVG or PDF)** lays the printer's file over the design (or over the print layout
in **Layout**), semi-transparent, scaled to millimetres from the file's own size, its page centred on the trim. Line
it up with **Offset X / Y** (exact mm: where the file's page centre sits from the trim's centre, right / down) or
the nudge buttons (0.5 mm, Shift 0.1 mm); scale it, change its opacity and line colour (cyan, black, green or as in
the file). A dieline drawn in the middle of its page lands on the trim straight away (QA: a 7 × 9 in PDF with the
bag's dieline in its middle lines up to 0.02 mm); an off-centre one takes two numbers (QA: an A4 page with the trim
at 20, 20 mm lines up with X 10, Y 33.9). A PDF is read with pdf.js 3.11.174 (loaded from cdnjs when needed; page 1
of a multi-page file). The overlay is for checking only: it is never part of any export. Switch **Seals** off to see
the printer's lines on their own. An SVG without real units is read at 96 px per inch (72 for an Illustrator file);
check its size in the note and correct with Scale.

## Words and claims
Every word on the pack is a field you control; nothing is added for you. Words the client has not supplied are
left as visible blanks (`___`) to fill in: the green presets' flavour, net weight and back-label facts, the bag's
servings per container, and the 3-pack's count and net weight. **Net weight** is automatic from grams
(`Net Wt. 0.35 oz (10 g)`, oz = g ÷ 28.3495), or type your own. The studio also compares the height of the net
weight's lowercase "o" with the US minimum for the panel size (21 CFR 101.105) and notes it in the status bar: a
quiet check, not a rule the studio enforces.

## The pop
Pick the picture that matches the real pop (pink with a gold stick, or the old white stick), or **Upload real
photo**. The pop is never recoloured or stretched: only its size and position change, and the studio shows its
print resolution (300 ppi or more is ideal; 250–299 gets a note; below 250 a warning). The green presets leave the
pop's place empty (a dashed outline in the editor only, nothing in the files) until you upload a photo of the real
green pop.

A photo that still has its backdrop is flagged (it would print as a box). If the backdrop is one plain colour,
**Remove plain background** clears it, including the light fringe a JPEG leaves along the edge, without touching
the pop: pale parts of the product (a white stick on a white sweep) are kept whole. A floor shadow in the photo
stays; for that, upload a cut-out PNG. Undo brings the original back.

## AI on your GPU (optional)
**AI on your GPU** (top bar) makes background art and logo or pack ideas with ComfyUI on **your own PC**, from the
local studio or the online one. The studio never needs a GPU itself; without a connection the panel only explains
itself and everything else works as before. The GPU side is the **Model Pops GPU bridge**: the `gpu-bridge` folder
next to `label-studio` in the model-pops-packaging folder on the GPU PC (it is not part of the online site); its
`README.md` has the setup, the key and the settings. It runs ComfyUI capped, so the PC stays usable: one picture at
a time, the GPU working about 60 % of the time with 5 GB of its memory kept free, at low priority, the models freed
when idle, and ComfyUI stopped with the bridge. It also guards memory: the models take about 30 GB of Windows
memory (RAM + page file), so it loads them only when that fits with room to spare, and stops ComfyUI at once if
memory still gets close to full. When memory is short, the panel says how much to free before you generate.

**Connect**
1. On the PC with the GPU, start the bridge (`gpu-bridge\start-gpu-bridge.cmd`). It prints its address and a key.
2. Pick the address:
   - **The same PC:** `http://127.0.0.1:8189`. From the online (https) studio, Chrome first asks for permission to
     reach this device (its local network access prompt): choose **Allow** (if you blocked it, allow it again in
     the site settings, left of the address bar). Until then Chrome blocks the call, and the panel says so.
   - **Anywhere else** (another computer, a phone, a colleague): start a tunnel on the GPU PC and use the **https**
     address it prints. Neither tunnel tool is installed here, and neither has been tried with the bridge yet (try
     one picture first); either should work:
     `cloudflared tunnel --url http://127.0.0.1:8189` (no account; gives `https://….trycloudflare.com`, a new one
     each start: paste the new one), or `ngrok http 127.0.0.1:8189` (free account; gives `https://….ngrok-free.app`,
     the same one each time; the studio sends ngrok's skip-the-warning header).
3. In the panel, paste the address and the key, then **Connect**. **Remember on this browser** keeps both in this
   browser only (**Forget** removes them). In a studio opened from disk (`index.html` double-clicked) it reads
   **Remember until this tab closes**: every file opened from disk shares one browser storage, so the key is never
   kept there. The key only ever travels in a request header, never in a link.

Anyone with the tunnel address **and** the key can use your GPU (within the cap) while the tunnel runs, with any
picture and style text they like: share neither, and stop the tunnel when you are done. After sharing one, make a
new key: `start-gpu-bridge.cmd --new-key` (the old key stops working at once). The panel says what went wrong in
plain words: a wrong key, a bridge that is not running, a tunnel that is down, an http address on the https page
(it needs the tunnel's https address), a page the bridge does not allow (its `allowedOrigins`), or a PC short of
memory for the models. While the bridge's ComfyUI is stopped, **Generate** is off and the reason is shown under it.

**Make**
- **What.** *Background art* (the default) is for print: no words, no logo, no pop. *Logo ideas* and *Pack ideas* are
  **ideas, not print files**: they are labelled so everywhere and can never be placed in the design.
- **Start from.** *My current design* (the front panel, drawn by the studio's own renderer at about 1 megapixel with
  its bleed): for art only its **background** is sent (no words, logo or pop, so nothing of the product can end up
  in the art); for ideas the front as it is, with its exact words passed on for pack ideas and the real pop as the
  product lock. Or the client's current **wrapper** or **bag** draft (bases already on the GPU PC).
- **How far from it** (0–1) has four bands, the same as in ComfyUI's Design brief: from *Refine* (0–0.25) through a
  variation (0.25–0.5) and a new style (0.5–0.75) to *All new* (0.75–1). The panel names each band for the chosen
  kind and says what it does; a click on a band sets the slider to its middle.
- **Style**: describe the look, or pick a suggestion. **Seed**: a new idea each time, or *Fixed* (then change only the
  distance to see the same idea nearer or further). **Versions**: 1–4, made one after another.
- **Generate** shows each step (waiting in line, making it, the time) and **Cancel** stops waiting. The bridge has no
  stop button, so the GPU still finishes the picture it was given; it is just not added.

**Results** stay in this browser for a day (the last 24). For background art, **Use as front background** (or back:
the panel being edited) sets it as that panel's background image, cover fit, exactly like Background → Image; the
logo, every word and the real pop stay on top as live layers, and Ctrl+Z undoes it. **Download PNG** saves the
picture; **Reuse settings** puts its style, distance and seed back under Make. A result is about 1 megapixel:
about 260 ppi on the wrapper (fine), but about 145 ppi on the bag. The panel has no upscale step: for the final
print, download it, upscale it 2× (for example with an upscale model in ComfyUI), and bring it back with
Background → **Replace background art**.

## Using ComfyUI art (by hand)
Background → **Image** → import the AI art **without words**. It fills the panel and bleed (cover fit; drag it
to reposition, zoom with the slider). The logo and every word stay live type on top, so they print sharp.
The studio shows the art's print resolution; a 1024 px image on the bag is only about 165 ppi, so upscale it first.

## Good to know
- Chrome makes PDF pages in fine steps, so the studio picks the nearest clean page size: a little larger than
  the trim (or layout) + 3 mm bleed, never smaller (for example 71.63 × 133.01 mm for a wrapper panel, 152.06 ×
  133.01 mm for the wrapper web); the artwork is centred and the extra is bleed. Chrome writes no TrimBox /
  BleedBox, so tell the printer the trim size (the print layout's title block carries it). The SVG pages are exact.
- In the PDF, variable fonts (Playfair Display, Bodoni Moda, Montserrat, Arimo) are embedded as vector glyphs
  (Type 3) and static ones (Poppins) as TrueType. All of it is real, selectable text. Some prepress checks warn on
  Type 3 fonts: if your printer's does, send the SVG or ask them to outline the type. The logos have fine hairlines:
  check the printer's minimum line for white type on a colour.
- The printed rib texture on the wrapper's end seals gives the draft's look; the sealing jaws emboss the real
  ribs. Ask the printer whether to keep it (Background → *Rib texture on the end seals*).
- The PDF is RGB (not PDF/X). Gold foil is shown as a gradient: for real hot-foil, tell the printer the logo is a
  foil layer. Ask the printer which PDF standard they accept.
- The SVG embeds web fonts; browsers render it exactly, but desktop apps such as Illustrator may substitute
  fonts when opening an SVG. Send the PDF to printers.
- Autosave keeps the design in this browser's storage and uploaded pictures in its IndexedDB. If a picture
  cannot be brought back, the studio says so and leaves its place empty; it never swaps in another picture.
  Designs saved by the earlier version (one front panel on the old 80 × 120 / 150 × 190 placeholders) open
  moved onto the new item specs, and so does any design saved on other item numbers (for example a bag saved at
  150 × 193.3 mm opens moved onto 150 × 189.2 mm; a note says so; re-apply a preset for the replica as it is now).

## Files
`index.html`, `studio.css`, `studio.js` (the studio), `gpu.js` (the optional AI on your GPU panel), `items.js` (the item specs), `mockup3d.js` (the 3D pack, and
`MPMockup.frontMap`, the flat-to-filled-pack geometry), `assets/assets-data.js` (the pop pictures, embedded so exports
work from a double-clicked file), `assets/pops/` (the pop pictures, originals and cut-outs), `assets/ref/` (the
client's drafts and back-label photo for Compare; `*-flat.png` are the drafts laid onto the flat panel through the
3D pack's geometry, for the overlay).
