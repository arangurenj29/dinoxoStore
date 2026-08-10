-- Consolidate authenticated SELECT policies to avoid duplicate evaluation.
drop policy "Public reads published products" on public.products;
drop policy "Active admins read all products" on public.products;

create policy "Public reads published products"
on public.products for select
to anon
using (status = 'published' and archived_at is null);

create policy "Authenticated reads published products or admin catalog"
on public.products for select
to authenticated
using (
  (status = 'published' and archived_at is null)
  or private.is_active_admin((select auth.uid()))
);

drop policy "Public reads published product variants" on public.product_variants;
drop policy "Active admins read all product variants" on public.product_variants;

create policy "Public reads published product variants"
on public.product_variants for select
to anon
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

create policy "Authenticated reads published variants or admin catalog"
on public.product_variants for select
to authenticated
using (
  (
    status = 'published'
    and archived_at is null
    and exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.status = 'published'
        and products.archived_at is null
    )
  )
  or private.is_active_admin((select auth.uid()))
);

drop policy "Public reads media for published products" on public.product_media;
drop policy "Active admins read all product media" on public.product_media;

create policy "Public reads media for published products"
on public.product_media for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_media.product_id
      and products.status = 'published'
      and products.archived_at is null
  )
);

create policy "Authenticated reads published media or admin catalog"
on public.product_media for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_media.product_id
      and products.status = 'published'
      and products.archived_at is null
  )
  or private.is_active_admin((select auth.uid()))
);

drop policy "Public reads referenced published product media" on storage.objects;
drop policy "Active admins read product media objects" on storage.objects;

create policy "Public reads referenced published product media"
on storage.objects for select
to anon
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

create policy "Authenticated reads referenced media or admin objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'products'
  and (
    private.is_active_admin((select auth.uid()))
    or exists (
      select 1
      from public.product_media as media
      join public.products as product on product.id = media.product_id
      where media.storage_path = storage.objects.name
        and product.status = 'published'
        and product.archived_at is null
    )
  )
);

create policy "No direct audit access"
on public.audit_log as restrictive
for all
to anon, authenticated
using (false)
with check (false);
