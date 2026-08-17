-- Permitir a admins activos eliminar productos.
create policy "Active admins delete products"
on public.products for delete
to authenticated
using (private.is_active_admin((select auth.uid())));
