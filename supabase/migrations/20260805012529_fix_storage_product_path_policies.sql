drop policy "Active admins insert product media objects" on storage.objects;
drop policy "Active admins update product media objects" on storage.objects;

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
    where products.id::text = (storage.foldername(storage.objects.name))[1]
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
    where products.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
