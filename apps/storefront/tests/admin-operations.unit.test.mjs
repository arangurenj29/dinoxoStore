import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteVariant,
  inspectAdminSession,
  persistProduct,
  persistVariant,
  signInWithPassword,
} from '../src/admin/admin-operations.ts';

test('password sign-in forwards credentials and propagates auth errors', async () => {
  const calls = [];
  await signInWithPassword(
    async (request) => {
      calls.push(request);
      return { error: null };
    },
    'admin@example.com',
    'correct horse battery staple',
  );
  assert.deepEqual(calls, [
    {
      email: 'admin@example.com',
      password: 'correct horse battery staple',
    },
  ]);
  await assert.rejects(
    signInWithPassword(
      async () => ({ error: new Error('Auth unavailable') }),
      'admin@example.com',
      'correct horse battery staple',
    ),
    /Auth unavailable/,
  );
});

test('reauth resolves database membership instead of trusting the session alone', async () => {
  const membershipLookups = [];
  assert.deepEqual(
    await inspectAdminSession({
      getMembership: async (userId) => {
        membershipLookups.push(userId);
        return { active: true, user_id: userId };
      },
      getUser: async () => ({ email: 'admin@example.com', id: 'user-1' }),
    }),
    {
      access: 'admin',
      membership: { active: true, user_id: 'user-1' },
      user: { email: 'admin@example.com', id: 'user-1' },
    },
  );
  assert.deepEqual(membershipLookups, ['user-1']);
  assert.equal(
    (
      await inspectAdminSession({
        getMembership: async () => null,
        getUser: async () => ({ email: 'other@example.com', id: 'user-2' }),
      })
    ).access,
    'unauthorized',
  );
});

test('catalog persistence deterministically selects insert, update and delete gateways', async () => {
  const calls = [];
  const gateway = {
    deleteVariant: async (id) => calls.push(['delete-variant', id]),
    insertProduct: async (payload) => {
      calls.push(['insert-product', payload]);
      return { id: 'product-new' };
    },
    insertVariant: async (payload) => calls.push(['insert-variant', payload]),
    updateProduct: async (id, payload) => {
      calls.push(['update-product', id, payload]);
      return { id };
    },
    updateVariant: async (id, payload) =>
      calls.push(['update-variant', id, payload]),
  };
  const product = { name: 'Producto' };
  const variant = { sku: 'SKU-001' };

  assert.equal(
    (await persistProduct(gateway, null, product)).id,
    'product-new',
  );
  assert.equal(
    (await persistProduct(gateway, 'product-1', product)).id,
    'product-1',
  );
  await persistVariant(gateway, null, variant);
  await persistVariant(gateway, 'variant-1', variant);
  await deleteVariant(gateway, 'variant-2');

  assert.deepEqual(calls, [
    ['insert-product', product],
    ['update-product', 'product-1', product],
    ['insert-variant', variant],
    ['update-variant', 'variant-1', variant],
    ['delete-variant', 'variant-2'],
  ]);
});
