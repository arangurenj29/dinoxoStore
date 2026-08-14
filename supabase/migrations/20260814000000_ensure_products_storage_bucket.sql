-- Ensure the products storage bucket exists and is public so the storefront
-- Worker can serve product images through public storage URLs
-- (/storage/v1/object/public/products/...). Public URLs only work when the
-- bucket exists and is public; RLS policies still gate access by product status.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'products',
  'products',
  true,
  8388608,
  array['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
