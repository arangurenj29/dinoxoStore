#!/usr/bin/env python3
"""Generate the compact Dinoxo Store Brand Book v1 PDF."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "DinoxoStore-Brand-Book-v1.pdf"
PRIMARY_LOGO = ROOT / "brand" / "assets" / "logo" / "dinoxostore-logo-primary.png"

W, H = A4
M = 42

MIDNIGHT_950 = HexColor("#030A12")
MIDNIGHT_900 = HexColor("#071526")
NAVY_800 = HexColor("#101B2A")
GRAPHITE_700 = HexColor("#263443")
SILVER_200 = HexColor("#D8E1EA")
SILVER_100 = HexColor("#EEF4F8")
BLUE_500 = HexColor("#178BFF")
BLUE_400 = HexColor("#24A2FF")
BLUE_200 = HexColor("#94D1FF")
LABEL_BLUE = HexColor("#0057B8")
TEXT = HexColor("#132234")
MUTED = HexColor("#5D6B79")
LINE = HexColor("#D9E2EA")
LIGHT = HexColor("#F4F7FA")
GREEN = HexColor("#16A86A")
AMBER = HexColor("#B86F00")
RED = HexColor("#D83B4C")

MASTER_PNG: Path
SYMBOL_PNG: Path


def rounded_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, radius=10, stroke=None):
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


def wrap_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if not current or stringWidth(trial, font, size) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(c: canvas.Canvas, text: str, x: float, y: float, width: float, *, font="Helvetica", size=9.4, leading=13, color=TEXT, max_lines=None) -> float:
    lines = wrap_lines(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(c: canvas.Canvas, items: Iterable[str], x: float, y: float, width: float, *, color=TEXT, dot=BLUE_500, size=9.2, leading=12.5, gap=6) -> float:
    for item in items:
        lines = wrap_lines(item, "Helvetica", size, width - 16)
        c.setFillColor(dot)
        c.circle(x + 3, y + 3, 2.2, fill=1, stroke=0)
        c.setFillColor(color)
        c.setFont("Helvetica", size)
        for i, line in enumerate(lines):
            c.drawString(x + 14, y - i * leading, line)
        y -= max(1, len(lines)) * leading + gap
    return y


def section_title(c: canvas.Canvas, kicker: str, title: str, subtitle: str = "", dark=False) -> float:
    fg = SILVER_100 if dark else TEXT
    sub = HexColor("#B9C8D6") if dark else MUTED
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(BLUE_400 if dark else LABEL_BLUE)
    c.drawString(M, H - 56, kicker.upper())
    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(fg)
    c.drawString(M, H - 88, title)
    y = H - 111
    if subtitle:
        y = text_block(c, subtitle, M, y, W - 2 * M, font="Helvetica", size=10.2, leading=14, color=sub)
    return y - 14


def footer(c: canvas.Canvas, page: int, dark=False):
    color = HexColor("#8999A8") if dark else MUTED
    c.setStrokeColor(Color(color.red, color.green, color.blue, alpha=0.35))
    c.setLineWidth(0.5)
    c.line(M, 31, W - M, 31)
    c.setFont("Helvetica", 7.7)
    c.setFillColor(color)
    c.drawString(M, 18, "DINOXO STORE  /  BRAND KIT V1  /  AGOSTO 2026")
    c.drawRightString(W - M, 18, f"{page:02d}")


def page_base(c: canvas.Canvas, page: int, *, dark=False):
    c.setFillColor(MIDNIGHT_950 if dark else white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    if dark:
        c.setFillColor(Color(BLUE_500.red, BLUE_500.green, BLUE_500.blue, alpha=0.05))
        c.circle(W + 40, H - 100, 220, fill=1, stroke=0)
    footer(c, page, dark=dark)


def draw_source_image(c: canvas.Canvas, path: Path, x: float, y: float, width: float, height: float) -> None:
    """Place the approved raster logo without redrawing or vectorizing it."""
    c.drawImage(ImageReader(str(path)), x, y, width, height, preserveAspectRatio=True, anchor="c", mask="auto")


def chip(c: canvas.Canvas, text: str, x: float, y: float, w: float, *, fill=LIGHT, fg=TEXT):
    rounded_rect(c, x, y, w, 24, fill, radius=12)
    c.setFont("Helvetica-Bold", 7.7)
    c.setFillColor(fg)
    c.drawCentredString(x + w / 2, y + 8, text.upper())


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, body: str, *, accent=BLUE_500, dark=False):
    fill = NAVY_800 if dark else LIGHT
    fg = SILVER_100 if dark else TEXT
    sub = HexColor("#B9C8D6") if dark else MUTED
    rounded_rect(c, x, y, w, h, fill, radius=10, stroke=GRAPHITE_700 if dark else LINE)
    c.setFillColor(accent)
    c.rect(x, y + h - 4, w, 4, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(fg)
    c.drawString(x + 14, y + h - 25, title)
    text_block(c, body, x + 14, y + h - 43, w - 28, size=8.4, leading=11.5, color=sub)


def page_cover(c: canvas.Canvas):
    c.setFillColor(MIDNIGHT_950); c.rect(0, 0, W, H, fill=1, stroke=0)
    img = ImageReader(str(PRIMARY_LOGO))
    c.saveState()
    c.setFillAlpha(0.76)
    c.drawImage(img, W - 350, 175, 390, 390, preserveAspectRatio=True, anchor="c", mask="auto")
    c.restoreState()
    c.setFillColor(Color(MIDNIGHT_950.red, MIDNIGHT_950.green, MIDNIGHT_950.blue, alpha=.35))
    c.rect(W - 350, 175, 390, 390, fill=1, stroke=0)
    c.setFillColor(BLUE_500); c.rect(M, H - 80, 52, 4, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9); c.setFillColor(BLUE_400); c.drawString(M, H - 105, "BRAND KIT V1")
    c.setFont("Helvetica-Bold", 42); c.setFillColor(SILVER_100); c.drawString(M, H - 162, "Dinoxo Store")
    c.setFont("Helvetica", 16); c.setFillColor(SILVER_200); c.drawString(M, H - 194, "Identidad gamer propia, precisa y confiable")
    text_block(c, "Sistema práctico para logo, color, tipografía, iconografía, contenido y producto digital.", M, H - 230, 280, size=10.5, leading=15, color=HexColor("#A9B8C6"))
    chip(c, "RASTER APROBADO", M, 160, 105, fill=NAVY_800, fg=SILVER_100)
    chip(c, "WCAG 2.2 AA", M + 115, 160, 100, fill=NAVY_800, fg=SILVER_100)
    c.setFont("Helvetica", 8); c.setFillColor(HexColor("#8595A5")); c.drawString(M, 64, "Versión 1.0  /  Agosto 2026")
    c.drawString(M, 49, "El PNG aprobado es la única fuente maestra del logo.")
    c.showPage()


def page_essence(c: canvas.Canvas):
    page_base(c, 2)
    y = section_title(c, "01 / Fundamento", "Decisiones primero", "Una marca gamer premium e independiente. Energía tecnológica contenida, información clara y entrega explicada.")
    card(c, M, y - 106, 158, 92, "PROMESA", "Entender qué compras, para qué región sirve y qué ocurrirá después del pago.")
    card(c, M + 170, y - 106, 158, 92, "PERSONALIDAD", "Confiable, ágil, experta, directa y cercana. Nunca infantil ni estridente.")
    card(c, M + 340, y - 106, 171, 92, "POSICIÓN", "Tienda gamer independiente con una experiencia digital cuidada.")
    c.setFont("Helvetica-Bold", 15); c.setFillColor(TEXT); c.drawString(M, y - 144, "Cuatro principios")
    bullets(c, [
        "Claridad antes que espectáculo: la imagen abre la puerta; la información cierra la compra.",
        "Rapidez con evidencia: indicar tiempos, pasos y condiciones sin promesas absolutas.",
        "Experiencia sin elitismo: orientar sin exigir dominio de jerga.",
        "Identidad propia: vender una plataforma no implica representarla oficialmente.",
    ], M, y - 170, 485, size=9.6, leading=13.5, gap=10)
    rounded_rect(c, M, 88, W - 2*M, 70, MIDNIGHT_900, radius=12)
    c.setFont("Helvetica-Bold", 8); c.setFillColor(BLUE_400); c.drawString(M + 18, 137, "TESIS VISUAL")
    c.setFont("Helvetica-Bold", 15); c.setFillColor(SILVER_100); c.drawString(M + 18, 111, "Precisión metálica sobre profundidad azul noche,")
    c.drawString(M + 18, 92, "con energía eléctrica contenida.")
    c.showPage()


def page_logo(c: canvas.Canvas):
    page_base(c, 3)
    y = section_title(c, "02 / Identidad", "El logo maestro es raster", "La D angular, el dinosaurio, el metal y el wordmark forman una composición indivisible.")
    rounded_rect(c, M, 342, 230, 310, MIDNIGHT_900, radius=16)
    draw_source_image(c, MASTER_PNG, M + 27, 381, 200, 229)
    c.setFont("Helvetica-Bold", 8); c.setFillColor(BLUE_400); c.drawString(M + 18, 361, "MAESTRO VERTICAL  /  FONDO OSCURO")
    c.setFont("Helvetica-Bold", 12); c.setFillColor(TEXT); c.drawString(304, 629, "Familia mínima")
    card(c, 304, 547, 249, 66, "HORIZONTAL", "Cabeceras web, footer, documentos y firmas.")
    card(c, 304, 467, 249, 66, "SÍMBOLO", "Avatar, favicon, app icon, sello y espacios reducidos.")
    card(c, 304, 387, 249, 66, "MONOCROMO", "Grabado, sellos, impresión a una tinta y fondos limitados.")
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 308, "Regla no negociable")
    bullets(c, [
        "El PNG aprobado es el maestro. No vectorizarlo ni sustituirlo por una nueva generación.",
        "El punto azul pertenece al wordmark; no sustituirlo por símbolos de plataformas.",
        "El wordmark v1 aún debe validarse y convertirse a contornos cuando se apruebe tipografía y kerning.",
    ], M, 283, W - 2*M, size=9.4, leading=13, gap=9)
    c.showPage()


def page_clearspace(c: canvas.Canvas):
    page_base(c, 4)
    y = section_title(c, "03 / Control", "Espacio, escala y usos", "La consistencia se protege con límites medibles, no con intuición.")
    # clearspace demo
    c.setStrokeColor(BLUE_200); c.setDash(4, 3); c.setLineWidth(1)
    c.rect(M + 24, 415, 240, 230, fill=0, stroke=1); c.setDash()
    draw_source_image(c, SYMBOL_PNG, M + 82, 462, 124, 124)
    c.setFillColor(LABEL_BLUE); c.setFont("Helvetica-Bold", 8)
    c.drawString(M + 24, 654, "MARGEN MÍNIMO: 3x SÍMBOLO / 4x LOGO COMPLETO")
    c.setFont("Helvetica-Bold", 13); c.setFillColor(TEXT); c.drawString(330, 625, "Tamaños mínimos")
    rows = [("Horizontal digital", "160 px"), ("Maestro digital", "120 px"), ("Símbolo digital", "24 px"), ("Horizontal impreso", "35 mm"), ("Símbolo impreso", "8 mm")]
    yy = 589
    for label, value in rows:
        c.setFont("Helvetica", 9); c.setFillColor(TEXT); c.drawString(330, yy, label)
        c.setFont("Helvetica-Bold", 9); c.drawRightString(W - M, yy, value)
        c.setStrokeColor(LINE); c.line(330, yy - 8, W - M, yy - 8); yy -= 35
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 370, "No hacer")
    cards = [
        ("NO DEFORMAR", "No estirar, inclinar ni girar."),
        ("NO IMITAR", "No fusionar símbolos o tipografías de una consola."),
        ("NO ENSUCIAR", "No colocar sobre ruido sin contraste medido."),
        ("NO EFECTOS", "No añadir brillo, bisel o sombra al maestro."),
    ]
    xx = M
    for title, body in cards:
        card(c, xx, 240, 119, 98, title, body, accent=RED)
        xx += 130
    rounded_rect(c, M, 86, W - 2*M, 112, LIGHT, radius=12, stroke=LINE)
    c.setFont("Helvetica-Bold", 11); c.setFillColor(TEXT); c.drawString(M + 16, 170, "Nota de producción a 16 px")
    text_block(c, "Para favicon o avatar, usa únicamente un recorte raster documentado y validado. SVG queda reservado a iconos funcionales y de servicio.", M + 16, 146, W - 2*M - 32, size=9.1, leading=13, color=MUTED)
    c.showPage()


def page_palette(c: canvas.Canvas):
    page_base(c, 5)
    y = section_title(c, "04 / Sistema", "Color con propósito", "Una base sobria, una plata fría y un solo acento eléctrico. El color siempre cumple una función.")
    swatches = [
        (MIDNIGHT_950, "MIDNIGHT 950", "#030A12", SILVER_100),
        (MIDNIGHT_900, "MIDNIGHT 900", "#071526", SILVER_100),
        (NAVY_800, "NAVY 800", "#101B2A", SILVER_100),
        (GRAPHITE_700, "GRAPHITE 700", "#263443", SILVER_100),
        (SILVER_200, "SILVER 200", "#D8E1EA", TEXT),
        (SILVER_100, "SILVER 100", "#EEF4F8", TEXT),
        (BLUE_500, "BLUE 500", "#178BFF", MIDNIGHT_900),
        (BLUE_400, "BLUE 400", "#24A2FF", TEXT),
    ]
    x0, yy = M, 555
    for i, (color, name, code, fg) in enumerate(swatches):
        x = x0 + (i % 4) * 130
        yb = yy - (i // 4) * 112
        rounded_rect(c, x, yb, 118, 92, color, radius=9)
        c.setFont("Helvetica-Bold", 7.7); c.setFillColor(fg); c.drawString(x + 10, yb + 28, name)
        c.setFont("Courier", 8); c.drawString(x + 10, yb + 12, code)
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 392, "Proporción orientativa")
    c.setFillColor(LIGHT); c.roundRect(M, 345, W - 2*M, 28, 14, fill=1, stroke=0)
    c.setFillColor(MIDNIGHT_900); c.roundRect(M, 345, 358, 28, 14, fill=1, stroke=0)
    c.setFillColor(GRAPHITE_700); c.rect(M + 350, 345, 103, 28, fill=1, stroke=0)
    c.setFillColor(LABEL_BLUE); c.roundRect(M + 446, 345, 65, 28, 14, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 8); c.setFillColor(white); c.drawString(M + 12, 355, "70% NEUTROS")
    c.drawString(M + 365, 355, "20% ESTRUCTURA"); c.drawString(M + 465, 355, "10% AZUL")
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 304, "Estados")
    for i, (col, name, desc) in enumerate([(GREEN, "ÉXITO", "Acción completada"), (AMBER, "ADVERTENCIA", "Atención requerida"), (RED, "ERROR", "Corrección necesaria")]):
        x = M + i*173
        rounded_rect(c, x, 213, 160, 66, LIGHT, radius=9, stroke=LINE)
        c.setFillColor(col); c.circle(x+20, 246, 7, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 8); c.setFillColor(TEXT); c.drawString(x+36, 250, name)
        c.setFont("Helvetica", 8); c.setFillColor(MUTED); c.drawString(x+36, 234, desc)
    text_block(c, "Nunca comunicar estado solo por color. Acompañar con texto, icono y una acción comprensible.", M, 174, W - 2*M, font="Helvetica-Bold", size=9.2, leading=13, color=TEXT)
    c.showPage()


def page_type(c: canvas.Canvas):
    page_base(c, 6)
    section_title(c, "05 / Tipografía", "Tecnología que se lee", "Máximo dos familias visibles por pantalla. Jerarquía fuerte, cuerpos cómodos y datos inequívocos.")
    rounded_rect(c, M, 478, W - 2*M, 160, MIDNIGHT_900, radius=14)
    c.setFont("Helvetica-Bold", 34); c.setFillColor(SILVER_100); c.drawString(M + 22, 577, "Compra sin adivinar")
    c.setFont("Helvetica", 13); c.setFillColor(SILVER_200); c.drawString(M + 22, 545, "Título display: breve, tenso y claro.")
    c.setFont("Courier", 11); c.setFillColor(BLUE_400); c.drawString(M + 22, 510, "CÓDIGO: DINOXO-2026")
    cards = [
        ("DISPLAY", "Space Grotesk", "Títulos breves. 600-700. Alternativa: Inter o Arial."),
        ("INTERFAZ", "Inter", "Texto, etiquetas y controles. 400-600. Alternativa: Arial."),
        ("DATOS", "IBM Plex Mono", "Códigos, seriales y metadatos. Alternativa: Menlo."),
    ]
    x = M
    for title, family, body in cards:
        rounded_rect(c, x, 334, 160, 116, LIGHT, radius=10, stroke=LINE)
        c.setFont("Helvetica-Bold", 7.5); c.setFillColor(LABEL_BLUE); c.drawString(x+14, 426, title)
        c.setFont("Helvetica-Bold", 15); c.setFillColor(TEXT); c.drawString(x+14, 398, family)
        text_block(c, body, x+14, 373, 132, size=8.2, leading=11.5, color=MUTED)
        x += 173
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 295, "Reglas de implementación")
    bullets(c, [
        "Cuerpo web recomendado: 16 px con interlineado cercano a 1.5.",
        "Los precios se escanean; no deben depender de una fuente decorativa.",
        "El wordmark v1 se convierte a contornos solo tras validar fuente, licencia y kerning.",
        "No se ha adquirido ninguna licencia tipográfica con este kit.",
    ], M, 270, W - 2*M, size=9.4, leading=13, gap=9)
    c.showPage()


def draw_mini_icon(c, kind, x, y):
    c.setStrokeColor(BLUE_500); c.setLineWidth(1.6); c.setLineCap(1); c.setLineJoin(1)
    if kind == "cart":
        c.line(x-8,y+6,x-4,y+6); c.line(x-4,y+6,x-1,y-6); c.line(x-1,y-6,x+9,y-6); c.line(x+9,y-6,x+11,y+3); c.line(x-3,y+2,x+10,y+2); c.circle(x,y-10,1.5); c.circle(x+8,y-10,1.5)
    elif kind == "search":
        c.circle(x,y,7,fill=0,stroke=1); c.line(x+5,y-5,x+11,y-11)
    elif kind == "menu":
        for dy in (-6,0,6): c.line(x-10,y+dy,x+10,y+dy)
    elif kind == "account":
        c.circle(x,y+5,4,fill=0,stroke=1); c.arc(x-9,y-11,x+9,y+4,0,180)
    elif kind == "payment":
        c.roundRect(x-11,y-8,22,16,3,fill=0,stroke=1); c.line(x-11,y+3,x+11,y+3)
    elif kind == "help":
        c.circle(x,y,10,fill=0,stroke=1); c.setFont("Helvetica-Bold",10); c.drawCentredString(x,y-3,"?")
    elif kind == "shield":
        p=c.beginPath(); p.moveTo(x,y+11); p.lineTo(x+9,y+7); p.lineTo(x+8,y-3); p.curveTo(x+7,y-8,x+3,y-11,x,y-13); p.curveTo(x-3,y-11,x-7,y-8,x-8,y-3); p.lineTo(x-9,y+7); p.close(); c.drawPath(p,fill=0,stroke=1); c.line(x-4,y,x-1,y-4); c.line(x-1,y-4,x+5,y+4)
    else:
        c.circle(x,y,10,fill=0,stroke=1); c.line(x,y-6,x,y+6); c.line(x-5,y,x+5,y)


def page_icons(c: canvas.Canvas):
    page_base(c, 7)
    section_title(c, "06 / Iconografía", "Reconocer antes que decorar", "Los iconos funcionales resuelven tareas. Los de servicio pueden heredar ángulos, círculos y azul sin repetir el dinosaurio.")
    labels = [("cart","CARRITO"),("search","BUSCAR"),("menu","MENÚ"),("account","CUENTA"),("payment","PAGO"),("help","AYUDA"),("shield","SEGURIDAD"),("other","ENTREGA")]
    for i,(kind,label) in enumerate(labels):
        x=M+(i%4)*130; y=557-(i//4)*100
        rounded_rect(c,x,y,116,78,LIGHT,radius=10,stroke=LINE)
        draw_mini_icon(c,kind,x+58,y+47)
        c.setFont("Helvetica-Bold",7.3); c.setFillColor(TEXT); c.drawCentredString(x+58,y+13,label)
    c.setFont("Helvetica-Bold", 14); c.setFillColor(TEXT); c.drawString(M, 410, "Especificación base")
    bullets(c, [
        "Retícula 24 x 24 px, trazo 1.75 px, remates y uniones redondas.",
        "Usar currentColor para heredar contexto y facilitar temas.",
        "Tamaño visual 24 px; objetivo táctil recomendado 44 x 44 px.",
        "El icono de contacto es neutral y no reproduce el logo de WhatsApp.",
    ], M, 385, W - 2*M, size=9.4, leading=13, gap=8)
    card(c, M, 166, 245, 100, "FUNCIONAL", "Carrito, búsqueda, menú, cuenta, contacto, pago, copiar y ayuda: máxima familiaridad, cero metal.")
    card(c, M+258, 166, 253, 100, "SERVICIO", "Entrega, compra segura, gift card y región: diagonales Dinoxo, círculo y un detalle azul como máximo.")
    c.showPage()


def page_language(c: canvas.Canvas):
    page_base(c, 8, dark=True)
    section_title(c, "07 / Dirección visual", "La energía se contiene", "El universo es oscuro y preciso. El comercio permanece limpio: el producto, el precio y la compatibilidad deben dominar.", dark=True)
    # Glowing arcs
    c.setStrokeColor(Color(BLUE_400.red, BLUE_400.green, BLUE_400.blue, alpha=.7)); c.setLineWidth(2)
    for r in (78,95,112): c.arc(W-270-r, H-330-r, W-270+r, H-330+r, 210, 185)
    draw_source_image(c, SYMBOL_PNG, W-342, H-402, 144, 144)
    c.setFont("Helvetica-Bold", 13); c.setFillColor(SILVER_100); c.drawString(M, 574, "Permitido")
    bullets(c, [
        "Arcos y discos como contenedores editoriales puntuales.",
        "Línea azul de 1-2 px y degradado azul noche discreto.",
        "Metal frío en render, campaña, portada o pieza hero.",
        "Textura granulada de baja intensidad en fondos grandes.",
    ], M, 548, 250, color=SILVER_200, dot=BLUE_400, size=9.2, leading=13, gap=8)
    c.setFont("Helvetica-Bold", 13); c.setFillColor(SILVER_100); c.drawString(M, 382, "Contención en producto")
    bullets(c, [
        "Catálogo, formularios, filtros y checkout usan superficies planas.",
        "El azul se reserva para acción, foco, selección y progreso.",
        "Texto, precios y condiciones permanecen en HTML, no en imágenes.",
    ], M, 356, W-2*M, color=SILVER_200, dot=BLUE_400, size=9.4, leading=13, gap=9)
    rounded_rect(c, M, 121, W-2*M, 100, NAVY_800, radius=12, stroke=GRAPHITE_700)
    c.setFont("Helvetica-Bold", 8); c.setFillColor(BLUE_400); c.drawString(M+18, 194, "REGLA DE ORO")
    c.setFont("Helvetica-Bold", 16); c.setFillColor(SILVER_100); c.drawString(M+18, 163, "El efecto visual abre la puerta.")
    c.drawString(M+18, 141, "La claridad termina la venta.")
    c.showPage()


def page_voice(c: canvas.Canvas):
    page_base(c, 9)
    section_title(c, "08 / Contenido", "Hablar como quien ayuda", "Conocimiento sin superioridad. Precisión sin frialdad. Cercanía sin promesas vacías.")
    pairs = [
        ("DIRECTO", "Elige tu región antes de pagar.", "Evita problemas con tu cuenta."),
        ("ÚTIL", "Recibirás el código y los pasos de canje.", "Todo llega rápido y fácil."),
        ("HUMANO", "¿No sabes cuál elegir? Te ayudamos.", "Compra como un verdadero gamer."),
        ("PRECISO", "Entrega estimada: 5 a 15 minutos.", "Entrega instantánea garantizada."),
    ]
    y=560
    for title,good,bad in pairs:
        c.setFont("Helvetica-Bold",8); c.setFillColor(LABEL_BLUE); c.drawString(M,y+46,title)
        rounded_rect(c,M,y,245,38,HexColor("#EDF8F3"),radius=8)
        c.setFillColor(GREEN); c.circle(M+15,y+19,4,fill=1,stroke=0)
        c.setFont("Helvetica-Bold",8.4); c.setFillColor(TEXT); c.drawString(M+28,y+15,good)
        rounded_rect(c,M+258,y,253,38,HexColor("#FFF1F3"),radius=8)
        c.setFillColor(RED); c.circle(M+273,y+19,4,fill=1,stroke=0)
        c.setFont("Helvetica",8.4); c.setFillColor(MUTED); c.drawString(M+286,y+15,bad)
        y-=92
    c.setFont("Helvetica-Bold", 13); c.setFillColor(TEXT); c.drawString(M, 180, "Antes de publicar")
    bullets(c, [
        "¿La promesa se puede demostrar?",
        "¿Plataforma, región, formato y entrega están claros?",
        "¿El cliente entiende la siguiente acción sin conocer jerga?",
    ], M, 156, W-2*M, size=9.2, leading=12.5, gap=7)
    c.showPage()


def page_access(c: canvas.Canvas):
    page_base(c, 10)
    section_title(c, "09 / Accesibilidad", "La experiencia debe incluir", "Objetivo mínimo: WCAG 2.2 AA. La identidad no puede depender de color, movimiento o percepción perfecta.")
    metrics=[("4.5:1","TEXTO NORMAL"),("3:1","TEXTO GRANDE, ICONOS Y CONTROLES"),("44 px","OBJETIVO TÁCTIL RECOMENDADO")]
    x=M
    for number,label in metrics:
        rounded_rect(c,x,521,160,112,MIDNIGHT_900,radius=12)
        c.setFont("Helvetica-Bold",24); c.setFillColor(BLUE_400); c.drawString(x+16,578,number)
        text_block(c,label,x+16,548,130,font="Helvetica-Bold",size=7.5,leading=10,color=SILVER_200)
        x+=173
    c.setFont("Helvetica-Bold",14); c.setFillColor(TEXT); c.drawString(M,475,"Checklist AA")
    bullets(c,[
        "Foco visible de 3 px con separación de 3 px.",
        "Navegación completa por teclado y orden lógico de foco.",
        "Texto alternativo por función; ornamentación con aria-hidden.",
        "Estados acompañados por texto o icono, nunca solo por color.",
        "Compatibilidad con prefers-reduced-motion.",
        "Errores claros, asociados al campo y con una acción de corrección.",
    ],M,448,W-2*M,size=9.4,leading=13,gap=8)
    rounded_rect(c,M,116,W-2*M,92,LIGHT,radius=12,stroke=LINE)
    c.setFont("Helvetica-Bold",10); c.setFillColor(TEXT); c.drawString(M+16,181,"Prueba mínima antes de lanzar")
    text_block(c,"Navegar sin mouse; aumentar zoom a 200%; probar tema oscuro; revisar mensajes de error; verificar contraste con una herramienta y confirmar lectura en un móvil real.",M+16,157,W-2*M-32,size=9.2,leading=13,color=MUTED)
    c.showPage()


def page_web(c: canvas.Canvas):
    page_base(c, 11)
    section_title(c, "10 / Aplicaciones", "De la identidad al producto", "La página se construye con tokens y componentes. El hero emociona; catálogo y checkout eliminan dudas.")
    steps=[
        ("01","HERO","Una imagen dominante, promesa breve y un CTA."),
        ("02","CATÁLOGO","Plataforma, región, precio y disponibilidad comparables."),
        ("03","DETALLE","Qué recibe, compatibilidad, región y proceso."),
        ("04","CONFIANZA","Evidencia, soporte y políticas fáciles de encontrar."),
        ("05","COMPRA","Pocos pasos, resumen persistente y estados explícitos."),
    ]
    y=577
    for num,title,body in steps:
        c.setFillColor(LABEL_BLUE); c.circle(M+16,y+8,16,fill=1,stroke=0)
        c.setFont("Helvetica-Bold",8); c.setFillColor(white); c.drawCentredString(M+16,y+5,num)
        c.setFont("Helvetica-Bold",10); c.setFillColor(TEXT); c.drawString(M+48,y+10,title)
        c.setFont("Helvetica",8.9); c.setFillColor(MUTED); c.drawString(M+145,y+10,body)
        c.setStrokeColor(LINE); c.line(M+48,y-11,W-M,y-11); y-=65
    rounded_rect(c,M,138,W-2*M,104,MIDNIGHT_900,radius=12)
    c.setFont("Helvetica-Bold",8); c.setFillColor(BLUE_400); c.drawString(M+18,215,"REDES")
    c.setFont("Helvetica-Bold",11); c.setFillColor(SILVER_100); c.drawString(M+18,189,"Avatar: símbolo  /  Portada: logo horizontal  /  Video: subtítulos siempre")
    text_block(c,"Una idea por lámina. Precios y vigencia en texto editable cuando sea posible. La apertura de video puede usar el símbolo durante un segundo, sin convertirlo en una animación ornamental larga.",M+18,168,W-2*M-36,size=8.5,leading=11,color=HexColor("#B9C8D6"))
    c.showPage()


def page_legal(c: canvas.Canvas):
    page_base(c, 12, dark=True)
    section_title(c, "11 / Control de marca", "Independiente, no confundible", "Dinoxo Store puede vender productos de plataformas reconocidas sin parecer una tienda oficial ni fusionar identidades.", dark=True)
    c.setFont("Helvetica-Bold",13); c.setFillColor(SILVER_100); c.drawString(M,586,"Co-branding")
    bullets(c,[
        "Separar visualmente la marca Dinoxo de logos y activos de terceros.",
        "No fusionar el emblema con símbolos de PlayStation, Sony, Xbox, Nintendo u otras marcas.",
        "No replicar tipografías, composición o trade dress identificable.",
        "No declarar autorización u oficialidad sin respaldo documental.",
        "Usar activos oficiales de terceros solo según sus guías y licencias.",
    ],M,560,W-2*M,color=SILVER_200,dot=BLUE_400,size=9.2,leading=13,gap=8)
    rounded_rect(c,M,302,W-2*M,104,NAVY_800,radius=12,stroke=GRAPHITE_700)
    c.setFont("Helvetica-Bold",8); c.setFillColor(AMBER); c.drawString(M+18,378,"AVISO")
    text_block(c,"Este Brand Kit no es asesoría legal ni acredita disponibilidad registral. Antes del registro, una campaña masiva o la expansión comercial, realizar búsqueda marcaria y revisión profesional en las jurisdicciones aplicables.",M+18,352,W-2*M-36,size=9.3,leading=13,color=SILVER_200)
    c.setFont("Helvetica-Bold",13); c.setFillColor(SILVER_100); c.drawString(M,262,"Siguiente decisión")
    bullets(c,[
        "Validar recortes raster del logo con diseño profesional.",
        "Probar reconocimiento a 16, 24 y 48 px.",
        "Construir tokens y componentes base antes de la página completa.",
        "Revisar licencias tipográficas, imágenes y activos comerciales.",
    ],M,236,W-2*M,color=SILVER_200,dot=BLUE_400,size=9.2,leading=13,gap=8)
    c.setFont("Helvetica-Bold",18); c.setFillColor(SILVER_100); c.drawString(M,94,"Identidad propia. Compra clara.")
    c.showPage()


def build_pdf() -> None:
    global MASTER_PNG, SYMBOL_PNG
    if not PRIMARY_LOGO.exists():
        raise FileNotFoundError(f"Required approved raster logo not found: {PRIMARY_LOGO}")
    MASTER_PNG = PRIMARY_LOGO
    SYMBOL_PNG = PRIMARY_LOGO
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("Dinoxo Store - Brand Book v1")
    c.setAuthor("Dinoxo Store")
    c.setSubject("Sistema de identidad visual, contenido y aplicaciones digitales")
    page_cover(c)
    page_essence(c)
    page_logo(c)
    page_clearspace(c)
    page_palette(c)
    page_type(c)
    page_icons(c)
    page_language(c)
    page_voice(c)
    page_access(c)
    page_web(c)
    page_legal(c)
    c.save()
    print(f"Generated {OUT}")


if __name__ == "__main__":
    build_pdf()
