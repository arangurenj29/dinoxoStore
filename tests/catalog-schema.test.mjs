import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../supabase/migrations/20260805004900_catalog_auth_rls_storage.sql',
  import.meta.url,
);
const hardeningMigrationPath = new URL(
  '../supabase/migrations/20260805005644_harden_catalog_policies.sql',
  import.meta.url,
);
const behaviorMigrationPath = new URL(
  '../supabase/migrations/20260805012411_audit_actor_and_atomic_media_order.sql',
  import.meta.url,
);
const storageFixMigrationPath = new URL(
  '../supabase/migrations/20260805012529_fix_storage_product_path_policies.sql',
  import.meta.url,
);

async function migrationSql() {
  return (await readFile(migrationPath, 'utf8')).toLowerCase();
}

test('catalog migration creates the complete phase 2 model with RLS', async () => {
  const sql = await migrationSql();

  for (const table of [
    'admin_users',
    'products',
    'product_variants',
    'product_media',
    'audit_log',
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }

  assert.match(sql, /price_minor bigint/);
  assert.match(sql, /unique[\s\S]*slug/);
  assert.match(sql, /unique[\s\S]*sku/);
  assert.match(sql, /archived_at timestamptz/);
});

test('authorization is database-owned and bootstraps only the initial admin', async () => {
  const sql = await migrationSql();

  assert.match(sql, /arangurenj29@gmail\.com/);
  assert.match(sql, /after insert on auth\.users/);
  assert.match(sql, /private\.is_active_admin/);
  assert.doesNotMatch(sql, /raw_user_meta_data[\s\S]*(admin|role)/);
  assert.doesNotMatch(sql, /user_metadata[\s\S]*(admin|role)/);
  assert.match(sql, /revoke execute on function private\./);
});

test('catalog and storage policies distinguish published readers from admins', async () => {
  const sql = await migrationSql();

  assert.match(sql, /create policy "public reads published products"/);
  assert.match(sql, /create policy "active admins update products"/);
  assert.match(sql, /for update[\s\S]*using[\s\S]*with check/);
  assert.match(sql, /insert into storage\.buckets/);
  assert.match(sql, /bucket_id = 'products'/);
  assert.match(sql, /public reads referenced published product media/);
  assert.match(sql, /active admins insert product media objects/);
  assert.match(sql, /active admins update product media objects/);
  assert.match(sql, /active admins delete product media objects/);
});

test('audit records are trigger-owned instead of client writable', async () => {
  const sql = await migrationSql();

  assert.match(sql, /create trigger audit_products/);
  assert.match(sql, /create trigger audit_product_variants/);
  assert.match(sql, /create trigger audit_product_media/);
  assert.match(
    sql,
    /revoke all on table public\.audit_log from anon, authenticated/,
  );
  assert.doesNotMatch(
    sql,
    /grant insert on table public\.audit_log to authenticated/,
  );
});

test('policy hardening avoids duplicate authenticated SELECT policies', async () => {
  const sql = (await readFile(hardeningMigrationPath, 'utf8')).toLowerCase();

  assert.match(sql, /drop policy "public reads published products"/);
  assert.match(sql, /to anon[\s\S]*status = 'published'/);
  assert.match(sql, /to authenticated[\s\S]*or private\.is_active_admin/);
  assert.match(sql, /no direct audit access/);
  assert.match(sql, /using \(false\)[\s\S]*with check \(false\)/);
});

test('audit snapshots and atomic media ordering are database enforced', async () => {
  const sql = (await readFile(behaviorMigrationPath, 'utf8')).toLowerCase();
  assert.match(sql, /add column actor_email text/);
  assert.match(sql, /unique \(product_id, position\)/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /private\.is_active_admin\(auth\.uid\(\)\)/);
  assert.match(sql, /revoke execute[\s\S]*from anon/);
});

test('storage path policies qualify the outer object name', async () => {
  const sql = (await readFile(storageFixMigrationPath, 'utf8')).toLowerCase();
  assert.match(sql, /storage\.foldername\(storage\.objects\.name\)/);
  assert.doesNotMatch(sql, /storage\.foldername\(products\.name\)/);
});
