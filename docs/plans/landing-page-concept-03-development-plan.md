# Plan de desarrollo — Landing Dinoxo Store, concepto 03

**Estado:** listo para estimación e implementación

**Destino:** `arangurenj29/dinoxoStore`

**Arquitectura base:** `docs/architecture/landing-page-cloudflare-free.md`

**Dirección visual:** concepto 03, confianza primero

## 1. Resultado esperado

Publicar en `https://dinoxostore.com/` una landing estática, rápida y accesible que:

- preserve el logo raster aprobado como núcleo de la identidad;
- comunique “Tu recarga, rápida y segura” sin promesas no demostrables;
- explique el proceso de compra y lleve a un único canal de conversión: WhatsApp;
- muestre un preview tipado de productos sin adelantar todavía Supabase;
- quede preparada para incorporar catálogo dinámico y panel administrativo en una fase posterior;
- cumpla los presupuestos de rendimiento, accesibilidad, SEO y seguridad definidos en la arquitectura.

## 2. Base verificada

- El repositorio remoto existe, su rama por defecto es `main` y está vacío.
- El directorio local actual contiene Brand Kit y arquitectura, pero todavía no es un checkout Git.
- No existen workspace, Astro, Wrangler, CI ni pruebas.
- El concepto 03 solo define la dirección del primer viewport; no existe aún una especificación completa de página larga ni responsive.
- Los PNG fuente pesan aproximadamente entre 1.5 y 2.3 MB, por lo que no pueden publicarse sin derivados optimizados.
- Hay una contradicción documental que debe resolverse antes de implementar `Logo`:
  - `brand/brand-book-v1.md` todavía prescribe SVG para el logo;
  - la decisión vigente y `brand/assets/visuals/README.md` fijan el PNG raster como logo principal inmutable y reservan SVG para iconografía funcional.

## 3. Decisiones de arquitectura para esta entrega

### 3.1 Landing primero; datos después

La primera entrega será una **landing estática vertical completa**. Quedan fuera de esta cadena:

- Supabase, migraciones y RLS;
- catálogo dinámico y detalle de producto;
- panel administrativo;
- carrito, pagos, pedidos y cuentas de cliente.

La razón es simple: mezclar adquisición, catálogo y backoffice en el primer cambio impediría revisar bien cada riesgo. Primero validamos mensaje, confianza y conversión; después incorporamos datos operativos.

### 3.2 Astro como SSG sin adaptador en la primera publicación

La landing se compilará como sitio estático y Cloudflare Workers Static Assets servirá `dist/`. Astro no necesita adaptador para SSG. Esto mantiene el JavaScript inicial cerca de cero y evita invocaciones dinámicas innecesarias.

Cuando llegue el catálogo dinámico, se añadirá `@astrojs/cloudflare` y la landing permanecerá prerenderizada. Esta evolución debe registrarse como un cambio explícito, no introducirse de forma preventiva.

### 3.3 Contenido estático tipado y sustituible

`CatalogPreview` recibirá datos estáticos validados desde un módulo de contenido. La UI no conocerá Supabase. En la fase de catálogo se sustituirá el proveedor de datos, no los componentes presentacionales.

No se creará `packages/ui` hasta que exista reutilización real con el panel. Tampoco se creará `packages/catalog-contracts` en esta cadena si todavía no está cerrado el modelo de catálogo.

### 3.4 Política de marca

- `dinoxostore-logo-primary.png` se conserva byte a byte como fuente de verdad.
- WebP/AVIF, tamaños y recortes son derivados de entrega, no nuevos logos.
- Los iconos funcionales permanecen en SVG.
- No se integrarán símbolos, logos ni tipografía propietaria de PlayStation/Sony en la identidad Dinoxo.
- Productos y plataformas de terceros solo se nombrarán o representarán cuando haya permiso y fuente licenciada.

## 4. Arquitectura de contenido

La página seguirá este recorrido:

1. **Header mínimo** — logo, navegación por anclas y CTA WhatsApp.
2. **Hero full-bleed** — “Tu recarga, rápida y segura”, explicación breve, CTA principal y enlace a catálogo.
3. **Prueba rápida** — tres señales verificables: entrega digital, atención directa y canal oficial.
4. **Cómo funciona** — elegir, confirmar y recibir; tres pasos concretos.
5. **Productos destacados** — preview estático, comparable y sin slider.
6. **Confianza** — condiciones, soporte y evidencia real; nunca cifras inventadas.
7. **Preguntas frecuentes** — HTML nativo con `<details>` si hay contenido suficiente.
8. **CTA final** — una sola acción de compra.
9. **Footer** — contacto, redes oficiales, privacidad y términos.

### Principios visuales

- Tesis: precisión metálica sobre profundidad azul noche, con energía eléctrica contenida.
- Hero amplio y dominante; el resto de la página reduce efectos para priorizar lectura.
- Máximo dos familias tipográficas visibles.
- Evitar “card soup”: solo productos y elementos interactivos usan contenedores cuando ayudan a comparar o accionar.
- Movimiento limitado a entrada inicial, profundidad sutil del hero y feedback de interacción.
- `prefers-reduced-motion` elimina todo movimiento no esencial.

## 5. Estructura inicial prevista

```text
DinoxoStore/
├── apps/
│   └── storefront/
│       ├── public/
│       │   ├── _headers
│       │   ├── _redirects
│       │   └── brand/
│       ├── src/
│       │   ├── components/
│       │   │   ├── core/
│       │   │   └── sections/
│       │   ├── content/
│       │   ├── layouts/
│       │   ├── pages/
│       │   └── styles/
│       ├── tests/
│       ├── astro.config.mjs
│       └── wrangler.jsonc
├── brand/
├── docs/
│   ├── architecture/
│   └── plans/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Componentes iniciales:

- `BaseLayout`, `SeoHead`, `StructuredData`;
- `Container`, `Logo`, `Icon`, `ButtonLink`, `SectionHeading`;
- `SiteHeader`, `SiteFooter`;
- `Hero`, `ProofStrip`, `HowItWorks`, `CatalogPreview`, `Trust`, `Faq`, `FinalCta`.

## 6. Work units y cadena de PRs

El trabajo completo excederá 400 líneas. Se recomienda una **feature-branch chain** con un PR tracker en borrador.

```text
tracker/landing-v1
├── PR 1 · chore/storefront-foundation
│   └── PR 2 · feat/landing-hero-brand
│       └── PR 3 · feat/landing-customer-journey
│           └── PR 4 · feat/landing-production-readiness
```

Cada PR debe poder revisarse y verificarse por separado. Los tests y la documentación viajan con el comportamiento que validan.

### PR 1 — Fundación reproducible y desplegable

**Objetivo:** convertir el material local en un repositorio limpio con una página Astro mínima servida como activo estático.

Trabajo:

- inicializar el checkout y conectar `origin` sin versionar `output/`, `outputs/`, `tmp/` ni `.DS_Store`;
- conservar `brand/`, arquitectura y este plan como fuentes versionadas;
- corregir la política contradictoria del logo en el Brand Book;
- crear workspace pnpm, TypeScript estricto, Astro y scripts raíz;
- configurar Wrangler para `dist/` y una página `404` real, no fallback SPA;
- añadir formato, lint, `astro check`, pruebas y build;
- preparar preview con `noindex` y producción indexable;
- crear un smoke test de la ruta raíz.

Aceptación:

- instalación reproducible con lockfile congelado;
- formato, lint, typecheck, pruebas y build pasan;
- `/` y `/404.html` salen del build estático;
- no hay secretos ni artefactos temporales versionados;
- el HTML base no necesita hidratación.

Nota de revisión: `pnpm-lock.yaml` puede superar por sí solo el presupuesto de líneas. Registrar una excepción de tamaño solo para el archivo generado; manifiestos y configuración siguen bajo revisión normal.

### PR 2 — Sistema visual web y hero concepto 03

**Objetivo:** entregar el primer viewport reconocible y responsive.

Trabajo:

- consumir `brand/tokens/brand.css` sin duplicar hexadecimales;
- implementar layout, header, logo, iconos y botones;
- construir el hero full-bleed del concepto 03;
- generar derivados AVIF/WebP y `srcset` para hero y logo;
- reservar dimensiones para evitar CLS;
- integrar CTA WhatsApp y navegación por anclas;
- añadir movimiento sutil con alternativa reduced-motion;
- escribir pruebas del primer viewport antes de completar estilos.

Aceptación:

- 360, 768 y 1440 px verificados;
- logo fuente sin alteración y sin sustitución SVG;
- hero móvil ≤250 KB y escritorio ≤450 KB;
- objetivos táctiles ≥44×44 px;
- contraste WCAG 2.2 AA y foco visible;
- JavaScript inicial cercano a 0 KB;
- no aparecen marcas PlayStation/Sony como identidad Dinoxo.

### PR 3 — Recorrido comercial completo

**Objetivo:** explicar la compra, demostrar confianza y conducir a conversión.

Trabajo:

- implementar `ProofStrip`, `HowItWorks`, `CatalogPreview`, `Trust`, `Faq`, `FinalCta` y footer;
- modelar productos destacados como datos estáticos tipados;
- mantener plataforma, región, denominación y entrega como HTML legible;
- generar mensajes de WhatsApp contextuales cuando exista un producto seleccionado;
- añadir semántica, teclado, estados de foco y pruebas responsive;
- enlazar redes oficiales sin fabricar estadísticas o testimonios.

Aceptación:

- cada sección cumple una función y no repite el mismo argumento;
- la página se comprende y convierte con JavaScript deshabilitado;
- el preview se puede alimentar luego desde Supabase sin reescribir la UI;
- no existen promesas absolutas, reseñas ni cifras sin fuente;
- CTA y enlaces funcionan mediante teclado y lector de pantalla;
- iconografía funcional usa los SVG aprobados.

### PR 4 — SEO, seguridad, rendimiento y producción

**Objetivo:** dejar la landing lista para dominio real con evidencia automatizada.

Trabajo:

- canonical, robots, sitemap, Open Graph y JSON-LD;
- headers de seguridad y política CSP mínima;
- redirección `www` → dominio raíz;
- Playwright en viewports críticos;
- smoke de accesibilidad y Lighthouse CI;
- pipeline de preview/deploy en Cloudflare;
- smoke post-deploy de HTTP, canonical, headers y CTA;
- Cloudflare Web Analytics solo en producción.

Aceptación:

- Lighthouse Performance ≥90 móvil;
- LCP ≤2.5 s, INP ≤200 ms y CLS ≤0.1;
- CSS inicial ≤50 KB comprimido;
- JavaScript inicial ≤70 KB, objetivo cercano a cero;
- preview no indexable y producción indexable;
- canonical `https://dinoxostore.com/`;
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y protección contra framing activos;
- navegación completa por teclado y reduced-motion verificados.

## 7. Estrategia de pruebas

Aplicar TDD por comportamiento, no por snapshot decorativo:

| Nivel | Evidencia |
|---|---|
| Contenido | campos obligatorios, URLs y mensajes WhatsApp válidos |
| Componentes | roles, nombres accesibles, jerarquía y estados |
| Integración | anclas, CTA, navegación y 404 |
| Responsive | Playwright en 360, 768 y 1440 px |
| Accesibilidad | teclado, foco, contraste y axe smoke |
| Rendimiento | peso de assets, budgets de JS/CSS y Lighthouse CI |
| Producción | status, headers, canonical, robots y enlaces externos |

El pipeline de esta cadena es deliberadamente un subconjunto del pipeline total de la arquitectura. Las migraciones y pruebas RLS se incorporarán con la fase Supabase, no como pasos vacíos.

## 8. Datos necesarios antes de cerrar implementación

No bloquean el bootstrap, pero sí la aprobación final del contenido:

1. Número de WhatsApp en formato internacional y texto prellenado.
2. Productos destacados, denominaciones, región, moneda y disponibilidad.
3. Plazo real de atención y entrega que respalde la palabra “rápida”.
4. Evidencia de reputación autorizada para publicación.
5. Razón o nombre comercial, contacto y textos legales.
6. Licencia y alojamiento de las tipografías finales.
7. Origen y licencia de imágenes y marcas de producto.
8. Cuenta/proyecto Cloudflare, dominio y credenciales OIDC/CI.
9. Especificación responsive final: crops, orden móvil y alturas del hero.

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| PNG fuente demasiado pesado | conservar fuente y publicar derivados AVIF/WebP medidos |
| Uso accidental del logo SVG rechazado | corregir Brand Book antes de crear `Logo` y añadir prueba de ruta del activo |
| Confianza inventada | publicar solo evidencia verificable y fechada |
| Propiedad intelectual de terceros | separar identidad Dinoxo de marcas/productos y validar licencias |
| Alcance descontrolado | mantener Supabase, admin y catálogo dinámico fuera de esta cadena |
| UI acoplada a datos temporales | contrato tipado y componente presentacional independiente del proveedor |
| Preview indexada | header `X-Robots-Tag: noindex` y prueba automatizada |

## 10. Definition of Done de la landing

- [ ] Los cuatro PRs están revisados y sus checks pasan.
- [ ] El logo raster aprobado sigue siendo la fuente de verdad.
- [ ] La landing completa funciona sin JavaScript esencial.
- [ ] CTA, contenido comercial y evidencia han sido aprobados.
- [ ] WCAG 2.2 AA y presupuestos de rendimiento están verificados.
- [ ] SEO, headers, redirecciones y preview noindex están activos.
- [ ] Producción responde correctamente en `dinoxostore.com`.
- [ ] El plan de catálogo/Supabase queda como una iniciativa separada.

## 11. Referencias técnicas

- Arquitectura local: `docs/architecture/landing-page-cloudflare-free.md`
- Astro Cloudflare: <https://docs.astro.build/en/guides/integrations-guide/cloudflare/>
- Cloudflare Astro: <https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/>
- Cloudflare Static Assets: <https://developers.cloudflare.com/workers/static-assets/routing/>
