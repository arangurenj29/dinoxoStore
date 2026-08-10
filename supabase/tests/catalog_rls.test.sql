-- Reproducible pgTAP policy checks. Run with `supabase test db` against a local stack.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_table('public', 'admin_users');
select has_table('public', 'products');
select has_table('public', 'product_variants');
select has_table('public', 'product_media');
select has_table('public', 'audit_log');

select is(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'admin_users'
  ),
  true,
  'admin_users has RLS enabled'
);
select is(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'products'
  ),
  true,
  'products has RLS enabled'
);
select is(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'product_variants'
  ),
  true,
  'product_variants has RLS enabled'
);
select is(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'product_media'
  ),
  true,
  'product_media has RLS enabled'
);
select is(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'audit_log'
  ),
  true,
  'audit_log has RLS enabled'
);

select policies_are(
  'public',
  'products',
  array[
    'Public reads published products',
    'Authenticated reads published products or admin catalog',
    'Active admins insert products',
    'Active admins update products'
  ]
);
select policies_are(
  'storage',
  'objects',
  array[
    'Public reads referenced published product media',
    'Authenticated reads referenced media or admin objects',
    'Active admins insert product media objects',
    'Active admins update product media objects',
    'Active admins delete product media objects'
  ]
);

select is(
  (
    select count(*)::integer
    from pg_trigger as trigger_row
    join pg_class as table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and schema_row.nspname = 'public'
      and table_row.relname = 'products'
      and trigger_row.tgname = 'audit_products'
  ),
  1,
  'products has audit_products trigger'
);
select is(
  (
    select count(*)::integer
    from pg_trigger as trigger_row
    join pg_class as table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and schema_row.nspname = 'public'
      and table_row.relname = 'product_variants'
      and trigger_row.tgname = 'audit_product_variants'
  ),
  1,
  'product_variants has audit_product_variants trigger'
);
select is(
  (
    select count(*)::integer
    from pg_trigger as trigger_row
    join pg_class as table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and schema_row.nspname = 'public'
      and table_row.relname = 'product_media'
      and trigger_row.tgname = 'audit_product_media'
  ),
  1,
  'product_media has audit_product_media trigger'
);

select has_function('private', 'is_active_admin', array['uuid']);
select has_function('private', 'bootstrap_initial_admin', array[]::text[]);
select has_function('private', 'write_audit_log', array[]::text[]);
select is(
  (
    select count(*)::integer
    from pg_attribute as attribute_row
    join pg_class as table_row on table_row.oid = attribute_row.attrelid
    join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'audit_log'
      and attribute_row.attname = 'actor_email'
      and attribute_row.attnum > 0
      and not attribute_row.attisdropped
  ),
  1,
  'audit_log has actor_email column'
);
select has_function('public', 'reorder_product_media', array['uuid[]']);
select is(
  (
    select count(*)::integer
    from pg_constraint as constraint_row
    join pg_class as table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace as schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'product_media'
      and constraint_row.conname = 'product_media_product_position_key'
  ),
  1,
  'product_media has atomic position uniqueness constraint'
);

select * from finish();
rollback;
