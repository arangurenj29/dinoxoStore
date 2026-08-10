-- Reproducible pgTAP policy checks. Run with `supabase test db` against a local stack.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_table('public', 'admin_users');
select has_table('public', 'products');
select has_table('public', 'product_variants');
select has_table('public', 'product_media');
select has_table('public', 'audit_log');

select row_security_is('public', 'admin_users', true);
select row_security_is('public', 'products', true);
select row_security_is('public', 'product_variants', true);
select row_security_is('public', 'product_media', true);
select row_security_is('public', 'audit_log', true);

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

select has_trigger('public', 'products', 'audit_products');
select has_trigger('public', 'product_variants', 'audit_product_variants');
select has_trigger('public', 'product_media', 'audit_product_media');

select has_function('private', 'is_active_admin', array['uuid']);
select has_function('private', 'bootstrap_initial_admin', array[]::text[]);
select has_function('private', 'write_audit_log', array[]::text[]);
select has_column('public', 'audit_log', 'actor_email');
select has_function('public', 'reorder_product_media', array['uuid[]']);
select has_constraint(
  'public',
  'product_media',
  'product_media_product_position_key'
);

select * from finish();
rollback;
