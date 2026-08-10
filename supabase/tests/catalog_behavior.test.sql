-- Transactional behavior verification for catalog, audit, RLS and Storage.
-- Safe for a linked non-production test project: every write is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

set constraints public.admin_users_user_id_fkey deferred;
set constraints public.audit_log_actor_id_fkey deferred;

insert into public.admin_users (user_id, role, active)
values ('90000000-0000-4000-8000-000000000001', 'owner', true);

insert into public.products (id, slug, name, status)
values
  ('10000000-0000-4000-8000-000000000001', 'behavior-published', 'Behavior Published', 'published'),
  ('10000000-0000-4000-8000-000000000002', 'behavior-draft', 'Behavior Draft', 'draft');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  if (select count(*) from public.products) <> 1 then
    raise exception 'anon must read exactly one published product';
  end if;
  begin
    insert into public.products (slug, name) values ('anon-forbidden', 'Anon forbidden');
    raise exception 'anon insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reorder_product_media(array[]::uuid[]);
    raise exception 'anon RPC unexpectedly succeeded';
  exception when insufficient_privilege or undefined_function then null;
  end;
end
$$;

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"90000000-0000-4000-8000-000000000002","email":"non.admin@example.com"}';

do $$
begin
  if (select count(*) from public.products) <> 1 then
    raise exception 'authenticated non-admin must read only published products';
  end if;
  if (select count(*) from public.admin_users) <> 0 then
    raise exception 'authenticated non-admin must not read admin membership';
  end if;
  begin
    insert into public.products (slug, name) values ('non-admin-forbidden', 'Non-admin forbidden');
    raise exception 'authenticated non-admin insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"90000000-0000-4000-8000-000000000001","email":"simulated.admin@example.com"}';

insert into public.products (id, slug, name, status)
values ('10000000-0000-4000-8000-000000000003', 'admin-published', 'Admin Published', 'published');

insert into storage.objects (bucket_id, name)
values
  ('products', '10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000001.webp'),
  ('products', '10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000002.webp');

insert into public.product_media (
  id, product_id, storage_path, alt_text, position, mime_type, width, height
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000001.webp',
    'First media', 0, 'image/webp', 1200, 800
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000002.webp',
    'Second media', 1, 'image/webp', 1200, 800
  );

select public.reorder_product_media(
  array[
    '30000000-0000-4000-8000-000000000002'::uuid,
    '30000000-0000-4000-8000-000000000001'::uuid
  ]
);

do $$
begin
  if (
    select array_agg(id order by position)
    from public.product_media
    where product_id = '10000000-0000-4000-8000-000000000003'
  ) <> array[
    '30000000-0000-4000-8000-000000000002'::uuid,
    '30000000-0000-4000-8000-000000000001'::uuid
  ] then
    raise exception 'atomic media reorder returned an unexpected order';
  end if;
  if (
    select count(*) = count(distinct position)
    from public.product_media
    where product_id = '10000000-0000-4000-8000-000000000003'
  ) is not true then
    raise exception 'media positions must remain unique';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'products') <> 2 then
    raise exception 'active admin must read inserted Storage objects';
  end if;
  begin
    insert into public.audit_log (entity, entity_id, action)
    values ('forbidden', gen_random_uuid(), 'INSERT');
    raise exception 'client audit insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.audit_log
    where actor_id = '90000000-0000-4000-8000-000000000001'
      and actor_email = 'simulated.admin@example.com'
      and entity in ('products', 'product_media')
  ) then
    raise exception 'audit actor snapshot was not recorded';
  end if;
end
$$;

delete from public.admin_users
where user_id = '90000000-0000-4000-8000-000000000001';

-- Simulate the FK's ON DELETE SET NULL result without mutating auth.users.
update public.audit_log
set actor_id = null
where actor_id = '90000000-0000-4000-8000-000000000001';

do $$
begin
  if not exists (
    select 1
    from public.audit_log
    where actor_id is null
      and actor_email = 'simulated.admin@example.com'
  ) then
    raise exception 'audit actor snapshot did not survive auth user deletion';
  end if;
end
$$;

select ok(true, 'catalog behavior, RLS, Storage, audit and atomic reorder verified');
select * from finish();
rollback;
