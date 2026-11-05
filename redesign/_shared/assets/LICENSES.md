# 3D candy assets: sources and licenses

Every file in this folder is under **CC0 1.0 (public domain)**, so it is free for any use,
including commercial use, with no attribution required. Credits are listed here anyway.

| file | source | author | license |
|---|---|---|---|
| `hdri/spiaggia_di_mondello_1k.hdr` | [Poly Haven: Spiaggia di Mondello](https://polyhaven.com/a/spiaggia_di_mondello) | Andreas Mischok | CC0 ([polyhaven.com/license](https://polyhaven.com/license)) |
| `hdri/umhlanga_sunrise_1k.hdr` | [Poly Haven: Umhlanga Sunrise](https://polyhaven.com/a/umhlanga_sunrise) | Greg Zaal | CC0 |
| `tex/paper_color.webp`, `paper_normal.webp`, `paper_rough.webp` | [ambientCG: Paper 001](https://ambientcg.com/a/Paper001) | ambientCG (Lennart Demes) | CC0 ([ambientcg.com/license](https://docs.ambientcg.com/license/)) |
| `tex/sugar_normal.webp`, `sugar_rough.webp`, `sugar_height.webp` | [ambientCG: Candy 003](https://ambientcg.com/a/Candy003) (sugar coating maps only) | ambientCG | CC0 |
| `tex/smudge_streaks.webp` | [ambientCG: Surface Imperfections 003](https://ambientcg.com/a/SurfaceImperfections003) | ambientCG | CC0 |
| `tex/smudge_spots.webp`, `smudge_spots_normal.webp` | [ambientCG: Surface Imperfections 001](https://ambientcg.com/a/SurfaceImperfections001) | ambientCG | CC0 |

## Processing

- The HDRIs are the original 1K (1024×512) Radiance `.hdr` files. Load them with `hdr-loader.js`
  (`GloHDR.load`), which also estimates the sun direction.
- The textures were downscaled from the 1K JPG sets to WebP: paper at 512px, everything else at
  1024px.

## How they load

Assets load over http(s). Opened straight from disk (`file://`), browsers block them in WebGL,
so the 3D library falls back to its procedural environment and textures.
