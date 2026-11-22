# Model Pops · Label Studio

Makes the **exact** pack artwork: the print files you send, not a picture of them. Every word and the logo
are real vector type (never AI-drawn, so nothing warps), and the pop is the real product picture, placed
exactly. The items themselves (the single-pop wrapper and the 100 g bag) are replicas of the client's two
drafts, so a design made here fits the pack, and the same files are wrapped onto a 3D pack for mockups.

You can also add pictures of your own as layers (**Elements**, below): an upload, the pop photo again, or an AI
drawing. An AI drawing is marked as one wherever it shows, and it never takes the place of the pop.

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
1. **Start from** a preset: *Current wrapper*, *Current bag*, *Green wrapper*, *Green bag* or *3-pack sleeve*, each
   shown as a small picture of its own front panel (its full name and size are in the tooltip). **Compare** (above
   the design) shows the client's draft beside the design.
2. **Front | Back | Layout** (above the design): each item has a front and a back panel, each with its own layers.
   **Layout** shows the print layout: every panel as it prints, with the dieline on top (click a panel to edit it).
3. **Edit**: click anything on the design (or in **Layers**) to change its words, font, size, colour and position
   (the controls changed most are in view; the rest, such as the font, spacing and the X / Y numbers, are under **More**).
   Drag to move (it snaps to the centre line); arrow keys nudge 0.5 mm, Shift + arrow 5 mm; or type exact X / Y in mm.
   Ctrl+Z / Ctrl+Shift+Z undo / redo. (Arrow keys on the 3D view only turn the pack.) **Add element**, at the top of
   Layers, adds a picture of your own (see *Elements*).
4. **Open items** show above the design (on either panel): a blank to fill in, a missing picture, words that do not
   fit the heart, words on a seal, a picture too small for print. Quieter notes sit behind one chip in the status bar below
   the design ("4 to check"; it turns to the warning colour and says "to fix" while an open item above is unsolved). The export dialog repeats them all under **Before you send**.
5. **Export files** (top right).

**The "?" buttons.** The explanations wait behind a small **?** at the end of the title or label they belong to, so
the panels show only the controls and what needs doing. Hover over a **?** (or Tab to it) to read it; click or tap it
to keep it open until the next click, Escape or a click elsewhere. Only one is open at a time, and it floats over the
page, so nothing moves. Warnings and errors stay in view, in one short sentence, with any longer explanation behind
their own **?**. In the AI panel the connect steps are under **How to connect**. (In the code: `helpHTML(html, topic)`
in studio.js, also on `MPStudio.helpHTML` for gpu.js, with one delegated handler for the whole page.)

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

**Format** shows these numbers under *Size and specs* (click the row to open it; it also shows the trim, the bleed
and the print layout size). Any of
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

### Save a kit
The **Kit** card at the top of **Export files** saves one folder named after the design (for example
`current-wrapper_kit_2026-11-22`, with `_DRAFT` while the design has open items), holding, side by side:

| File | What it is |
|---|---|
| `preview-3d.png` | The 3D pack in the hero view, as the studio shows it. |
| `pieces/` | Every visible layer on its own: a see-through PNG at 300 ppi of its printed size, cropped to what it paints (about 1 mm to spare). Named in stacking order, front then back: `front-01-background.png`, `front-02-the-pop.png`, … An AI drawing ends in `-ai`. |
| `pieces-sheet.png` | All the pieces on one see-through picture, in rows, each at its true relative size (300 ppi), front first, then back. No labels: it is meant to be used. |
| `pieces-sheet.svg` | The same sheet as vector: each piece is its own group, named like its file (id and title), so it opens as separate objects. Words and the logo stay vector type, fonts embedded. |
| `design.json` | The design file: open it again with **Open**. |
| `README.txt` | What each file is, the design's name and size, which pieces are AI drawings, and any open DRAFT notes. |

Chrome and Edge on a computer ask for a folder the first time (once per visit) and write the kit there as a new
sub-folder. Everywhere else (phones, Firefox, Safari), or if you cancel the folder choice, the kit comes as one ZIP
of that folder. The pieces are drawn one after another by the same renderer as every other file, from a copy of the
design, so edits made while it builds wait for the next kit.

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
weight's lowercase "o" with the US minimum for the panel size (21 CFR 101.105) and notes it under the status bar's notes chip: a
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

The Pop layer is always a photo of the real product. An AI-drawn lollipop can be added as an element (below), but
it is a layer of its own, marked as an AI drawing, and it is never offered here under *Picture of the real pop*.

## Elements (pictures of your own)
An element is a picture added as a layer of its own, on the front or the back panel: a second pop, a heart, a
slice of lemon. The built-in layers stay as they are, and the Pop layer is still the real product photo.
- **Add.** **Layers → Add element**: *The real pop photo* (the bundled photo again, as an element), *Upload a
  picture…* (PNG, JPG or WebP) or *Make with AI…* (opens **AI on your GPU** on *New element*, below). The new
  element lands in the middle of the panel being edited, about 40 % of its width, selected.
- **Move and size.** Drag it; the arrow keys nudge it. On the design, the small square at its corner resizes it and
  the round knob above it turns it (Shift: steps of 15°). Its panel has the name, the width in mm (the height
  follows: a picture is never stretched), the rotation, the position and Arrange.
- **Duplicate** (or Ctrl+D) makes a copy 4 mm to the right and down, showing the same picture. **Delete** (or the
  Delete or Backspace key) takes the element out; Ctrl+Z brings it back. Built-in layers cannot be deleted, only
  hidden.
- **Replace picture…** puts another picture in the same place at the same size. **Remove plain background** (shown
  for a picture that still has a solid backdrop) cuts a one-colour backdrop out from the edges inwards; an enclosed
  area, such as the hole of a ring, keeps the colour.
- **Rework with AI…** (or simply selecting the element with **AI on your GPU** open) makes that element what the AI
  panel edits: say what should change and Generate; the result replaces its picture in place (same centre, same
  longer side), and **Back to before** puts the old one back.
- **AI drawings are marked.** An element drawn or reworked by AI has an **AI** tag in Layers and in its own panel,
  with the words it was made from; the AI panel labels its results *AI drawing*; and the checks before export say
  how many there are (*1 AI-drawn element: a drawing, not a product photo.*). An upload, or the pop photo added as
  an element, has no tag.
- Elements are part of the design: they are in the PDF, SVG and PNG, the print layout and the 3D pack, and they are
  saved with the design and remembered in this browser. An element printed below 200 ppi gets a warning. One that
  has lost its picture shows as a dashed outline in the editor only and is left out of the files.

## AI on your GPU (optional)

A link that ends in `#gpu=<bridge address>` opens the studio with the AI panel already connected to that
address (the part after `#` stays in the browser). The desktop launcher on the GPU PC opens the studio that way,
and its sharing version prints such a link for another device.
**AI on your GPU** (top bar) edits what you select in the design (the background, a picture element, the pop) with
ComfyUI on **your own PC**, from the local studio or the online one, and makes logo or pack ideas. The studio never needs a GPU itself; without a connection the
panel only explains itself and everything else works as before. The GPU side is the **Model Pops GPU bridge**: the
`gpu-bridge` folder next to `label-studio` in the model-pops-packaging folder on the GPU PC (it is not part of the
online site); its `README.md` has the setup and the settings. It runs ComfyUI capped, so the PC stays usable: one
picture at a time, the GPU working about 60 % of the time with 5 GB of its memory kept free, at low priority, the
models freed when idle, and ComfyUI stopped with the bridge. It also guards memory: the models take about 34 GB of
Windows memory (RAM + page file), so it loads them only when that fits with room to spare, and stops ComfyUI at
once if memory still gets close to full. When memory is short, the panel says how much to free before you generate.

**Connect**
1. On the PC with the GPU, start the bridge (`gpu-bridge\start-gpu-bridge.cmd`). It prints its address.
2. Pick the address:
   - **The same PC:** `http://127.0.0.1:8189`. From the online (https) studio, Chrome first asks for permission to
     reach this device (its local network access prompt): choose **Allow** (if you blocked it, allow it again in
     the site settings, left of the address bar). Until then Chrome blocks the call, and the panel says so.
   - **Another device** (another computer, a phone, a colleague): start a tunnel on the GPU PC, next to the bridge,
     and paste the **https** address it prints on that device; the device needs nothing installed. Neither tunnel
     tool is installed here, and neither has been tried with the bridge yet (try one picture first); either should
     work: `cloudflared tunnel --url http://127.0.0.1:8189` (no account; the first choice; gives
     `https://….trycloudflare.com`, a new random one each start: paste the new one), or `ngrok http 127.0.0.1:8189`
     (free account; gives `https://….ngrok-free.app`, the same one each time; the studio sends ngrok's
     skip-the-warning header).
3. In the panel, paste the address, then **Connect**. Once connected the panel shows only the status light; the
   address, the bridge version, the GPU line, **Change** and **Disconnect** are under the closed row *Connection*. No key is needed by default. If the bridge asks for one (its
   `requireKey` is on), the panel shows a **Key** field with the line *This bridge asks for a key: it is shown in
   the bridge window on the GPU PC*. **Remember on this browser** keeps the address (and the key, if one was used)
   in this browser only (**Forget the saved address** removes them). In a studio opened from disk (`index.html`
   double-clicked) it reads **Remember until this tab closes**: every file opened from disk shares one browser
   storage, so nothing is kept there past the tab. A key only ever travels in a request header, never in a link.

Without a key, anyone who has the tunnel address can use the AI while the tunnel runs: pictures only (no files and
no commands), within the GPU cap and the memory gate, with at most 3 jobs waiting. So use the cloudflared quick
tunnel (its random address changes at every start, so it works like a one-time password; ngrok's free address stays
the same between sessions), stop it when you are done, and watch the bridge window: it lists each job and where it
came from. To turn the key back on: set `"requireKey": true` in `gpu-bridge\config.json` and restart the bridge; the
key then shows in the bridge window. To try all of this without the GPU, start the bridge with
`start-gpu-bridge.cmd --fake` (placeholder pictures: an element comes back as a plain candy shape, pink when new
and orange when reworked; the bridge's README has the steps, with a tunnel too).

The panel says what went wrong in plain words: a bridge or a tunnel that is not running on the GPU PC (or a PC that
is asleep), a key the bridge asks for, an http address on the https page (it needs the tunnel's https address), a
page the bridge does not allow (its `allowedOrigins`), or a PC short of memory for the models. While the bridge's
ComfyUI is stopped, **Generate** is off and the reason is shown under it.

**Make: it edits what is selected.** The top of *Make* names what is being edited (with a small picture of it),
and it follows your clicks on the design and in Layers while the panel is open:
- **Nothing, or the Background** (*Background · front*, or back: the panel being edited): new background art made
  from that panel's current background. Only the background is sent (no words, logo, pop or added elements), so
  nothing of the product can end up in the art. *Describe the background* (or pick a suggestion) and choose **How
  much to change**: *Refine*, *Variation* (the default), *New style* or *All new* (the bands of ComfyUI's Design
  brief).
- **A picture element**: *What should change*. The studio sends the element itself, centred on a 1024 × 1024 square
  of one flat colour, and the result replaces its picture.
- **The pop** (*The pop*): the Pop layer's photo is sent as an element rework. The result is an **AI drawing**
  element at the pop's centre and height, and the Pop layer is hidden (never deleted, its photo never changed) while
  the drawing is on the design. The box is *Angle or style* (examples: tilted a little to the left, seen slightly
  from above, a flat illustration, a watercolour): the job is sent with `subject: "pop"`, and the bridge (1.2.0 or
  later) keeps the same lollipop, so only the angle, the tilt, the light or the drawing style can change, never its
  shape, colour, collar or stick. With an older bridge, Generate is off for the pop (*Needs a newer bridge.*).
- **New element** (the button on the right of that line, or *Make with AI…*): *Describe the element*, or pick an
  example (a strawberry lollipop, a heart, a sparkle, a seashell, a palm leaf, a slice of lemon).
- **The logo, the heart badge or a line of words**: Generate is off (*AI can't redraw words: they must print
  exactly.*); for the logo, a link opens *Logo ideas*.

Elements are drawn whole on one flat colour (green, or blue when the words or the element are green; magenta only
when both green and blue) and the studio cuts that colour out when the picture comes back; if it cannot, the raw
picture is used and the reason is behind a "?". Pictures need bridge 1.1.0 or later. **More options** (folded):
**Seed** (a new one each time, or *Fixed*) and **Versions** (1–4). **Generate** shows each step (waiting in line,
making it, the time) and **Cancel** stops waiting; the bridge has no stop button, so the GPU still finishes the
picture it was given, it is just not used.

**The result goes straight onto the design**, so the stage and the 3D pack show it at once: a background becomes the
panel's background image (cover fit; the logo, every word and the real pop stay on top as live layers), an element
gets the new picture, a new element lands in the middle of the panel, selected. Right under what is being edited,
*On the design* shows **Before** and each version made for it (several versions, or Generate again): a click shows
that one on the design, and **Back to before** returns to how it was. All of it is **one** undo step: switching
never piles up history, and Ctrl+Z returns to the design before the first result. Selecting something else, or
closing the panel, keeps what is showing. A background result is about 1 megapixel: about 260 ppi on the wrapper
(fine), about 145 ppi on the bag; for the final print, download it, upscale it 2× (for example in ComfyUI) and bring
it back with Background → **Replace background art**.

**Recent** keeps the results for a day (the last 24) as a strip: a click puts an older one on the design again (a
background on the panel being edited, a rework on its element if it is still there); otherwise it offers **Add as a
new element**. **Download PNG** saves the picture; its details (seed, size, print resolution) are behind the "?".

**Ideas (not print files)**, folded at the bottom: *Logo ideas* and *Pack ideas*, to choose a direction. They start
from *My current design* (the front as it is, with its exact words passed on for pack ideas and the real pop as the
product lock) or the client's **wrapper** or **bag** draft, with **How far from it** (0–1, four bands) and a style.
Each idea is a card with **Download PNG** and **Reuse settings**; ideas are labelled so everywhere and are never
placed in the design.

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
- The PDF is RGB (not PDF/X). The logo's *Gold foil* fill is a flat bright gold in the print files (no
  drawn shading or outline); the 3D pack shows it as a real foil material with its own shine. For real
  hot-foil, tell the printer the logo is a foil layer. Ask the printer which PDF standard they accept.
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
