-- The storefront serves product images through public storage URLs built by the
-- Worker (/storage/v1/object/public/products/...). Public URLs only work when
-- the bucket is public; RLS policies still gate access by product status.
update storage.buckets
set public = true
where id = 'products';
