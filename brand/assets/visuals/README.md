# Dinoxo Store — Raster Visual System

These backgrounds extend the material language of the selected Dinoxo Store logo without redrawing it. The exact primary logo remains:

`../logo/dinoxostore-logo-primary.png`

Use that PNG as the only logo layer above these images. Do not recolor, trace, sharpen, regenerate, or replace the D–dinosaur emblem, metallic wordmark, blue point, pebbled disk, or blue rim.

## Asset matrix

| Asset | Size | Intended use | Overlay-safe area | Suggested background position |
| --- | ---: | --- | --- | --- |
| `dinoxostore-hero-background.png` | 1672 × 941 | Full-bleed homepage hero | Left 46%; keep copy within the inner 40% | `72% center` desktop; `68% center` mobile |
| `dinoxostore-catalog-background.png` | 1672 × 941 | Catalog/product-list section backdrop | Center-left and upper-center 65% | `right center` |
| `dinoxostore-trust-background.png` | 1672 × 941 | Trust, security, and instant-delivery section | Left 52% | `78% center` desktop; `70% center` mobile |
| `dinoxostore-social-background.png` | 1254 × 1254 | Square social campaign/profile composition | Central circular area, approximately 58% of width | `center center` |

## Placement guidance

### Hero

- Use as a full-bleed `cover` background.
- Keep the logo, headline, body copy, and primary CTA on the calm left side.
- Recommended logo width: `clamp(180px, 22vw, 360px)`.
- If the text column moves on mobile, add a dark linear-gradient overlay rather than modifying the source image.

### Catalog

- Use behind the section, not inside every product card.
- Keep filters, prices, and product information as real HTML/UI.
- A solid or translucent midnight surface may be placed behind dense UI when needed for WCAG contrast.
- The decorative rings should remain peripheral; they are atmosphere, not a focal product.

### Trust / instant delivery

- Put the heading and proof points in the left safe area.
- Keep the blue energy core on the right; do not place text over it.
- Use the project SVG functional icons for proof-point rows. Do not bake shields, locks, or check marks into this background.

### Social

- Center the exact primary logo above the empty circular field.
- Recommended overlay width: 62–68% of the canvas, adjusted visually per channel crop.
- Keep campaign copy outside the logo artwork or add it as editable text in the publishing tool.
- Test both the full square and circular avatar crop before publishing.

## Logo-overlay caveat

The primary logo is intentionally the approved raster artwork and includes its own midnight background; it is not a transparent cutout. Place it only on dark midnight/graphite surfaces where its edge blends naturally. If isolated artwork is required later, create a **separate raster-mask derivative** and retain `dinoxostore-logo-primary.png` unchanged as the source of truth. Do not replace it with the simplified SVG logo.

## Accessibility and implementation

- Backgrounds are decorative: use empty alt text (`alt=""`) when rendered with `<img>`, or use CSS backgrounds.
- Text contrast must be verified in the final layout; the safe zones reduce detail but do not guarantee contrast for every crop.
- Prefer HTML text, SVG functional icons, and CSS controls over rasterized UI.
- Do not add PlayStation/Sony marks, controller button-shape sets, copyrighted characters, or language implying affiliation.
