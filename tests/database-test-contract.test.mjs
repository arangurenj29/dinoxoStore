import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('pgTAP storage policy contract expects exactly the five deployed policies', async () => {
  const sql = await readFile(
    new URL('../supabase/tests/catalog_rls.test.sql', import.meta.url),
    'utf8',
  );
  const block = sql.match(
    /policies_are\(\s*'storage',\s*'objects',\s*array\[([\s\S]*?)\]\s*\)/,
  )?.[1];
  assert.ok(
    block,
    'Debe existir el contrato policies_are para storage.objects',
  );

  const entries = block
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  assert.deepEqual(entries, [
    "'Public reads referenced published product media'",
    "'Authenticated reads referenced media or admin objects'",
    "'Active admins insert product media objects'",
    "'Active admins update product media objects'",
    "'Active admins delete product media objects'",
  ]);
});
