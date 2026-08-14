import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

test('local migration filenames match the applied remote history exactly', async () => {
  const migrations = (
    await readdir(new URL('../supabase/migrations/', import.meta.url))
  )
    .filter((name) => name.endsWith('.sql'))
    .sort();

  assert.deepEqual(migrations, [
    '20260805004900_catalog_auth_rls_storage.sql',
    '20260805005644_harden_catalog_policies.sql',
    '20260805012411_audit_actor_and_atomic_media_order.sql',
    '20260805012529_fix_storage_product_path_policies.sql',
    '20260813000000_public_products_storage_bucket.sql',
    '20260814000000_ensure_products_storage_bucket.sql',
  ]);
});
