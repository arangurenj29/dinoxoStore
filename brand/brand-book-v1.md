# Dinoxo Store - Brand Book v1

**Decisión central:** Dinoxo Store será una marca gamer premium, rápida y confiable, con identidad propia. Toma del universo gaming la energía, la precisión y el contraste tecnológico, pero NO imita a PlayStation ni comunica afiliación con Sony.

## Uso inmediato

1. Trabaja siempre desde `brand/assets/logo/dinoxostore-logo-primary.png`, la única fuente maestra del logo.
2. SVG se reserva exclusivamente para iconografía funcional; nunca para sustituir, redibujar o simplificar el logo.
3. Usa azul eléctrico solo para acción, foco y pequeños momentos de reconocimiento.
4. Mantén el catálogo más limpio que el hero: la legibilidad vende más que el exceso de efectos.
5. Usa metal, textura y luz de borde únicamente como expresión promocional.
6. Aplica los tokens de `brand/tokens/` antes de diseñar componentes.

## 1. Esencia de marca

| Dimensión | Decisión v1 |
|---|---|
| Propósito | Facilitar compras digitales para gamers con orientación clara y entrega ágil. |
| Promesa | Entender qué compras, para qué región sirve y qué ocurrirá después del pago. |
| Personalidad | Confiable, ágil, experta, directa y cercana; nunca infantil ni estridente. |
| Público inicial | Gamers y compradores de regalos digitales que valoran rapidez, claridad y acompañamiento. |
| Posicionamiento | Tienda gamer independiente con experiencia digital cuidada. |

### Principios

- **Claridad antes que espectáculo.** El efecto visual abre la puerta; la información clara cierra la compra.
- **Rapidez con evidencia.** Explicar tiempos, pasos y condiciones; evitar absolutos.
- **Experiencia sin elitismo.** Hablar con conocimiento, sin obligar al cliente a dominar jerga.
- **Identidad propia.** Vender productos de plataformas reconocidas no convierte a Dinoxo Store en representante oficial.

## 2. Sistema de logo

El emblema integra una **D angular** con la cabeza de un dinosaurio. El ojo azul funciona como firma mínima. El círculo recuerda un control físico sin copiar botones, símbolos o marcas de una consola específica.

El logo aprobado es una pieza raster indivisible: emblema, textura, iluminación, wordmark y punto azul forman una sola composición. No se trazan, reconstruyen ni sustituyen por una versión vectorial.

### Jerarquía de archivos

| Archivo | Uso recomendado |
|---|---|
| `dinoxostore-logo-primary.png` | Fuente de verdad, presentaciones, portadas y composiciones de marca. |
| Derivados WebP/AVIF | Entrega web optimizada, siempre generados desde el PNG aprobado y sin alterar su composición. |
| Recortes raster documentados | Avatar o favicon cuando el tamaño exija una lectura específica; nunca reemplazan al maestro. |

### Área de seguridad

Usa **x = altura del ojo azul** como unidad. Conserva al menos `4x` alrededor del logo completo y `3x` alrededor del símbolo. Ningún texto, borde, fotografía o marca aliada entra en esa zona.

### Tamaños mínimos

| Aplicación | Mínimo |
|---|---:|
| Logo completo digital | 160 px de ancho |
| Recorte raster documentado | 32 px de ancho |
| Logo completo impreso | 35 mm de ancho |

No reduzcas el logo completo hasta perder la textura, el perfil o el wordmark. Para tamaños menores, usa un recorte raster aprobado y validado específicamente en 16/24/32 px.

### Fondos

- Preferido: azul noche o blanco.
- Permitido: fotografía con zona tonal estable y contraste medido.
- Evitar: textura de alto ruido detrás del wordmark, azul medio sin contraste o degradados multicolor.

## 3. Paleta

| Rol | Color | Hex | Uso |
|---|---|---|---|
| Midnight 950 | Azul negro | `#030A12` | Fondo cinematográfico |
| Midnight 900 | Azul noche | `#071526` | Superficie oscura principal |
| Navy 800 | Azul grafito | `#101B2A` | Superficie elevada |
| Graphite 700 | Grafito frío | `#263443` | Bordes y estructura |
| Silver 200 | Plata clara | `#D8E1EA` | Marca, texto secundario oscuro |
| Silver 100 | Blanco frío | `#EEF4F8` | Texto sobre oscuro |
| Blue 500 | Azul eléctrico | `#178BFF` | Acción, punto y foco |
| Blue 400 | Azul luminoso | `#24A2FF` | Hover o destello puntual |
| Blue 700 | Azul accesible | `#0057B8` | Texto azul, foco y CTA sobre blanco |

Estados: éxito `#16A86A`, advertencia `#B86F00`, error `#D83B4C`. Nunca expresar un estado solo por color; acompáñalo con texto o icono.

### Proporción orientativa

- 70% superficies neutras y espacio respirable.
- 20% estructura, texto y grafito.
- 10% azul eléctrico y estados.

## 4. Tipografía

| Rol | Familia sugerida | Alternativa | Regla |
|---|---|---|---|
| Display | Space Grotesk | Inter / Arial | Títulos breves, semibold o bold |
| Interfaz y cuerpo | Inter | Arial / sans-serif | Alta legibilidad, 400-600 |
| Códigos | IBM Plex Mono | Menlo / monospace | Códigos, seriales y metadatos |

Máximo dos familias visibles por pantalla. No se ha adquirido ninguna licencia como parte de este kit: valida la licencia y el alojamiento web antes de publicar. La tipografía integrada en el logo raster no debe reconstruirse como texto web; la tipografía de interfaz se licencia y selecciona de forma independiente.

## 5. Iconografía

### Funcional

Carrito, búsqueda, menú, cuenta, contacto, pago, copiar y ayuda deben parecer familiares antes que “de marca”. Base: 24 px, trazo 1.75 px, remates y uniones redondas, sin metal ni sombras.

Estos iconos funcionales y de servicio son el único uso aprobado de SVG. Deben vivir en `brand/assets/icons/` y conservar significado, contraste y nombre accesible en la interfaz.

### De servicio

Entrega inmediata, compra segura, gift card y región pueden heredar:

- diagonales tensas de la D;
- círculos y cortes precisos;
- un detalle azul;
- relación entre masa sólida y vacío.

No repetir el dinosaurio en cada pictograma. La repetición literal reduce reconocimiento y añade ruido.

## 6. Lenguaje gráfico

### Tesis visual

**Precisión metálica sobre profundidad azul noche, con energía eléctrica contenida.**

### Elementos permitidos

- Disco o arco circular como contenedor editorial, no como botón universal.
- Líneas de borde azul de 1-2 px.
- Degradado discreto entre `#030A12` y `#101B2A`.
- Metal frío en renders promocionales y campañas.
- Textura granulada en fondos grandes, a baja intensidad.

### Regla de contención

En comercio, el producto y el precio mandan. Reserva el render 3D para hero, campaña o portada. Tarjetas, formularios, tablas, filtros y checkout usan superficies planas.

## 7. Fotografía e imágenes

- Usar fotografía o mockups de producto con iluminación fría y fondo despejado.
- Dejar un área tonal estable para texto; no pegar texto sobre carátulas saturadas.
- No incrustar precio, condiciones o CTA dentro de la imagen: deben permanecer en HTML.
- Mantener representación honesta del producto, plataforma, región y formato digital.
- Separar visualmente contenido propio de activos oficiales de fabricantes.

## 8. Voz y contenido

### Cómo habla Dinoxo

- Directo: “Elige tu región antes de pagar”.
- Útil: “Recibirás el código y los pasos de canje”.
- Humano: “¿No sabes cuál elegir? Te ayudamos”.
- Preciso: indicar plazos, restricciones y medios de entrega reales.

### Evitar

- “100% seguro”, “oficial” o “instantáneo” sin soporte verificable.
- Jerga innecesaria, urgencia artificial o exceso de mayúsculas.
- Tono infantil, agresivo o de superioridad técnica.
- Confundir tienda, plataforma, publisher y método de entrega.

## 9. Accesibilidad

Objetivo mínimo: **WCAG 2.2 nivel AA**.

- Contraste de 4.5:1 para texto normal.
- Contraste de 3:1 para texto grande, controles e iconos que comunican estado.
- Foco visible `#0057B8` de 3 px con separación de 3 px sobre fondos claros; en oscuro usar `#94D1FF`.
- Objetivos táctiles recomendados de 44 x 44 px.
- Navegación completa con teclado y orden de foco lógico.
- Texto alternativo que describa función; los ornamentos usan `aria-hidden="true"`.
- Respetar `prefers-reduced-motion`.
- No depender de color, hover, sonido o movimiento para comunicar información crítica.

## 10. Aplicaciones web y sociales

### Web

1. **Hero:** fondo oscuro, una imagen dominante, promesa breve y CTA único.
2. **Catálogo:** plano, limpio, con plataforma, región, precio y disponibilidad fáciles de comparar.
3. **Detalle:** explicar qué recibe el cliente, compatibilidad, región y proceso.
4. **Confianza:** testimonios verificables, canales de soporte y políticas claras.
5. **Compra:** mínimos pasos, resumen persistente y estados explícitos.

El azul eléctrico se reserva para CTA, foco, selección y señales de progreso. Metal y brillo no aparecen en cada botón.

### Social

- Avatar: recorte raster aprobado sobre azul noche.
- Portada: logo raster completo, promesa breve y espacio respirable.
- Reels/TikTok: apertura de 1 segundo con símbolo; subtítulos siempre.
- Carruseles: una idea por lámina; precio y vigencia fuera de la imagen cuando sea posible.

## 11. Co-branding y propiedad intelectual

Dinoxo Store puede identificar plataformas y productos vendidos, pero las marcas de terceros deben aparecer como **referencias de producto**, no como elementos estructurales del logo propio.

- Mantener separación visual y área de seguridad entre marcas.
- No fusionar el símbolo Dinoxo con logos de PlayStation, Sony, Xbox, Nintendo u otras plataformas.
- No replicar tipografías, símbolos de botones, composiciones o trade dress identificable.
- No declarar “distribuidor autorizado”, “tienda oficial” o equivalentes sin autorización documental.
- Usar activos oficiales de terceros solo conforme a sus guías y licencias.

**Aviso:** este documento no es asesoría legal ni acredita disponibilidad registral. Antes de registro, campaña masiva o expansión comercial, realizar búsqueda marcaria y revisión profesional en las jurisdicciones aplicables.

## 12. Usos prohibidos

- Estirar, inclinar, recolorear libremente o aplicar filtros al logo.
- Sustituir el punto azul del wordmark por símbolos de una plataforma.
- Regenerar, vectorizar o sustituir el raster aprobado por una aproximación del render metálico.
- Colocar el logo sobre fondos sin contraste medido.
- Mezclar más de dos tipografías o varios azules de acento sin función.
- Convertir navegación, precio o condiciones en imagen.
- Crear iconos funcionales ornamentales que pierdan reconocimiento.

## Checklist de publicación

- [ ] Se usó el raster aprobado o un derivado WebP/AVIF generado desde él, sin alterar la composición.
- [ ] Los SVG presentes corresponden exclusivamente a iconos funcionales o de servicio.
- [ ] Se respetó área de seguridad y tamaño mínimo.
- [ ] Colores y espaciado vienen de tokens.
- [ ] Contraste y foco cumplen WCAG 2.2 AA.
- [ ] Plataforma, región y entrega se explican claramente.
- [ ] Las marcas de terceros no sugieren afiliación.
- [ ] Se verificaron licencias de fuentes, imágenes y activos.
- [ ] Logo e iconos se probaron en móvil, escritorio y modo oscuro.

## Próximo paso recomendado

Validar recortes raster del logo a 16/24/48 px con diseño profesional y construir la primera biblioteca UI: botón, campo, selector de plataforma, tarjeta de producto, selector de región, resumen de compra, avisos y estados.
