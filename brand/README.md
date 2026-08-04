# Dinoxo Store - Brand Kit v1

Este directorio es la **fuente operativa de identidad** para web, redes y piezas comerciales. `assets/logo/dinoxostore-logo-primary.png` es el único logo maestro aprobado. Su composición raster, textura, iluminación, emblema, wordmark y punto azul no se redibujan ni se sustituyen.

## Ruta rápida

1. Usa `assets/logo/dinoxostore-logo-primary.png` como fuente de verdad.
2. Genera WebP/AVIF y recortes raster documentados solo como derivados de entrega; conserva intacto el PNG maestro.
3. Usa SVG exclusivamente para iconos funcionales y de servicio ubicados en `assets/icons/`.
4. Importa `tokens/brand.css` y aplica sus variables, sin copiar colores manualmente.
5. Consulta `brand-book-v1.md` antes de crear una aplicación nueva.

## Fuente de verdad

| Necesidad | Archivo |
|---|---|
| Manual práctico | `brand-book-v1.md` |
| Logo maestro raster | `assets/logo/dinoxostore-logo-primary.png` |
| Iconografía funcional SVG | `assets/icons/` |
| Tokens agnósticos | `tokens/brand.tokens.json` |
| Variables CSS | `tokens/brand.css` |
| Fondos promocionales raster | `assets/visuals/` |

Los antiguos ensayos vectoriales del logo se conservan únicamente como historial en `archive/legacy-vector-logo/`. Están fuera del flujo operativo y NO pueden importarse, publicarse ni usarse para regenerar la marca.

## Iconos incluidos

Todos usan `viewBox="0 0 24 24"`, trazo de 1.75 px, remates redondos y `currentColor`.

| Tipo | Iconos |
|---|---|
| Funcionales | `cart`, `search`, `menu`, `account`, `whatsapp-contact`, `payment`, `copy-code`, `help` |
| Servicio | `instant-delivery`, `secure-purchase`, `gift-card`, `region` |

El icono `whatsapp-contact.svg` es un símbolo neutral de contacto; NO reproduce la marca de WhatsApp. Si se usa el logotipo oficial de una plataforma, debe obtenerse de su kit de marca y respetar sus condiciones.

### SVG inline y accesibilidad

Cada icono tiene un ID de título único dentro del kit. Si el mismo SVG se inserta varias veces, usa `<img alt="...">`, un sprite con `<symbol>` o IDs únicos por instancia. Repetir el mismo `id` rompe la relación accesible.

## Reglas no negociables

- No redibujar, vectorizar, estirar, girar, recolorear ni añadir filtros al logo raster aprobado.
- No usar los SVG históricos del logo en aplicaciones operativas.
- No usar símbolos, tipografías o composiciones que pretendan imitar a PlayStation u otra plataforma.
- No prometer afiliación, autorización o seguridad absoluta sin evidencia.
- Mantener WCAG 2.2 AA: 4.5:1 para texto normal y 3:1 para texto grande, controles e iconos relevantes.
- Validar licencias tipográficas y disponibilidad marcaria antes de un lanzamiento comercial definitivo.

## Regeneración reproducible

Ejecuta desde la raíz del proyecto:

```bash
# 1. Iconos y tokens. Este comando NO genera logos.
python3 brand/tools/build_brand_assets.py

# 2. PDF; consume directamente el PNG maestro aprobado.
PY=/Users/vassperu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3.12
"$PY" brand/tools/build_brand_book_pdf.py

# 3. QA visual del PDF generado.
"$PY" brand/tools/build_pdf_qa.py

# 4. Integridad del raster, SVG solo en iconos, tokens y contraste.
python3 brand/tools/validate_brand.py
```

## Validación complementaria

```bash
jq empty brand/tokens/brand.tokens.json
xmllint --noout brand/assets/icons/*.svg
python3 -m py_compile brand/tools/build_brand_assets.py brand/tools/validate_brand.py
"$PY" -m py_compile brand/tools/build_brand_book_pdf.py brand/tools/build_pdf_qa.py
```
