import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdminWorkspaceDraft,
  formatAdminError,
  loadAdminWorkspaceDraft,
  parseAdminWorkspaceDraft,
  removeAdminWorkspaceDraft,
  resolveAdminAccess,
  saveAdminWorkspaceDraft,
  workspaceDraftStorageKey,
} from '../src/admin/admin-state.ts';
import {
  detectImageMime,
  validateImageFile,
} from '../src/admin/image-validation.ts';

function fakeFile(bytes, type = 'image/png', size = bytes.length) {
  return {
    name: 'test-image.png',
    size,
    type,
    async arrayBuffer() {
      return Uint8Array.from(bytes).buffer;
    },
  };
}

test('access state requires a verified user and active database membership', () => {
  assert.equal(resolveAdminAccess(null, null), 'logged-out');
  assert.equal(
    resolveAdminAccess({ id: 'user-1' }, { active: false, user_id: 'user-1' }),
    'unauthorized',
  );
  assert.equal(
    resolveAdminAccess({ id: 'user-1' }, { active: true, user_id: 'user-2' }),
    'unauthorized',
  );
  assert.equal(
    resolveAdminAccess({ id: 'user-1' }, { active: true, user_id: 'user-1' }),
    'admin',
  );
});

test('workspace drafts round-trip product fields, variant edits, creations and pending deletions', () => {
  const draft = createAdminWorkspaceDraft({
    product: {
      description: 'Contenido sin guardar',
      dirty: true,
      name: 'Producto local',
      productId: 'product-1',
      slug: 'producto-local',
    },
    variants: [
      {
        clientId: 'variant-existing',
        currency: 'USD',
        denomination: '10',
        dirty: true,
        intent: 'upsert',
        name: 'Editada',
        platform: 'Steam',
        price: '9.50',
        region: 'Global',
        sku: 'EDIT-001',
        status: 'draft',
        variantId: 'variant-1',
      },
      {
        clientId: 'variant-new',
        currency: 'USD',
        denomination: '20',
        dirty: true,
        intent: 'upsert',
        name: 'Nueva',
        platform: 'Steam',
        price: '18.00',
        region: 'Global',
        sku: 'NEW-001',
        status: 'draft',
        variantId: null,
      },
      {
        clientId: 'variant-delete',
        currency: 'USD',
        denomination: '30',
        dirty: true,
        intent: 'delete',
        name: 'Pendiente de borrar',
        platform: 'Steam',
        price: '27.00',
        region: 'Global',
        sku: 'DELETE-001',
        status: 'archived',
        variantId: 'variant-3',
      },
    ],
  });

  assert.deepEqual(parseAdminWorkspaceDraft(JSON.stringify(draft)), draft);
  assert.equal(parseAdminWorkspaceDraft('{not-json'), null);
  assert.equal(
    parseAdminWorkspaceDraft(JSON.stringify({ variants: [{ dirty: 'yes' }] })),
    null,
  );
});

test('workspace drafts remain isolated while navigating between products', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  const variant = (clientId, variantId, intent = 'upsert') => ({
    clientId,
    currency: 'USD',
    denomination: '10',
    dirty: true,
    intent,
    name: clientId,
    platform: 'Steam',
    price: '9.50',
    region: 'Global',
    sku: clientId.toUpperCase(),
    status: 'draft',
    variantId,
  });
  const draftA = createAdminWorkspaceDraft({
    product: {
      description: 'A editado',
      dirty: true,
      name: 'Producto A',
      productId: 'product-a',
      slug: 'producto-a',
    },
    variants: [
      variant('variant-a-edit', 'variant-a'),
      variant('variant-a-delete', 'variant-a-delete', 'delete'),
    ],
  });
  const draftB = createAdminWorkspaceDraft({
    product: {
      description: 'B editado',
      dirty: true,
      name: 'Producto B',
      productId: 'product-b',
      slug: 'producto-b',
    },
    variants: [variant('variant-b-new', null)],
  });

  saveAdminWorkspaceDraft(storage, draftA);
  saveAdminWorkspaceDraft(storage, draftB);

  assert.notEqual(
    workspaceDraftStorageKey('product-a'),
    workspaceDraftStorageKey('product-b'),
  );
  assert.deepEqual(loadAdminWorkspaceDraft(storage, 'product-b'), draftB);
  assert.deepEqual(loadAdminWorkspaceDraft(storage, 'product-a'), draftA);
  assert.equal(
    loadAdminWorkspaceDraft(storage, 'product-a').variants[1].intent,
    'delete',
  );
  removeAdminWorkspaceDraft(storage, 'product-b');
  assert.equal(loadAdminWorkspaceDraft(storage, 'product-b'), null);
  assert.deepEqual(loadAdminWorkspaceDraft(storage, 'product-a'), draftA);
});

test('admin errors preserve actionable service diagnostics', () => {
  assert.equal(formatAdminError(new Error('Storage denied')), 'Storage denied');
  assert.equal(
    formatAdminError({ message: 'RLS denied', hint: 'Check admin membership' }),
    'RLS denied · Check admin membership',
  );
});

test('image validation verifies signatures, declared MIME and decoded dimensions', async () => {
  const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];
  assert.equal(detectImageMime(Uint8Array.from(png)), 'image/png');

  const metadata = await validateImageFile(fakeFile(png), async () => ({
    height: 1080,
    width: 1920,
  }));
  assert.deepEqual(metadata, {
    height: 1080,
    mimeType: 'image/png',
    width: 1920,
  });

  await assert.rejects(
    validateImageFile(fakeFile(png, 'image/jpeg'), async () => ({
      height: 100,
      width: 100,
    })),
    /does not match/i,
  );
  await assert.rejects(
    validateImageFile(fakeFile(png), async () => ({
      height: 5000,
      width: 5000,
    })),
    /4096/,
  );
});
