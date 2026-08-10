#!/usr/bin/env python3
"""Validate Dinoxo Store SVGs, token/CSS parity, and WCAG contrast pairs."""

from __future__ import annotations

import json
import hashlib
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "brand"
TOKENS_PATH = BRAND / "tokens" / "brand.tokens.json"
CSS_PATH = BRAND / "tokens" / "brand.css"
PRIMARY_LOGO_PATH = BRAND / "assets" / "logo" / "dinoxostore-logo-primary.png"
PRIMARY_LOGO_SHA256 = "3505157d019c6bc9b843095be28b7326844c6b744645a4604d769fe576b8764d"


def fail(message: str) -> None:
    raise AssertionError(message)


def load_tokens() -> dict:
    return json.loads(TOKENS_PATH.read_text(encoding="utf-8"))


def token_at(tokens: dict, path: str):
    node = tokens
    for part in path.split("."):
        node = node[part]
    return node["$value"] if isinstance(node, dict) and "$value" in node else node


def resolve(tokens: dict, path: str) -> str:
    value = token_at(tokens, path)
    seen = {path}
    while isinstance(value, str) and value.startswith("{") and value.endswith("}"):
        ref = value[1:-1]
        if ref in seen:
            fail(f"Circular token reference: {ref}")
        seen.add(ref)
        value = token_at(tokens, ref)
    return value


def parse_css_block(css: str, selector: str) -> dict[str, str]:
    pattern = rf"{re.escape(selector)}\s*\{{(.*?)\}}"
    match = re.search(pattern, css, re.S)
    if not match:
        fail(f"Missing CSS block: {selector}")
    return {name: value.strip() for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", match.group(1))}


def relative_luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    if len(value) != 6:
        fail(f"Expected 6-digit hex color, got {hex_color}")
    rgb = [int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in rgb]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(foreground: str, background: str) -> float:
    first, second = relative_luminance(foreground), relative_luminance(background)
    return (max(first, second) + 0.05) / (min(first, second) + 0.05)


def validate_svg() -> None:
    files = sorted((BRAND / "assets" / "icons").glob("*.svg"))
    unexpected = sorted(path for path in (BRAND / "assets").rglob("*.svg") if path not in files)
    if unexpected:
        fail(f"Operational SVG is restricted to brand/assets/icons: {unexpected}")
    if len(files) != 12:
        fail(f"Expected 12 functional/service SVG icons, found {len(files)}")
    ids: dict[str, Path] = {}
    for path in files:
        root = ET.parse(path).getroot()
        for element in root.iter():
            tag = element.tag.rsplit("}", 1)[-1]
            if tag == "image":
                fail(f"Raster embed forbidden in {path}")
            element_id = element.attrib.get("id")
            if element_id:
                if element_id in ids:
                    fail(f"Duplicate SVG id '{element_id}' in {path} and {ids[element_id]}")
                ids[element_id] = path
        if "data:image" in path.read_text(encoding="utf-8"):
            fail(f"Raster data URI forbidden in {path}")
    print(f"SVG icons: {len(files)} valid XML files; {len(ids)} globally unique IDs; no raster embeds")


def validate_primary_logo() -> None:
    if not PRIMARY_LOGO_PATH.exists():
        fail(f"Missing approved raster logo: {PRIMARY_LOGO_PATH}")
    digest = hashlib.sha256(PRIMARY_LOGO_PATH.read_bytes()).hexdigest()
    if digest != PRIMARY_LOGO_SHA256:
        fail(f"Approved raster logo changed: {digest} != {PRIMARY_LOGO_SHA256}")
    print(f"Primary raster logo: SHA-256 {digest}")


def validate_css_tokens(tokens: dict) -> None:
    css = CSS_PATH.read_text(encoding="utf-8")
    root = parse_css_block(css, ":root")
    dark = parse_css_block(css, '[data-theme="dark"]')
    expected_root = {
        "--dx-surface": "color.semantic.light.surface",
        "--dx-surface-subtle": "color.semantic.light.surface-subtle",
        "--dx-text": "color.semantic.light.text",
        "--dx-text-muted": "color.semantic.light.text-muted",
        "--dx-border": "color.semantic.light.border",
        "--dx-accent": "color.semantic.light.accent",
        "--dx-on-accent": "color.semantic.light.on-accent",
        "--dx-focus-ring": "color.semantic.light.focus-ring",
    }
    expected_dark = {
        "--dx-surface": "color.semantic.dark.surface",
        "--dx-surface-subtle": "color.semantic.dark.surface-subtle",
        "--dx-text": "color.semantic.dark.text",
        "--dx-text-muted": "color.semantic.dark.text-muted",
        "--dx-border": "color.semantic.dark.border",
        "--dx-accent": "color.semantic.dark.accent",
        "--dx-on-accent": "color.semantic.dark.on-accent",
        "--dx-focus-ring": "color.semantic.dark.focus-ring",
    }
    for css_name, token_path in expected_root.items():
        actual, expected = root.get(css_name, "").upper(), resolve(tokens, token_path).upper()
        if actual != expected:
            fail(f"CSS/token drift in root {css_name}: {actual} != {expected}")
    for css_name, token_path in expected_dark.items():
        actual, expected = dark.get(css_name, "").upper(), resolve(tokens, token_path).upper()
        if actual != expected:
            fail(f"CSS/token drift in dark {css_name}: {actual} != {expected}")

    primitive_colors = {item["$value"].upper() for item in tokens["color"]["primitive"].values()}
    css_hex = {value.upper() for value in re.findall(r"#[0-9a-fA-F]{6,8}", css)}
    undocumented = sorted(css_hex - primitive_colors)
    if undocumented:
        fail(f"Undocumented CSS colors: {undocumented}")
    print("CSS/tokens: semantic light/dark values match JSON; all CSS hex colors are documented primitives")


def validate_contrast(tokens: dict) -> None:
    pairs = [
        ("light text / surface", "color.semantic.light.text", "color.semantic.light.surface", 4.5),
        ("light muted / surface", "color.semantic.light.text-muted", "color.semantic.light.surface", 4.5),
        ("light accent / surface", "color.semantic.light.accent", "color.semantic.light.surface", 4.5),
        ("light on-accent / accent", "color.semantic.light.on-accent", "color.semantic.light.accent", 4.5),
        ("light focus / surface", "color.semantic.light.focus-ring", "color.semantic.light.surface", 3.0),
        ("PDF label / light", "color.semantic.pdf-label-on-light", "color.semantic.light.surface", 4.5),
        ("dark text / surface", "color.semantic.dark.text", "color.semantic.dark.surface", 4.5),
        ("dark muted / surface", "color.semantic.dark.text-muted", "color.semantic.dark.surface", 4.5),
        ("dark accent / surface", "color.semantic.dark.accent", "color.semantic.dark.surface", 3.0),
        ("dark on-accent / accent", "color.semantic.dark.on-accent", "color.semantic.dark.accent", 4.5),
        ("dark focus / surface", "color.semantic.dark.focus-ring", "color.semantic.dark.surface", 3.0),
        ("success non-text / light", "color.semantic.status.success", "color.semantic.light.surface", 3.0),
        ("warning non-text / light", "color.semantic.status.warning", "color.semantic.light.surface", 3.0),
        ("error non-text / light", "color.semantic.status.error", "color.semantic.light.surface", 3.0),
    ]
    for label, fg_path, bg_path, minimum in pairs:
        fg, bg = resolve(tokens, fg_path), resolve(tokens, bg_path)
        ratio = contrast(fg, bg)
        if ratio + 1e-9 < minimum:
            fail(f"Contrast failure {label}: {fg} on {bg} = {ratio:.2f}:1 < {minimum:.1f}:1")
        print(f"CONTRAST {label}: {fg} on {bg} = {ratio:.2f}:1 (min {minimum:.1f}:1)")


def main() -> int:
    tokens = load_tokens()
    validate_primary_logo()
    validate_svg()
    validate_css_tokens(tokens)
    validate_contrast(tokens)
    print("Brand validation passed")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, KeyError, json.JSONDecodeError, ET.ParseError) as error:
        print(f"VALIDATION FAILED: {error}", file=sys.stderr)
        sys.exit(1)
