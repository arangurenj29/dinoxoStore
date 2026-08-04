#!/usr/bin/env python3
"""Build Dinoxo Store SVG icons and design tokens.

The approved logo is raster artwork and is intentionally outside this generator.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "brand"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


ICON_COMMON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="dinoxo-icon-{name}-title">
  <title id="dinoxo-icon-{name}-title">{title}</title>
  {body}
</svg>'''


def build_icons() -> None:
    icons = {
        "cart": ("Carrito", '<path d="M3 4h2l1.7 10.2a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.4L21 7H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'),
        "search": ("Buscar", '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
        "menu": ("Menú", '<path d="M4 7h16M4 12h16M4 17h16"/>'),
        "account": ("Cuenta", '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/>'),
        "whatsapp-contact": ("Contacto", '<path d="M20 11.5a8 8 0 0 1-11.7 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.8 2.4 2.3 3.9 4.7 4.8l1.3-1.2 2 .9-.2 2c-4.8.8-8.7-3.1-7.8-7.8l2-.2.8 2Z"/>'),
        "payment": ("Pago", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>'),
        "copy-code": ("Copiar código", '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/><path d="M11 13h5M13.5 10.5v5"/>'),
        "help": ("Ayuda", '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.2.9-1.2 1.7"/><circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none"/>'),
        "instant-delivery": ("Entrega inmediata", '<circle cx="12" cy="12" r="9"/><path d="m13.5 6-5 7h4l-2 5 5.5-7h-4Z"/><path d="M3.5 12H1M23 12h-2.5"/>'),
        "secure-purchase": ("Compra segura", '<path d="M12 3 20 6v5c0 5.1-3.2 8.4-8 10-4.8-1.6-8-4.9-8-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>'),
        "gift-card": ("Gift card", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M12 7v13"/><path d="M12 7c-2.4 0-4.2-.4-4.2-2 0-1 .8-1.7 1.8-1.7C11 3.3 12 5 12 7Zm0 0c2.4 0 4.2-.4 4.2-2 0-1-.8-1.7-1.8-1.7C13 3.3 12 5 12 7Z"/>'),
        "region": ("Región", '<circle cx="10" cy="11" r="7"/><path d="M3 11h14M10 4c2 2 3 4.3 3 7M10 4c-2 2-3 4.3-3 7M5 7.5h10"/><path d="M21 15.5c0 2.3-3 5.5-3 5.5s-3-3.2-3-5.5a3 3 0 1 1 6 0Z"/><circle cx="18" cy="15.5" r=".7" fill="currentColor" stroke="none"/>'),
    }
    for name, (title, body) in icons.items():
        write(BRAND / "assets" / "icons" / f"{name}.svg", ICON_COMMON.format(name=name, title=title, body=body))


def build_tokens() -> None:
    tokens = {
        "$schema": "https://design-tokens.github.io/community-group/format/",
        "color": {
            "primitive": {
                "midnight-950": {"$type": "color", "$value": "#030A12"},
                "midnight-900": {"$type": "color", "$value": "#071526"},
                "navy-800": {"$type": "color", "$value": "#101B2A"},
                "graphite-700": {"$type": "color", "$value": "#263443"},
                "slate-600": {"$type": "color", "$value": "#526273"},
                "slate-500": {"$type": "color", "$value": "#405164"},
                "slate-300": {"$type": "color", "$value": "#B5C2CF"},
                "slate-200": {"$type": "color", "$value": "#C8D3DD"},
                "silver-200": {"$type": "color", "$value": "#D8E1EA"},
                "silver-100": {"$type": "color", "$value": "#EEF4F8"},
                "white": {"$type": "color", "$value": "#FFFFFF"},
                "blue-500": {"$type": "color", "$value": "#178BFF"},
                "blue-400": {"$type": "color", "$value": "#24A2FF"},
                "blue-200": {"$type": "color", "$value": "#94D1FF"},
                "blue-700": {"$type": "color", "$value": "#0057B8"},
                "green-500": {"$type": "color", "$value": "#16A86A"},
                "amber-500": {"$type": "color", "$value": "#B86F00"},
                "red-500": {"$type": "color", "$value": "#D83B4C"},
            },
            "semantic": {
                "brand-primary": {"$type": "color", "$value": "{color.primitive.blue-500}"},
                "brand-highlight": {"$type": "color", "$value": "{color.primitive.blue-400}"},
                "pdf-label-on-light": {"$type": "color", "$value": "{color.primitive.blue-700}"},
                "light": {
                    "surface": {"$type": "color", "$value": "{color.primitive.white}"},
                    "surface-subtle": {"$type": "color", "$value": "{color.primitive.silver-100}"},
                    "text": {"$type": "color", "$value": "{color.primitive.midnight-900}"},
                    "text-muted": {"$type": "color", "$value": "{color.primitive.slate-600}"},
                    "border": {"$type": "color", "$value": "{color.primitive.slate-200}"},
                    "accent": {"$type": "color", "$value": "{color.primitive.blue-700}"},
                    "on-accent": {"$type": "color", "$value": "{color.primitive.white}"},
                    "focus-ring": {"$type": "color", "$value": "{color.primitive.blue-700}"},
                },
                "dark": {
                    "surface": {"$type": "color", "$value": "{color.primitive.midnight-900}"},
                    "surface-subtle": {"$type": "color", "$value": "{color.primitive.navy-800}"},
                    "text": {"$type": "color", "$value": "{color.primitive.silver-100}"},
                    "text-muted": {"$type": "color", "$value": "{color.primitive.slate-300}"},
                    "border": {"$type": "color", "$value": "{color.primitive.slate-500}"},
                    "accent": {"$type": "color", "$value": "{color.primitive.blue-400}"},
                    "on-accent": {"$type": "color", "$value": "{color.primitive.midnight-950}"},
                    "focus-ring": {"$type": "color", "$value": "{color.primitive.blue-200}"},
                },
                "status": {
                    "success": {"$type": "color", "$value": "{color.primitive.green-500}"},
                    "warning": {"$type": "color", "$value": "{color.primitive.amber-500}"},
                    "error": {"$type": "color", "$value": "{color.primitive.red-500}"},
                },
            },
        },
        "font": {
            "family": {
                "display": {"$type": "fontFamily", "$value": ["Space Grotesk", "Inter", "Arial", "sans-serif"]},
                "body": {"$type": "fontFamily", "$value": ["Inter", "Arial", "sans-serif"]},
                "mono": {"$type": "fontFamily", "$value": ["IBM Plex Mono", "Menlo", "monospace"]},
            },
            "size": {"xs": {"$type": "dimension", "$value": "0.75rem"}, "sm": {"$type": "dimension", "$value": "0.875rem"}, "md": {"$type": "dimension", "$value": "1rem"}, "lg": {"$type": "dimension", "$value": "1.25rem"}, "xl": {"$type": "dimension", "$value": "2rem"}, "display": {"$type": "dimension", "$value": "3.5rem"}},
            "weight": {"regular": {"$type": "number", "$value": 400}, "medium": {"$type": "number", "$value": 500}, "semibold": {"$type": "number", "$value": 600}, "bold": {"$type": "number", "$value": 700}},
            "lineHeight": {"tight": {"$type": "number", "$value": 1.1}, "body": {"$type": "number", "$value": 1.5}},
        },
        "space": {str(k): {"$type": "dimension", "$value": v} for k, v in {0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 6: "1.5rem", 8: "2rem", 12: "3rem", 16: "4rem", 24: "6rem"}.items()},
        "radius": {"sm": {"$type": "dimension", "$value": "0.375rem"}, "md": {"$type": "dimension", "$value": "0.75rem"}, "lg": {"$type": "dimension", "$value": "1.25rem"}, "pill": {"$type": "dimension", "$value": "999px"}},
        "shadow": {"raised": {"$type": "shadow", "$value": {"color": "#030A1240", "offsetX": "0px", "offsetY": "8px", "blur": "24px", "spread": "0px"}}, "glow": {"$type": "shadow", "$value": {"color": "#178BFF59", "offsetX": "0px", "offsetY": "0px", "blur": "20px", "spread": "0px"}}},
        "motion": {"duration": {"fast": {"$type": "duration", "$value": "120ms"}, "normal": {"$type": "duration", "$value": "220ms"}, "slow": {"$type": "duration", "$value": "420ms"}}, "easing": {"standard": {"$type": "cubicBezier", "$value": [0.2, 0, 0, 1]}, "entrance": {"$type": "cubicBezier", "$value": [0.16, 1, 0.3, 1]}}},
        "focus": {"width": {"$type": "dimension", "$value": "3px"}, "offset": {"$type": "dimension", "$value": "3px"}},
    }
    path = BRAND / "tokens" / "brand.tokens.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(tokens, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    p = {name: item["$value"] for name, item in tokens["color"]["primitive"].items()}
    css = f'''/* Dinoxo Store Brand Tokens v1. Generated from brand.tokens.json. */
:root {{
  --dx-color-midnight-950: {p['midnight-950']};
  --dx-color-midnight-900: {p['midnight-900']};
  --dx-color-navy-800: {p['navy-800']};
  --dx-color-graphite-700: {p['graphite-700']};
  --dx-color-slate-600: {p['slate-600']};
  --dx-color-slate-500: {p['slate-500']};
  --dx-color-slate-300: {p['slate-300']};
  --dx-color-slate-200: {p['slate-200']};
  --dx-color-silver-200: {p['silver-200']};
  --dx-color-silver-100: {p['silver-100']};
  --dx-color-blue-700: {p['blue-700']};
  --dx-color-blue-500: {p['blue-500']};
  --dx-color-blue-400: {p['blue-400']};
  --dx-color-blue-200: {p['blue-200']};
  --dx-color-success: {p['green-500']};
  --dx-color-warning: {p['amber-500']};
  --dx-color-error: {p['red-500']};
  --dx-surface: {p['white']};
  --dx-surface-subtle: {p['silver-100']};
  --dx-text: {p['midnight-900']};
  --dx-text-muted: {p['slate-600']};
  --dx-border: {p['slate-200']};
  --dx-accent: {p['blue-700']};
  --dx-on-accent: {p['white']};
  --dx-font-display: "Space Grotesk", Inter, Arial, sans-serif;
  --dx-font-body: Inter, Arial, sans-serif;
  --dx-font-mono: "IBM Plex Mono", Menlo, monospace;
  --dx-space-1: 0.25rem; --dx-space-2: 0.5rem; --dx-space-3: 0.75rem;
  --dx-space-4: 1rem; --dx-space-6: 1.5rem; --dx-space-8: 2rem;
  --dx-space-12: 3rem; --dx-space-16: 4rem; --dx-space-24: 6rem;
  --dx-radius-sm: 0.375rem; --dx-radius-md: 0.75rem;
  --dx-radius-lg: 1.25rem; --dx-radius-pill: 999px;
  --dx-shadow-raised: 0 8px 24px rgb(3 10 18 / 25%);
  --dx-shadow-glow: 0 0 20px rgb(23 139 255 / 35%);
  --dx-motion-fast: 120ms; --dx-motion-normal: 220ms; --dx-motion-slow: 420ms;
  --dx-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --dx-ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);
  --dx-focus-ring: {p['blue-700']};
  --dx-focus: 0 0 0 3px var(--dx-focus-ring);
}}

[data-theme="dark"] {{
  --dx-surface: {p['midnight-900']};
  --dx-surface-subtle: {p['navy-800']};
  --dx-text: {p['silver-100']};
  --dx-text-muted: {p['slate-300']};
  --dx-border: {p['slate-500']};
  --dx-accent: {p['blue-400']};
  --dx-on-accent: {p['midnight-950']};
  --dx-focus-ring: {p['blue-200']};
}}

:focus-visible {{ outline: 3px solid var(--dx-focus-ring); outline-offset: 3px; }}
@media (prefers-reduced-motion: reduce) {{
  *, *::before, *::after {{ scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }}
}}'''
    write(BRAND / "tokens" / "brand.css", css)


if __name__ == "__main__":
    build_icons()
    build_tokens()
    print("Dinoxo Store icons and tokens generated; primary raster logo preserved.")
