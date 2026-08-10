# Despliegue automático del storefront a Cloudflare

Cada push o merge a `main` despliega `dinoxostore-storefront` únicamente después
de que los jobs `storefront` y `database` terminen correctamente. Los pull
requests ejecutan todos los gates, pero **nunca modifican producción**.
Las migraciones de Supabase se aplican manualmente al único proyecto productivo;
este workflow nunca escribe en Supabase.

## Configuración manual única

1. En GitHub, crea el **GitHub Environment `production`**. Si el repositorio lo
   permite, agrega required reviewers para proteger el acceso a producción.
2. En ese environment agrega:
   - Secret `CLOUDFLARE_API_TOKEN`.
   - Variable `CLOUDFLARE_ACCOUNT_ID`.
3. En Cloudflare crea un token personalizado, limitado a la cuenta y zona de
   Dinoxo Store, con estos permisos mínimos para la configuración actual:

| Recurso | Permiso | Motivo |
|---|---|---|
| Cuenta de Dinoxo Store | `Workers Scripts Edit` | Cargar y activar versiones de `dinoxostore-storefront`. |
| Zona `dinoxostore.com` | `Workers Routes Edit` | Mantener el custom domain declarado en `wrangler.jsonc`. |

No otorgues KV, R2, D1, DNS ni permisos administrativos: este Worker no usa esos
recursos. Cloudflare también ofrece la plantilla **Edit Cloudflare Workers**, pero
incluye permisos adicionales; para mínimo privilegio, usa el token personalizado
anterior y limita sus recursos a una sola cuenta y una sola zona.

Los identificadores de cuenta y proyecto no son secretos y se almacenan como
variables. Los tokens y la contraseña sí son secretos: NO deben aparecer en el
repositorio, logs, variables públicas ni archivos `.env`.

## Flujo de producción

```text
push main
├─ storefront: format, lint, types, unitarias y builds
├─ database: stack Supabase local, migraciones y pgTAP
└─ deploy (solo si ambos pasan)
   ├─ instalación frozen y build:production
   ├─ Wrangler deploy desde apps/storefront
   └─ smoke de https://dinoxostore.com y /admin
```

El job `database` arranca una base efímera dentro del runner de GitHub y aplica
los archivos versionados en `supabase/migrations` solo para probarlos junto con
pgTAP. Esa base se destruye al finalizar y no es un segundo proyecto Supabase.

Antes de fusionar cambios de esquema, aplicá manualmente las migraciones al único
proyecto productivo con `supabase db push --linked`, verificá el historial remoto y
comprobá el panel `/admin`. No se ejecutan seeds ni resets automáticamente. Los
cambios manuales hechos fuera de esas migraciones continúan siendo drift y deben
reconciliarse mediante una nueva migración versionada.

El job `deploy` usa el GitHub Environment `production`. Cada workflow se encola
detrás del anterior y no se cancela una ejecución en curso
(`cancel-in-progress: false`). No existe `workflow_dispatch`: una ejecución manual
no puede saltarse los gates.

El smoke HTTP reintenta durante la propagación del edge y sigue redirects, pero
exige que `/` termine exactamente en `/` y que `/admin` termine en `/admin` o
`/admin/` sobre el host HTTPS esperado. Falla si cualquiera no responde `200`,
si HSTS no declara un `max-age` entero mayor que cero, si faltan CSP o
`X-Content-Type-Options: nosniff`, o si `/admin` no incluye `robots: noindex`.
Ese job no recibe credenciales de producción.

## Acciones fijadas

Las acciones externas que participan en el pipeline están fijadas por SHA
completo. Los comentarios conservan el tag humano; al actualizar una acción,
verifica el nuevo SHA contra el tag del repositorio oficial.

| Acción | Tag | SHA fijado |
|---|---|---|
| `actions/checkout` | `v4` | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | `v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `supabase/setup-cli` | `v3` | `46f7f98c7f948ad727d22c1e67fab04c223a0520` |
| `cloudflare/wrangler-action` | `v3` | `9acf94ace14e7dc412b076f2c5c20b8ce93c79cd` |

## Verificación y rollback

Ante un incidente, identifica primero una versión estable y revierte desde el
directorio del Worker:

```bash
cd apps/storefront
pnpm wrangler versions list
pnpm wrangler rollback <VERSION_ID> --message "Rollback por incidente <ID>"
```

`wrangler rollback` cambia inmediatamente la versión activa. Verifica después el
dominio, `/admin`, headers y logs. El rollback del Worker NO revierte la base de
datos: una corrección de esquema debe publicarse como una nueva migración hacia
adelante, nunca borrando o reescribiendo una migración ya aplicada.
