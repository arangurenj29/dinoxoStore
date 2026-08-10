-- Dinoxo Store phase 2: Auth-backed administration, catalog, audit and product media.
create schema if not exists private;
revoke all on schema private from public;

create type public.admin_role as enum ('owner', 'editor');
create type public.catalog_status as enum ('draft', 'published', 'archived');

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  status public.catalog_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_name_not_blank check (length(btrim(name)) between 2 and 120),
  constraint products_archive_consistency check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  name text not null,
  platform text not null,
  region text not null,
  denomination text not null,
  price_minor bigint not null,
  currency char(3) not null,
  status public.catalog_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_format check (sku ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'),
  constraint product_variants_name_not_blank check (length(btrim(name)) between 1 and 120),
  constraint product_variants_platform_not_blank check (length(btrim(platform)) between 1 and 80),
  constraint product_variants_region_not_blank check (length(btrim(region)) between 1 and 80),
  constraint product_variants_denomination_not_blank check (length(btrim(denomination)) between 1 and 80),
  constraint product_variants_price_nonnegative check (price_minor >= 0),
  constraint product_variants_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint product_variants_archive_consistency check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  position integer not null default 0,
  mime_type text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_media_path_format check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f-]+\.(avif|gif|jpe?g|png|webp)$'
  ),
  constraint product_media_alt_not_blank check (length(btrim(alt_text)) between 1 and 180),
  constraint product_media_position_nonnegative check (position >= 0),
  constraint product_media_mime_allowed check (
    mime_type in ('image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp')
  ),
  constraint product_media_width_positive check (width is null or width > 0),
  constraint product_media_height_positive check (height is null or height > 0)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index products_status_idx on public.products (status) where archived_at is null;
create index product_variants_product_position_idx on public.product_variants (product_id, status);
create index product_media_product_position_idx on public.product_media (product_id, position);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, changed_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, changed_at desc);

create function private.is_active_admin(candidate_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users as administrator
    where administrator.user_id = candidate_user_id
      and administrator.active
  );
$$;

create function private.bootstrap_initial_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if lower(coalesce(new.email, '')) = 'arangurenj29@gmail.com' then
    insert into public.admin_users (user_id, role, active)
    values (new.id, 'owner', true)
    on conflict (user_id) do update
      set role = excluded.role,
          active = true,
          updated_at = now();
  end if;

  return new;
end;
$$;

create trigger bootstrap_initial_admin_after_auth_signup
after insert on auth.users
for each row execute function private.bootstrap_initial_admin();

-- Backfill safely when the allowed identity existed before this migration.
insert into public.admin_users (user_id, role, active)
select id, 'owner', true
from auth.users
where lower(coalesce(email, '')) = 'arangurenj29@gmail.com'
on conflict (user_id) do update
set role = excluded.role,
    active = true,
    updated_at = now();

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_admin_users_updated_at
before update on public.admin_users
for each row execute function private.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function private.set_updated_at();

create trigger set_product_media_updated_at
before update on public.product_media
for each row execute function private.set_updated_at();

create function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record_id uuid;
begin
  record_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_log (
    actor_id,
    entity,
    entity_id,
    action,
    old_data,
    new_data
  ) values (
    auth.uid(),
    tg_table_name,
    record_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_products
after insert or update or delete on public.products
for each row execute function private.write_audit_log();

create trigger audit_product_variants
after insert or update or delete on public.product_variants
for each row execute function private.write_audit_log();

create trigger audit_product_media
after insert or update or delete on public.product_media
for each row execute function private.write_audit_log();

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.audit_log enable row level security;

create policy "Active administrator reads own membership"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()) and active);

create policy "Public reads published products"
on public.products for select
to anon, authenticated
using (status = 'published' and archived_at is null);

create policy "Active admins read all products"
on public.products for select
to authenticated
using (private.is_active_admin((select auth.uid())));

create policy "Active admins insert products"
on public.products for insert
to authenticated
with check (private.is_active_admin((select auth.uid())));

create policy "Active admins update products"
on public.products for update
to authenticated
using (private.is_active_admin((select auth.uid())))
with check (private.is_active_admin((select auth.uid())));

create policy "Public reads published product variants"
on public.product_variants for select
to anon, authenticated
using (
  status = 'published'
  and archived_at is null
  and exists (
    select 1
    from public.products
    where products.id = product_variants.product_id
      and products.status = 'published'
      and products.archived_at is null
  )
);

create policy "Active admins read all product variants"
on public.product_variants for select
to authenticated
using (private.is_active_admin((select auth.uid())));

create policy "Active admins insert product variants"
on public.product_variants for insert
to authenticated
with check (private.is_active_admin((select auth.uid())));

create policy "Active admins update product variants"
on public.product_variants for update
to authenticated
using (private.is_active_admin((select auth.uid())))
with check (private.is_active_admin((select auth.uid())));

create policy "Active admins delete product variants"
on public.product_variants for delete
to authenticated
using (private.is_active_admin((select auth.uid())));

create policy "Public reads media for published products"
on public.product_media for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_media.product_id
      and products.status = 'published'
      and products.archived_at is null
  )
);

create policy "Active admins read all product media"
on public.product_media for select
to authenticated
using (private.is_active_admin((select auth.uid())));

create policy "Active admins insert product media"
on public.product_media for insert
to authenticated
with check (private.is_active_admin((select auth.uid())));

create policy "Active admins update product media"
on public.product_media for update
to authenticated
using (private.is_active_admin((select auth.uid())))
with check (private.is_active_admin((select auth.uid())));

create policy "Active admins delete product media"
on public.product_media for delete
to authenticated
using (private.is_active_admin((select auth.uid())));

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.product_media from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select on table public.products, public.product_variants, public.product_media to anon;
grant select, insert, update on table public.products to authenticated;
grant select, insert, update, delete on table public.product_variants, public.product_media to authenticated;

revoke execute on function private.is_active_admin(uuid) from public;
revoke execute on function private.bootstrap_initial_admin() from public;
revoke execute on function private.set_updated_at() from public;
revoke execute on function private.write_audit_log() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_admin(uuid) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'products',
  'products',
  false,
  8388608,
  array['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads referenced published product media"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'products'
  and exists (
    select 1
    from public.product_media as media
    join public.products as product on product.id = media.product_id
    where media.storage_path = storage.objects.name
      and product.status = 'published'
      and product.archived_at is null
  )
);

create policy "Active admins read product media objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'products'
  and private.is_active_admin((select auth.uid()))
);

create policy "Active admins insert product media objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'products'
  and private.is_active_admin((select auth.uid()))
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f-]+\.(avif|gif|jpe?g|png|webp)$'
  and exists (
    select 1
    from public.products
    where products.id::text = (storage.foldername(name))[1]
  )
);

create policy "Active admins update product media objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'products'
  and private.is_active_admin((select auth.uid()))
)
with check (
  bucket_id = 'products'
  and private.is_active_admin((select auth.uid()))
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f-]+\.(avif|gif|jpe?g|png|webp)$'
  and exists (
    select 1
    from public.products
    where products.id::text = (storage.foldername(name))[1]
  )
);

create policy "Active admins delete product media objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'products'
  and private.is_active_admin((select auth.uid()))
);
