# Supabase — fase 2

Proyecto remoto: `dinoxoStore` (`yvbrvclbqmvxxtfehxxp`). Las migraciones de
`migrations/` son la fuente de verdad para catálogo, autorización, auditoría y
Storage.

La configuración pública versionada del frontend solo contiene producción en
`apps/storefront/config/public-env.json`. Preview y desarrollo fallan de forma
cerrada y exigen ambos overrides `PUBLIC_SUPABASE_*` de un proyecto aislado; el
validador rechaza explícitamente el origen productivo. CI usa un origen `.invalid`
deliberadamente no funcional únicamente para comprobar el build estático.

## Aplicación local reproducible

Con Supabase CLI y Docker disponibles, sin enlazar ni tocar el remoto:

```bash
supabase db start
supabase test db --local
supabase stop --no-backup
```

`config.toml` fija PostgreSQL 17, igual que el proyecto remoto. Los tests pgTAP
comprueban esquema y comportamiento real con roles `anon` y `authenticated`, RLS,
Storage, auditoría y reordenamiento atómico. El job `database` de
`.github/workflows/quality.yml` instala Supabase CLI `2.101.0`, crea un stack
efímero, aplica todas las migraciones y ejecuta esos tests sin credenciales
remotas.

El borrador local de `/admin` incluye los campos del producto, todas las variantes
editadas o nuevas y las eliminaciones preparadas. Una eliminación se aplica solo
al pulsar `Aplicar eliminación`, por lo que una recarga puede restaurarla o
deshacerla antes de mutar la base.

## Acceso administrativo y gestión de usuarios

El panel usa `signInWithPassword` y no expone registro público, magic links,
recuperación ni cambio de contraseña. Los usuarios se crean y mantienen
manualmente en Supabase Auth → Users. El frontend solo puede iniciar sesión y
cerrarla.

`supabase/config.toml` deja el registro deshabilitado para cualquier stack local.
La misma restricción debe aplicarse en el proyecto remoto desde Auth → Settings;
la configuración del repositorio no modifica por sí sola los ajustes alojados.

Para habilitar el acceso inicial:

1. En Supabase Auth, desactiva el registro público y los métodos passwordless
   que no vayas a utilizar.
2. En Supabase Auth → Users, crea `arangurenj29@gmail.com` con su contraseña y
   confirma el correo si corresponde.
3. Abre `/admin` e introduce esas credenciales. El trigger de PostgreSQL crea la
   membresía `owner` al insertar esa identidad en Auth.

Para cada administrador adicional:

1. Crea el usuario y su contraseña desde Supabase Auth → Users.
2. Añade su membresía en `public.admin_users` desde el SQL Editor usando su
   `auth.users.id` y el rol `editor` u `owner`.
3. Si se pierde una contraseña, actualízala únicamente desde Supabase Auth →
   Users; el panel no ofrece recuperación ni cambio de contraseña.

No se debe insertar manualmente en `auth.users` ni entregar una clave secreta o
`service_role` al navegador. Cualquier otra identidad Auth queda sin membresía y
solo conserva la lectura pública permitida por RLS.

## Imágenes

El bucket acepta AVIF, GIF, JPEG, PNG y WebP de hasta 8 MB. El panel verifica
magic bytes contra el MIME declarado, decodifica el archivo y rechaza dimensiones
superiores a 4096 × 4096 px. `width` y `height` son obligatorios en
`product_media`. El orden se actualiza mediante el RPC transaccional
`reorder_product_media`; la restricción única `(product_id, position)` evita
duplicados.
