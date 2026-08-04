#!/usr/bin/env python3
"""Render the Brand Book PDF and create visual QA evidence."""

from __future__ import annotations

import shutil
import subprocess
import os
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "output" / "pdf" / "DinoxoStore-Brand-Book-v1.pdf"
QA = ROOT / "tmp" / "pdfs" / "dinoxostore-brand-book-v1"
SOURCE_LOGO = ROOT / "brand" / "assets" / "logo" / "dinoxostore-logo-primary.png"
DPI = 120


def require(name: str) -> str:
    command = shutil.which(name)
    if not command:
        raise RuntimeError(f"Required command not found: {name}")
    return command


def render_pages() -> list[Path]:
    if not PDF.exists():
        raise FileNotFoundError(f"Build the PDF first: {PDF}")
    QA.mkdir(parents=True, exist_ok=True)
    for old in QA.glob("page-*.png"):
        old.unlink()
    env = os.environ.copy()
    env["XDG_CACHE_HOME"] = str((ROOT / "tmp" / "font-cache").resolve())
    subprocess.run([require("pdftoppm"), "-png", "-r", str(DPI), str(PDF), str(QA / "page")], check=True, env=env)
    pages = sorted(QA.glob("page-*.png"))
    if len(pages) != 12:
        raise RuntimeError(f"Expected 12 QA pages, found {len(pages)}")
    return pages


def make_contact_sheet(pages: list[Path]) -> Path:
    tiles = []
    for index, path in enumerate(pages, 1):
        image = Image.open(path).convert("RGB")
        image.thumbnail((300, 424))
        tile = Image.new("RGB", (320, 460), "#C8D0D8")
        tile.paste(image, ((320 - image.width) // 2, 20))
        ImageDraw.Draw(tile).text((12, 438), f"Página {index:02d}", fill="#071526")
        tiles.append(tile)
    sheet = Image.new("RGB", (1280, 1380), "#9AA6B2")
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % 4) * 320, (index // 4) * 460))
    path = QA / "contact-sheet.png"
    sheet.save(path)
    return path


def composite_on_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, "white")
    background.alpha_composite(rgba)
    return background.convert("RGB")


def make_logo_evidence(page_four: Path) -> Path:
    if not SOURCE_LOGO.exists():
        raise FileNotFoundError(f"Missing approved raster logo: {SOURCE_LOGO}")
    source = composite_on_white(Image.open(SOURCE_LOGO))
    source.thumbnail((360, 360))

    page = Image.open(page_four).convert("RGB")
    scale = DPI / 72
    # Exact PDF placement: x=42+82 pt, y=462 pt, size=124 pt on A4 height 841.89 pt.
    left = round((42 + 82) * scale)
    top = round((841.8898 - (462 + 124)) * scale)
    right = round((42 + 82 + 124) * scale)
    bottom = round((841.8898 - 462) * scale)
    placed = page.crop((left, top, right, bottom)).resize((360, 360), Image.Resampling.LANCZOS)

    evidence = Image.new("RGB", (800, 470), "#E8EEF4")
    draw = ImageDraw.Draw(evidence)
    evidence.paste(source, (30 + (360 - source.width) // 2, 60 + (360 - source.height) // 2))
    evidence.paste(placed, (410, 60))
    draw.text((30, 24), "APPROVED RASTER SOURCE", fill="#071526")
    draw.text((410, 24), "PDF PAGE 04 CROP", fill="#071526")
    draw.text((30, 438), "Composition, texture, lighting and wordmark must remain faithful.", fill="#526273")
    path = QA / "logo-orientation-comparison.png"
    evidence.save(path)
    return path


def main() -> None:
    pages = render_pages()
    sheet = make_contact_sheet(pages)
    evidence = make_logo_evidence(pages[3])
    print(f"Rendered {len(pages)} PDF pages")
    print(f"Contact sheet: {sheet}")
    print(f"Raster logo evidence: {evidence}")


if __name__ == "__main__":
    main()
