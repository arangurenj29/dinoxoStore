-- Otorgar permiso DELETE al rol authenticated en products (requerido para que la política RLS de delete funcione).
grant delete on public.products to authenticated;
grant delete on public.product_variants to authenticated;
grant delete on public.product_media to authenticated;
